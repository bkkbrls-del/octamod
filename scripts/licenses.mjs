import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NOTICE_NAME, NOTICE_PAGE, renderLicenseNotices, renderLicensePage } from './license-notices.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const write = process.argv.includes('--write')
const notices = await renderLicenseNotices(root)
for (const [relativePath, content] of [
  ['sdk/octabam/licenses/' + NOTICE_NAME, notices],
  ['public/licenses/' + NOTICE_NAME, notices],
  ['public/licenses/' + NOTICE_PAGE, renderLicensePage(notices)],
]) {
  const path = resolve(root, relativePath)
  if (write) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content)
  } else if (await readFile(path, 'utf8') !== content) {
    throw new Error(relativePath + ': licence notices are stale. Run npm run licenses:generate.')
  }
}
console.log('Full component notices, module SPDX declarations and distribution copies verified.')
