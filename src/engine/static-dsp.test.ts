import { describe, expect, it } from 'vitest'
import { applyStaticDispatch, planStaticPlacement, staticModulePlan } from './static-dsp'
import { parseDspMemory, readDspWords } from './dsp-memory'
import facts from './assets/static-dsp.json'
import stockMetadata from './assets/stock-dsp-metadata.json'
import dsp from './assets/dsp-packages.json'
import resident from './assets/resident-dsp.json'
// Structural facts only: stock effect spans, module package sizes and native priorities. No firmware.
const core = (tag: string) => stockMetadata.payloads.find(payload => payload.tag === tag)!.packages.map(({ key, fxId, sourceAddress, words }) => ({ key, fxId, sourceAddress, words }))
const words = (id: string) => id === 'character' ? resident.character.words : dsp.packages.find(pkg => pkg.id === id)!.words
const plan = (ids: string[]) => staticModulePlan(ids).map(module => ({ key: module.key, fxId: module.fxId, words: words(module.id) }))
const stockFx1 = ['FILTER', 'SPATIALIZER', 'EQUALIZER', 'PHASER', 'FLANGER', 'CHORUS', 'COMPRESSOR', 'LO-FI', 'DJ EQ', 'COMB FILTER']
const everyStock = new Set(core('A').map(effect => effect.key))
const fx2Off = new Set(stockFx1)
describe('loader-free DSP placement (native static stock)', () => {
  it('uses native priority and stable catalog ties regardless of selection order', () => {
    expect(staticModulePlan(['euclid', 'miniverb', 'tapeecho', 'modulation', 'character', 'spectrum', 'repitch']).map(module => module.id))
      .toEqual(['spectrum', 'character', 'modulation', 'tapeecho', 'miniverb', 'euclid'])
    expect(() => staticModulePlan(['unknown'])).toThrow('Unknown module')
  })
  it('keeps listed stock dispatch entries and nulls every omitted custom id on both cores', () => {
    for (const stub of facts.payloads) {
      // A synthetic X-memory record covering both dispatch tables; no stock instruction bytes.
      const bytes: number[] = [], word = (value: number) => bytes.push(value & 255, value >>> 8 & 255, value >>> 16 & 255)
      ;[1, 0x215, 64, ...Array.from({ length: 64 }, (_, i) => 0x1200 + i), 3, 0].forEach(word)
      const memory = parseDspMemory(new Uint8Array(bytes))
      const selected = { fxId: 23, init: 0x1000, proc: 0x1001 }
      applyStaticDispatch(memory, [selected], [{ fxId: 16 }], stub)
      expect(Array.from(readDspWords(memory, 1, 0x215 + selected.fxId, 1))).toEqual([selected.init])
      expect(Array.from(readDspWords(memory, 1, 0x235 + selected.fxId, 1))).toEqual([selected.proc])
      for (const fxId of [0, 6, 7, 9, 10, 11, 14, 15, 16, 26, 29]) {
        expect(readDspWords(memory, 1, 0x215 + fxId, 1)[0]).toBe(stub.nullInit)
        expect(readDspWords(memory, 1, 0x235 + fxId, 1)[0]).toBe(stub.nullProc)
      }
      // FILTER and unused reverb donors retain their original entries.
      for (const fxId of [1, 17, 18]) {
        expect(readDspWords(memory, 1, 0x215 + fxId, 1)[0]).toBe(0x1200 + fxId)
        expect(readDspWords(memory, 1, 0x235 + fxId, 1)[0]).toBe(0x1220 + fxId)
      }
    }
  })
  it('takes the three reverbs as one region on each core when stock FX2 is off', () => {
    const a = planStaticPlacement('A', core('A'), fx2Off, plan(['miniverb'])), b = planStaticPlacement('B', core('B'), fx2Off, plan(['miniverb']))
    expect(a.runs).toHaveLength(1); expect(a.runs[0]).toMatchObject({ base: 0x1000, words: 2724 })
    expect(b.runs[0]).toMatchObject({ base: 0xdc0, words: 2724 })
  })
  it('refuses anything that needs DSP space while every stock effect is listed', () => {
    expect(() => planStaticPlacement('A', core('A'), everyStock, plan(['euclid']))).toThrow('nowhere to place EUCLID')
    expect(planStaticPlacement('A', core('A'), everyStock, plan([])).placed).toEqual([])
  })
  it('places modules in native priority order, packed from the region start', () => {
    const { placed } = planStaticPlacement('A', core('A'), fx2Off, plan(['euclid', 'tapeecho', 'miniverb']))
    expect(placed.map(item => item.key)).toEqual(['TAPE ECHO', 'MINIVERB', 'EUCLID'])
    expect(placed[0].address).toBe(0x1000)
    for (let i = 1; i < placed.length; i++) expect(placed[i].address).toBe(placed[i - 1].address + placed[i - 1].words)
  })
  it('names the overrun with native wording, matching the native proofs', () => {
    expect(() => planStaticPlacement('A', core('A'), fx2Off, plan(['spectrum', 'modulation']))).toThrow('MODULATION overruns the region (2966 > 2724 words)')
    expect(() => planStaticPlacement('A', core('A'), fx2Off, plan(['spectrum', 'modulation', 'character']))).toThrow('MODULATION overruns the region (3955 > 2724 words)')
  })
  it('nulls only donors the placed code reached and keeps the rest stock', () => {
    const { nulledDonors } = planStaticPlacement('A', core('A'), fx2Off, plan(['miniverb', 'tapeecho', 'euclid']))
    expect(nulledDonors.map(effect => effect.key)).toEqual(['PLATE REV', 'SPRING REV'])
  })
  it('does not use space in a run that is too small even if other runs are free', () => {
    // FILTER and DARK REV are separate runs; MODULATION (1575) fits neither.
    const listed = new Set([...everyStock].filter(key => key !== 'FILTER' && key !== 'DARK REV'))
    expect(() => planStaticPlacement('A', core('A'), listed, plan(['modulation']))).toThrow('does not fit any harvested run')
    // First-fit by address: Tape Echo (5 words) takes the lower run, Mini Verb (457) skips FILTER's 441 words.
    expect(planStaticPlacement('A', core('A'), listed, plan(['tapeecho'])).placed[0].address).toBe(0x7d1)
    expect(planStaticPlacement('A', core('A'), listed, plan(['miniverb'])).placed[0].address).toBe(0x1679)
  })
  it('fits Character with Mini Verb and Tape Echo, but not with Spectrum', () => {
    expect(planStaticPlacement('A', core('A'), fx2Off, plan(['character', 'miniverb', 'tapeecho'])).placed).toHaveLength(3)
    expect(() => planStaticPlacement('A', core('A'), fx2Off, plan(['spectrum', 'character', 'miniverb']))).toThrow('overruns the region')
  })
})
