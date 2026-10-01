// Recover from the user's own original firmware, compare complete payloads in
// memory, and retain no firmware or generated files. No emulator gates run.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { decodeFirmware } from '../src/engine/elek.ts'
import { recoverStockDsp } from '../src/engine/stock-dsp.ts'
import { composeDynamicDsp } from '../src/engine/resident-dsp.ts'
import { composeDescriptors } from '../src/engine/descriptors.ts'
import { applyGuardedOsWrites } from '../src/engine/os-patches.ts'
import { CATALOG_SOURCE } from '../src/catalog/modules.ts'
const file=process.argv[2]
if(!file){console.error('Usage: node scripts/verify-resident-dsp-native.mjs <own-original-1.40C.bin>');process.exit(2)}
const fixture=JSON.parse(readFileSync(new URL('../src/engine/assets/resident-dsp.json',import.meta.url)))
assert.equal(fixture.revision,CATALOG_SOURCE.revision)
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const original=decodeFirmware(readFileSync(file)).mainOs, cores=await recoverStockDsp(original)
const before=cores.map(core=>hash(core.memory.bytes))
for(const proof of fixture.proofs){
 const result=await composeDynamicDsp(cores,proof.moduleIds)
 const descriptors=await composeDescriptors(original,proof.moduleIds)
 assert.equal(descriptors.descriptors.length,proof.baselineDescriptors.length)
 for(let i=0;i<descriptors.descriptors.length;i++){
  assert.equal(descriptors.descriptors[i].id,proof.baselineDescriptors[i].id)
  assert.equal(descriptors.descriptors[i].address,proof.baselineDescriptors[i].address)
  assert.equal(hash(descriptors.descriptors[i].bytes),proof.baselineDescriptors[i].sha256)
 }
 await applyGuardedOsWrites(original,[...result.writes,...descriptors.writes])
 for(let i=0;i<2;i++){
  const payload=result.writes[i], expected=proof.payloads[i]
  assert.equal(payload.bytes.length,expected.bytes);assert.equal(hash(payload.bytes),expected.sha256)
  assert.equal(result.layouts[i].tag,expected.tag)
 }
 assert.deepEqual(cores.map(core=>hash(core.memory.bytes)),before)
 console.log(`${proof.moduleIds.join(', ')||'Stock only'}: complete DSP payloads and baseline descriptors match native output; merged OS guards pass and original bytes are preserved.`)
}
const changedShared=await recoverStockDsp(original);changedShared[0].shared[0].words[0]^=1
await assert.rejects(composeDynamicDsp(changedShared,[]),/shared DSP routine fingerprint/)
const modified=await recoverStockDsp(original);modified[0].memory.bytes[20]^=1
await assert.rejects(composeDynamicDsp(modified,[]),/verified original payload/)
await assert.rejects(composeDynamicDsp([cores[0],cores[0]],[]),/both stock cores/)
console.log(`${fixture.proofs.length} complete two-core DSP / baseline descriptor comparisons and modified payload / shared-routine / duplicated-core rejection passed; no firmware files written.`)
