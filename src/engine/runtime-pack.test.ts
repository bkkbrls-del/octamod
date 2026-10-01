import { describe, expect, it } from 'vitest'
import { packGka3, packRuntimeStream, unpackGka3 } from './runtime-pack'
import fixtures from './assets/runtime-packing-oracles.json'
const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g)!, byte => parseInt(byte, 16))
async function hash(bytes: Uint8Array) { const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer); return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') }
describe('native runtime packer parity', () => {
  for (const fixture of fixtures.cases) it(`matches native greedy packing: ${fixture.name}`, async () => {
    const data = fromHex(fixture.inputHex), stream = packRuntimeStream(data, fixture.maxCandidates)
    expect(stream.length).toBe(fixture.expected.bytes)
    expect(await hash(stream)).toBe(fixture.expected.sha256)
    if (fixture.maxCandidates === 4096) expect(unpackGka3(packGka3(data))).toEqual(data)
  })
  it('rejects invalid limits and corrupt, truncated, mismatched or trailing runtime data', () => {
    const data = fromHex(fixtures.cases[2].inputHex)
    expect(() => packRuntimeStream(new Uint8Array())).toThrow('invalid size')
    for (const limit of [0, 4097, 1.5, NaN]) expect(() => packRuntimeStream(data, limit)).toThrow('candidate limit')
    const packed = packGka3(data)
    const magic = packed.slice(); magic[0] ^= 1; expect(() => unpackGka3(magic)).toThrow('header')
    const size = packed.slice(); new DataView(size.buffer).setUint32(4, data.length + 1); expect(() => unpackGka3(size)).toThrow('does not match')
    new DataView(size.buffer).setUint32(4, data.length - 1); expect(() => unpackGka3(size)).toThrow('size limit')
    new DataView(size.buffer).setUint32(4, 0xffffffff); expect(() => unpackGka3(size)).toThrow('header')
    expect(() => unpackGka3(packed.subarray(0, packed.length - 1))).toThrow('truncated')
    const trailing = new Uint8Array(packed.length + 1); trailing.set(packed); expect(() => unpackGka3(trailing)).toThrow('end marker')
  })
})
