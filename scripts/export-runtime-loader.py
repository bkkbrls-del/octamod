"""Firmware-free native packing and bootstrap proofs for Octamod."""
import argparse,hashlib,json,os,pathlib,subprocess,sys,tempfile,struct

def sha(data):return hashlib.sha256(data).hexdigest()
def identity(data):return {'bytes':len(data),'sha256':sha(data)}
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('worktree',type=pathlib.Path);p.add_argument('destination',type=pathlib.Path);p.add_argument('--app',type=pathlib.Path,required=True)
    a=p.parse_args();root=a.worktree.resolve();app=a.app.resolve();dest=a.destination.resolve()
    revision=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
    if revision!=json.loads((app/'src/catalog/native-metadata.json').read_text())['revision']:p.error('Use the catalog-pinned native worktree.')
    if subprocess.run(['git','-C',str(root),'diff','--quiet','HEAD']).returncode:p.error('Native tracked sources must be clean.')
    os.chdir(root);sys.path[:0]=[str(root/'tools/build'),str(root/'tools')]
    import toolpath
    from remix import runtime_build as rb,platform_build as pb,arena
    vectors=[('one literal',b'\xa5',4096),('all byte values',bytes(range(256)),4096),('short and reused offsets',b'ABCxABCyABCzAB'+b'ab'*43+b'Z'+b'ab'*45,4096),('long overlapping match',b'Q'*32774,4096)]
    state=0x71234567;noise=bytearray()
    for i in range(4300):
        state=(1664525*state+1013904223)&0xffffffff;noise.append(state>>24)
    marker=bytes(range(128))
    vectors.append(('far offset',marker+bytes(noise)+marker,4096))
    collision=b'ABCabcdefghijk!ABCz?ABCabcdefghijk'
    vectors += [('candidate chain '+str(n),bytes(collision),n) for n in [1,4,4096]]
    cases=[];loaders=[]
    with tempfile.TemporaryDirectory(prefix='octamod-own-loader.') as tmp:
        work=pathlib.Path(tmp)
        (work/'table.inc').write_text('        .long 1\n        .long blob0,0,0,0,0,0,0,0\n        .align 4\nblob0:\n')
        obj=work/'template.o';pb._run(['m68k-elf-as','-mcpu=5475','-I',work,'-o',obj,root/'tools/remix/loader.S'],work)
        data=obj.read_bytes()
        package={'schema':1,'revision':revision,'cpu':'5475','license':['/licenses/octabam.txt','/licenses/ems-octakit.txt'],'source':'tools/remix/loader.S','sourceSha256':sha((root/'tools/remix/loader.S').read_bytes()),'bytes':len(data),'code':data.hex(),'sha256':sha(data),'loaderAddress':pb.LOADER_AT,'runtimeBase':arena.BASE,'reserveBytes':arena.PLATFORM_PAGES*arena.PAGE,'uncachedAlias':pb.UNCACHED,'stageAlignment':pb.STAGE_ALIGN}
        for index,(name,raw,candidates) in enumerate(vectors):
            packed=rb._pack(raw,candidates)
            ops=rb._greedy_parse(raw,candidates);matches=[o for o in ops if isinstance(o,tuple)]
            prior=None;reuse=0
            for off,length in matches:
                if off==prior:reuse+=1
                prior=off
            cases.append({'name':name,'inputHex':raw.hex(),'maxCandidates':candidates,'expected':{**identity(packed),'longestMatch':max([o[1] for o in matches],default=0),'farMatches':sum(o[0]>rb.MAX_OFFSET_FOR_LEN2 for o in matches),'reusedOffsets':reuse}})
            if candidates!=4096:continue
            gka3=rb.PACKED_MAGIC+len(raw).to_bytes(4,'big')+packed;blob=pb.SIGNATURE+gka3
            stage=(arena.BASE+len(raw)+pb.STAGE_ALIGN-1)&~(pb.STAGE_ALIGN-1)
            entry=dict(name='octabam',blob=blob,stage=stage+pb.UNCACHED,dst=arena.BASE+pb.UNCACHED,rawlen=len(raw),rhash=pb.roll(raw),backup=0)
            append,_,_,_=pb.build([], [entry],work/str(index))
            loaders.append({'case':index,'expected':{**identity(append),'stage':stage,'stageEnd':stage+len(blob),'rawHash':pb.roll(raw),'packedHash':pb.roll(gka3)}})
    dest.mkdir(parents=True,exist_ok=True)
    (dest/'runtime-packing-oracles.json').write_text(json.dumps({'schema':1,'revision':revision,'cases':cases},indent=2)+'\n')
    (dest/'bootstrap-package.json').write_text(json.dumps(package,indent=2)+'\n')
    (dest/'bootstrap-oracles.json').write_text(json.dumps({'schema':1,'revision':revision,'cases':loaders},indent=2)+'\n')
    print(f'{len(cases)} synthetic packing proofs, {len(loaders)} native bootstrap proofs, one authored template; no firmware read or retained.')
if __name__=='__main__':main()
