import { describe, expect, it } from 'vitest'
import { emitLabelFormatter, emitModeFormatter, type ModeRenames } from './menu-formatters'
import recipes from './assets/menu-recipes.json'
async function hash(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
describe('authored control formatter native parity', () => {
  it('matches every current control and mode rename at two descriptor origins', async () => {
    for (const recipe of recipes.recipes) for (const proof of recipe.proofs) {
      const renames = recipe.renames as ModeRenames
      const bytes = Object.keys(renames).length ? emitModeFormatter(recipe.labels, proof.namesAddress, renames) : emitLabelFormatter(recipe.labels)
      expect(bytes.length, recipe.key + ' ' + recipe.name).toBe(proof.bytes)
      expect(await hash(bytes), recipe.key + ' ' + recipe.name).toBe(proof.sha256)
    }
  })
  it('restores every mode-dependent name so names cannot stick after a mode switch', () => {
    for (const recipe of recipes.recipes) {
      const renames = recipe.renames as ModeRenames
      if (!Object.keys(renames).length) continue
      const touched = [...new Set(Object.values(renames).flatMap(names => Object.keys(names)))].sort()
      for (let mode = 0; mode < recipe.labels.length; mode++) expect(Object.keys(renames[mode]).sort()).toEqual(touched)
    }
  })
  it('rejects unsafe sprintf labels, unterminated names and invalid table dimensions', () => {
    for (const labels of [[], Array(129).fill('X'), ['%s'], ['a\0b'], ['Café']]) expect(() => emitLabelFormatter(labels)).toThrow()
    expect(() => emitLabelFormatter(['X'.repeat(65535)])).toThrow('16-bit offsets')
    expect(() => emitModeFormatter(['A'], 0x400d6b36, { 1: { 0: 'A' } })).toThrow('invalid mode')
    expect(() => emitModeFormatter(['A'], 0x400d6b36, { 0: { 12: 'A' } })).toThrow('invalid parameter slot')
    expect(() => emitModeFormatter(['A'], 0x400d6b36, { 0: { 0: '123456' } })).toThrow('terminated six-byte field')
    expect(() => emitModeFormatter(['A'], 0x400d6b37, {})).toThrow('invalid address')
  })
})
