import { describe, expect, it } from 'vitest'
import { serializeRuntimeCatalog } from './runtime-catalog'
import type { CatalogOptions, RuntimePackage } from './runtime-catalog'
import fixtures from './assets/runtime-catalog-oracles.json'
async function hash(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
const options: CatalogOptions = { base: 0x1000, slots: Array(32).fill(3), reads: Array(32).fill(0), qualifiedMask: 0xffffffff, stubAtBoot: 0, pmap16: false }
function pkg(): RuntimePackage { return { core: 0, fxId: 6, words: new Uint32Array([1, 2, 3]), relocations: [0], init: 0, proc: 1 } }
describe('native runtime catalog serialization', () => {
  for (const fixture of fixtures.cases) it(`matches native assembly: ${fixture.name}`, async () => {
    const packages = fixture.packages.map(pkg => ({ ...pkg, words: new Uint32Array(pkg.words) }))
    const result = serializeRuntimeCatalog(packages, fixture)
    expect(result.bytes.length).toBe(fixture.expected.bytes)
    expect(await hash(result.bytes)).toBe(fixture.expected.sha256)
    expect(result.symbols).toEqual(fixture.expected.symbols)
  })
  it('rejects invalid addressing, flag arrays, duplicate entries and package fields', () => {
    for (const base of [-1, 0.5, 1, NaN, 0xffffffff, 0xfffffffc]) expect(() => serializeRuntimeCatalog([], { ...options, base })).toThrow()
    expect(() => serializeRuntimeCatalog([], { ...options, qualifiedMask: -1 })).toThrow('flags')
    expect(() => serializeRuntimeCatalog([], { ...options, stubAtBoot: 0x100000000 })).toThrow('flags')
    expect(() => serializeRuntimeCatalog([], { ...options, slots: [3] })).toThrow('32 valid')
    expect(() => serializeRuntimeCatalog([], { ...options, reads: Array(32).fill(2) })).toThrow('32 valid')
    expect(() => serializeRuntimeCatalog([pkg(), pkg()], options)).toThrow('duplicate')
    for (const bad of [{ ...pkg(), core: 2 }, { ...pkg(), fxId: 32 }]) expect(() => serializeRuntimeCatalog([bad], options)).toThrow('entry')
    for (const bad of [{ ...pkg(), init: 3 }, { ...pkg(), words: new Uint32Array([0x1000000, 0, 0]) }]) expect(() => serializeRuntimeCatalog([bad], options)).toThrow('words')
    for (const relocations of [[0, 0x8000], [1, 0], [3], [0.5], [-1], [0x10000]]) expect(() => serializeRuntimeCatalog([{ ...pkg(), relocations }], options)).toThrow('relocation')
  })
})
