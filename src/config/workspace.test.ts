import { describe, expect, it } from 'vitest'
import { newConfiguration, validateConfiguration, configurationVersionError } from './workspace'
import { MODULES } from '../catalog/modules'
describe('persistent configuration version pins',()=>{
 it('starts empty with stock FX2 disabled while dynamic loading is unavailable',()=>{
  const configuration=newConfiguration('Empty')
  expect(configuration.moduleIds).toEqual([])
  expect(configuration.moduleVersions).toEqual({})
  expect(configuration.keepStockFx2).toBe(false)
 })
 it('pins new configurations but retains saved older versions until the user updates them',()=>{
  const current=newConfiguration('Current',['spectrum'])
  expect(current.moduleVersions).toEqual({spectrum:MODULES.find(module=>module.id==='spectrum')!.version})
  expect(configurationVersionError(current)).toBe('')
  const old=validateConfiguration({...current,moduleVersions:{spectrum:'0.0.9'}})
  expect(old.moduleVersions.spectrum).toBe('0.0.9')
  expect(configurationVersionError(old)).toContain('Use current module versions')
  expect(newConfiguration('Copy',old.moduleIds,old.keepStockFx2,old.moduleVersions).moduleVersions).toEqual(old.moduleVersions)
 })
 it('migrates pre-version configurations to the initial catalog without accepting malformed pins',()=>{
  const current=newConfiguration('Legacy',['repitch'])
  expect(validateConfiguration({...current,moduleVersions:undefined}).moduleVersions).toEqual({repitch:'0.1.0-experimental'})
  for(const pins of [[],null,{repitch:'latest'},{repitch:'0.1.0',spectrum:'0.1.0'}])expect(()=>validateConfiguration({...current,moduleVersions:pins})).toThrow()
 })
})
