import { describe, expect, it } from 'vitest'
import { checkSelection } from './compatibility'
import { MODULES } from './modules'
import { moduleBuildPending } from './build-support'
describe('declarative compatibility',()=>{
 it('checks every nonempty selection in the verified native profile against its pinned ledger',()=>{const supported=MODULES.filter(module=>!moduleBuildPending(module.id));expect(supported).toHaveLength(7);for(let mask=1;mask<1<<supported.length;mask++){const ids=supported.filter((_,index)=>mask&(1<<index)).map(m=>m.id);expect(checkSelection(ids).checked).toBe(true);expect(checkSelection(ids).issues).toEqual([])}})
 it('refuses unknown modules and does not call an empty configuration checked',()=>{expect(()=>checkSelection(['unknown'])).toThrow();expect(checkSelection([]).checked).toBe(false)})
})
