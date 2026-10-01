"""Facts for loader-free (static stock) DSP placement, from the pinned native registry. No stock bytes exported."""
import argparse,hashlib,json,os,pathlib,subprocess,sys
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('worktree',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);p.add_argument('--app',type=pathlib.Path,required=True)
    a=p.parse_args();root=a.worktree.resolve();app=a.app.resolve();dest=a.output.resolve()
    rev=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
    if rev!=json.loads((app/'src/catalog/native-metadata.json').read_text())['revision']:p.error('Use the catalog-pinned native worktree.')
    if subprocess.run(['git','-C',str(root),'diff','--quiet','HEAD']).returncode:p.error('Native tracked sources must be clean.')
    stock=(root/'out/raw/section_3_MAIN_OS.bin').read_bytes();stockmeta=json.loads((app/'src/engine/assets/stock-dsp-metadata.json').read_text())
    if sha(stock)!=stockmeta['sourceSha256']:p.error('The original OS fingerprint is invalid.')
    os.chdir(root);sys.path[:0]=[str(root/'tools/build'),str(root/'tools')]
    os.environ.update(REMIX='miniverb',XBUS='1',SPEC='1',DEV='0',NOROUNDTRIP='0',OCTABAM_STATIC_STOCK='1',OCTABAM_NO_CACHE='1',BUILD='79')
    import toolpath,build_bus as native,dsp_modmap as dm
    dm.IMG=root/'out/raw/section_3_MAIN_OS.bin'
    from remix import registry
    known=registry.modules()
    order=['spectrum','modulation','character','miniverb','tapeecho','euclid','repitch']
    byid={m.name:m for m in known.values()}
    # schema.DspSection.priority orders placement in the given-up region; ties keep catalog order.
    modules=[{'id':id,'key':byid[id].key,'fxId':byid[id].menu.fx2_id,'priority':byid[id].dsp.priority} for id in order if byid[id].dsp is not None]
    # build_bus `_omitted`: custom modules with a menu that a remix may leave out; their DSP ids resolve to the null stub.
    custom=sorted(m.menu.fx2_id for m in known.values() if m.menu is not None and not m.is_stock and not m.menu.replaces)
    payloads=[{'core':0 if tag=='A' else 1,'tag':tag,'nullInit':native.PP[tag]['nul_i'],'nullProc':native.PP[tag]['nul_p']} for tag in 'AB']
    result={'schema':1,'revision':rev,'sourceSha256':stockmeta['sourceSha256'],'noneId':native.NONE_ID,'modules':modules,'customIds':custom,'payloads':payloads}
    dest.write_text(json.dumps(result,indent=2)+'\n')
    print(f'{len(modules)} placeable DSP modules, {len(custom)} custom ids, null stubs per core; no stock bytes retained.')
if __name__=='__main__':main()
