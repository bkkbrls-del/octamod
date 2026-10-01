// Binary layout of the native MIT-licensed runtime_catalog._catalog output.
// Stock words are provided by local recovery; only independently authored
// module packages and fingerprint-bound flags are imported by this module.
import { resolveSelection, CATALOG_SOURCE } from '../catalog/modules.ts'
import { readDspPackage, relocateDspPackage } from './dsp-package.ts'
import type { StockDspCore } from './stock-dsp.ts'
import flags from './assets/runtime-catalog-flags.json' with { type: 'json' }
import stockMetadata from './assets/stock-dsp-metadata.json' with { type: 'json' }

export type RuntimePackage = {
  core: number; fxId: number; words: Uint32Array
  relocations: readonly number[]; init: number; proc: number
}
export type CatalogOptions = {
  base: number; slots: readonly number[]; reads: readonly number[]
  qualifiedMask: number; stubAtBoot: number; pmap16: boolean
}
export type RuntimeCatalog = { bytes: Uint8Array; symbols: Record<string, number> }
const CATALOG_AT = 8, CODES_AT = 392, DATA_AT = 1416
const uint32 = (value: number) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff
const align4 = (value: number) => Math.ceil(value / 4) * 4

export function serializeRuntimeCatalog(packages: readonly RuntimePackage[], options: CatalogOptions): RuntimeCatalog {
  if (!uint32(options.base) || options.base % 4 || !uint32(options.qualifiedMask) || !uint32(options.stubAtBoot) || typeof options.pmap16 !== 'boolean') throw new Error('The runtime catalog address or flags are invalid.')
  if (options.slots.length !== 32 || options.reads.length !== 32 || !options.slots.every(value => Number.isInteger(value) && value >= 0 && value <= 3) || !options.reads.every(value => value === 0 || value === 1)) throw new Error('The runtime catalog needs 32 valid slot and buffer-read entries.')
  if (packages.length > 64) throw new Error('The runtime catalog has too many packages.')
  const seen = new Set<string>()
  const placements: { pkg: RuntimePackage; wordsAt: number; relocationsAt: number }[] = []
  let size = DATA_AT
  for (const pkg of packages) {
    const key = `${pkg.core}:${pkg.fxId}`
    if (![0, 1].includes(pkg.core) || !Number.isInteger(pkg.fxId) || pkg.fxId < 0 || pkg.fxId > 31 || seen.has(key)) throw new Error('The runtime catalog has an invalid or duplicate core / effect entry.')
    seen.add(key)
    if (pkg.words.length < 1 || pkg.words.length > 0x7fff || pkg.words.some(word => word > 0xffffff) || ![pkg.init, pkg.proc].every(entry => Number.isInteger(entry) && entry >= 0 && entry < pkg.words.length)) throw new Error('The runtime catalog package has invalid words or entry points.')
    let previous = -1
    for (const relocation of pkg.relocations) {
      const offset = relocation & 0x7fff
      if (!Number.isInteger(relocation) || relocation < 0 || relocation > 0xffff || offset >= pkg.words.length || offset <= previous) throw new Error('The runtime catalog relocation table is invalid.')
      previous = offset
    }
    size = align4(size)
    const wordsAt = size; size += pkg.words.length * 4
    const relocationsAt = size; size += pkg.relocations.length * 2
    placements.push({ pkg, wordsAt, relocationsAt })
  }
  // An empty relocation label may point exactly one byte past the block.
  if (options.base + size > 0xffffffff) throw new Error('The runtime catalog pointers exceed 32-bit memory.')
  const bytes = new Uint8Array(size), view = new DataView(bytes.buffer)
  const symbols: Record<string, number> = {
    dl_stub_at_boot: options.base, dl_pmap16: options.base + 4,
    dl_catalog: options.base + CATALOG_AT, dl_codes: options.base + CODES_AT,
  }
  view.setUint32(0, options.stubAtBoot); view.setUint32(4, options.pmap16 ? 1 : 0)
  for (let id = 0; id < 32; id++) {
    const pkg = packages.find(pkg => pkg.core === 0 && pkg.fxId === id), offset = CATALOG_AT + id * 12
    view.setUint16(offset, pkg?.words.length ?? 0); view.setUint16(offset + 2, 1)
    bytes[offset + 8] = options.slots[id]; bytes[offset + 9] = pkg ? 0 : 1
    bytes[offset + 10] = options.qualifiedMask >>> id & 1; bytes[offset + 11] = options.reads[id]
  }
  for (const { pkg, wordsAt, relocationsAt } of placements) {
    const offset = CODES_AT + (pkg.core * 32 + pkg.fxId) * 16, label = `dl_pkg_${pkg.core}_${pkg.fxId}`
    symbols[label + '_words'] = options.base + wordsAt
    symbols[label + '_reloc'] = options.base + relocationsAt
    view.setUint32(offset, options.base + wordsAt); view.setUint32(offset + 4, options.base + relocationsAt)
    view.setUint16(offset + 8, pkg.words.length); view.setUint16(offset + 10, pkg.init)
    view.setUint16(offset + 12, pkg.proc); view.setUint16(offset + 14, pkg.relocations.length)
    pkg.words.forEach((word, i) => view.setUint32(wordsAt + i * 4, word))
    pkg.relocations.forEach((relocation, i) => view.setUint16(relocationsAt + i * 2, relocation))
  }
  return { bytes, symbols }
}

export async function createDynamicRuntimeCatalog(cores: readonly StockDspCore[], ids: readonly string[], base: number): Promise<RuntimeCatalog & { packages: RuntimePackage[]; needsNativePlacement: string[] }> {
  const selection = resolveSelection(ids)
  if (cores.length !== 2 || cores.filter(core => core.core === 0).length !== 1 || cores.filter(core => core.core === 1).length !== 1) throw new Error('The dynamic runtime catalog requires both stock DSP cores.')
  if (flags.schema !== 1 || flags.revision !== CATALOG_SOURCE.revision || flags.sourceSha256 !== stockMetadata.sourceSha256) throw new Error('Runtime catalog flags do not match the pinned stock metadata.')
  const packages: RuntimePackage[] = [], slots = Array(32).fill(3) as number[], reads = [...flags.stock], needsNativePlacement: string[] = []
  for (const core of [...cores].sort((a, b) => a.core - b.core)) for (const pkg of core.packages) {
    packages.push({ core: core.core, fxId: pkg.fxId, words: pkg.words, relocations: pkg.relocations, init: pkg.init, proc: pkg.proc })
    if (core.core === 0) slots[pkg.fxId] = pkg.slots.includes('fx1') ? 3 : 2
  }
  for (const module of selection) {
    const flag = flags.modules.find(entry => entry.id === module.id)
    if (!flag) { needsNativePlacement.push(module.id); continue }
    const pkg = await readDspPackage(module.id)
    if (flag.sha256 !== pkg.sha256 || flag.fxId !== pkg.fxId) throw new Error('The module buffer-read flag does not match its native package.')
    if (packages.some(entry => entry.fxId === pkg.fxId)) throw new Error('The selected module collides with a stock runtime package.')
    const words = relocateDspPackage(pkg, 0).words
    for (const core of [0, 1]) packages.push({ core, fxId: pkg.fxId, words, relocations: pkg.relocations, init: pkg.init, proc: pkg.proc })
    slots[pkg.fxId] = 3; reads[pkg.fxId] = flag.readsBase
    if (flag.needsColdFire) needsNativePlacement.push(module.id)
  }
  const stubAtBoot = packages.reduce((mask, pkg) => (mask | 1 << pkg.fxId) >>> 0, 0)
  const catalog = serializeRuntimeCatalog(packages, { base, slots, reads, qualifiedMask: 0xffffffff, stubAtBoot, pmap16: false })
  return { ...catalog, packages, needsNativePlacement }
}
