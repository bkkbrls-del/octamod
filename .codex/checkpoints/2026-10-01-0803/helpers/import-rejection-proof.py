from pathlib import Path
import tempfile,subprocess,json,hashlib,shutil
app=Path('/Users/jannikassfalg/coding/octamod.pages.dev')
source=Path('/private/tmp/octamod-source-build-proof-v3-20261001')
sha=lambda b:hashlib.sha256(b).hexdigest()
def run(folder,expected=None):
 p=subprocess.run(['node','scripts/import-module-build.mjs',str(folder),'--development','--check-only'],cwd=app,capture_output=True,text=True)
 if expected is None: assert p.returncode==0,p.stderr
 else: assert p.returncode!=0 and expected in p.stderr,p.stdout+p.stderr
assets=app/'src/engine/assets'
before={p.name:sha(p.read_bytes()) for p in assets.glob('*.json')}
with tempfile.TemporaryDirectory(prefix='octamod-artifact-rejections.') as temp:
 root=Path(temp)
 def fresh(name):
  dest=root/name;shutil.copytree(source,dest);return dest
 run(source)
 case=fresh('corrupt');p=case/'dsp-packages.json';p.write_bytes(p.read_bytes()+b' ');run(case,'Corrupt compiled artifact')
 case=fresh('stale-version');p=case/'module-build.json';doc=json.loads(p.read_text());doc['moduleVersions']['spectrum']='0.0.1';p.write_text(json.dumps(doc));run(case,'Stale compiled module version')
 case=fresh('stale-source');p=case/'module-build.json';doc=json.loads(p.read_text());doc['sources']['modules/spectrum/README.md']='a'*64;p.write_text(json.dumps(doc));run(case,'Compiled source is stale')
 case=fresh('incomplete');p=case/'module-build.json';doc=json.loads(p.read_text());doc['sources'].pop(next(iter(doc['sources'])));p.write_text(json.dumps(doc));run(case,'source inventory is incomplete')
 case=fresh('stock-read');p=case/'module-build.json';doc=json.loads(p.read_text());doc['stockRead']=True;p.write_text(json.dumps(doc));run(case,'Invalid stock-free')
 case=fresh('stock-tail');p=case/'resident-dsp.json';doc=json.loads(p.read_text());doc['variants'][0]['code']=doc['variants'][0]['code'][:-6]+'00000c';p.write_text(json.dumps(doc));report=json.loads((case/'module-build.json').read_text());report['files'][p.name]={'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())};(case/'module-build.json').write_text(json.dumps(report));run(case,'zero placeholders')
assert before=={p.name:sha(p.read_bytes()) for p in assets.glob('*.json')},'Rejection proofs changed frontend assets'
print('Valid development artifact accepted; corrupt artifact, stale version/source, incomplete inventory, stock-read declaration and stock-tail content all rejected without changing frontend assets.')
