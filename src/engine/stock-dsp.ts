import { CATALOG_SOURCE } from '../catalog/modules.ts'
import metadata from './assets/stock-dsp-metadata.json' with { type: 'json' }
import { parseDspMemory, readDspWords } from './dsp-memory.ts'
import type { DspMemory } from './dsp-memory.ts'

export type StockDspPackage = {
  key: string; fxId: number; slots: readonly string[]; words: Uint32Array
  relocations: readonly number[]; init: number; proc: number
}
export type StockDspCore = {
  tag: string; core: number; memory: DspMemory
  effectStart: number; effectEnd: number; sharedEnd: number
  shared: { destination: number; words: Uint32Array }[]
  packages: StockDspPackage[]
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
export async function dspWordsHash(words: Uint32Array): Promise<string> {
  const bytes = new Uint8Array(words.length * 3)
  words.forEach((word, i) => { bytes[i * 3] = word >>> 16; bytes[i * 3 + 1] = word >>> 8; bytes[i * 3 + 2] = word })
  return sha256(bytes)
}
export function adjustStockAddresses(source: Uint32Array, adjustments: readonly { offset: number; delta: number }[]): Uint32Array {
  if (source.some(word => word > 0xffffff)) throw new Error('The stock DSP source has invalid words.')
  const result = source.slice(), seen = new Set<number>()
  for (const { offset, delta } of adjustments) {
    if (!Number.isInteger(offset) || offset < 0 || offset >= source.length || seen.has(offset) || !Number.isInteger(delta) || Math.abs(delta) > 0x10000) throw new Error('The stock DSP address-adjustment metadata is invalid.')
    seen.add(offset); result[offset] = (source[offset] + delta) & 0xffffff
  }
  return result
}

export function relocateStockDsp(pkg: StockDspPackage, base: number): { words: Uint32Array; init: number; proc: number } {
  if (!Number.isInteger(base) || base < 0 || base + pkg.words.length > 0x1000000 || pkg.words.length === 0 || pkg.words.length > 0x7fff || ![pkg.init, pkg.proc].every(entry => Number.isInteger(entry) && entry >= 0 && entry < pkg.words.length)) throw new Error('The stock DSP package placement is invalid.')
  const words = pkg.words.slice()
  let previous = -1
  if (words.some(word => word > 0xffffff)) throw new Error('The stock DSP package has invalid words.')
  for (const relocation of pkg.relocations) {
    const offset = relocation & 0x7fff
    if (!Number.isInteger(relocation) || relocation < 0 || relocation > 0xffff || offset >= words.length || offset <= previous) throw new Error('The stock DSP package relocation is invalid.')
    previous = offset
    words[offset] = (words[offset] + (relocation & 0x8000 ? -base : base)) & 0xffffff
  }
  return { words, init: base + pkg.init, proc: base + pkg.proc }
}

export async function recoverStockDsp(mainOs: Uint8Array): Promise<StockDspCore[]> {
  if (metadata.schema !== 1 || metadata.revision !== CATALOG_SOURCE.revision) throw new Error('Stock DSP metadata does not match the catalog revision.')
  if (await sha256(mainOs) !== metadata.sourceSha256) throw new Error('Stock DSP recovery needs the original, unmodified OS image.')
  const cores: StockDspCore[] = []
  for (const payload of metadata.payloads) {
    const bytes = mainOs.subarray(payload.sourceOffset, payload.sourceOffset + payload.bytes)
    if (await sha256(bytes) !== payload.sha256) throw new Error('The stock DSP payload fingerprint does not match.')
    const memory = parseDspMemory(bytes)
    if (JSON.stringify(memory.records) !== JSON.stringify(payload.records)) throw new Error('The stock DSP record map does not match its native fingerprint.')
    async function recover(recipe: { sourceAddress: number; words: number; sourceSha256: string; sha256: string; adjustments: { offset: number; delta: number }[] }) {
      const source = readDspWords(memory, 0, recipe.sourceAddress, recipe.words)
      if (await dspWordsHash(source) !== recipe.sourceSha256) throw new Error('The stock DSP source span fingerprint does not match.')
      const adjusted = adjustStockAddresses(source, recipe.adjustments)
      if (await dspWordsHash(adjusted) !== recipe.sha256) throw new Error('The stock DSP package differs from the native relocation recipe.')
      return adjusted
    }
    const shared: StockDspCore['shared'] = [], packages: StockDspPackage[] = []
    for (const recipe of payload.shared) shared.push({ destination: recipe.destination, words: await recover(recipe) })
    for (const recipe of payload.packages) {
      const words = await recover(recipe)
      const pkg = { key: recipe.key, fxId: recipe.fxId, slots: recipe.slots, words, relocations: recipe.relocations, init: recipe.init, proc: recipe.proc }
      relocateStockDsp(pkg, 0)
      packages.push(pkg)
    }
    cores.push({ tag: payload.tag, core: payload.core, memory, effectStart: payload.effectStart, effectEnd: payload.effectEnd, sharedEnd: payload.sharedEnd, shared, packages })
  }
  return cores
}
