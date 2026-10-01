import { handleCommunity } from '../../server/transport'
import type { Env } from '../../server/platform'
export function onRequest(context: { request: Request; env: Env }) { return handleCommunity(context.request, context.env) }
