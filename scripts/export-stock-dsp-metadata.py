"""Export native stock DSP transformation metadata, never stock bytecode."""
import argparse, hashlib, json, os, pathlib, subprocess, sys


def digest(words):
    return hashlib.sha256(b''.join(word.to_bytes(3,'big') for word in words)).hexdigest()


def transform(source,target):
    assert len(source)==len(target)
    deltas=[]
    for offset,(old,new) in enumerate(zip(source,target)):
        if old!=new:
            delta=((new-old+0x800000)&0xffffff)-0x800000
            if abs(delta)>0x10000:raise RuntimeError('Transformation is not an address adjustment')
            deltas.append({'offset':offset,'delta':delta})
    return deltas


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('worktree',type=pathlib.Path);parser.add_argument('output',type=pathlib.Path)
    args=parser.parse_args();root=args.worktree.resolve();destination=args.output.resolve()
    app=pathlib.Path(__file__).resolve().parents[1]
    expected=json.loads((app/'src/catalog/native-metadata.json').read_text())['revision']
    revision=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
    if revision!=expected:parser.error('Use the catalog-pinned native worktree.')
    if subprocess.run(['git','-C',str(root),'diff','--quiet','HEAD']).returncode:parser.error('Native tracked sources must be clean.')
    os.chdir(root);sys.path[:0]=[str(root/'tools/build'),str(root/'tools')]
    import dsp_modmap as dm
    from experimental.dsp_dynload.stock_catalog import build
    from experimental.dsp_dynload.runtime_catalog import dynamic_layout,dynamic_package,SHARED
    image=dm.IMG.read_bytes();rows=build()
    result={'schema':1,'revision':revision,'sourceSha256':hashlib.sha256(image).hexdigest(),'payloads':[]}
    for tag,va,length in dm.PAYLOADS:
        core=0 if tag=='A' else 1;records,blob=dm.modules(image,va,length)
        start=min(row['p_base'] for row in rows if row['core']==core and row['p_words'])
        helpers,copies,shared_end,reclaimed=dynamic_layout(rows,core,start)
        payload={'tag':tag,'core':core,'sourceOffset':va-dm.BASE,'bytes':length,'sha256':hashlib.sha256(blob).hexdigest(),'effectStart':start,'effectEnd':reclaimed[0][1],'sharedEnd':shared_end,'records':[{'space':sp,'address':addr,'count':count,'dataOffset':offset} for sp,addr,count,offset in records],'shared':[],'packages':[]}
        for (owner,offset,count),(address,words) in zip(SHARED,copies):
            row=next(row for row in rows if row['core']==core and row['key']==owner)
            source=row['p_words'][offset:offset+count]
            payload['shared'].append({'owner':owner,'sourceAddress':row['p_base']+offset,'words':count,'destination':address,'sourceSha256':digest(source),'sha256':digest(words),'adjustments':transform(source,words)})
        for row in rows:
            if row['core']!=core or not row['p_words']:continue
            package=dynamic_package(row,reclaimed,helpers);source=row['p_words'][:len(package['words'])]
            proofs=[]
            for base in (0x1000,0x1801,0x2407):
                placed=list(package['words'])
                for reloc in package['relocations']:
                    index=reloc&0x7fff
                    placed[index]=(placed[index]+(-base if reloc&0x8000 else base))&0xffffff
                proofs.append({'base':base,'sha256':digest(placed)})
            payload['packages'].append({'key':row['key'],'fxId':row['fx_id'],'slots':row['slots'],'sourceAddress':row['p_base'],'words':len(source),'sourceSha256':digest(source),'sha256':digest(package['words']),'init':package['init'],'proc':package['proc'],'adjustments':transform(source,package['words']),'relocations':package['relocations'],'proofs':proofs})
        result['payloads'].append(payload)
    destination.write_text(json.dumps(result,indent=2)+'\n')
    print('Exported two payload maps, 26 stock-package recipes, six shared-copy recipes; no firmware words retained.')


if __name__=='__main__':main()
