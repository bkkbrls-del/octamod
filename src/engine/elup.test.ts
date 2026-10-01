import { describe, expect, it } from 'vitest'
import { decodeElup, decodeWord, encodeElup, encodeWord } from './elup'
function synthetic(size:number){const result=Uint8Array.from({length:size},(_,i)=>(i*37)&255);result.set([69,76,69,75]);return result}
describe('local update container codec',()=>{
 it('handles both feedback variants and unsigned arithmetic',()=>{for(const seed of [0,0x800000,0xffffffff,0x2f1349d2])for(const word of [0,1,0x80000000,0xffffffff,0x9e3b16a2])expect(decodeWord(seed,encodeWord(seed,word))).toBe(word)})
 it('round-trips synthetic containers at every word alignment',()=>{for(const size of [18,19,20,21,1023]){const container=synthetic(size),decoded=decodeElup(encodeElup(container,0x2f1349d2));expect(decoded.container).toEqual(container);expect(decoded.seed).toBe(0x2f1349d2)}})
 it('rejects corruption, invalid headers, lengths, containers and seeds',()=>{const bytes=encodeElup(synthetic(19),0);bytes[bytes.length-1]^=1;expect(()=>decodeElup(bytes)).toThrow('checksum');expect(()=>decodeElup(new Uint8Array(16))).toThrow('length');expect(()=>decodeElup(new Uint8Array(20))).toThrow('header');expect(()=>encodeElup(new Uint8Array(19),0)).toThrow('container');expect(()=>encodeElup(synthetic(18),-1)).toThrow('seed')})
})
