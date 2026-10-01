// Loader-free DSP composition, ported from the pinned native build_bus static-stock path. Stock effect code
// stays built in; a module is placed only in the code of stock effects listed on neither chooser. Every
// selection is checked against native output (static-composition-proofs.json).
import facts from './assets/static-dsp.json' with { type: 'json' }
import stockMetadata from './assets/stock-dsp-metadata.json' with { type: 'json' }
import { CATALOG_SOURCE, resolveSelection } from '../catalog/modules.ts'
import { readDspPackage, relocateDspPackage, type DspPackage } from './dsp-package.ts'
import { readResidentCharacter } from './resident-dsp.ts'
import type { StockDspCore } from './stock-dsp.ts'
import { parseDspMemory, writeDspWords } from './dsp-memory.ts'
import { OS_LOAD_ADDRESS, type OsWrite } from './os-patches.ts'
import type { ChooserProfile } from './choosers.ts'

// The shared X dispatch table holds init[32], then process[32].
const INIT_TABLE = 0x215, PROC_TABLE = 0x235
async function sha(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
type Run = { base: number; words: number; cursor: number }
export type StaticDspLayout = { core: number; tag: string; region: { base: number; words: number } | null; placed: { key: string; address: number; words: number }[]; nulledDonors: string[] }

export async function composeStaticDsp(cores: readonly StockDspCore[], ids: readonly string[], profile: ChooserProfile) {
  if (facts.schema !== 1 || facts.revision !== CATALOG_SOURCE.revision || facts.sourceSha256 !== stockMetadata.sourceSha256) throw new Error('Static DSP facts do not match the pinned catalog.')
  if (cores.length !== 2 || new Set(cores.map(core => core.core)).size !== 2) throw new Error('DSP composition requires both stock cores.')
  const selected = new Set(resolveSelection(ids).map(module => module.id))
  // build_bus `plan`: placement order is the module's priority; Python's stable sort keeps catalog order on ties.
  const plan = facts.modules.filter(module => selected.has(module.id)).sort((a, b) => a.priority - b.priority)
  const packages = new Map<string, DspPackage>()
  for (const module of plan) packages.set(module.id, module.id === 'character' ? await readResidentCharacter() : await readDspPackage(module.id))
  const listed = new Set([...profile.fx1, ...profile.fx2])
  const writes: OsWrite[] = [], layouts: StaticDspLayout[] = []
  for (const core of [...cores].sort((a, b) => a.core - b.core)) {
    const stock = stockMetadata.payloads.find(payload => payload.core === core.core)!, stub = facts.payloads.find(payload => payload.core === core.core)!
    if (!stock || !stub || core.tag !== stock.tag || stub.tag !== stock.tag || await sha(core.memory.bytes) !== stock.sha256) throw new Error('DSP composition needs the verified original payloads.')
    // stock.harvested: effects on NEITHER chooser give up their words; contiguous ones form one run.
    const harvested = stock.packages.filter(effect => !listed.has(effect.key)).sort((a, b) => a.sourceAddress - b.sourceAddress)
    const runs: Run[] = []
    for (const effect of harvested) {
      const last = runs[runs.length - 1]
      if (last && last.base + last.words === effect.sourceAddress) last.words += effect.words
      else runs.push({ base: effect.sourceAddress, words: effect.words, cursor: effect.sourceAddress })
    }
    if (!runs.length && plan.length) throw new Error('payload ' + stock.tag + ': nothing is harvested, so there is nowhere to place ' + plan.map(module => module.key).sort().join(', ') + '.')
    const memory = parseDspMemory(new Uint8Array(core.memory.bytes))
    const dispatch = (fxId: number, init: number, proc: number) => { writeDspWords(memory, 1, INIT_TABLE + fxId, new Uint32Array([init])); writeDspWords(memory, 1, PROC_TABLE + fxId, new Uint32Array([proc])) }
    // The NONE fallback: id 0 resolves to the per-payload null stub.
    dispatch(facts.noneId, stub.nullInit, stub.nullProc)
    const placed: StaticDspLayout['placed'] = [], budget = runs.reduce((sum, run) => sum + run.words, 0)
    for (const module of plan) {
      const pkg = packages.get(module.id)!
      if (pkg.fxId !== module.fxId) throw new Error('The ' + module.key + ' package does not match its native DSP id.')
      const run = runs.find(run => run.cursor + pkg.words <= run.base + run.words)
      if (!run) {
        if (runs.length < 2) throw new Error('payload ' + stock.tag + ': ' + module.key + ' overruns the region (' + (runs[0].cursor + pkg.words - runs[0].base) + ' > ' + budget + ' words)')
        throw new Error('payload ' + stock.tag + ': ' + module.key + ' does not fit any harvested run.')
      }
      const code = relocateDspPackage(pkg, run.cursor)
      writeDspWords(memory, 0, run.cursor, code.words)
      dispatch(module.fxId, code.init, code.proc)
      placed.push({ key: module.key, address: run.cursor, words: pkg.words })
      run.cursor += pkg.words
    }
    // build_bus `_omitted`: a custom module left out of this build resolves to the fallback, here the null stub.
    for (const fxId of facts.customIds) if (!plan.some(module => module.fxId === fxId)) dispatch(fxId, stub.nullInit, stub.nullProc)
    // Donor ids go to the null stub only where placed code reached the effect; the rest stay stock.
    const nulledDonors: string[] = []
    for (const effect of harvested) {
      const run = runs.find(run => run.base <= effect.sourceAddress && effect.sourceAddress < run.base + run.words)!
      if (effect.sourceAddress < run.cursor) { dispatch(effect.fxId, stub.nullInit, stub.nullProc); nulledDonors.push(effect.key) }
    }
    writes.push({ address: OS_LOAD_ADDRESS + stock.sourceOffset, guardLength: stock.bytes, guardSha256: stock.sha256, bytes: memory.bytes, note: 'DSP payload ' + stock.tag + ' (static stock)' })
    layouts.push({ core: core.core, tag: stock.tag, region: runs.length ? { base: runs[0].base, words: budget } : null, placed, nulledDonors })
  }
  return { writes, layouts }
}
