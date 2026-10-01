import { describe, expect, it } from 'vitest'
import { checkSelection } from './compatibility'
import { MODULES } from './modules'
describe('declarative compatibility',()=>{
 it('checks every nonempty selection against the pinned native ledger',()=>{for(let mask=1;mask<1<<MODULES.length;mask++){const ids=MODULES.filter((_,index)=>mask&(1<<index)).map(m=>m.id);expect(checkSelection(ids).checked).toBe(true);expect(checkSelection(ids).issues).toEqual([])}})
 it('refuses unknown modules and does not call an empty configuration checked',()=>{expect(()=>checkSelection(['unknown'])).toThrow();expect(checkSelection([]).checked).toBe(false)})
})
