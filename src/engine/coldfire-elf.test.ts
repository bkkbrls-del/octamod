import { describe, expect, it } from 'vitest'
import { parseColdFireObject, relocateColdFireObject } from './coldfire-elf'
import fixtures from './assets/coldfire-elf-oracles.json'
const fromHex = (hex: string) => new Uint8Array(hex.match(/../g)?.map(value => parseInt(value, 16)) ?? [])
const toHex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
function fixture() {
  const oracle = fixtures.cases[0], bytes = fromHex(oracle.object), object = parseColdFireObject(bytes)
  const placements = new Map(object.sections.filter(section => section.flags & 2).map(section => [section.index, { address: oracle.placements[section.name as keyof typeof oracle.placements] }]))
  return { oracle, bytes, object, placements, external: new Map(Object.entries(oracle.external)) }
}
describe('ColdFire ELF object relocation', () => {
  for (const oracle of fixtures.cases) it(`matches native linking at 0x${oracle.base.toString(16)}`, () => {
    const object = parseColdFireObject(fromHex(oracle.object))
    expect(new Set(object.relocations.map(relocation => relocation.type))).toEqual(new Set([1, 4, 5, 6]))
    const placements = new Map(object.sections.filter(section => section.flags & 2).map(section => [section.index, { address: oracle.placements[section.name as keyof typeof oracle.placements] }]))
    const result = relocateColdFireObject(object, placements, new Map(Object.entries(oracle.external)))
    expect(Object.fromEntries(result.exports)).toEqual(oracle.exports)
    for (const expected of oracle.sections) {
      const section = object.sections.find(section => section.name === expected.name)!
      expect(toHex(result.sections.find(output => output.index === section.index)!.data)).toBe(expected.bytes)
    }
    expect(result.sections.find(output => object.sections[output.index].name === '.bss')).toMatchObject({ size: 12, data: new Uint8Array() })
  })
  it('rejects malformed headers, tables, relocation types and truncated bytes', () => {
    const { bytes } = fixture()
    for (const length of [0, 51, 52, bytes.length - 1]) expect(() => parseColdFireObject(bytes.slice(0, length))).toThrow()
    for (const [offset, value] of [[0, 0], [4, 2], [5, 1], [19, 0], [47, 0], [50, 255]]) {
      const bad = bytes.slice(); bad[offset] = value
      expect(() => parseColdFireObject(bad)).toThrow()
    }
    const bad = bytes.slice(), view = new DataView(bad.buffer), table = view.getUint32(32), count = view.getUint16(48)
    const relocation = Array.from({ length: count }, (_, index) => table + index * 40).find(offset => view.getUint32(offset + 4) === 4)!
    const start = view.getUint32(relocation + 16)
    view.setUint8(start + 7, 7)
    expect(() => parseColdFireObject(bad)).toThrow('unsupported relocation type')
    view.setUint8(start + 7, 1); view.setUint32(start, 0xffffffff)
    expect(() => parseColdFireObject(bad)).toThrow('invalid relocation target')
  })
  it('rejects missing symbols, placement overflow, misalignment and relative overflow', () => {
    const { object, placements, external } = fixture()
    expect(() => relocateColdFireObject(object, placements, new Map())).toThrow('unresolved symbol')
    const bad = new Map(placements), text = object.sections.find(section => section.name === '.text')!
    bad.set(text.index, { address: 0xffffffff })
    expect(() => relocateColdFireObject(object, bad, external)).toThrow('placement')
    bad.set(text.index, { address: 0x1001 })
    expect(() => relocateColdFireObject(object, bad, external)).toThrow('placement')
    bad.delete(text.index)
    expect(() => relocateColdFireObject(object, bad, external)).toThrow('placement')
    expect(() => relocateColdFireObject(object, placements, new Map([...external, ['near', 0x100000]]))).toThrow('overflowing relocation')
  })
  it('requires explicit address mapping for mergeable sections and preserves input bytes', () => {
    const { object, placements, external } = fixture(), before = object.sections.map(section => section.data.slice())
    relocateColdFireObject(object, placements, external)
    object.sections.forEach((section, index) => expect(section.data).toEqual(before[index]))
    const rodata = object.sections.find(section => section.name === '.rodata')!
    rodata.flags |= 0x10
    expect(() => relocateColdFireObject(object, placements, external)).toThrow('explicit merged-section layout')
  })
})
