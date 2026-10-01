import { createContext, useContext } from 'react'
import type { PublishedModule, Session } from './api'
export const emptySession:Session={available:false,admin:false,user:null}
export const CommunityContext=createContext<{session:Session;catalog:PublishedModule[];refresh:()=>Promise<void>}>({session:emptySession,catalog:[],refresh:async()=>{}})
export function useCommunity(){return useContext(CommunityContext)}
