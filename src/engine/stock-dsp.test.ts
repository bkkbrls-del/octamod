import { describe, expect, it } from 'vitest'
import { adjustStockAddresses, recoverStockDsp, relocateStockDsp } from './stock-dsp'
import type { StockDspPackage } from './stock-dsp'
function synthetic(): StockDspPackage { return { key: 'SYNTHETIC', fxId: 31, slots: ['fx2'], words: new Uint32Array([2, 0xfffffe, 0x123456, 0]), relocations: [0, 0x8001], init: 0, proc: 2 } }
describe('local stock DSP transformations', () => {
  it('preserves unchanged source words and wraps signed address adjustments at 24 bits', () => {
    const source = new Uint32Array([0, 0xffffff, 0x123456])
    expect(Array.from(adjustStockAddresses(source, [{ offset: 0, delta: -1 }, { offset: 1, delta: 1 }]))).toEqual([0xffffff, 0, 0x123456])
    expect(Array.from(source)).toEqual([0, 0xffffff, 0x123456])
    for (const adjustments of [[{ offset: -1, delta: 1 }], [{ offset: 3, delta: 1 }], [{ offset: 0.5, delta: 1 }], [{ offset: 0, delta: NaN }], [{ offset: 0, delta: 65537 }], [{ offset: 0, delta: 1 }, { offset: 0, delta: 2 }]]) expect(() => adjustStockAddresses(source, adjustments)).toThrow('metadata')
  })
  it('supports native positive and negative relocation tags without mutating the package', () => {
    const pkg = synthetic(), placed = relocateStockDsp(pkg, 0x1000)
    expect(Array.from(placed.words)).toEqual([0x1002, 0xffeffe, 0x123456, 0])
    expect(placed.init).toBe(0x1000); expect(placed.proc).toBe(0x1002)
    expect(pkg.words[0]).toBe(2)
  })
  it('rejects malformed placements and relocation tables', () => {
    const pkg = synthetic()
    for (const base of [-1, 0.5, NaN, 0xffffff]) expect(() => relocateStockDsp(pkg, base)).toThrow('placement')
    for (const relocations of [[0, 0], [0, 0x8000], [1, 0], [4], [-1], [0.5], [0x10000]]) expect(() => relocateStockDsp({ ...pkg, relocations }, 0x1000)).toThrow('relocation')
    expect(() => relocateStockDsp({ ...pkg, proc: 4 }, 0)).toThrow('placement')
    expect(() => relocateStockDsp({ ...pkg, words: new Uint32Array([0x1000000, 0, 0, 0]) }, 0)).toThrow('words')
  })
  it('refuses stock recovery from unrelated or modified operating-system data', async () => {
    await expect(recoverStockDsp(new Uint8Array([1, 2, 3]))).rejects.toThrow('original')
  })
})
