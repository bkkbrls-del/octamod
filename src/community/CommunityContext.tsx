import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { PublishedModule, Session } from './api'
import { CommunityContext, emptySession } from './context'
export function CommunityProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState(emptySession),[catalog,setCatalog]=useState<PublishedModule[]>([])
 async function refresh(){try{const next=await api<Session>('/auth/session');setSession(next);if(next.available)setCatalog(await api<PublishedModule[]>('/catalog'))}catch{setSession(emptySession)}}
 useEffect(()=>{let cancelled=false;void api<Session>('/auth/session').then(next=>{if(cancelled)return;setSession(next);if(next.available)void api<PublishedModule[]>('/catalog').then(items=>{if(!cancelled)setCatalog(items)}).catch(()=>{})}).catch(()=>{});return()=>{cancelled=true}},[])
 return <CommunityContext.Provider value={{session,catalog,refresh}}>{children}</CommunityContext.Provider>
}
