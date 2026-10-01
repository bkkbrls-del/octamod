// Container codec ported from octabam's MIT-licensed make_bin.py / bin_decode.py.
// No firmware content is embedded. See /licenses/octabam.txt.
const MAGIC=0x454c5550, XOR_A=0x9e3b16a2, XOR_B=0x764e28ca, C3=0x360fa955, C7=0xef4a9ab6
function rot16(value:number){return ((value<<16)|(value>>>16))>>>0}
function swap(value:number){return ((value>>>24)|((value>>>8)&0xff00)|((value<<8)&0xff0000)|(value<<24))>>>0}
export function decodeWord(previous:number,cipher:number){return (previous^((previous&0x800000)?C7^swap(cipher^XOR_B):C3^rot16(cipher^XOR_A)))>>>0}
export function encodeWord(previous:number,plain:number){const value=(previous^((previous&0x800000)?C7:C3)^plain)>>>0;return ((previous&0x800000)?swap(value)^XOR_B:rot16(value)^XOR_A)>>>0}
export function decodeElup(bytes:Uint8Array):{container:Uint8Array;seed:number}{
 if(bytes.byteLength<20||bytes.byteLength%4||bytes.byteLength>64*1024*1024)throw new Error('The firmware update has an invalid length.')
 const input=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
 if(input.getUint32(0)!==MAGIC)throw new Error('The firmware update header is invalid.')
 const seed=input.getUint32(4),plain=new Uint8Array(bytes.byteLength-12),out=new DataView(plain.buffer)
 let previous=seed,sum=0
 for(let offset=8;offset<bytes.byteLength-4;offset+=4){const cipher=input.getUint32(offset),word=decodeWord(previous,cipher);out.setUint32(offset-8,word);sum=(sum+word)>>>0;previous=cipher}
 if(decodeWord(previous,input.getUint32(bytes.byteLength-4))!==sum)throw new Error('The firmware update checksum does not match.')
 const size=out.getUint32(0)
 if(size<18||size>plain.byteLength-4||plain.byteLength-4-size>3)throw new Error('The firmware container length is invalid.')
 for(let i=size+4;i<plain.length;i++)if(plain[i]!==0)throw new Error('The firmware update padding is invalid.')
 const container=plain.slice(4,size+4)
 if(String.fromCharCode(...container.slice(0,4))!=='ELEK')throw new Error('The firmware container header is invalid.')
 return {container,seed}
}
export function encodeElup(container:Uint8Array,seed:number):Uint8Array{
 if(container.byteLength<18||container.byteLength>64*1024*1024-16||String.fromCharCode(...container.slice(0,4))!=='ELEK')throw new Error('Choose a valid firmware container.')
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('The firmware seed is invalid.')
 const plain=new Uint8Array(Math.ceil((container.byteLength+4)/4)*4),view=new DataView(plain.buffer)
 view.setUint32(0,container.byteLength);plain.set(container,4)
 const bytes=new Uint8Array(plain.byteLength+12),out=new DataView(bytes.buffer)
 out.setUint32(0,MAGIC);out.setUint32(4,seed)
 let previous=seed,sum=0
 for(let offset=0;offset<plain.byteLength;offset+=4){const word=view.getUint32(offset),cipher=encodeWord(previous,word);out.setUint32(offset+8,cipher);sum=(sum+word)>>>0;previous=cipher}
 out.setUint32(bytes.byteLength-4,encodeWord(previous,sum))
 return bytes
}
