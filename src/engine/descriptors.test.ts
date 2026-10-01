import { describe, expect, it } from 'vitest'
import { composeDescriptors } from './descriptors'
import recipes from './assets/descriptor-recipes.json'
describe('local descriptor composition', () => {
  it('requires the original OS and rejects unknown modules', async () => {
    await expect(composeDescriptors(new Uint8Array(16), [])).rejects.toThrow('original OS fingerprint')
    await expect(composeDescriptors(new Uint8Array(16), ['invented'])).rejects.toThrow('Unknown module')
  })
  it('contains terminated authored labels and bounded numeric fields only', () => {
    for (const recipe of recipes.recipes) {
      expect(recipe).not.toHaveProperty('donorBytes')
      for (const field of recipe.strings) {
        expect(field.value.length).toBeLessThan(field.width)
        expect(field.offset + field.width).toBeLessThanOrEqual(recipes.descriptorBytes)
      }
      for (const field of recipe.integers) {
        expect(field.offset + field.width).toBeLessThanOrEqual(recipes.descriptorBytes)
        expect(field.value).toBeGreaterThanOrEqual(0)
        expect(field.value).toBeLessThan(2 ** (field.width * 8))
      }
    }
  })
})
