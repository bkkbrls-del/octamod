import { describe, expect, it } from 'vitest'
import { parseModuleDocument } from './module-contract'
import { compareModuleVersions } from './versions'
import example from '../../public/module-repository.example.json'
import catalog from './module-documents.json'
describe('module folder contract',()=>{
 it('requires exact versions and retains honest evidence for all seven catalog modules',()=>{
  expect(parseModuleDocument(example).version).toBe('0.1.0')
  expect(catalog.modules.map(module=>parseModuleDocument(module).id)).toEqual(['spectrum','modulation','character','miniverb','tapeecho','euclid','repitch'])
  expect(parseModuleDocument(catalog.modules.find(m=>m.id==='tapeecho')).tests.summary).toContain('seventh freezing')
  expect(parseModuleDocument(catalog.modules.find(m=>m.id==='miniverb')).tests.hardwareStatus).toBe('untested')
 })
 it('rejects undeclared fields, invalid versions and unsafe source or media paths',()=>{
  for(const bad of [{...example,extra:'unreviewed'},{...example,version:'latest'},{...example,version:'01.0.0'},{...example,version:'1.0.0-01'},{...example,nativeManifest:'../manifest.py'},{...example,license:{...example.license,file:'firmware.bin'}}])expect(()=>parseModuleDocument(bad)).toThrow()
  const media={path:'media/screen.png',captureType:'emulator',caption:'Actual capture',alt:'The effect page',credit:'Author',license:'CC-BY-4.0',source:'original'}
  expect(parseModuleDocument({...example,media:[media]}).media[0].alt).toBe('The effect page')
  for(const change of [{path:'../media/screen.png'},{path:'media/upgrade.bin'},{captureType:'audio'},{credit:''},{source:'http://example.com/file'},{alt:''}])expect(()=>parseModuleDocument({...example,media:[{...media,...change}]})).toThrow()
 })
 it('rejects broken controls and false numeric resource claims',()=>{
  const control=example.controls[0]
  for(const change of [{default:128},{count:0},{labels:['one']},{doc:''}])expect(()=>parseModuleDocument({...example,controls:[{...control,...change}]})).toThrow()
  const resources=example.resources
  expect(()=>parseModuleDocument({...example,resources:{...resources,storage:{...resources.storage,value:30}}})).toThrow('unmeasured')
  expect(()=>parseModuleDocument({...example,resources:{...resources,processing:{...resources.processing,value:101,unit:'%',method:'hardware'}}})).toThrow('percentage')
 })
})
describe('module version ordering',()=>{
 it('requires actual semantic increases, including prerelease ordering',()=>{
  for(const [a,b] of [['1.0.1','1.0.0'],['1.1.0','1.0.99'],['2.0.0','1.99.99'],['1.0.0','1.0.0-rc.9'],['1.0.0-rc.10','1.0.0-rc.9'],['1.0.0-beta','1.0.0-alpha'],['1.0.0-alpha.1','1.0.0-alpha']]){expect(compareModuleVersions(a,b)).toBe(1);expect(compareModuleVersions(b,a)).toBe(-1)}
  expect(compareModuleVersions('1.0.0','1.0.0')).toBe(0)
  for(const value of ['0.01.0','1.0','1.0.0-01','latest','1.0.0+mutable'])expect(()=>compareModuleVersions(value,'1.0.0')).toThrow()
 })
})
