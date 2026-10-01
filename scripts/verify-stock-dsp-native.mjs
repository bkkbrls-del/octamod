// Local fingerprint / native-oracle comparison. Writes no firmware files.
import { readFileSync } from 'node:fs'
import { decodeFirmware } from '../src/engine/elek.ts'
import { recoverStockDsp, dspWordsHash, relocateStockDsp } from '../src/engine/stock-dsp.ts'
const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/verify-stock-dsp-native.mjs <own-original-1.40C.bin>'); process.exit(2) }
const stock = readFileSync(file), { mainOs } = decodeFirmware(stock)
const metadata = JSON.parse(readFileSync(new URL('../src/engine/assets/stock-dsp-metadata.json', import.meta.url)))
const cores = await recoverStockDsp(mainOs)
let packages = 0, proofs = 0
for (const core of cores) {
  const expected = metadata.payloads.find(payload => payload.core === core.core)
  if (!expected || core.shared.length !== 3 || core.packages.length !== 13) throw new Error('The native stock inventory differs.')
  for (const pkg of core.packages) {
    const recipe = expected.packages.find(recipe => recipe.fxId === pkg.fxId)
    for (const proof of recipe.proofs) {
      if (await dspWordsHash(relocateStockDsp(pkg, proof.base).words) !== proof.sha256) throw new Error(`${core.tag} ${pkg.key}: relocation mismatch`)
      proofs++
    }
    packages++
  }
  console.log(`Payload ${core.tag}: ${core.memory.records.length} records, 13 stock packages, three shared copies; every source and result fingerprint matches the native tool.`)
}
const changed = mainOs.slice(); changed[0] ^= 1
try { await recoverStockDsp(changed); throw new Error('Modified OS was accepted') } catch (error) {
  if (!error.message.includes('original')) throw error
}
console.log(`${packages} packages, ${proofs} relocation comparisons passed; modified input rejected. No firmware files written.`)
