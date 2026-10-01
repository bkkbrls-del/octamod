// Loader-free composition against native static-stock output, for every module subset with and without
// the stock FX2 effects. Uses the user's own firmware in memory; nothing is written or uploaded.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { decodeFirmware } from '../src/engine/elek.ts'
import { composeOs } from '../src/engine/compose-os.ts'
import { defaultChoosers } from '../src/engine/choosers.ts'
import { CATALOG_SOURCE } from '../src/catalog/modules.ts'
const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/verify-static-composition-native.mjs <own-original-1.40C.bin>'); process.exit(2) }
const fixtures = JSON.parse(readFileSync(new URL('../src/engine/assets/static-composition-proofs.json', import.meta.url)))
if (fixtures.revision !== CATALOG_SOURCE.revision || fixtures.staticStock !== true) throw new Error('Static proofs do not match the pinned catalog.')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const original = decodeFirmware(readFileSync(file)).mainOs, before = hash(original)
if (before !== fixtures.sourceSha256) throw new Error('Use the same original OS 1.40C the proofs were made from.')
const failures = [], counts = { built: 0, refused: 0 }
for (const proof of fixtures.proofs) {
  const label = (proof.moduleIds.join('+') || 'stock') + (proof.keepStockFx2 ? ' (stock FX2 kept)' : ' (stock FX2 off)')
  const site = defaultChoosers(proof.moduleIds, proof.keepStockFx2)
  if (JSON.stringify(site) !== JSON.stringify({ fx1: proof.menu.fx1, fx2: proof.menu.fx2 })) { failures.push(label + ': the site would build different menus than the proof'); continue }
  let result, error
  try { result = await composeOs(original, proof.moduleIds, site, { loader: false }) } catch (caught) { error = caught instanceof Error ? caught.message : String(caught) }
  if (hash(original) !== before) throw new Error('The original OS changed during composition.')
  if (proof.error) {
    // Native wording is the oracle: the overrun line verbatim, the other refusals by their reason.
    const expected = proof.error.includes('overruns the region') ? proof.error : proof.error.includes('nowhere to place') ? proof.error.slice(0, proof.error.indexOf('. ') + 1) : 'does not fit'
    const matches = expected === 'does not fit' ? /does not fit|do not fit|exceeds its reserved region/.test(error ?? '') : !!error?.includes(expected)
    if (!matches) failures.push(label + ': native refuses (' + proof.error.slice(0, 90) + ') but the browser ' + (error ? 'said: ' + error.slice(0, 90) : 'built it'))
    else counts.refused++
    continue
  }
  if (error) { failures.push(label + ': native builds it but the browser refused: ' + error.slice(0, 120)); continue }
  const { bytes } = result
  if (bytes.length !== proof.bytes || hash(bytes) !== proof.sha256) {
    const os = hash(bytes.subarray(0, original.length)) === proof.osSha256, append = hash(bytes.subarray(original.length)) === proof.appendSha256
    failures.push(label + ': ' + bytes.length + ' bytes vs native ' + proof.bytes + (os ? '' : '; patched OS differs') + (append ? '' : '; appended runtime differs'))
  } else counts.built++
}
console.log(counts.built + ' builds byte-identical to native, ' + counts.refused + ' refusals matching native, ' + failures.length + ' mismatches (' + fixtures.proofs.length + ' proofs).')
for (const failure of failures.slice(0, 40)) console.log('  ' + failure)
if (failures.length) process.exit(1)
console.log('No firmware written; the original OS was unchanged throughout.')
