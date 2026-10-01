import { handleCommunity } from './server/transport'
import type { Env } from './server/platform'
export default { fetch(request: Request, env: Env) { return handleCommunity(request, env) } }
