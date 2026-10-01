import { apiUrl } from '../hosting'
import type { UsageEvent } from './usage-contract'
import { isModuleAvailable } from '../catalog/availability'
import { moduleBuildPending } from '../catalog/build-support'
const preferenceKey = 'octamod.usage.opt-out', visitorKey = 'octamod.usage.daily-visitor', configurationsKey = 'octamod.usage.started-configurations'
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
export function browserRequestsPrivacy() { return typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl === true) }
export function usageAllowed() { try { return typeof window !== 'undefined' && !browserRequestsPrivacy() && localStorage.getItem(preferenceKey) !== 'off' } catch { return false } }
export function setUsageAllowed(enabled: boolean) {
  try {
    if(enabled)localStorage.removeItem(preferenceKey)
    else {localStorage.setItem(preferenceKey,'off');localStorage.removeItem(visitorKey);localStorage.removeItem(configurationsKey)}
    lastPage = ''
    return true
  } catch {return false}
}
function visitor() {
  const day = new Date().toISOString().slice(0,10)
  try {
    let record: {day?:string;value?:string} = {}
    try {record=JSON.parse(localStorage.getItem(visitorKey)??'{}') as typeof record} catch { /* Replace an invalid local identifier. */ }
    if(record?.day === day && typeof record.value === 'string' && uuid.test(record.value))return record.value
    const value=crypto.randomUUID();localStorage.setItem(visitorKey,JSON.stringify({day,value}));return value
  } catch {return null}
}
/** The only outbound fields are a closed event name and two random identifiers. Never pass build/configuration data. */
export function trackUsage(event: UsageEvent) {
  if(!usageAllowed())return
  const dailyVisitor=visitor();if(!dailyVisitor)return
  try {void fetch(apiUrl('/usage/events'),{method:'POST',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({event,eventId:crypto.randomUUID(),visitor:dailyVisitor})}).catch(()=>{})} catch { /* Counts never block device work. */ }
}
let lastPage = ''
export function trackPageView(route: string) {
  if(!usageAllowed()||lastPage===route)return
  lastPage=route
  if(route==='admin'||route==='review')return
  trackUsage('page_view') // The route itself is never sent.
}
export function trackConfigurationStarted(id: string) {
  if(!usageAllowed()||!uuid.test(id))return
  try {
    let ids: string[]=[]
    try {const saved:unknown=JSON.parse(localStorage.getItem(configurationsKey)??'[]');if(Array.isArray(saved))ids=saved.filter((value):value is string=>typeof value==='string'&&uuid.test(value))} catch { /* Keep tracking best-effort. */ }
    if(ids.includes(id))return
    localStorage.setItem(configurationsKey,JSON.stringify([...ids.slice(-999),id]))
    trackUsage('configuration_started') // Local configuration IDs and contents never leave the device.
  } catch { /* Storage-disabled browsers are excluded. */ }
}

/** Call only after an enabled download of a completed build, using that build's reported module IDs. */
export function trackFirmwareDownload(moduleIds: readonly string[]) {
  trackUsage('firmware_download_requested')
  if(!usageAllowed())return
  const dailyVisitor=visitor();if(!dailyVisitor)return
  for(const moduleId of new Set(moduleIds)) {
    if(!isModuleAvailable(moduleId)||moduleBuildPending(moduleId))continue
    try {void fetch(apiUrl('/usage/module-downloads'),{method:'POST',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({moduleId,eventId:crypto.randomUUID(),visitor:dailyVisitor})}).catch(()=>{})} catch { /* Counts never block a firmware download. */ }
  }
}
