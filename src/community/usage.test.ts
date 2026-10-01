import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
let usage: typeof import('./usage')
let values: Map<string,string>
let request: ReturnType<typeof vi.fn>
beforeEach(async()=>{
 vi.resetModules();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-01T12:00:00Z'))
 values=new Map();request=vi.fn().mockResolvedValue(new Response('{}'))
 vi.stubGlobal('window',{});vi.stubGlobal('navigator',{doNotTrack:null});vi.stubGlobal('fetch',request)
 vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)})
 usage=await import('./usage')
})
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
describe('anonymous usage reporting',()=>{
 it('sends only the closed event name and random IDs, without cookies, session headers or configuration identifiers',()=>{
  values.set('octamod.community.session:/api','a'.repeat(64));values.set('octamod.community.admin:/api','b'.repeat(64))
  const configuration='33333333-3333-4333-8333-333333333333'
  usage.trackConfigurationStarted(configuration);usage.trackConfigurationStarted(configuration)
  expect(request).toHaveBeenCalledTimes(1)
  const [url,options]=request.mock.calls[0];expect(url).toBe('/api/usage/events');expect(options.credentials).toBe('omit');expect(options.referrerPolicy).toBe('no-referrer')
  expect(Object.keys(JSON.parse(options.body)).sort()).toEqual(['event','eventId','visitor'])
  expect(options.body).not.toContain(configuration);expect(options.headers).toEqual({'Content-Type':'application/json'})
 })
 it('deduplicates page effects, excludes admin views, never sends routes and rotates the visitor daily',()=>{
  usage.trackPageView('library');usage.trackPageView('library');usage.trackPageView('admin');usage.trackPageView('library')
  expect(request).toHaveBeenCalledTimes(2)
  const first=JSON.parse(request.mock.calls[0][1].body);expect(first.visitor).toBe(JSON.parse(request.mock.calls[1][1].body).visitor)
  expect(request.mock.calls[0][1].body).not.toContain('library')
  vi.setSystemTime(new Date('2026-10-02T00:00:01Z'));usage.trackUsage('page_view')
  expect(JSON.parse(request.mock.calls[2][1].body).visitor).not.toBe(first.visitor)
 })
 it('honors Do Not Track, Global Privacy Control and the saved opt-out before creating identifiers',()=>{
  vi.stubGlobal('navigator',{doNotTrack:'1'});usage.trackUsage('page_view');expect(values.size).toBe(0)
  vi.stubGlobal('navigator',{globalPrivacyControl:true});usage.trackUsage('page_view');expect(values.size).toBe(0)
  vi.stubGlobal('navigator',{});expect(usage.setUsageAllowed(false)).toBe(true);usage.trackUsage('page_view');expect(request).not.toHaveBeenCalled()
  expect(usage.setUsageAllowed(true)).toBe(true);usage.trackUsage('page_view');expect(request).toHaveBeenCalledTimes(1)
  usage.setUsageAllowed(false);expect(values.has('octamod.usage.daily-visitor')).toBe(false)
 })
 it('never blocks local work when storage or the service is unavailable',async()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('Unavailable')}});expect(()=>usage.trackUsage('page_view')).not.toThrow();expect(request).not.toHaveBeenCalled()
  vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{},removeItem:()=>{}});request.mockRejectedValue(new Error('Offline'))
  expect(()=>usage.trackUsage('build_succeeded')).not.toThrow();await Promise.resolve()
 })
})
