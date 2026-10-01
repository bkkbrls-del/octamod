import { afterEach, describe, expect, it, vi } from 'vitest'
import { communityBase, assetUrl } from './hosting'
afterEach(()=>vi.unstubAllEnvs())
describe('hosting URLs',()=>{
 it('keeps static files under the current Pages directory',()=>{vi.stubEnv('BASE_URL','./');expect(new URL(assetUrl('/favicon.svg'),'https://octamod.github.io/octamod/').href).toBe('https://octamod.github.io/octamod/favicon.svg')})
 it('accepts a separate HTTPS API and local development API',()=>{
  expect(communityBase('https://community.workers.dev/api')).toBe('https://community.workers.dev/api')
  expect(communityBase('http://127.0.0.1:8788/api')).toBe('http://127.0.0.1:8788/api')
  expect(communityBase('')).toBe('/api')
 })
 it('rejects unsafe or ambiguous endpoints',()=>{
  for(const url of ['http://evil.test/api','https://user:pass@api.test/api','https://api.test/api?key=secret','https://api.test/api#route','https://api.test/other','javascript:alert(1)'])expect(()=>communityBase(url)).toThrow()
 })
})
