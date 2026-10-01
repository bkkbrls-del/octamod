// Loader-free composition kernel, byte-verified against the native module selection matrix.
import { composeAnalogBd, createAnalogBootstrap } from './analog-bd.ts'
import { defaultChoosers, composeChoosers } from './choosers.ts'
import { recoverStockDsp } from './stock-dsp.ts'
import { composeStaticDsp } from './static-dsp.ts'
import { createStaticColdFireRuntime } from './coldfire-runtime.ts'
import { createRuntimeBootstrap, BOOTSTRAP_ADDRESS } from './bootstrap.ts'
import { createPlatformOsWrites } from './platform-writes.ts'
import { applyGuardedOsWrites, OS_LOAD_ADDRESS } from './os-patches.ts'
export async function composeStaticOs(original: Uint8Array, ids: readonly string[], profile = defaultChoosers(ids)) {
  const cores = await recoverStockDsp(original), runtime = await createStaticColdFireRuntime(ids, original)
  const menus = await composeChoosers(original, ids, profile, runtime), dsp = await composeStaticDsp(cores, ids, menus.chooser)
  let patched = await applyGuardedOsWrites(original, [...menus.writes, ...dsp.writes, ...(runtime ? createPlatformOsWrites(runtime, ids, { loader: false }) : [])])
  if (!runtime) return { bytes: patched, chooser: menus.chooser, dsp: dsp.layouts, runtime: { bytes: 0, stage: 0, stageEnd: 0 }, caveCursor: menus.caveCursor, overflowCursor: menus.overflowCursor }
  const analog = ids.includes('analog-bassdrum') ? await composeAnalogBd(original, patched, ids, profile) : null
  if (analog) patched = analog.bytes
  const bootstrap = analog ? await createAnalogBootstrap(runtime.bytes, analog.uploads) : await createRuntimeBootstrap(runtime.bytes)
  if (OS_LOAD_ADDRESS + original.length !== BOOTSTRAP_ADDRESS) throw new Error('The runtime loader does not follow the original OS extent.')
  const bytes = new Uint8Array(patched.length + bootstrap.append.length); bytes.set(patched); bytes.set(bootstrap.append, patched.length)
  return { bytes, chooser: menus.chooser, dsp: dsp.layouts, runtime: { bytes: runtime.bytes.length, stage: bootstrap.layout.stage, stageEnd: bootstrap.layout.stageEnd }, caveCursor: menus.caveCursor, overflowCursor: menus.overflowCursor }
}
