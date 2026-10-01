import type { Env, User, Database } from './platform'
import { cookie, digest, HttpError, jsonBody, response, sessionValue, token } from './security'
/** Fixed actor row for administrator history; the administrator is not a visitor account. */
export const ADMIN_ACTOR='administrator'
const ADMIN_SECONDS=8*60*60
function configuredKey(env:Env){const value=env.ADMIN_KEY_SHA256?.trim().toLowerCase()??'';return /^[a-f0-9]{64}$/.test(value)?value:''}
function sameDigest(a:string,b:string){if(a.length!==b.length)return false;let difference=0;for(let index=0;index<a.length;index++)difference|=a.charCodeAt(index)^b.charCodeAt(index);return difference===0}
/** Administration is separate from guest sessions and fails closed until the backend owner configures a key. Rotating the key revokes every administrator session. */
export async function isAdmin(request:Request,env:Env,db:Database){
 const key=configuredKey(env),value=request.headers.get('X-Octamod-Admin')??''
 if(!key||!/^[a-f0-9]{64}$/.test(value))return false
 return !!await db.prepare('SELECT token_hash FROM admin_sessions WHERE token_hash=? AND key_hash=? AND expires>?').bind(await digest(value),await digest(key),Math.floor(Date.now()/1000)).first()
}
export async function currentUser(request:Request,db:Database):Promise<User|null>{
 const value=sessionValue(request);if(!/^[a-f0-9]{64}$/.test(value))return null
 return db.prepare('SELECT u.id,u.display_name FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?').bind(await digest(value),Math.floor(Date.now()/1000)).first<User>()
}
export async function throttle(db:Database,key:string,maximum:number,seconds=3600){
 const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/seconds)
 const result=await db.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(await digest(key+':'+bucket),now+seconds).first<{count:number}>()
 if(!result||result.count>maximum)throw new HttpError(429,'Too many requests. Please try again later.')
}
async function createSession(user:User,env:Env,db:Database){
 const value=token(),seconds=30*24*60*60
 await db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').bind(await digest(value),user.id,Math.floor(Date.now()/1000)+seconds).run()
 return { cookie: env.SESSION_TRANSPORT === 'bearer' ? undefined : cookie('octamod_session',value,env,seconds), sessionToken: env.SESSION_TRANSPORT === 'bearer' ? value : undefined }
}
export async function guest(request:Request,env:Env,db:Database,name:string):Promise<{user:User;cookie?:string;sessionToken?:string}>{
 const existing=await currentUser(request,db);if(existing)return {user:existing}
 await throttle(db,'visitor:'+ (request.headers.get('CF-Connecting-IP')??'local'),20,3600)
 const user:User={id:crypto.randomUUID(),display_name:name}
 await db.prepare('INSERT INTO users(id,display_name) VALUES(?,?)').bind(user.id,name).run()
 return {user,...await createSession(user,env,db)}
}
export async function authentication(request:Request,env:Env,path:string):Promise<Response|null>{
 const db=env.DB
 if(path==='/api/auth/session'&&request.method==='GET'){
  const user=db?await currentUser(request,db):null
  return response({available:!!db,admin:db?await isAdmin(request,env,db):false,user:user?{id:user.id,displayName:user.display_name}:null})
 }
 if(!path.startsWith('/api/auth/'))return null
 if(/^\/api\/auth\/(github(\/callback)?|complete)$/.test(path))throw new HttpError(410,'Octamod has no website sign-in. Comments, ratings, likes and issue reports work as a guest.')
 if(!db)throw new HttpError(503,'Community storage is not connected yet.')
 if(path==='/api/auth/logout'&&request.method==='POST'){
  await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(sessionValue(request))).run()
  const result=response({ok:true});result.headers.set('X-Octamod-Session','');if(env.SESSION_TRANSPORT!=='bearer')result.headers.append('Set-Cookie',cookie('octamod_session','',env,0));return result
 }
 if(path==='/api/auth/admin'&&request.method==='POST'){
  await throttle(db,'admin-key:'+(request.headers.get('CF-Connecting-IP')??'local'),5,900)
  const key=configuredKey(env);if(!key)throw new HttpError(503,'Administrator access has not been configured for this backend.')
  const body=await jsonBody(request)
  if(typeof body.key!=='string'||body.key.length<32||body.key.length>256||!sameDigest(await digest(body.key),key))throw new HttpError(403,'This administrator key was not accepted.')
  const value=token(),now=Math.floor(Date.now()/1000)
  await db.prepare('DELETE FROM admin_sessions WHERE expires<=?').bind(now).run()
  await db.prepare('INSERT INTO admin_sessions(token_hash,key_hash,expires) VALUES(?,?,?)').bind(await digest(value),await digest(key),now+ADMIN_SECONDS).run()
  return response({token:value,expires:now+ADMIN_SECONDS})
 }
 if(path==='/api/auth/admin'&&request.method==='DELETE'){
  await db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(request.headers.get('X-Octamod-Admin')??'')).run()
  return response({ok:true})
 }
 throw new HttpError(404,'Authentication route not found.')
}
