import { describe, expect, it } from 'vitest'
import { MODULE_DOCUMENTS_BY_ID } from './documents'
import { moduleBuildError, moduleBuildPending } from './build-support'
import { checkSelection } from './compatibility'
import { getModuleSource, resolveSelection } from './modules'
import { createSelection, parseSelection } from '../config/selection'
import { composeOs } from '../engine/compose-os'
import { validateCompiledPackage } from '../engine/module-build'

const imported = ['analog-bassdrum', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer']
describe('reviewed imports with verified loader-free composition', () => {
  it('unlocks verified versions while rejecting changed base firmware', async () => {
    for (const id of imported) {
      expect(moduleBuildPending(id)).toBe(false)
      expect(checkSelection(['repitch',id])).toMatchObject({checked:true})
      expect(moduleBuildError([id])).toBe('')
      expect(()=>validateCompiledPackage(id,'0.1.1-experimental')).not.toThrow()
      const original = new Uint8Array(64)
      await expect(composeOs(original,['repitch',id])).rejects.toThrow('unmodified')
      expect(original.every(byte=>byte===0)).toBe(true)
    }
    expect(moduleBuildError(['repitch'])).toBe('')
    expect(()=>moduleBuildError(['unknown'])).toThrow('Unknown module')
  })
  it('saves exact imported module versions without claiming firmware validation', () => {
    const selection={...createSelection(imported,null),name:'New modules'}
    expect(selection.validation).toBe('pending')
    expect(parseSelection(JSON.stringify(selection)).moduleIds).toEqual(imported)
    for(const module of selection.modules)expect(module.version).toBe('0.1.1-experimental')
  })
  it('links each import to its pinned upstream source and retains historical qualification limits', () => {
    for(const module of resolveSelection(imported)) {
      expect(getModuleSource(module)).toBe('https://github.com/sambanks/octabam/tree/363861e31ee963c478fab2b190a0fabe1d7ce37b/modules/'+module.id)
      expect(MODULE_DOCUMENTS_BY_ID[module.id].tests.hardwareStatus).toBe('historical')
    }
    expect(MODULE_DOCUMENTS_BY_ID['usb-audio-out-tracks-main-cue'].compatibility.limitations.join(' ')).toContain('output only')
    expect(MODULE_DOCUMENTS_BY_ID['analog-bassdrum'].compatibility.conflicts).toContain('synth')
  })
})
