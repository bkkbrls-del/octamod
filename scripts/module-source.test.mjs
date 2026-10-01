import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compiledModuleVersions, moduleSourcePaths } from './module-source.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const catalog = JSON.parse(await readFile(resolve(root, 'sdk/catalog.json'), 'utf8'))
const pending = ['analog-bassdrum', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer']
describe('release package scope and pending source inventory', () => {
  it('compiles the verified seven while retaining every pending import in the source inventory', async () => {
    const versions = await compiledModuleVersions(root, catalog), paths = await moduleSourcePaths(root)
    expect(Object.keys(versions)).toEqual(['spectrum', 'modulation', 'character', 'miniverb', 'tapeecho', 'euclid', 'repitch'])
    expect(versions.miniverb).toBe('0.1.1-experimental')
    for (const id of pending) {
      expect(versions).not.toHaveProperty(id)
      expect(paths).toContain('modules/' + id + '/manifest.py')
    }
    expect(paths).toContain('platform/usb-midi/manifest.py')
  })
  it('refuses stale and duplicate catalog pins even for pending imports', async () => {
    const temporary = await mkdtemp(resolve(tmpdir(), 'octamod-scope-test.'))
    try {
      const id = pending[0], folder = resolve(temporary, 'sdk/octabam/modules', id)
      await mkdir(folder, { recursive: true })
      await writeFile(resolve(folder, 'octamod.module.json'), await readFile(resolve(root, 'sdk/octabam/modules', id, 'octamod.module.json')))
      const entry = catalog.modules.find(module => module.id === id)
      await expect(compiledModuleVersions(temporary, { modules: [{ ...entry, version: '0.1.1-experimental' }] })).rejects.toThrow('Stale catalog module version')
      await expect(compiledModuleVersions(temporary, { modules: [entry, entry] })).rejects.toThrow('Invalid catalog module id')
    } finally { await rm(temporary, { recursive: true, force: true }) }
  })
})
