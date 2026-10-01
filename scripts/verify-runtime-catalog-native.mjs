// Local native-oracle comparison. Catalog bytes contain local stock data and
// remain in process memory; only pre-existing fingerprints are compared.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { decodeFirmware } from '../src/engine/elek.ts'
import { recoverStockDsp } from '../src/engine/stock-dsp.ts'
import { createDynamicRuntimeCatalog } from '../src/engine/runtime-catalog.ts'
const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/verify-runtime-catalog-native.mjs <own-original-1.40C.bin>'); process.exit(2) }
const proofs = JSON.parse(readFileSync(new URL('../src/engine/assets/runtime-catalog-proofs.json', import.meta.url)))
const cores = await recoverStockDsp(decodeFirmware(readFileSync(file)).mainOs)
for (const fixture of proofs.cases) {
  const catalog = await createDynamicRuntimeCatalog(cores, fixture.moduleIds, fixture.base)
  assert.equal(catalog.bytes.length, fixture.bytes)
  assert.equal(createHash('sha256').update(catalog.bytes).digest('hex'), fixture.sha256)
  assert.deepEqual(catalog.symbols, fixture.symbols)
  assert.deepEqual(catalog.needsNativePlacement, ['character', 'tapeecho', 'euclid', 'repitch'].filter(id => fixture.moduleIds.includes(id)))
  console.log(`${fixture.moduleIds.join(', ') || 'Stock only'}: catalog bytes and every symbol address match native output.`)
}
console.log(`${proofs.cases.length} native catalog comparisons passed. No stock or generated firmware files written.`)
