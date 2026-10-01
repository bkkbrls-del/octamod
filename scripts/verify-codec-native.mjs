// Development-only codec comparison. Does not run octabam gates or retain firmware.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { packSection, unpackSection } from '../src/engine/aplib.ts'
import { decodeFirmware } from '../src/engine/elek.ts'
import { decodeElup } from '../src/engine/elup.ts'
import { BASE_FIRMWARE } from '../src/engine/base.ts'

const [nativeWorktree, stockPath] = process.argv.slice(2)
if (!nativeWorktree) {
  console.error('Usage: node scripts/verify-codec-native.mjs <octamad-worktree> [own-original-1.40C.bin]')
  process.exit(2)
}
const source = resolve(nativeWorktree, 'vendor/elektron-firmware-tool')
const scratch = mkdtempSync(join(tmpdir(), 'octamod-codec-'))
const driver = join(scratch, 'oracle.c'), executable = join(scratch, 'oracle')
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { maxBuffer: 32 * 1024 * 1024, ...options })
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message ?? result.stderr?.toString()}`)
  return result.stdout
}
function identical(left, right, label) {
  if (!Buffer.from(left).equals(Buffer.from(right))) throw new Error(`${label} differs from the native oracle.`)
}
try {
  writeFileSync(driver, `
#include "format.h"
#include <stdlib.h>
#include <stdio.h>
int main(int argc,char **argv) {
  if(argc!=2) return 2;
  size_t cap=16*1024*1024;
  uint8_t *in=malloc(cap),*out=malloc(cap*2);
  if(!in||!out) return 3;
  size_t n=fread(in,1,cap,stdin);
  size_t result=argv[1][0]=='p'?ap_pack(in,n,out,cap*2):ap_depack(in,n,out,cap*2,0);
  if(result==(size_t)-1) return 4;
  return fwrite(out,1,result,stdout)==result?0:5;
}
`)
  run(process.env.CC || 'cc', ['-O2', '-I', source, driver, ...['compress.c', 'decompress.c', 'integrity.c'].map(file => join(source, file)), '-o', executable])
  const compact = JSON.parse(readFileSync(new URL('../src/engine/aplib-vectors.json', import.meta.url)))
  const large = JSON.parse(readFileSync(new URL('../src/engine/aplib-large-vectors.json', import.meta.url)))
  const cases = compact.map(vector => ({ name: vector.name, data: Buffer.from(vector.input, 'hex'), expected: Buffer.from(vector.packed, 'hex') }))
  for (const vector of large) {
    let state = vector.seed ?? 0
    const data = Uint8Array.from({ length: vector.length }, () => {
      if (vector.pattern === 'repeat') return vector.value
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state >>> 24
    })
    if (vector.pattern === 'far') data.set(data.slice(0, 200), 3800)
    cases.push({ name: vector.name, data, expectedHash: vector.packedSha256 })
  }
  for (const vector of cases) {
    const native = run(executable, ['pack'], { input: vector.data }), browser = packSection(vector.data)
    identical(browser, native, vector.name)
    if (vector.expected) identical(native, vector.expected, `${vector.name} fixture`)
    if (vector.expectedHash && createHash('sha256').update(native).digest('hex') !== vector.expectedHash) throw new Error(`${vector.name} native fixture has drifted.`)
    identical(unpackSection(native), vector.data, `${vector.name} decode`)
    if (vector.data.length) identical(run(executable, ['unpack'], { input: browser }), vector.data, `${vector.name} native decode`)
    console.log(`${vector.name}: identical`)
  }
  if (stockPath) {
    const stock = readFileSync(stockPath)
    if (stock.length !== BASE_FIRMWARE.bytes || createHash('sha256').update(stock).digest('hex') !== BASE_FIRMWARE.sha256) throw new Error('Choose your original, unmodified OS 1.40C file.')
    const decoded = decodeFirmware(stock), { container } = decodeElup(stock)
    const size = new DataView(container.buffer, container.byteOffset, container.byteLength).getUint32(18)
    const native = run(executable, ['unpack'], { input: container.subarray(18, 26 + size) })
    identical(decoded.mainOs, native, 'Original stock decode')
    console.log(`Original stock decode: identical (${decoded.mainOs.length} bytes); no firmware files written.`)
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
