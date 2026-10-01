// Compare complete authored menu / ROM regions with native composition.
// Original firmware is read locally and never written or uploaded.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { decodeFirmware } from '../src/engine/elek.ts'
import { recoverStockDsp } from '../src/engine/stock-dsp.ts'
import { composeDynamicDsp } from '../src/engine/resident-dsp.ts'
import { createColdFireRuntime } from '../src/engine/coldfire-runtime.ts'
import { createPlatformOsWrites } from '../src/engine/platform-writes.ts'
import { composeModuleMenus } from '../src/engine/module-menus.ts'
import { applyGuardedOsWrites, OS_LOAD_ADDRESS } from '../src/engine/os-patches.ts'
const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/verify-module-menus-native.mjs <own-original-1.40C.bin>'); process.exit(2) }
const fixtures = JSON.parse(readFileSync(new URL('../src/engine/assets/menu-recipes.json', import.meta.url)))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const original = decodeFirmware(readFileSync(file)).mainOs, before = hash(original), cores = await recoverStockDsp(original)
for (const proof of fixtures.proofs) {
  const result = await composeModuleMenus(original, proof.moduleIds, proof.caveLimit)
  assert.equal(result.caveCursor, proof.caveCursor, 'menu cursor')
  assert.equal(result.overflowCursor, proof.overflowCursor, 'overflow cursor')
  assert.equal(result.regions.length + result.descriptors.length, proof.regions.length, 'complete region coverage')
  const dsp = await composeDynamicDsp(cores, proof.moduleIds), runtime = await createColdFireRuntime(cores, proof.moduleIds)
  const composed = await applyGuardedOsWrites(original, [...result.writes, ...dsp.writes, ...createPlatformOsWrites(runtime, proof.moduleIds)])
  for (const region of proof.regions) {
    const offset = region.address - OS_LOAD_ADDRESS
    assert.equal(hash(composed.subarray(offset, offset + region.bytes)), region.sha256, region.note)
  }
  assert.equal(hash(original), before)
  console.log(`${proof.moduleIds.join(', ') || 'Stock only'}: ${proof.regions.length} complete menu / ROM regions match native bytes; allocation, combined DSP / runtime write guards and original preservation pass.`)
}
const modified = original.slice(); modified[100] ^= 1
await assert.rejects(composeModuleMenus(modified, ['repitch']), /original OS fingerprint/)
await assert.rejects(composeModuleMenus(original, ['invented']), /Unknown module/)
await assert.rejects(composeModuleMenus(original, [], 0x400d8000), /pinned placement profile/)
console.log('Complete native menu / ROM comparisons and modified firmware, unknown module and invalid cave rejection passed. No firmware files written.')
