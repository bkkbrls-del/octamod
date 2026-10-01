/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite'
import type { SQLInputValue } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { handleApi } from '../../server/api'
import { handleCommunity } from '../../server/transport'
import { digest } from '../../server/security'
import type { Database, Statement, Env } from '../../server/platform'
const databases:DatabaseSync[]=[]
function adapter(db:DatabaseSync):Database{
 function statement(sql:string,values:SQLInputValue[]=[]):Statement{return {
  bind(...args){return statement(sql,args as SQLInputValue[])},
  async first<T>(){return (db.prepare(sql).get(...values) as T|undefined)??null},
  async all<T>(){return {results:db.prepare(sql).all(...values) as T[]}},
  async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}}}
 }}
 return {prepare:statement,async batch(items){db.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}}}
}
async function fixture(){
 const db=new DatabaseSync(':memory:');databases.push(db);db.exec(readFileSync(new URL('../../migrations/0001_community.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../../migrations/0003_module_publications.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0004_sign_in_grants.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0005_configuration_choosers.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0006_configuration_versions.sql',import.meta.url),'utf8'))
 db.exec(readFileSync(new URL('../../migrations/0007_guest_only_admin.sql',import.meta.url),'utf8'))
 const env:Env={DB:adapter(db),APP_URL:'https://octamod.test',ADMIN_KEY_SHA256:await digest(adminKey)}
 const objects=new Map<string,ArrayBuffer>()
 env.MEDIA={async put(key,bytes){objects.set(key,bytes)},async get(key){const bytes=objects.get(key);return bytes?{body:new ReadableStream({start(controller){controller.enqueue(new Uint8Array(bytes));controller.close()}})}:null},async delete(key){objects.delete(key)}}
 const tokens={author:'a'.repeat(64),other:'b'.repeat(64)}
 for(const [role,name] of [['author','Author guest'],['other','Another guest']] as const){
  db.prepare('INSERT INTO users(id,display_name) VALUES(?,?)').run(role,name)
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(await digest(tokens[role]),role,Math.floor(Date.now()/1000)+600)
 }
 async function call(path:string,method='GET',body?:unknown,auth='',origin=env.APP_URL!,admin=''){
  const headers:Record<string,string>={Origin:origin};if(auth)headers.Cookie=auth;if(admin)headers['X-Octamod-Admin']=admin
  if(body!==undefined)headers['Content-Type']='application/json'
  return handleApi(new Request(env.APP_URL+'/api'+path,{method,headers,body:body!==undefined?JSON.stringify(body):undefined}),env)
 }
 async function openAdmin(key=adminKey){return call('/auth/admin','POST',{key})}
 const admin=(await (await openAdmin()).json()).token as string
 return {db,env,call,tokens,admin,openAdmin}
}
const adminKey='e'.repeat(64)
afterEach(()=>{for(const db of databases.splice(0))db.close()})
const details={moduleId:'new-filter',title:'New filter',repositoryUrl:'https://github.com/sambanks/example/tree/main/modules/filter',description:'Original filter',usage:'Choose the filter',testReportUrl:'https://github.com/sambanks/example/blob/main/TESTS.md',stressNotes:'Eight tracks under stress',qualityNotes:'Emulator only; hardware untested',resourceNotes:'100 words; CPU not measured',license:'Original code, MIT; own capture',rightsConfirmed:true}
describe('community access and review',()=>{
 it('accepts module contributions through PRs only, including authors and admins',async()=>{
  const {call,db,tokens,admin}=await fixture()
  for(const path of ['/submissions','/submissions/test/media','/submissions/test/submit','/review/test','/repository/import','/repository/media']){
   for(const session of ['', 'octamod_session='+tokens.author])expect((await call(path,'POST',details,session)).status).toBe(410)
   expect((await call(path,'POST',details,'',undefined,admin)).status).toBe(410)
  }
  expect(db.prepare('SELECT COUNT(*) AS count FROM submissions').get()).toEqual({count:0})
  expect((await call('/submissions','POST',details,'','https://elsewhere.test')).status).toBe(403)
 })
 it('preserves existing publications when obsolete approval endpoints are called and keeps withdrawal private',async()=>{
  const {call,db,tokens,admin:token}=await fixture(),author='octamod_session='+tokens.author
  const asAdmin=(path:string,method='GET',body?:unknown)=>call(path,method,body,'',undefined,token)
  for(const path of ['/admin/overview','/admin/history','/admin/issues','/admin/comments']){expect((await call(path)).status).toBe(403);expect((await call(path,'GET',undefined,author)).status).toBe(403);expect((await call(path,'GET',undefined,'',undefined,'f'.repeat(64))).status).toBe(403)}
  db.prepare("INSERT INTO submissions(id,owner_id,module_id,title,repository_url,description,usage,test_report_url,stress_notes,quality_notes,resource_notes,license,rights_confirmed,status) VALUES('approved','author','new-filter','Version one','https://github.com/author/repo','Original filter','Usage','https://github.com/author/repo','Stress evidence','Quality evidence','Measured resources','MIT',1,'approved')").run()
  db.prepare("INSERT INTO module_publications(module_id,submission_id) VALUES('new-filter','approved')").run()
  expect((await asAdmin('/review/new-version','POST',{decision:'approved',evidenceVerified:true,note:'Attempted bypass'})).status).toBe(410)
  expect((await (await call('/catalog')).json())[0].title).toBe('Version one')
  expect((await call('/admin/modules/new-filter/withdraw','POST',{note:'Rights concern'},author)).status).toBe(403)
  expect((await asAdmin('/admin/modules/new-filter/withdraw','POST',{note:'Rights concern'})).status).toBe(200)
  expect(await (await call('/catalog')).json()).toEqual([])
  expect((await (await asAdmin('/admin/history')).json()).map((item:{action:string;actor:string})=>[item.action,item.actor])).toEqual([['withdrawn','Octamod administrator']])
 })
 it('accepts comments and ratings with no registration or email, preserving browser ownership',async()=>{
  const {call}=await fixture();const posted=await call('/modules/spectrum/comments','POST',{body:'Useful module',displayName:'Listener'});expect(posted.status).toBe(200)
  const cookie=posted.headers.get('set-cookie')!;expect(cookie).toContain('HttpOnly');const session=cookie.split(';')[0]
  expect((await call('/modules/spectrum/rating','POST',{value:5},session)).status).toBe(200)
  expect((await call('/modules/spectrum/rating','POST',{value:3},session)).status).toBe(200)
  const page=await (await call('/modules/spectrum','GET',undefined,session)).json()
  expect(page.ratings).toEqual({average:3,count:1});expect(page.comments[0].author).toBe('Listener');expect(page.comments[0].canDelete).toBe(true);expect(JSON.stringify(page)).not.toContain('email')
  expect((await call('/modules/spectrum/rating','POST',{value:6},session)).status).toBe(400)
  expect((await call('/modules/spectrum/like','POST',{liked:true},session)).status).toBe(200)
  expect((await call('/modules/spectrum/like','POST',{liked:true},session)).status).toBe(200)
  expect((await (await call('/modules/spectrum','GET',undefined,session)).json()).likes).toBe(1)
  expect((await call('/submissions','POST',details,session)).status).toBe(410)
  expect((await call('/modules/remix-miniverb/comments','POST',{body:'Guest remix discussion'},session)).status).toBe(200)
  expect((await call('/modules/remix-miniverb/rating','POST',{value:4},session)).status).toBe(200)
  expect((await call('/auth/email','POST',{email:'unused@example.test'})).status).toBe(404)
  const own=await (await call('/auth/session','GET',undefined,session)).json()
  expect(own).toEqual({available:true,admin:false,user:{id:own.user.id,displayName:'Listener'}})
 })
 it('keeps previously uploaded private media restricted without offering new upload routes',async()=>{
  const {call,db,env,tokens}=await fixture(),auth='octamod_session='+tokens.author,other='octamod_session='+tokens.other
  db.prepare("INSERT INTO submissions(id,owner_id,module_id,title,repository_url,description,usage,test_report_url,stress_notes,quality_notes,resource_notes,license,status) VALUES('legacy','author','new-filter','Legacy','https://github.com/author/repo','Original','Usage','https://github.com/author/repo','Stress','Quality','Resources','MIT','draft')").run()
  db.prepare("INSERT INTO media(id,submission_id,kind,mime,caption,capture_type,object_key,bytes) VALUES('preview','legacy','image','image/png','Test','emulator','legacy/preview',32)").run()
  await env.MEDIA!.put('legacy/preview',new Uint8Array(32).buffer)
  expect((await call('/media/preview')).status).toBe(404)
  expect((await call('/media/preview','GET',undefined,other)).status).toBe(404)
  expect((await call('/media/preview','GET',undefined,auth)).status).toBe(200)
  expect((await call('/submissions/legacy/media','POST',{},auth)).status).toBe(410)
 })
 it('keeps account-free issue reports private to the administrator and the reporting device',async()=>{
  const {call,tokens,admin}=await fixture()
  const result=await call('/modules/spectrum/issues','POST',{title:'Knob issue',body:'Steps and revision',displayName:'Listener'});expect(result.status).toBe(201);expect((await result.json()).author).toBe('sambanks')
  const reporter=result.headers.get('set-cookie')!.split(';')[0],other='octamod_session='+tokens.other,author='octamod_session='+tokens.author
  for(const session of ['',other,author,reporter])expect((await call('/admin/issues','GET',undefined,session)).status).toBe(403)
  expect((await call('/issues','GET',undefined,reporter)).status).toBe(404)
  expect(await (await call('/issues/mine')).json()).toEqual([])
  expect(await (await call('/issues/mine','GET',undefined,other)).json()).toEqual([])
  const mine=await (await call('/issues/mine','GET',undefined,reporter)).json();expect(mine).toHaveLength(1);expect(mine[0]).toMatchObject({author_login:'sambanks',status:'open'})
  const inbox=await (await call('/admin/issues','GET',undefined,'',undefined,admin)).json();expect(inbox).toHaveLength(1);expect(inbox[0].reporter).toBe('Listener')
  expect((await call('/admin/issues/'+inbox[0].id,'PATCH',{status:'closed'},reporter)).status).toBe(403)
  expect((await call('/admin/issues/'+inbox[0].id,'PATCH',{status:'closed'},'',undefined,admin)).status).toBe(200)
  expect((await (await call('/issues/mine','GET',undefined,reporter)).json())[0].status).toBe('closed')
 })
 it('retires account-bound cloud configuration copies; configurations stay on the device',async()=>{
  const {call,tokens}=await fixture(),auth='octamod_session='+tokens.author
  const config={id:'one',name:'Live',moduleIds:['spectrum'],moduleVersions:{spectrum:'0.0.9'},revision:0}
  expect((await call('/configurations','PUT',config,auth)).status).toBe(410)
  expect((await call('/configurations','GET',undefined,auth)).status).toBe(410)
  expect((await call('/configurations/one','DELETE',undefined,auth)).status).toBe(410)
 })
})

describe('separate administrator access',()=>{
 it('fails closed until a key is configured and never treats a guest session as administrator',async()=>{
  const {env,call,admin,tokens,db}=await fixture()
  expect((await (await call('/auth/session','GET',undefined,'',undefined,admin)).json()).admin).toBe(true)
  expect((await (await call('/auth/session','GET',undefined,'octamod_session='+tokens.author)).json()).admin).toBe(false)
  expect(db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE user_id='administrator'").get()).toEqual({count:0})
  env.ADMIN_KEY_SHA256=undefined
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(403)
  expect((await call('/auth/admin','POST',{key:adminKey})).status).toBe(503)
  env.ADMIN_KEY_SHA256='not-a-digest'
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(403)
 })
 it('rejects wrong keys, throttles guessing, and revokes sessions on sign-out or key rotation',async()=>{
  const {env,call,admin,openAdmin}=await fixture()
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(200)
  expect((await openAdmin('f'.repeat(64))).status).toBe(403)
  expect((await openAdmin('short')).status).toBe(403)
  expect((await call('/auth/admin','POST',{key:adminKey},'','https://elsewhere.test')).status).toBe(403)
  const second=(await (await openAdmin()).json()).token as string
  expect((await openAdmin('f'.repeat(64))).status).toBe(403)
  expect((await openAdmin()).status).toBe(429)
  expect((await call('/auth/admin','DELETE',undefined,'',undefined,second)).status).toBe(200)
  expect((await call('/admin/overview','GET',undefined,'',undefined,second)).status).toBe(403)
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(200)
  env.ADMIN_KEY_SHA256=await digest('d'.repeat(64))
  expect((await call('/admin/overview','GET',undefined,'',undefined,admin)).status).toBe(403)
 })
 it('lets the administrator moderate guest comments without a guest identity',async()=>{
  const {call,admin}=await fixture()
  const posted=await call('/modules/spectrum/comments','POST',{body:'Spam',displayName:'Guest'});const guest=posted.headers.get('set-cookie')!.split(';')[0]
  const [comment]=await (await call('/admin/comments','GET',undefined,'',undefined,admin)).json() as {id:string}[]
  expect((await (await call('/modules/spectrum','GET',undefined,'',undefined,admin)).json()).comments[0].canDelete).toBe(true)
  expect((await (await call('/modules/spectrum')).json()).comments[0].canDelete).toBe(false)
  expect((await call('/comments/'+comment.id,'DELETE')).status).toBe(401)
  expect((await call('/comments/'+comment.id,'DELETE',undefined,'',undefined,admin)).status).toBe(200)
  expect((await (await call('/modules/spectrum','GET',undefined,guest)).json()).comments).toEqual([])
 })
})

describe('GitHub Pages and separate backend',()=>{
 it('allows exactly the configured origin and bounded preflights, including errors',async()=>{
  const {env}=await fixture();env.APP_URL='https://octamod.github.io/octamod/'
  const allowed='https://octamod.github.io',backend='https://community.workers.dev'
  const preflight=await handleCommunity(new Request(backend+'/api/submissions',{method:'OPTIONS',headers:{Origin:allowed,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Authorization, Content-Type, X-Octamod-Admin'}}),env)
  expect(preflight.status).toBe(204);expect(preflight.headers.get('access-control-allow-origin')).toBe(allowed)
  expect(preflight.headers.get('access-control-allow-credentials')).toBeNull()
  const deniedHeaders:Record<string,string>[]=[{Origin:'https://evil.test','Access-Control-Request-Method':'POST'},{Origin:allowed,'Access-Control-Request-Method':'TRACE'},{Origin:allowed,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'X-Unsafe'}]
  for(const headers of deniedHeaders)expect((await handleCommunity(new Request(backend+'/api/submissions',{method:'OPTIONS',headers}),env)).status).toBe(403)
  const error=await handleCommunity(new Request(backend+'/api/submissions',{method:'POST',headers:{Origin:allowed}}),env)
  expect(error.status).toBe(410);expect(error.headers.get('access-control-allow-origin')).toBe(allowed)
  expect((await handleCommunity(new Request(backend+'/api/auth/session',{headers:{Origin:'https://evil.test'}}),env)).status).toBe(403)
 })
 it('keeps guest ownership across domains without cookies and revokes bearer sessions',async()=>{
  const {env}=await fixture();env.SESSION_TRANSPORT='bearer'
  const endpoint='https://community.workers.dev/api'
  async function call(path:string,method='GET',body?:unknown,session=''){
   const headers=new Headers({Origin:new URL(env.APP_URL!).origin})
   if(session)headers.set('Authorization','Bearer '+session)
   if(body!==undefined)headers.set('Content-Type','application/json')
   return handleCommunity(new Request(endpoint+path,{method,headers,body:body!==undefined?JSON.stringify(body):undefined}),env)
  }
  const result=await call('/modules/spectrum/comments','POST',{body:'Cross-domain guest'})
  const session=result.headers.get('X-Octamod-Session')!
  expect(session).toMatch(/^[a-f0-9]{64}$/);expect(result.headers.get('set-cookie')).toBeNull()
  expect(result.headers.get('access-control-expose-headers')).toBe('X-Octamod-Session')
  const mine=await (await call('/modules/spectrum','GET',undefined,session)).json();expect(mine.comments[0].canDelete).toBe(true)
  expect((await call('/submissions','POST',details,session)).status).toBe(410)
  const logout=await call('/auth/logout','POST',{},session);expect(logout.headers.get('X-Octamod-Session')).toBe('')
  expect((await (await call('/auth/session','GET',undefined,session)).json()).user).toBeNull()
 })
 it('has no website sign-in routes or GitHub identity in the session contract',async()=>{
  const {env}=await fixture();env.SESSION_TRANSPORT='bearer';env.APP_URL='https://octamod.github.io/octamod/'
  const endpoint='https://community.workers.dev/api',headers={Origin:'https://octamod.github.io','Content-Type':'application/json'}
  for(const path of ['/auth/github','/auth/github/callback','/auth/complete'])for(const method of ['GET','POST']){
   const result=await handleCommunity(new Request(endpoint+path,{method,headers,body:method==='POST'?'{}':undefined}),env)
   expect(result.status).toBe(410);expect(result.headers.get('location')).toBeNull();expect(result.headers.get('set-cookie')).toBeNull()
  }
  const session=await (await handleCommunity(new Request(endpoint+'/auth/session',{headers}),env)).text()
  expect(session).not.toMatch(/github/i)
 })
})
