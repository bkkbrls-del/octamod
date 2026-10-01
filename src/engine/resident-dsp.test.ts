import { describe, expect, it } from 'vitest'
import { readResidentCharacter, composeDynamicDsp } from './resident-dsp'
import { relocateDspPackage } from './dsp-package'
import { dspWordsHash } from './stock-dsp'
import catalog from './assets/resident-dsp.json'
describe('native resident DSP packages', () => {
  it('matches Character native assembly at four origins after the shared-bus rewrite', async () => {
    const pkg = await readResidentCharacter()
    for (const proof of catalog.character.proofs) expect(await dspWordsHash(relocateDspPackage(pkg, proof.base).words)).toBe(proof.sha256)
  })
  it('bundles only placeholders for every copied stock stub', () => {
    for (const variant of catalog.variants) {
      expect(variant.code.slice(variant.stockCopy.destinationOffset * 6)).toBe('000000'.repeat(variant.stockCopy.words))
      expect(variant.tableAddress + variant.tableWords).toBe(variant.codeAddress)
      expect(variant.tableWords - 64).toBeGreaterThan(catalog.character.words)
    }
  })
  it('rejects unknown modules or missing cores before composition', async () => {
    await expect(composeDynamicDsp([], ['invented'])).rejects.toThrow('Unknown module')
    await expect(composeDynamicDsp([], [])).rejects.toThrow('both stock cores')
  })
})
