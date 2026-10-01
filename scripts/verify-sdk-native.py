from pathlib import Path
import contextlib, hashlib, importlib, io, json, os, shutil, sys, tempfile

import argparse
parser = argparse.ArgumentParser(description="Compare the trimmed SDK against pinned native composition identities, using your own local original OS. No emulator, audio-render or stress checks run.")
parser.add_argument('--raw-os', type=Path, required=True, help='Your locally extracted original 1.40C main OS; never upload or commit it')
parser.add_argument('--vendor', type=Path, required=True, help='Your patched native toolchain vendor directory; read only')
args = parser.parse_args()
app = Path(__file__).resolve().parents[1]
catalog = json.loads((app / 'sdk/catalog.json').read_text())
pending = [item['id'] for item in catalog['modules']
           if json.loads((app / 'sdk/octabam/modules' / item['id'] / 'octamod.module.json').read_text()).get('build', {}).get('status') == 'pending']
if pending:
    parser.error('The SDK has source imports awaiting native integration: ' + ', '.join(pending) + '. Existing composition proofs cover only the initial seven. No imported source was evaluated.')
raw_os = args.raw_os.resolve()
vendor = args.vendor.resolve()
if not raw_os.is_file() or not vendor.is_dir(): parser.error('Local original OS and patched vendor directory are required')
sdk = app / 'sdk/octabam'
proofs = json.loads((app / 'src/engine/assets/composition-proofs.json').read_text())['proofs']
order = ['spectrum', 'modulation', 'character', 'miniverb', 'tapeecho', 'euclid', 'repitch']
cases = [next(p for p in proofs if p['moduleIds'] == ids and p['default'] == keep)
         for ids, keep in [(['miniverb', 'tapeecho', 'euclid', 'repitch'], True), (order, False), (order, True)]]

with tempfile.TemporaryDirectory(prefix='octamod-sdk-parity.') as directory:
    root = Path(directory)
    for name in ['modules', 'platform', 'tools', 'dsp']:
        shutil.copytree(sdk / name, root / name, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    (root / 'vendor').symlink_to(vendor, target_is_directory=True)
    (root / 'out/raw').mkdir(parents=True)
    shutil.copyfile(raw_os, root / 'out/raw/section_3_MAIN_OS.bin')
    os.chdir(root)
    sys.path[:0] = [str(root / 'tools'), str(root / 'tools/build')]
    os.environ.update(REMIX='sdk-local-proof', XBUS='1', SPEC='1', DEV='0', NOROUNDTRIP='0', OCTABAM_STATIC_STOCK='0', OCTABAM_NO_CACHE='1', BUILD='79')
    import toolpath
    from remix import registry
    from remix.schema import Remix
    known = registry.modules()
    public = sorted(m.name for m in known.values() if not m.is_stock and m.name not in registry.PLATFORM_NAMES)
    assert public == sorted(order), public
    print('Registry contains exactly seven public modules and two internal platform declarations.', flush=True)
    results = []
    for case in cases:
        selected = [known[next(k for k, m in known.items() if m.name == id)] for id in order if id in case['moduleIds']]
        keys = [key for key in case['menu']['fx2'] if known[key].is_stock] + [m.key for m in selected]
        profile = registry.with_platform(Remix(name='sdk-local-proof', doc='Temporary packing proof, never flashed.', modules=tuple(keys), fx1=tuple(case['menu']['fx1']), hidden=tuple(case['menu']['hidden']), fallback='NONE'), known)
        assert all(key in profile.modules for key in registry.PLATFORM_DSP)
        registry.remix = lambda _: profile
        sys.modules.pop('build_bus', None)
        builder = importlib.import_module('build_bus')
        captured = io.StringIO()
        try:
            try:
                with contextlib.redirect_stdout(captured):
                    builder.main()
            except SystemExit as error:
                if 'error' not in case or str(error) != case['error']:
                    raise RuntimeError('SDK composition rejected unexpectedly; native log was kept private') from error
                result = {'modules': case['moduleIds'], 'keepStockFx2': case['default'], 'rejection': str(error)}
            else:
                if 'error' in case:
                    raise ValueError('SDK accepted a selection that the native oracle rejects')
                image = builder.OUT.read_bytes()
                digest = hashlib.sha256(image).hexdigest()
                assert len(image) == case['bytes'] and digest == case['sha256'], (len(image), digest, case['sha256'])
                result = {'modules': case['moduleIds'], 'keepStockFx2': case['default'], 'bytes': len(image), 'sha256': digest}
            results.append(result)
            print(json.dumps(result), flush=True)
        finally:
            if builder._SCRATCH is not None:
                shutil.rmtree(builder._SCRATCH, ignore_errors=True)

print('SDK parity and crowded-selection rejection passed. Temporary stock-containing outputs removed; no emulator/stress/render checks run.', flush=True)
