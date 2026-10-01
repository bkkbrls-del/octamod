import { describe, expect, it } from 'vitest'
import { checkSelection } from './compatibility'
import { selectionConflicts, selectionConflictError } from './selection-conflicts'

const seven = ['miniverb', 'tapeecho', 'euclid', 'repitch', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer']
describe('native selection conflicts', () => {
  it('shows Analog BD conflicts before pending verification and offers both explicit choices', () => {
    const ids = [...seven, 'analog-bassdrum']
    const result = checkSelection(ids)
    expect(result.checked).toBe(false)
    expect(result.conflicts[0].moduleIds).toEqual(['analog-bassdrum', 'miniverb', 'tapeecho', 'euclid'])
    expect(result.conflicts[0].fixes[0]).toEqual({label:'Remove Analog BD & Euclid',removeIds:['analog-bassdrum','euclid']})
    expect(result.conflicts[0].fixes[1].removeIds).toEqual(['miniverb', 'tapeecho', 'euclid'])
    expect(result.notes[0]).toContain('awaiting Octamod verification')
    const analogChoice = ids.filter(id => !result.conflicts[0].fixes[1].removeIds?.includes(id))
    expect(selectionConflicts(analogChoice)).toEqual([])
    expect(checkSelection(analogChoice).checked).toBe(false)
  })
  it('reports the measured seven-module menu limit without applying it to smaller unmeasured sets', () => {
    expect(selectionConflicts(seven)[0].id).toBe('seven-module-menu-space')
    expect(selectionConflictError(seven)).toContain('menu space')
    expect(selectionConflicts(seven.filter(id => id !== 'euclid'))).toEqual([])
    expect(selectionConflicts(seven.filter(id => id !== 'midi-scenes'))).toEqual([])
  })
  it('keeps original-effects conflicts actionable when the chooser option is available', () => {
    expect(selectionConflicts(['miniverb'], true)[0].fixes).toEqual([{ label: 'Turn off stock FX2', keepStockFx2: false }])
    expect(selectionConflicts(['repitch'], true)).toEqual([])
    expect(selectionConflicts(['analog-bassdrum'], true)[0].id).toBe('stock-fx2-space')
  })
  it('rejects unknown IDs and includes paused custom DSP modules in Analog BD conflicts', () => {
    expect(() => selectionConflicts(['unknown'])).toThrow()
    expect(selectionConflicts(['analog-bassdrum', 'character'])[0].moduleIds).toContain('character')
  })
})
