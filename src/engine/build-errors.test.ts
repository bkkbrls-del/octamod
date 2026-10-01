import { describe, expect, it } from 'vitest'
import { explainBuildFailure } from './build-errors'
describe('build refusal wording', () => {
  it('explains the stock FX2 trade for modules that need DSP space', () => {
    expect(explainBuildFailure('payload A: nothing is harvested, so there is nowhere to place EUCLID.', true)).toContain('Turn off Keep stock FX2')
  })
  it('asks to remove a module when the DSP space is too small', () => {
    for (const detail of ['payload A: MODULATION overruns the region (3955 > 2724 words)', 'payload A: EUCLID does not fit any harvested run'])
      expect(explainBuildFailure(detail, false)).toBe('These modules do not fit together in the available effect memory. Remove one of them, then check again.')
  })
  it('does not offer the stock FX2 switch when it is already off', () => {
    expect(explainBuildFailure('wide dial hook (116 B) does not fit', false)).not.toContain('Keep stock FX2')
    expect(explainBuildFailure('A module menu cave exceeds its reserved region.', true)).toContain('Turn off Keep stock FX2')
  })
  it('passes other failures through unchanged', () => expect(explainBuildFailure('The selected firmware changed. Build again.')).toBe('The selected firmware changed. Build again.'))
})
