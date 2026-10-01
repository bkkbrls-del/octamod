import { describe, expect, it } from 'vitest'
import { composeOs } from './compose-os'
import proofs from './assets/composition-proofs.json'
import { CATALOG_SOURCE } from '../catalog/modules'
describe('complete local OS composer', () => {
  it('rejects changed firmware before creating a runtime or output', async () => {
    await expect(composeOs(new Uint8Array(64), ['repitch'])).rejects.toThrow('original OS fingerprint')
  })
  it('pins complete native identities without keeping image bytes', () => {
    expect(proofs.revision).toBe(CATALOG_SOURCE.revision)
    for (const proof of proofs.proofs.filter(proof => !proof.error)) {
      expect(proof.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.osSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.appendSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.bytes).toBeGreaterThan(1112560)
      expect(proof.firmware?.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.firmware?.containerSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.firmware?.version).toBe('OCTAMOD79')
      expect(proof).not.toHaveProperty('code')
      expect(proof).not.toHaveProperty('image')
    }
  })
})
