"""Export synthetic catalog oracles and stock buffer-read flags, never stock words."""
import argparse, hashlib, json, os, pathlib, subprocess, sys, tempfile, shutil


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('worktree',type=pathlib.Path);parser.add_argument('destination',type=pathlib.Path)
    args=parser.parse_args();root=args.worktree.resolve();dest=args.destination.resolve()
    app=pathlib.Path(__file__).resolve().parents[1]
    revision=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
    expected=json.loads((app/'src/catalog/native-metadata.json').read_text())['revision']
    if revision!=expected:parser.error('Use the catalog-pinned native worktree.')
    if subprocess.run(['git','-C',str(root),'diff','--quiet','HEAD']).returncode:parser.error('Native tracked sources must be clean.')
    os.chdir(root);sys.path[:0]=[str(root/'tools/build'),str(root/'tools')]
    import toolpath
    from experimental.dsp_dynload import runtime_catalog as rc
    from remix.platform_build import _run,_nm
    from remix.registry import modules
    known=modules()
    byid={module.name:module for module in known.values()}
    packages=json.loads((app/'src/engine/assets/dsp-packages.json').read_text())
    flags={'schema':1,'revision':revision,'sourceSha256':json.loads((app/'src/engine/assets/stock-dsp-metadata.json').read_text())['sourceSha256'],'stock':rc.buffer_reads({}),'modules':[]}
    for package in packages['packages']:
        raw=bytes.fromhex(package['code']);words=[int.from_bytes(raw[i:i+3],'big') for i in range(0,len(raw),3)]
        flags['modules'].append({'id':package['id'],'fxId':package['fxId'],'sha256':package['sha256'],'readsBase':rc._init_reads_base(words,0,package['init']),'needsColdFire':bool(byid[package['id']].linked or byid[package['id']].runtime)})
    cases=[
        {'name':'empty catalog','base':0,'packages':[],'qualifiedMask':0xffffffff,'stubAtBoot':0,'pmap16':False,'slots':[3]*32,'reads':[0]*32},
        {'name':'empty relocation table and bit 31','base':0xfffe0000,'packages':[{'core':0,'fxId':31,'words':[0x123456],'relocations':[],'init':0,'proc':0}],'qualifiedMask':0x80000000,'stubAtBoot':0x80000000,'pmap16':True,'slots':[3]*32,'reads':[int(p==31) for p in range(32)]},
        {'name':'insertion order, alignment and both relocation signs','base':0x48a04000,'packages':[{'core':1,'fxId':6,'words':[1,2,3,4,5],'relocations':[0,0x8003],'init':1,'proc':4},{'core':0,'fxId':10,'words':[0xabcdef,0,0x654321],'relocations':[1],'init':0,'proc':2},{'core':0,'fxId':6,'words':[9,8,7,6,5],'relocations':[1,0x8003],'init':0,'proc':4}],'qualifiedMask':0x80000440,'stubAtBoot':0x440,'pmap16':False,'slots':[p%4 for p in range(32)],'reads':[p%2 for p in range(32)]},
        {'name':'asymmetric core table','base':0x1000,'packages':[{'core':1,'fxId':5,'words':[1,2],'relocations':[0],'init':0,'proc':1}],'qualifiedMask':0x20,'stubAtBoot':0x20,'pmap16':False,'slots':[2]*32,'reads':[0]*32},
    ]
    for case in cases:
        data={(pkg['core'],pkg['fxId']):{key:value for key,value in pkg.items() if key not in ('core','fxId')} for pkg in case['packages']}
        source=rc._catalog(data,{p for p in range(32) if case['qualifiedMask']>>p&1},lambda p,pkg:case['slots'][p],case['stubAtBoot'],case['reads'],int(case['pmap16']))
        with tempfile.TemporaryDirectory(prefix='octamod-catalog-oracle.') as temporary:
            work=pathlib.Path(temporary);asm=work/'catalog.s';obj=work/'catalog.o';elf=work/'catalog.elf';raw=work/'catalog.bin';linker=work/'catalog.ld'
            asm.write_text(source)
            _run(['m68k-elf-as','-mcpu=54455','-o',obj,asm],work)
            linker.write_text(f'SECTIONS {{ .rodata 0x{case["base"]:x} : {{ *(.rodata) }} }}\n')
            _run(['m68k-elf-ld','--entry=dl_catalog','-T',linker,'-o',elf,obj],work)
            _run(['m68k-elf-objcopy','-O','binary','--only-section=.rodata',elf,raw],work)
            output=raw.read_bytes()
            case['expected']={'bytes':len(output),'sha256':hashlib.sha256(output).hexdigest(),'symbols':{key:value for key,value in _nm(elf,work).items() if key.startswith('dl_')}}
    # Real-stock results are retained only as hashes and symbol addresses.
    os.environ.update(REMIX='miniverb',XBUS='1',SPEC='1',DEV='0',OCTABAM_STATIC_STOCK='0',NOROUNDTRIP='0')
    import build_bus as native
    from remix.registry import modules
    known=modules()
    byid={module.name:module for module in known.values()}
    order=['spectrum','modulation','character','miniverb','tapeecho','euclid','repitch']
    selections=[[],['miniverb'],['spectrum','modulation','miniverb','euclid'],order,['euclid','spectrum']]
    proofs=[]
    try:
        for index,ids in enumerate(selections):
            selected=[byid[id] for id in order if id in ids]
            native.CARRIED=[module.key for module in selected if module.menu is not None]
            native._CLONED=[module for module in selected if module.menu is not None and not module.is_stock]
            for module in selected:
                if module.dsp:native.ASM_SRC[module.key]=module.dsp.asm
            native._loadables()
            source=rc.include_dynamic({module.key:module for module in selected})
            base=0x48a04000+index*0x40
            with tempfile.TemporaryDirectory(prefix='octamod-real-catalog.') as temporary:
                work=pathlib.Path(temporary);asm=work/'catalog.s';obj=work/'catalog.o';elf=work/'catalog.elf';raw=work/'catalog.bin';linker=work/'catalog.ld'
                asm.write_text(source);linker.write_text(f'SECTIONS {{ .rodata 0x{base:x} : {{ *(.rodata) }} }}\n')
                _run(['m68k-elf-as','-mcpu=54455','-o',obj,asm],work)
                _run(['m68k-elf-ld','--entry=dl_catalog','-T',linker,'-o',elf,obj],work)
                _run(['m68k-elf-objcopy','-O','binary','--only-section=.rodata',elf,raw],work)
                output=raw.read_bytes()
                proofs.append({'moduleIds':ids,'base':base,'bytes':len(output),'sha256':hashlib.sha256(output).hexdigest(),'symbols':{key:value for key,value in _nm(elf,work).items() if key.startswith('dl_')}})
    finally:
        if native._SCRATCH is not None:shutil.rmtree(native._SCRATCH,ignore_errors=True)
    dest.mkdir(parents=True,exist_ok=True)
    (dest/'runtime-catalog-flags.json').write_text(json.dumps(flags,indent=2)+'\n')
    (dest/'runtime-catalog-oracles.json').write_text(json.dumps({'schema':1,'revision':revision,'cases':cases},indent=2)+'\n')
    (dest/'runtime-catalog-proofs.json').write_text(json.dumps({'schema':1,'revision':revision,'sourceSha256':flags['sourceSha256'],'cases':proofs},indent=2)+'\n')
    print('Five real-stock catalog fingerprints, four synthetic native catalog oracles and fingerprint-bound buffer-read flags exported; no stock words retained.')


if __name__=='__main__':main()
