"""Local stock-derived native runtime fingerprints; never retain stock words."""
import argparse,hashlib,json,os,pathlib,shutil,subprocess,sys,tempfile
import importlib.util
helper_path=pathlib.Path(__file__).with_name('export-coldfire-packages.py')
helper_spec=importlib.util.spec_from_file_location('coldfire_exports',helper_path)
helper=importlib.util.module_from_spec(helper_spec);helper_spec.loader.exec_module(helper)
symbols,allocated_sections=helper.symbols,helper.allocated_sections

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('worktree',type=pathlib.Path);parser.add_argument('destination',type=pathlib.Path)
    args=parser.parse_args();root=args.worktree.resolve();destination=args.destination.resolve();app=pathlib.Path(__file__).resolve().parents[1]
    revision=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
    expected=json.loads((app/'src/catalog/native-metadata.json').read_text())['revision']
    if revision!=expected:parser.error('Use the catalog-pinned native worktree.')
    if subprocess.run(['git','-C',str(root),'diff','--quiet','HEAD']).returncode:parser.error('Native tracked sources must be clean.')
    metadata=json.loads((app/'src/engine/assets/stock-dsp-metadata.json').read_text());image=root/'out/raw/section_3_MAIN_OS.bin'
    if hashlib.sha256(image.read_bytes()).hexdigest()!=metadata['sourceSha256']:parser.error('The local user-supplied stock OS does not match the catalog fingerprint.')
    os.chdir(root);sys.path[:0]=[str(root/'tools/build'),str(root/'tools')]
    os.environ.update(REMIX='miniverb',XBUS='1',SPEC='1',DEV='0',OCTABAM_STATIC_STOCK='0',NOROUNDTRIP='0')
    import build_bus as native
    from experimental.dsp_dynload import runtime_catalog as rc
    from remix.registry import modules,with_platform
    from remix.schema import Remix
    from remix.platform_build import link_runtime
    from remix import arena, platform_build, runtime_build
    known=modules();byid={module.name:module for module in known.values()};order=['spectrum','modulation','character','miniverb','tapeecho','euclid','repitch']
    selections=[[],['miniverb'],['euclid'],['tapeecho'],['euclid','tapeecho'],['spectrum','modulation','miniverb','euclid'],order,['euclid','spectrum']]
    cases=[]
    try:
        for ids in selections:
            selected=[byid[id] for id in order if id in ids]
            native.CARRIED=[module.key for module in selected if module.menu is not None]
            native._CLONED=[module for module in selected if module.menu is not None and not module.is_stock]
            for module in selected:
                if module.dsp:native.ASM_SRC[module.key]=module.dsp.asm
            native._loadables()
            remix=with_platform(Remix(name='octamod-proof',doc='Local browser runtime oracle, never flashed',modules=tuple(module.key for module in selected),fallback='NONE'),known)
            units=[(key,unit) for key in remix.modules for unit in known[key].linked if unit.dram]
            includes={unit.label:unit.include({key:known[key] for key in remix.modules}) for key,unit in units if unit.include is not None}
            with tempfile.TemporaryDirectory(prefix='octamod-local-runtime.') as tmp:
                work=pathlib.Path(tmp);raw,nm=link_runtime(units,work,{},arena.BASE,includes)
                globals={name for obj in work.glob('*.o') for name in symbols(obj.read_bytes())}
                packed=runtime_build.PACKED_MAGIC+len(raw).to_bytes(4,'big')+runtime_build._pack(raw,platform_build.MAX_CANDIDATES)
                stage=(arena.BASE+len(raw)+platform_build.STAGE_ALIGN-1)&~(platform_build.STAGE_ALIGN-1)
                entry=dict(name='octabam',blob=platform_build.SIGNATURE+packed,stage=stage+platform_build.UNCACHED,dst=arena.BASE+platform_build.UNCACHED,rawlen=len(raw),rhash=platform_build.roll(raw),backup=0)
                if stage+len(entry['blob'])>arena.BASE+arena.PLATFORM_PAGES*arena.PAGE:raise ValueError('Runtime stage exceeds the native reserve.')
                append,_,_,_=platform_build.build([], [entry],work/'bootstrap')
                bootstrap={'bytes':len(append),'sha256':hashlib.sha256(append).hexdigest(),'stage':stage,'stageEnd':stage+len(entry['blob']),'rawHash':platform_build.roll(raw),'packedHash':platform_build.roll(packed)}
                cases.append({'bootstrap':bootstrap,'moduleIds':ids,'units':[unit.label for _,unit in units],'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'symbols':{name:nm[name] for name in sorted(globals)},'sections':allocated_sections((work/'runtime.elf').read_bytes())})
    finally:
        if native._SCRATCH is not None:shutil.rmtree(native._SCRATCH,ignore_errors=True)
    destination.write_text(json.dumps({'schema':1,'revision':revision,'sourceSha256':metadata['sourceSha256'],'base':arena.BASE,'arenaSourceSha256':hashlib.sha256((root/'tools/remix/arena.py').read_bytes()).hexdigest(),'cases':cases},indent=2)+'\n')
    print(f'{len(cases)} native runtime and bootstrap fingerprints; temporary stock-derived outputs removed. No stress tests or emulators run.')
if __name__=='__main__':main()
