import { resolveSelection } from '../catalog/modules.ts'
import { readColdFirePackage, PLATFORM_UNITS } from './coldfire-package.ts'
import { linkColdFireRuntime, runtimeCatalogObject } from './coldfire-link.ts'
import { createDynamicRuntimeCatalog } from './runtime-catalog.ts'
import type { StockDspCore } from './stock-dsp.ts'
// Native arena.BASE. All accepted selections reserve the platform at its bottom.
export const PLATFORM_RUNTIME_BASE = 0x40a955e0
/** Loader-free runtime: only the selected modules' ColdFire units, or none at all (native static stock). */
export async function createStaticColdFireRuntime(ids: readonly string[]) {
  const units = []
  for (const module of resolveSelection(ids)) if (module.id === 'tapeecho' || module.id === 'euclid') units.push(await readColdFirePackage(module.id))
  if (!units.length) return null
  return { ...linkColdFireRuntime(units, PLATFORM_RUNTIME_BASE), units: units.map(unit => unit.label) }
}
export async function createColdFireRuntime(cores: readonly StockDspCore[], ids: readonly string[]) {
  const selection = resolveSelection(ids), catalog = await createDynamicRuntimeCatalog(cores, ids, 0)
  const units = []
  // with_platform appends the loader after the remix's declared modules.
  for (const module of selection) if (module.id === 'tapeecho' || module.id === 'euclid') units.push(await readColdFirePackage(module.id))
  for (const label of PLATFORM_UNITS) units.push(await readColdFirePackage(label))
  units.push({ label: 'dlcatalog', object: runtimeCatalogObject(catalog, units[0].object.flags) })
  const link = linkColdFireRuntime(units, PLATFORM_RUNTIME_BASE)
  const catalogBase = link.symbols.get('dl_stub_at_boot')!
  return { ...link, catalogBase, units: units.map(unit => unit.label), pendingResidentDsp: selection.filter(module => module.id === 'character').map(module => module.id), pendingRomUnits: selection.filter(module => module.id === 'repitch').map(module => module.id) }
}
