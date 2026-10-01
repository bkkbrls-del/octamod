"""Export stock-byte-free platform write guards and local native fingerprints."""
import argparse,hashlib,json,os,pathlib,subprocess,sys
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('worktree',type=pathlib.Path);p.add_argument('destination',type=pathlib.Path);p.add_argument('--app',type=pathlib.Path,required=True)
    a=p.parse_args();root=a.worktree.resolve();app=a.app.resolve();dest=a.destination.resolve()
    revision=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
    if revision!=json.loads((app/'src/catalog/native-metadata.json').read_text())['revision']:p.error('Use the catalog-pinned native worktree.')
    if subprocess.run(['git','-C',str(root),'diff','--quiet','HEAD']).returncode:p.error('Native tracked sources must be clean.')
    stock=(root/'out/raw/section_3_MAIN_OS.bin').read_bytes();sourceSha=json.loads((app/'src/engine/assets/stock-dsp-metadata.json').read_text())['sourceSha256']
    if sha(stock)!=sourceSha:p.error('The local original OS fingerprint is invalid.')
    os.chdir(root);sys.path[:0]=[str(root/'tools/build'),str(root/'tools')]
    import toolpath
    from remix import arena,platform_build
    from remix.registry import modules
    known=modules();base=0x40000400
    def guard(addr,expected,note):
        if stock[addr-base:addr-base+len(expected)]!=expected:raise ValueError('Native write guard does not match the original OS.')
        return {'address':addr,'length':len(expected),'sha256':sha(expected),'note':note}
    arenaRows=[]
    for addr,expect,write,note in arena.pokes([('octabam platform','bottom',arena.PLATFORM_PAGES)]):
        arenaRows.append({**guard(addr,expect,note),'value':int.from_bytes(write,'big')})
    bootExpected=b'\x4e\xb9'+(0x40001e50).to_bytes(4,'big')
    boot=guard(0x4000050c,bootExpected,'boot to octabam loader')
    groups=[]
    for key in ['DSP DYNLOAD STOCK','TAPE ECHO','EUCLID']:
        module=known[key];rows=[]
        for d in module.detours:
            if d.kind not in ['jmp','jsr'] or d.target is not None:raise ValueError('Unproven detour profile.')
            length=d.pad_to or 6
            if length>len(d.expect) or length<6 or length%2:raise ValueError('Unproven detour padding profile.')
            rows.append({**guard(d.site,d.expect,d.note),'unit':d.unit,'symbol':d.symbol,'kind':d.kind,'writeLength':length})
        groups.append({'moduleId':module.name,'key':module.key,'author':module.author,'source':f'modules/{module.name}/manifest.py','sourceSha256':sha((root/f'modules/{module.name}/manifest.py').read_bytes()),'detours':rows})
    cases=[];runtimeProof=json.loads((app/'src/engine/assets/coldfire-runtime-proofs.json').read_text())
    for case in runtimeProof['cases']:
        img=bytearray(stock);ranges=[]
        def write(addr,data,note):
            if any(addr<end and start<addr+len(data) for start,end in ranges):raise ValueError('Native write overlap.')
            ranges.append((addr,addr+len(data)));img[addr-base:addr-base+len(data)]=data
        for addr,expect,data,note in arena.pokes([('octabam platform','bottom',arena.PLATFORM_PAGES)]):write(addr,data,note)
        write(boot['address'],b'\x4e\xb9'+platform_build.LOADER_AT.to_bytes(4,'big'),boot['note'])
        for group in groups:
            if group['moduleId']!='dsp-dynload-stock' and group['moduleId'] not in case['moduleIds']:continue
            for d in known[group['key']].detours:
                target=case['symbols'][d.symbol];length=d.pad_to or 6
                data={'jmp':b'\x4e\xf9','jsr':b'\x4e\xb9'}[d.kind]+target.to_bytes(4,'big')+b'\x4e\x71'*((length-6)//2)
                write(d.site,data,d.note)
        cases.append({'moduleIds':case['moduleIds'],'writes':len(ranges),'bytes':len(img),'sha256':sha(img)})
    result={'schema':1,'revision':revision,'sourceSha256':sourceSha,'osBase':base,'osBytes':len(stock),'scope':'Platform arena, boot and DRAM detours only; not complete firmware.','arenaSourceSha256':sha((root/'tools/remix/arena.py').read_bytes()),'arena':arenaRows,'boot':boot,'groups':groups,'cases':cases}
    dest.write_text(json.dumps(result,indent=2)+'\n')
    print(f'{len(arenaRows)} arena guards, {sum(len(g["detours"]) for g in groups)} DRAM detour guards, {len(cases)} native partial-OS fingerprints. No firmware bytes exported.')
if __name__=='__main__':main()
