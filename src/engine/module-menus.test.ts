import { describe, expect, it } from 'vitest'
import { composeModuleMenus } from './module-menus'
import recipes from './assets/menu-recipes.json'
import rom from './assets/rom-packages.json'
import { CATALOG_SOURCE } from '../catalog/modules'
describe('local module menu composition guards', () => {
  it('rejects an unknown selection and modified firmware before creating patches', async () => {
    await expect(composeModuleMenus(new Uint8Array(20), ['invented'])).rejects.toThrow('Unknown module')
    await expect(composeModuleMenus(new Uint8Array(20), ['repitch'])).rejects.toThrow('original OS fingerprint')
  })
  it('pins authored objects and keeps stock-site expectations as fingerprints only', () => {
    expect(recipes.revision).toBe(CATALOG_SOURCE.revision)
    expect(rom.revision).toBe(CATALOG_SOURCE.revision)
    for (const patch of recipes.repitchPatches) {
      expect(patch.guardSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(patch).not.toHaveProperty('expect')
      expect(patch).not.toHaveProperty('stockBytes')
    }
    expect(recipes.proofs.some(proof => proof.overflowCursor > 0x400d24d0)).toBe(true)
    expect(recipes.proofs.some(proof => proof.regions.some(region => region.note === 'SHPE formatter' && region.bytes > 0))).toBe(true)
  })
})
