import { resolveSelection } from './modules.ts'

export type ConflictFix = { label: string; removeIds?: string[]; keepStockFx2?: boolean }
export type SelectionConflict = { id: string; title: string; description: string; moduleIds: string[]; fixes: ConflictFix[] }
// Native build_bus.py admits Analog BD with stock DSP effects only. These
// are the custom DSP sections in the pinned catalog, including paused ones.
const customDspIds = ['spectrum', 'modulation', 'character', 'miniverb', 'tapeecho', 'euclid']
const crowdedMenuIds = ['miniverb', 'tapeecho', 'euclid', 'repitch', 'midi-scenes', 'usb-audio-out-tracks-main-cue', 'quantizer']

export function selectionConflicts(ids: readonly string[], keepStockFx2 = false): SelectionConflict[] {
  const modules = resolveSelection(ids), selected = new Set(modules.map(module => module.id))
  const dsp = modules.filter(module => customDspIds.includes(module.id))
  const conflicts: SelectionConflict[] = []
  const keepEffectsRemoves = ['analog-bassdrum', ...(crowdedMenuIds.every(id => selected.has(id)) ? ['euclid'] : [])]
  if (selected.has('analog-bassdrum') && dsp.length) conflicts.push({
    id: 'analog-bd-custom-dsp', title: 'Choose Analog BD or custom effects',
    description: 'Analog BD currently works with the original effects. It cannot run alongside ' + dsp.map(module => module.name).join(', ') + '.' + (keepEffectsRemoves.length > 1 ? ' The other seven also exceed menu space; removing Analog BD and Euclid keeps six modules.' : ''),
    moduleIds: ['analog-bassdrum', ...dsp.map(module => module.id)],
    fixes: [{ label: keepEffectsRemoves.length > 1 ? 'Remove Analog BD & Euclid' : 'Remove Analog BD', removeIds: keepEffectsRemoves }, { label: 'Keep Analog BD · remove custom effects', removeIds: dsp.map(module => module.id) }],
  })
  if (keepStockFx2 && (dsp.length || selected.has('analog-bassdrum'))) conflicts.push({
    id: 'stock-fx2-space', title: 'Make room for your modules',
    description: 'These modules need space used by the original FX2 effects. Turn off “Keep stock FX2 effects” to continue. Original FX1 effects stay available.',
    moduleIds: [...dsp.map(module => module.id), ...(selected.has('analog-bassdrum') ? ['analog-bassdrum'] : [])],
    fixes: [{ label: 'Turn off stock FX2', keepStockFx2: false }],
  })
  // Exact owner-requested native profile, 1 Oct 2026: seven modules, stock
  // FX1 + Euclid, stock FX2 removed. Menu formatters exceed the available
  // space. Do not generalize this result to smaller, unmeasured subsets.
  if (!keepStockFx2 && !selected.has('analog-bassdrum') && crowdedMenuIds.every(id => selected.has(id))) conflicts.push({
    id: 'seven-module-menu-space', title: 'This selection needs more menu space',
    description: 'These seven modules do not fit together in the Octatrack’s effect menus. Removing Euclid leaves the six-module combination that passed a local native build.',
    moduleIds: crowdedMenuIds,
    fixes: [{ label: 'Remove Euclid', removeIds: ['euclid'] }],
  })
  return conflicts
}
export function selectionConflictError(ids: readonly string[], keepStockFx2 = false) {
  return selectionConflicts(ids, keepStockFx2).map(conflict => conflict.title + '. ' + conflict.description).join(' ')
}
