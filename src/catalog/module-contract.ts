import { compareModuleVersions } from './versions.ts'
// Shared by the web catalog and stock-free PR validation. No Python is evaluated.
export type EvidenceMethod = 'unmeasured' | 'static' | 'emulator' | 'hardware'
export type ModuleMetric = { label: string; display: string; value: number | null; unit: string; method: EvidenceMethod; conditions: string; source: string }
export type ModuleControl = { name: string; default: number; count: number; doc: string; labels: string[] | null }
export type ModuleDocument = {
  schemaVersion: 2; id: string; key: string; name: string; version: string; category: 'effects' | 'playback'
  author: { github: string; credits: string[] }; nativeManifest: string
  presentation: { label: string; family: string; summary: string; overview: string; highlights: string[]; usage: string[] }
  controls: ModuleControl[]
  compatibility: { firmware: '1.40C'; effectId: number | null; location: 'FX1' | 'FX2' | 'FX1 / FX2' | 'Flex / Static'; conflicts: string[]; limitations: string[] }
  resources: { recorded: string; storage: ModuleMetric; processing: ModuleMetric }
  tests: { report: string; summary: string; hardwareStatus: 'untested' | 'historical' | 'verified'; evidenceRevision: string; gates: string[] }
  license: { spdx: string; file: string; declaration: string }
  media: { path: string; captureType: 'hardware' | 'emulator' | 'audio'; caption: string; alt: string; credit: string; license: string; source: string }[]
}
function fail(path: string, message: string): never { throw new Error(path + ': ' + message) }
function object(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected an object')
  const item = value as Record<string, unknown>
  for (const key of Object.keys(item)) if (!keys.includes(key)) fail(path + '.' + key, 'unknown field')
  for (const key of keys) if (!(key in item)) fail(path + '.' + key, 'required field is missing')
  return item
}
function text(value: unknown, path: string, maximum=4000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || Array.from(value).some(character=>{const code=character.charCodeAt(0);return code<32&&![9,10,13].includes(code)})) fail(path, 'expected nonempty plain text within ' + maximum + ' characters')
  return value.trim()
}
function enumeration<T extends string>(value: unknown, path: string, choices: readonly T[]): T {
  if (!choices.includes(value as T)) fail(path, 'expected ' + choices.join(', '))
  return value as T
}
function list(value: unknown, path: string, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) fail(path, 'expected an array of at most ' + maximum + ' items')
  return value
}
function texts(value: unknown, path: string, maximum: number): string[] { return list(value,path,maximum).map((v,i)=>text(v,path+'['+i+']')) }
export function modulePath(value: unknown, path='file'): string {
  const result=text(value,path,240)
  if (!result.split('/').every(part=>/^[a-zA-Z0-9_.-]+$/.test(part)&&part!=='.'&&part!=='..') || result.startsWith('/') || /\.(bin|syx|exe|dll|so|dylib|zip)$/i.test(result)) fail(path,'expected a relative source/document/media path inside the module folder')
  return result
}
function metric(value: unknown, path: string): ModuleMetric {
  const m=object(value,path,['label','display','value','unit','method','conditions','source'])
  const method=enumeration(m.method,path+'.method',['unmeasured','static','emulator','hardware'])
  if (m.value!==null && (typeof m.value!=='number'||!Number.isFinite(m.value)||m.value<0)) fail(path+'.value','expected a nonnegative finite measurement or null')
  if (method==='unmeasured'&&m.value!==null) fail(path+'.value','unmeasured costs must be null')
  const unit=text(m.unit,path+'.unit',60)
  if (unit==='%' && typeof m.value==='number' && m.value>100) fail(path+'.value','percentage cannot exceed 100')
  return {label:text(m.label,path+'.label',100),display:text(m.display,path+'.display',100),value:m.value as number|null,unit,method,conditions:text(m.conditions,path+'.conditions'),source:modulePath(m.source,path+'.source')}
}
export function parseModuleDocument(value: unknown): ModuleDocument {
  const d=object(value,'module',['schemaVersion','id','key','name','version','category','author','nativeManifest','presentation','controls','compatibility','resources','tests','license','media'])
  if(d.schemaVersion!==2) fail('schemaVersion','expected 2')
  const id=text(d.id,'id',60); if(!/^[a-z][a-z0-9-]*$/.test(id)) fail('id','use lowercase letters, numbers and hyphens')
  const version=text(d.version,'version',80); compareModuleVersions(version,version)
  const a=object(d.author,'author',['github','credits']), github=text(a.github,'author.github',39)
  if(!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(github)) fail('author.github','invalid GitHub login')
  const p=object(d.presentation,'presentation',['label','family','summary','overview','highlights','usage'])
  const c=object(d.compatibility,'compatibility',['firmware','effectId','location','conflicts','limitations'])
  if(c.effectId!==null&&(typeof c.effectId!=='number'||!Number.isInteger(c.effectId)||c.effectId<4||c.effectId>31))fail('compatibility.effectId','expected a valid effect ID or null for contributions without an effect slot')
  if(c.firmware!=='1.40C') fail('compatibility.firmware','only 1.40C is supported')
  const r=object(d.resources,'resources',['recorded','storage','processing'])
  const t=object(d.tests,'tests',['report','summary','hardwareStatus','evidenceRevision','gates'])
  const evidenceRevision=text(t.evidenceRevision,'tests.evidenceRevision',40)
  if(!/^[a-f0-9]{40}$/.test(evidenceRevision)) fail('tests.evidenceRevision','pin the exact evidence source commit')
  const l=object(d.license,'license',['spdx','file','declaration'])
  const nativeManifest=modulePath(d.nativeManifest,'nativeManifest'); if(nativeManifest!=='manifest.py') fail('nativeManifest','use manifest.py alongside this document')
  const controls=list(d.controls,'controls',64).map((v,i):ModuleControl=>{
    const path='controls['+i+']', control=object(v,path,['name','default','count','doc','labels'])
    const count=control.count, initial=control.default
    if(typeof count!=='number'||!Number.isInteger(count)||count<1||count>256) fail(path+'.count','expected 1–256 values')
    if(typeof initial!=='number'||!Number.isInteger(initial)||initial<0||initial>=count) fail(path+'.default','default is outside the declared range')
    const labels=control.labels===null?null:texts(control.labels,path+'.labels',256)
    if(labels&&labels.length!==count) fail(path+'.labels','one label is required for every value')
    return {name:text(control.name,path+'.name',40),default:initial,count,doc:text(control.doc,path+'.doc'),labels}
  })
  if(new Set(controls.map(control=>control.name)).size!==controls.length) fail('controls','control names must be unique')
  const media=list(d.media,'media',8).map((v,i):ModuleDocument['media'][number]=>{
    const path='media['+i+']', m=object(v,path,['path','captureType','caption','alt','credit','license','source']), file=modulePath(m.path,path+'.path')
    const captureType=enumeration(m.captureType,path+'.captureType',['hardware','emulator','audio'])
    if(!file.startsWith('media/')||!(captureType==='audio'?/\.(wav|mp3|ogg)$/i:/\.(png|jpe?g|webp)$/i).test(file)) fail(path+'.path','media type and extension must agree within media/')
    const source=text(m.source,path+'.source',1000)
    if(source!=='original'){ let url:URL;try{url=new URL(source)}catch{fail(path+'.source','use original or an HTTPS attribution URL')}if(url.protocol!=='https:'||url.username||url.password)fail(path+'.source','use an HTTPS attribution URL') }
    return {path:file,captureType,caption:text(m.caption,path+'.caption',400),alt:text(m.alt,path+'.alt',300),credit:text(m.credit,path+'.credit',200),license:text(m.license,path+'.license',100),source}
  })
  if(new Set(media.map(item=>item.path)).size!==media.length) fail('media','media paths must be unique')
  return {schemaVersion:2,id,key:text(d.key,'key',60),name:text(d.name,'name',100),version,category:enumeration(d.category,'category',['effects','playback']),author:{github,credits:texts(a.credits,'author.credits',30)},nativeManifest,presentation:{label:text(p.label,'presentation.label',80),family:text(p.family,'presentation.family',80),summary:text(p.summary,'presentation.summary',300),overview:text(p.overview,'presentation.overview'),highlights:texts(p.highlights,'presentation.highlights',12),usage:texts(p.usage,'presentation.usage',12)},controls,compatibility:{firmware:'1.40C',effectId:c.effectId as number|null,location:enumeration(c.location,'compatibility.location',['FX1','FX2','FX1 / FX2','Flex / Static']),conflicts:texts(c.conflicts,'compatibility.conflicts',64),limitations:texts(c.limitations,'compatibility.limitations',24)},resources:{recorded:text(r.recorded,'resources.recorded',100),storage:metric(r.storage,'resources.storage'),processing:metric(r.processing,'resources.processing')},tests:{report:modulePath(t.report,'tests.report'),summary:text(t.summary,'tests.summary'),hardwareStatus:enumeration(t.hardwareStatus,'tests.hardwareStatus',['untested','historical','verified']),evidenceRevision,gates:texts(t.gates,'tests.gates',64)},license:{spdx:text(l.spdx,'license.spdx',100),file:modulePath(l.file,'license.file'),declaration:text(l.declaration,'license.declaration')},media}
}
