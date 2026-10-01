/// <reference lib="webworker" />
import { createEngineSession } from './session'
import type { EngineRequest } from './protocol'
const scope = self as DedicatedWorkerGlobalScope
const handle = createEngineSession((response, transfer = []) => scope.postMessage(response, transfer))
scope.onmessage = (event: MessageEvent<EngineRequest>) => { void handle(event.data) }
