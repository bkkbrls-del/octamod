// Link the catalog from the user's own firmware in process memory. Retain only
// the pinned native fingerprints; no firmware or runtime files are written.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { decodeFirmware } from '../src/engine/elek.ts'
import { recoverStockDsp } from '../src/engine/stock-dsp.ts'
import { createColdFireRuntime, PLATFORM_RUNTIME_BASE } from '../src/engine/coldfire-runtime.ts'
import { applyPlatformOsWrites, createPlatformOsWrites } from '../src/engine/platform-writes.ts'
import { createRuntimeBootstrap } from '../src/engine/bootstrap.ts'
import { CATALOG_SOURCE } from '../src/catalog/modules.ts'
const file=process.argv[2]
if(!file){console.error('Usage: node scripts/verify-coldfire-runtime-native.mjs <own-original-1.40C.bin>');process.exit(2)}
const proof=JSON.parse(readFileSync(new URL('../src/engine/assets/coldfire-runtime-proofs.json',import.meta.url)))
assert.equal(proof.revision,CATALOG_SOURCE.revision);assert.equal(proof.base,PLATFORM_RUNTIME_BASE)
const original=decodeFirmware(readFileSync(file)).mainOs
const cores=await recoverStockDsp(original)
const writesProof=JSON.parse(readFileSync(new URL('../src/engine/assets/platform-writes.json',import.meta.url)))
assert.equal(writesProof.revision,CATALOG_SOURCE.revision)
for(const fixture of proof.cases){
 const runtime=await createColdFireRuntime(cores,fixture.moduleIds)
 assert.deepEqual(runtime.units,fixture.units)
 assert.equal(runtime.bytes.length,fixture.bytes)
 assert.equal(createHash('sha256').update(runtime.bytes).digest('hex'),fixture.sha256)
 assert.deepEqual(Object.fromEntries(runtime.symbols),fixture.symbols)
 assert.deepEqual(runtime.sections.filter(section=>section.size),fixture.sections)
 assert.deepEqual(runtime.pendingResidentDsp,fixture.moduleIds.includes('character')?['character']:[])
 assert.deepEqual(runtime.pendingRomUnits,fixture.moduleIds.includes('repitch')?['repitch']:[])
 const bootstrap=await createRuntimeBootstrap(runtime.bytes)
 assert.equal(bootstrap.append.length,fixture.bootstrap.bytes)
 assert.equal(createHash('sha256').update(bootstrap.append).digest('hex'),fixture.bootstrap.sha256)
 assert.equal(bootstrap.layout.stage,fixture.bootstrap.stage)
 assert.equal(bootstrap.layout.stageEnd,fixture.bootstrap.stageEnd)
 assert.equal(bootstrap.rawHash,fixture.bootstrap.rawHash)
 assert.equal(bootstrap.packedHash,fixture.bootstrap.packedHash)
 const writeFixture=writesProof.cases.find(entry=>JSON.stringify(entry.moduleIds)===JSON.stringify(fixture.moduleIds))
 assert.ok(writeFixture)
 const plan=createPlatformOsWrites(runtime,fixture.moduleIds), patched=await applyPlatformOsWrites(original,runtime,fixture.moduleIds)
 assert.equal(plan.length,writeFixture.writes)
 assert.equal(patched.length,writeFixture.bytes)
 assert.equal(createHash('sha256').update(patched).digest('hex'),writeFixture.sha256)
 console.log(`${fixture.moduleIds.join(', ')||'Stock only'}: runtime bytes, symbols, sections, packing, boot-loader append and guarded platform OS writes match native output.`)
}
const modified=original.slice();modified[10]^=1
const last=await createColdFireRuntime(cores,[])
await assert.rejects(applyPlatformOsWrites(modified,last,[]),/original OS fingerprint/)
console.log(`${proof.cases.length} runtime / bootstrap / platform-write comparisons and modified-input rejection passed; no firmware files written.`)
