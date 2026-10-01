import { readFile, readdir, lstat, realpath, copyFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchOwnerApproval } from '../src/release/approval.ts'
import { parseModuleDocument } from '../src/catalog/module-contract.ts'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2), folder = args[0] && resolve(args[0]), development = args.includes('--development'), checkOnly = args.includes('--check-only')
if (!folder) throw new Error('Usage: node scripts/import-module-build.mjs artifact-directory [--development] [--check-only]')
const expected = ['dsp-packages.json','coldfire-packages.json','resident-dsp.json','rom-packages.json','bootstrap-package.json','menu-recipes.json','descriptor-recipes.json','platform-writes.json']
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
async function regular(path, parent) { const info = await lstat(path); if (!info.isFile() || info.isSymbolicLink() || info.size > 8*1024*1024 || !(await realpath(path)).startsWith(await realpath(parent) + '/')) throw new Error('Invalid artifact/source file: ' + path) }
await regular(resolve(folder,'module-build.json'),folder)
const report = await json(resolve(folder, 'module-build.json')), catalog = await json(resolve(root, 'sdk/catalog.json'))
if (report.schemaVersion !== 1 || report.kind !== 'source-packages' || report.stockRead !== false || report.nativeRevision !== catalog.sourceRevision || !hash(report.sourceTreeSha256) || !hash(report.compilerSha256)) throw new Error('Invalid stock-free source build record')
if (report.compilerSha256 !== sha(await readFile(resolve(root, 'scripts/build-module-packages.py')))) throw new Error('Artifact compiler differs from this source checkout')
if (report.sourceCommit !== null && !/^[a-f0-9]{40}$/.test(report.sourceCommit)) throw new Error('Invalid source commit')
let approval = null
if (!development) {
  if (!report.sourceCommit) throw new Error('Development builds require --development; they are not approved releases')
  const head = execFileSync('git', ['rev-parse','HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  if (head !== report.sourceCommit) throw new Error('Artifact source commit differs from this checkout')
  // The compiler output is untrusted. Fetch approval independently from GitHub.
  approval = await fetchOwnerApproval(process.env.GITHUB_REPOSITORY ?? '', report.sourceCommit, Number(process.env.OCTAMOD_APPROVER_ID), process.env.GITHUB_TOKEN ?? '')
}
const versions = Object.fromEntries(catalog.modules.map(item => [item.id,item.version]))
if (JSON.stringify(Object.keys(report.moduleVersions).sort()) !== JSON.stringify(Object.keys(versions).sort())) throw new Error('Compiled module scope differs from the catalog')
for (const [id,version] of Object.entries(versions)) {
  const doc = parseModuleDocument(await json(resolve(root,'sdk/octabam/modules',id,'octamod.module.json')))
  if (doc.version !== version || report.moduleVersions[id] !== version) throw new Error('Stale compiled module version: ' + id)
}
if (JSON.stringify(Object.keys(report.files).sort()) !== JSON.stringify([...expected].sort()) || !report.sources || typeof report.sources !== 'object' || !Object.keys(report.sources).length) throw new Error('Invalid compiled artifact inventory')
const native = resolve(root,'sdk/octabam')
async function inventory(folder,prefix) { const files=[];for(const item of await readdir(folder,{withFileTypes:true})){if(item.name==='__pycache__'||item.name.endsWith('.pyc'))continue;if(item.isSymbolicLink())throw new Error('Source symlinks are prohibited.');const path=prefix+'/'+item.name;if(item.isDirectory())files.push(...await inventory(resolve(folder,item.name),path));else if(item.isFile())files.push(path);else throw new Error('Source must be a regular file.')}return files }
const actual=[];for(const group of ['modules','platform','tools','dsp'])actual.push(...await inventory(resolve(native,group),group))
if(JSON.stringify(actual.sort())!==JSON.stringify(Object.keys(report.sources).sort()))throw new Error('Compiled source inventory is incomplete or stale.')
for (const [path, fingerprint] of Object.entries(report.sources)) {
  if (!/^(modules|platform|tools|dsp)\/[A-Za-z0-9._/-]+$/.test(path) || path.split('/').some(part => part === '..' || part === '.') || !hash(fingerprint) || /\.(bin|syx|exe|dll|dylib|zip)$/i.test(path)) throw new Error('Invalid source inventory path: ' + path)
  const source = resolve(native,path); await regular(source,native)
  if (sha(await readFile(source)) !== fingerprint) throw new Error('Compiled source is stale: ' + path)
}
if (sha(JSON.stringify(Object.fromEntries(Object.entries(report.sources).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)))) !== report.sourceTreeSha256) throw new Error('Source tree fingerprint differs')
const packages = new Map()
for (const name of expected) {
  const file = resolve(folder,name); await regular(file,folder); const bytes = await readFile(file), entry = report.files[name]
  if (!entry || entry.bytes !== bytes.length || entry.sha256 !== sha(bytes)) throw new Error('Corrupt compiled artifact: ' + name)
  const doc = JSON.parse(bytes)
  if (doc.schema !== 1 || doc.revision !== catalog.sourceRevision || doc.sourceCommit !== report.sourceCommit || JSON.stringify(doc.moduleVersions) !== JSON.stringify(report.moduleVersions)) throw new Error('Compiled artifact provenance differs: ' + name)
  packages.set(name,doc)
}
for (const variant of packages.get('resident-dsp.json').variants) {
  if (variant.stockCopy.words !== 9 || variant.code.slice(variant.stockCopy.destinationOffset*6) !== '000000'.repeat(9)) throw new Error('Compiled receiver must contain only zero placeholders for its stock tail')
  // Native static placement leaves unbound ids on stock's null stub; only the running receiver redirects them.
  if (variant.nullInit !== variant.stockCopy.sourceAddress || variant.nullProc !== variant.stockCopy.sourceAddress + 1) throw new Error('Compiled receiver must keep stock null dispatch entries')
}
if(checkOnly){console.log('All eight artifacts, complete source inventory and version pins validated ('+(development?'development':'owner-approved')+').');process.exit(0)}
// Validate the complete artifact before touching any frontend file.
for (const name of expected) await copyFile(resolve(folder,name),resolve(root,'src/engine/assets',name))
const frontend = { schemaVersion:1, kind:'source-packages', sourceCommit:report.sourceCommit, nativeRevision:report.nativeRevision, sourceTreeSha256:report.sourceTreeSha256, compilerSha256:report.compilerSha256, moduleVersions:report.moduleVersions, files:report.files, approval, qualification:report.qualification }
await writeFile(resolve(root,'src/engine/assets/module-build.json'), JSON.stringify(frontend,null,2)+'\n')
console.log('Imported eight source-built artifacts at exact module versions (' + (development ? 'local development; no release approval' : 'owner-approved PR #' + approval.pullRequest) + ').')
