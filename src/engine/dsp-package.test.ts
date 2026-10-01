import { describe, expect, it } from 'vitest'
import { readDspPackage, relocateDspPackage } from './dsp-package'
import catalog from './assets/dsp-packages.json'

async function digest(words: Uint32Array) {
  const bytes = new Uint8Array(words.length * 3)
  words.forEach((word, i) => { bytes[i * 3] = word >>> 16; bytes[i * 3 + 1] = word >>> 8; bytes[i * 3 + 2] = word })
  const hash = await crypto.subtle.digest('SHA-256', bytes.buffer)
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
}
describe('independently authored DSP package relocation', () => {
  for (const fixture of catalog.packages) it(`${fixture.id} matches native fresh assembly at four origins`, async () => {
    const pkg = await readDspPackage(fixture.id)
    for (const proof of fixture.proofs) {
      const placed = relocateDspPackage(pkg, proof.base)
      expect(await digest(placed.words)).toBe(proof.sha256)
      expect(placed.init).toBe(proof.base + pkg.init); expect(placed.proc).toBe(proof.base + pkg.proc)
    }
    expect(await digest(relocateDspPackage(pkg, 0).words)).toBe(pkg.sha256)
  })
  it('rejects malformed package structure, relocation and placement', async () => {
    const pkg = await readDspPackage('miniverb')
    for (const base of [-1, 0.5, NaN, Infinity, 0xffffff]) expect(() => relocateDspPackage(pkg, base)).toThrow('placement')
    expect(() => relocateDspPackage({ ...pkg, code: '00' }, 0)).toThrow('words')
    expect(() => relocateDspPackage({ ...pkg, init: pkg.words }, 0)).toThrow('entry')
    for (const relocations of [[-1], [0.5], [pkg.words], [0, 0]]) expect(() => relocateDspPackage({ ...pkg, relocations }, 0)).toThrow('relocation')
    const code = 'ffffff' + pkg.code.slice(6)
    expect(() => relocateDspPackage({ ...pkg, code, relocations: [0] }, 0)).toThrow('relocation')
    await expect(readDspPackage('character')).rejects.toThrow('different native placement')
    await expect(readDspPackage('unknown')).rejects.toThrow('different native placement')
  })
})
