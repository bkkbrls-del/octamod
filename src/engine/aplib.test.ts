import { describe, expect, it } from 'vitest'
import { MAX_SECTION_SIZE, packSection, unpackSection } from './aplib'
import vectors from './aplib-vectors.json'
import largeVectors from './aplib-large-vectors.json'

function hex(value: string): Uint8Array {
  return Uint8Array.from(value.match(/../g) ?? [], byte => parseInt(byte, 16))
}
function section(stream: number[]) {
  const bytes = new Uint8Array(8 + stream.length), header = new DataView(bytes.buffer)
  header.setUint32(0, stream.length); header.setUint32(4, stream.reduce((sum, byte) => sum + byte, 0))
  bytes.set(stream, 8)
  return bytes
}
describe('native-compatible firmware section codec', () => {
  for (const vector of vectors) it(`matches the native C oracle: ${vector.name}`, () => {
    const input = hex(vector.input), packed = hex(vector.packed)
    expect(packSection(input)).toEqual(packed)
    expect(unpackSection(packed)).toEqual(input)
  })
  it('bounds expansion and rejects damaged lengths, checksums and references', () => {
    const valid = packSection(new Uint8Array(32).fill(42))
    expect(() => unpackSection(valid, 8)).toThrow('size limit')
    expect(() => unpackSection(valid, MAX_SECTION_SIZE + 1)).toThrow('size limit')
    expect(() => unpackSection(valid.subarray(0, 7))).toThrow('header')
    expect(() => unpackSection(valid.subarray(0, valid.length - 1))).toThrow('length')
    const corrupt = valid.slice(); corrupt[4] ^= 1
    expect(() => unpackSection(corrupt)).toThrow('checksum')
    expect(() => unpackSection(section([0x80]))).toThrow('truncated')
    expect(() => unpackSection(section([0x28]))).toThrow('outside')
    expect(() => unpackSection(section(Array(9).fill(0)))).toThrow('invalid length')
  })
  for (const vector of largeVectors) it(`matches the native C oracle: ${vector.name}`, async () => {
    let state = vector.seed ?? 0
    const input = Uint8Array.from({ length: vector.length }, () => {
      if (vector.pattern === 'repeat') return vector.value ?? 0
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state >>> 24
    })
    if (vector.pattern === 'far') input.set(input.slice(0, 200), 3800)
    const packed = packSection(input)
    const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(packed).buffer)
    const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    expect(sha256).toBe(vector.packedSha256)
    expect(unpackSection(packed)).toEqual(input)
  })
})
