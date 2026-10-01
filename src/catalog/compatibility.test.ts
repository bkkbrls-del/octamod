import { describe, expect, it } from 'vitest'
import { checkSelection } from './compatibility'
import { MODULES } from './modules'
describe('declarative compatibility',()=>{
 it('checks every nonempty selection in the verified native profile against its pinned ledger',()=>{const supported=MODULES.filter(module=>['spectrum','modulation','character','miniverb','tapeecho','euclid','repitch'].includes(module.id));expect(supported).toHaveLength(7);for(let mask=1;mask<1<<supported.length;mask++){const ids=supported.filter((_,index)=>mask&(1<<index)).map(m=>m.id);expect(checkSelection(ids).checked).toBe(true);expect(checkSelection(ids).issues).toEqual([])}})
 it('has recorded declaration checks for every requested buildable eight-module subset',()=>{const visible=MODULES.filter(module=>!['spectrum','modulation','character','midi-scenes'].includes(module.id));expect(visible).toHaveLength(7);for(let mask=1;mask<1<<visible.length;mask++){const ids=visible.filter((_,index)=>mask&(1<<index)).map(m=>m.id);expect(checkSelection(ids).notes).toEqual([])}})
 it('notes pending MIDI Scenes without treating the selection as checked',()=>{expect(checkSelection(['midi-scenes']).checked).toBe(false);expect(checkSelection(['midi-scenes']).notes.join(' ')).toContain('awaiting Octamod verification');expect(checkSelection(['repitch','midi-scenes']).checked).toBe(false)})
 it('refuses unknown modules and does not call an empty configuration checked',()=>{expect(()=>checkSelection(['unknown'])).toThrow();expect(checkSelection([]).checked).toBe(false)})
})
