import { compiledModuleSource } from './module-build.ts'
import { moduleBuildError } from '../catalog/build-support.ts'
// Complete local OS composition. Packaging / the download flow are enabled
// separately only after full native output and rejection verification.
import { composeChoosers, type ChooserProfile } from './choosers.ts'
import { recoverStockDsp } from './stock-dsp.ts'
import { composeDynamicDsp } from './resident-dsp.ts'
import { composeStaticOs } from './static-compose.ts'
import { createColdFireRuntime } from './coldfire-runtime.ts'
import { createRuntimeBootstrap, BOOTSTRAP_ADDRESS } from './bootstrap.ts'
import { createPlatformOsWrites } from './platform-writes.ts'
import { applyGuardedOsWrites, OS_LOAD_ADDRESS } from './os-patches.ts'
import { DSP_LOADER } from './protocol.ts'
export async function composeOs(original: Uint8Array, ids: readonly string[], profile?: ChooserProfile, { loader = DSP_LOADER }: { loader?: boolean } = {}) {
  const pending = moduleBuildError(ids)
  if (pending) throw new Error(pending)
  compiledModuleSource()
  if (!loader) return composeStaticOs(original, ids, profile)
  if (ids.some(id => ['analog-bassdrum','midi-scenes','usb-audio-out-tracks-main-cue','quantizer'].includes(id))) throw new Error('These modules require the verified loader-free engine.')
  const menus = await composeChoosers(original, ids, profile), cores = await recoverStockDsp(original)
  const dsp = await composeDynamicDsp(cores, ids), runtime = await createColdFireRuntime(cores, ids)
  const bootstrap = await createRuntimeBootstrap(runtime.bytes)
  if (OS_LOAD_ADDRESS + original.length !== BOOTSTRAP_ADDRESS) throw new Error('The runtime loader does not follow the original OS extent.')
  const patched = await applyGuardedOsWrites(original, [...menus.writes, ...dsp.writes, ...createPlatformOsWrites(runtime, ids)])
  const bytes = new Uint8Array(patched.length + bootstrap.append.length); bytes.set(patched); bytes.set(bootstrap.append, patched.length)
  return { bytes, chooser: menus.chooser, dsp: dsp.layouts, runtime: { bytes: runtime.bytes.length, stage: bootstrap.layout.stage, stageEnd: bootstrap.layout.stageEnd }, caveCursor: menus.caveCursor, overflowCursor: menus.overflowCursor }
}
