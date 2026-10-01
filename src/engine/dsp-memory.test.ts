import { describe, expect, it } from 'vitest'
import { parseDspMemory, readDspWords, writeDspWords } from './dsp-memory'
function synthetic(records: { space: number; address: number; words: number[] }[], prefix = true) {
  const output: number[] = []
  function w(value: number) { output.push(value & 255, value >>> 8 & 255, value >>> 16 & 255) }
  if (prefix) { w(3); w(0); w(4); w(0) }
  for (const record of records) { w(record.space); w(record.address); w(record.words.length); record.words.forEach(w) }
  w(3); w(0)
  return new Uint8Array(output)
}
describe('local DSP record memory', () => {
  it('reads each memory space and crosses adjacent records', () => {
    const memory = parseDspMemory(synthetic([{ space: 0, address: 10, words: [0x123456, 2] }, { space: 0, address: 12, words: [3, 4] }, { space: 1, address: 10, words: [5] }, { space: 2, address: 10, words: [6] }]))
    expect(memory.prefixLength).toBe(12)
    expect(Array.from(readDspWords(memory, 0, 11, 3))).toEqual([2, 3, 4])
    expect(Array.from(readDspWords(memory, 1, 10, 1))).toEqual([5])
    expect(Array.from(readDspWords(memory, 2, 10, 1))).toEqual([6])
    expect(readDspWords(memory, 0, 10, 0)).toHaveLength(0)
  })
  it('writes only word data across headers and preflights failures before mutation', () => {
    const memory = parseDspMemory(synthetic([{ space: 0, address: 10, words: [1, 2] }, { space: 0, address: 12, words: [3, 4] }]))
    const prefix = memory.bytes.slice(0, 12), trailer = memory.bytes.slice(memory.trailerOffset)
    writeDspWords(memory, 0, 11, new Uint32Array([0xabcdef, 0x654321, 0]))
    expect(Array.from(readDspWords(memory, 0, 10, 4))).toEqual([1, 0xabcdef, 0x654321, 0])
    expect(parseDspMemory(memory.bytes).records).toEqual(memory.records)
    expect(memory.bytes.slice(0, 12)).toEqual(prefix); expect(memory.bytes.slice(memory.trailerOffset)).toEqual(trailer)
    const snapshot = memory.bytes.slice()
    expect(() => writeDspWords(memory, 0, 13, new Uint32Array([5, 6]))).toThrow('not loaded')
    expect(() => writeDspWords(memory, 0, 10, new Uint32Array([5, 0x1000000]))).toThrow('24 bits')
    expect(memory.bytes).toEqual(snapshot)
  })
  it('rejects invalid, overlapping and truncated records and missing memory', () => {
    expect(() => parseDspMemory(synthetic([{ space: 0, address: 10, words: [1, 2] }, { space: 0, address: 11, words: [3] }]))).toThrow('overlapping')
    expect(() => parseDspMemory(synthetic([{ space: 5, address: 10, words: [1] }], false))).toThrow('space')
    expect(() => parseDspMemory(synthetic([{ space: 0, address: 0xffffff, words: [1, 2] }]))).toThrow('range')
    expect(() => parseDspMemory(synthetic([{ space: 0, address: 0, words: [] }]))).toThrow('range')
    const bytes = synthetic([{ space: 0, address: 10, words: [1, 2] }])
    expect(() => parseDspMemory(bytes.subarray(0, 22))).toThrow('truncated')
    expect(() => parseDspMemory(bytes.subarray(0, bytes.length - 1))).toThrow('terminator')
    const memory = parseDspMemory(bytes)
    for (const [address, count] of [[-1, 1], [0.5, 1], [10, -1], [10, 0.5], [10, 0x20001]]) expect(() => readDspWords(memory, 0, address, count)).toThrow('range')
    expect(() => readDspWords(memory, 0, 9, 2)).toThrow('not loaded')
  })
})
