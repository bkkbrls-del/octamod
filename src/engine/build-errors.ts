// Visitor-facing wording for composition refusals. Native wording is matched, never shown.
export function explainBuildFailure(detail: string, keepStockFx2?: boolean): string {
  // Stock FX2 kept and a module needs DSP room: nothing is free to take.
  if (/nowhere to place/.test(detail)) return 'These modules need space used by the stock FX2 effects. Turn off Keep stock FX2 effects, then check again.'
  // Modules together are larger than the DSP space left by the effects given up.
  if (/overruns the region|does not fit any harvested run/.test(detail)) return 'These modules do not fit together in the available effect memory. Remove one of them, then check again.'
  if (/does not fit|do not fit|exceeds its reserved region|need more space/.test(detail)) return keepStockFx2 === false
    ? 'These modules do not fit together. Remove one of them, then check again.'
    : 'These modules and stock FX2 effects do not fit together. Turn off Keep stock FX2 effects or remove a module, then check again.'
  return detail
}
