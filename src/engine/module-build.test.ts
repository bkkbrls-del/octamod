import { describe, expect, it } from 'vitest'
import { compiledModuleSource, validateCompiledModules } from './module-build'
describe('source-built module identity', () => {
  it('binds all eleven compiled modules to the displayed catalog versions', () => {
    const source = compiledModuleSource()
    expect(Object.keys(source.moduleVersions)).toHaveLength(11)
    expect(source.moduleVersions['midi-scenes']).toBe('0.2.0-experimental')
    expect(source.sourceTreeSha256).toMatch(/^[a-f0-9]{64}$/)
  })
  it('rejects stale or missing compiled versions before firmware composition', () => {
    const source = { sourceCommit:null, sourceTreeSha256:'a'.repeat(64), moduleVersions:{ spectrum:'1.0.0' } }
    expect(() => validateCompiledModules(source,[{id:'spectrum',version:'1.0.1'}])).toThrow('Rebuild')
    expect(() => validateCompiledModules(source,[{id:'spectrum',version:'1.0.0'},{id:'euclid',version:'1.0.0'}])).toThrow('versions differ')
    expect(() => validateCompiledModules({...source,sourceCommit:'main'},[{id:'spectrum',version:'1.0.0'}])).toThrow('identity')
  })
})
