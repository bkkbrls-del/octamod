import { describe, expect, it } from 'vitest'
import { decodeContainer, decodeFirmware, encodeContainer, encodeFirmware } from './elek'
import type { DecodedFirmware } from './elek'
function synthetic(): DecodedFirmware {
  const header = new TextEncoder().encode('ELEK0001     0.00A')
  return { header, mainOs: new TextEncoder().encode('Synthetic test payload only. Synthetic test payload only.'), tail: new Uint8Array([0, 0, 91]), seed: 0x2f1349d2 }
}
describe('local firmware packaging', () => {
  it('preserves source header and opaque tail when replacing the OS section', () => {
    const stock = synthetic(), replacement = new Uint8Array([1, 2, 3, 4, 4, 4, 4, 4])
    const decoded = decodeContainer(encodeContainer(stock, replacement))
    expect(decoded.header).toEqual(stock.header); expect(decoded.tail).toEqual(stock.tail)
    expect(decoded.mainOs).toEqual(replacement)
  })
  it('stamps the full version field and verifies the complete update round-trip', () => {
    const stock = synthetic(), decoded = decodeFirmware(encodeFirmware(stock, stock.mainOs, 'OCTAMOD001'))
    expect(new TextDecoder().decode(decoded.header.subarray(8))).toBe('OCTAMOD001')
    expect(decoded.header.subarray(0, 8)).toEqual(stock.header.subarray(0, 8))
    expect(decoded.seed).toBe(stock.seed); expect(decoded.mainOs).toEqual(stock.mainOs); expect(decoded.tail).toEqual(stock.tail)
    const short = decodeContainer(encodeContainer(stock, stock.mainOs, 'TEST'))
    expect(new TextDecoder().decode(short.header.subarray(8))).toBe('TEST      ')
  })
  it('rejects truncated sections, absent OS data and invalid version fields', () => {
    const stock = synthetic(), encoded = encodeContainer(stock, stock.mainOs)
    expect(() => decodeContainer(encoded.subarray(0, 25))).toThrow('header')
    expect(() => decodeContainer(encoded.subarray(0, encoded.length - stock.tail.length - 1))).toThrow('truncated')
    expect(() => encodeContainer(stock, new Uint8Array())).toThrow('no operating-system')
    for (const version of ['', 'TOO MANY CHARACTERS', 'NUL\0', 'été']) expect(() => encodeContainer(stock, stock.mainOs, version)).toThrow('version')
    stock.header[0] = 0
    expect(() => encodeContainer(stock, stock.mainOs)).toThrow('header')
  })
})
