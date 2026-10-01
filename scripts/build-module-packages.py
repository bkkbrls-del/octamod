"""Compile the seven reviewed SDK modules without stock firmware.

Run untrusted changes only in the isolated build container. This developer
command executes reviewed native declarations in a disposable source copy.
It assembles and proves relocation; it never boots, renders or stress-tests.
"""
from pathlib import Path
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile

APP = Path(__file__).resolve().parents[1]
ORDER = ['spectrum', 'modulation', 'character', 'miniverb', 'tapeecho', 'euclid', 'repitch']
ASSET_NAMES = ['dsp-packages.json', 'coldfire-packages.json', 'resident-dsp.json', 'rom-packages.json',
               'bootstrap-package.json', 'menu-recipes.json', 'descriptor-recipes.json', 'platform-writes.json']
HASH = lambda data: hashlib.sha256(data).hexdigest()


def json_file(path): return json.loads(path.read_text())
def code_bytes(words): return b''.join(word.to_bytes(3, 'big') for word in words)
def dump(path, value): path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def run(arguments, cwd):
    result = subprocess.run([str(arg) for arg in arguments], cwd=cwd, capture_output=True, text=True)
    if result.returncode: raise RuntimeError(str(arguments[0]) + ' failed: ' + result.stderr[-2000:])
    return result.stdout


def exported_symbols(elf, root):
    rows = [line.split() for line in run(['m68k-elf-nm', elf], root).splitlines()]
    return {row[2]: int(row[0], 16) for row in rows if len(row) == 3 and row[1].isupper() and row[1] != 'U'}


def validate_source(text):
    if re.search(r'^\s*\.?(?:include|incbin)\b', text, re.M | re.I):
        raise ValueError('Transcluded source or binary content is not allowed in a module package')


def source_hashes(root):
    files = {}
    for group in ['modules', 'platform', 'tools', 'dsp']:
        for path in sorted((root / group).rglob('*')):
            if path.is_symlink(): raise ValueError('Source symlinks are not allowed: ' + str(path))
            # Finder metadata is never source; the release checkout never contains it.
            if not path.is_file() or '__pycache__' in path.parts or path.suffix == '.pyc' or path.name == '.DS_Store': continue
            if path.suffix.lower() in ('.bin', '.syx', '.exe', '.dll', '.dylib', '.zip') or path.name == 'stock_labels.json':
                raise ValueError('Firmware/binary input is not allowed in source compilation')
            files[path.relative_to(root).as_posix()] = HASH(path.read_bytes())
    return files


def fingerprint(reference, address):
    from remix.stock_guard import LocalStockSpan
    if isinstance(reference, LocalStockSpan):
        if reference.address != address: raise ValueError('Protected span address differs from its declaration')
        return len(reference), reference.sha256
    if isinstance(reference, bytes): return len(reference), HASH(reference)
    raise ValueError('A protected span must be declared with a fingerprint')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--vendor', type=Path, required=True, help='Patched DSP assembler/disassembler toolchain directory')
    parser.add_argument('--output', type=Path, required=True, help='New stock-free artifact directory; never overwritten')
    parser.add_argument('--source-commit', help='Exact clean Octamod Git commit for a release build; absent means development')
    parser.add_argument('--verify-existing', action='store_true', help='Compare every compiled code package with the pinned browser baseline')
    args = parser.parse_args()
    destination, vendor = args.output.resolve(), args.vendor.resolve()
    if destination.exists(): parser.error('Output already exists; refusing to replace immutable artifacts')
    assembler = vendor / 'dsp56300/build/source/dsp_host/dsp_asm'
    disassembler = vendor / 'dsp56300/build/source/disassemble/dsp56kDisassemble'
    if not assembler.is_file() or not disassembler.is_file(): parser.error('Patched DSP assembler and disassembler are required')
    if args.source_commit:
        if not re.fullmatch('[a-f0-9]{40}', args.source_commit): parser.error('An exact source commit is required')
        head = run(['git', 'rev-parse', 'HEAD'], APP).strip()
        if head != args.source_commit: parser.error('Source commit differs from this checkout')
        run(['git', 'diff', '--exit-code', 'HEAD', '--', 'sdk', 'src', 'scripts'], APP)
        if run(['git', 'ls-files', '--others', '--exclude-standard', '--', 'sdk', 'src', 'scripts'], APP).strip():
            parser.error('Untracked source is not allowed in a release build')
    sdk = APP / 'sdk/octabam'
    sources = source_hashes(sdk)
    baseline = {name: json_file(APP / 'src/engine/assets' / name) for name in ASSET_NAMES}
    catalog = json_file(APP / 'sdk/catalog.json')
    if [module['id'] for module in catalog['modules']] != ORDER: parser.error('This release compiler supports exactly the seven initial modules')
    versions = {module['id']: module['version'] for module in catalog['modules']}
    revision = catalog['sourceRevision']
    documents = {id: json_file(sdk / 'modules' / id / 'octamod.module.json') for id in ORDER}
    provenance = {'sourceCommit': args.source_commit, 'moduleVersions': versions}
    products = {}
    with tempfile.TemporaryDirectory(prefix='octamod-source-build.') as temporary:
        root = Path(temporary)
        for group in ['modules', 'platform', 'tools', 'dsp']:
            shutil.copytree(sdk / group, root / group, ignore=shutil.ignore_patterns('__pycache__', '*.pyc', '.DS_Store'))
        sys.path[:0] = [str(root / 'tools'), str(root / 'tools/build')]
        os.chdir(root)
        for flag in ('NOSHIM', 'MARKER', 'PROBE', 'XPROBE', 'TPROBE', 'DELAYPROBE', 'RVSRC', 'DLSRC', 'NOROUNDTRIP'):
            os.environ.pop(flag, None)
        os.environ.update(REMIX='source-build', XBUS='1', SPEC='1', DEV='0', OCTABAM_STATIC_STOCK='0', BUILD='79')
        import toolpath
        from remix import registry, stock_guard
        from remix.schema import Remix
        def deny_stock(): raise RuntimeError('Source builds never accept or resolve stock firmware')
        stock_guard._verified_image = deny_stock
        known = registry.modules()
        byid = {module.name: module for module in known.values()}
        public = sorted(module.name for module in known.values() if not module.is_stock and module.name not in registry.PLATFORM_NAMES)
        if public != sorted(ORDER): raise ValueError('Unexpected module scope')
        for id in ORDER:
            module, doc = byid[id], documents[id]
            if doc['version'] != versions[id] or doc['key'] != module.key or doc['author']['github'] != module.author or doc['compatibility']['effectId'] != (module.menu.fx2_id if module.menu else None):
                raise ValueError(id + ': website metadata differs from its native declaration')
        profile = registry.with_platform(Remix(name='source-build', doc='Compile authored packages without firmware.', modules=tuple(byid[id].key for id in ORDER), fallback='NONE'), known)
        registry.remix = lambda _: profile
        import build_bus as native
        import label_fmt, mode_names, wide_dial
        from remix import platform_build
        native.DIS, native.DISASM = assembler, disassembler

        def hashes(*paths): return {path: sources[path] for path in paths}
        def package(module, text):
            validate_source(text)
            words, relocations, init, proc = native._package(module.key, text, tuple(module.dsp.ptable))
            proofs = []
            for base in (0x1000, 0x1400, 0x1801, 0x2407):
                fresh, _ = native.assemble_syms(text.replace(native.PTABLE_LITERAL, f'${base:x}'), base + len(module.dsp.ptable), label=module.key)
                proofs.append({'base': base, 'sha256': HASH(code_bytes(list(module.dsp.ptable) + fresh))})
            code = code_bytes(words)
            return {'id': module.name, 'version': versions[module.name], 'key': module.key, 'author': module.author,
                    'sources': hashes(module.dsp.asm, f'modules/{module.name}/manifest.py'), 'fxId': module.menu.fx2_id,
                    'words': len(words), 'code': code.hex(), 'sha256': HASH(code), 'relocations': relocations,
                    'init': init, 'proc': proc, 'proofs': proofs}

        packages = []
        for id in sorted(ORDER):
            module = byid[id]
            if not module.dsp or id == 'character': continue
            text = native._loadable_text(module)
            if text is None: raise ValueError(id + ': changed native placement needs a supported browser recipe')
            packages.append(package(module, text))
        products['dsp-packages.json'] = {'schema': 1, 'revision': revision, 'license': '/licenses/octabam.txt', **provenance,
            'packages': packages, 'excluded': [{'id': 'character', 'reason': 'Native resident placement.'}]}
        print('Compiled five loadable DSP modules with four-origin relocation proofs.', flush=True)

        character = byid['character']
        text = (root / character.dsp.asm).read_text()
        text = re.sub(r'\$9([0-9a-f]{2})\b', lambda match: '$%x' % (0x36000 + int(match[1], 16)), text)
        if any(marker in text for marker in ('; ROTLATCH', '; XBUS_GATE', '.include', '.incbin')): raise ValueError('Changed resident placement needs review')
        resident = package(character, text)
        resident.update(mode='resident', xbusBase=0x36000, ptableMemory='P')
        receiver_source = 'platform/dsp-dynload-transport/receiver_runtime.asm'
        receiver = (root / receiver_source).read_text()
        marker = '; OCTAMOD_LOCAL_NULL_STUB'
        if receiver.count(marker) != 1: raise ValueError('Receiver must reserve exactly one local stock tail')
        receiver = receiver.replace(marker, '; stock-free reserved tail during source compilation')
        validate_source(receiver)
        variants = []
        for old in baseline['resident-dsp.json']['variants']:
            payload = next(row for row in json_file(APP / 'src/engine/assets/stock-dsp-metadata.json')['payloads'] if row['core'] == old['core'])
            table = payload['sharedEnd'] + (resident['words'] if old['hasCharacter'] else 0)
            probe, _ = native.assemble_syms(receiver.replace('@DLWORDS@', '0').replace('$fab1e0', f'${table:x}'), table, label='DSP DYNLOAD STOCK')
            arena = payload['effectEnd'] - table - len(probe)
            if arena < 1131: raise ValueError('Receiver and module do not fit the stock DSP region')
            code_address = table + arena
            words, symbols = native.assemble_syms(receiver.replace('@DLWORDS@', str(arena)).replace('$fab1e0', f'${table:x}'), code_address, label='DSP DYNLOAD STOCK')
            offset = symbols['dlstubinit'] - code_address
            if len(words) != len(probe) or len(words) - offset != 9 or symbols['dlstubdone'] != code_address + offset + 8: raise ValueError('Receiver reserved-tail geometry differs')
            masked = words[:offset] + [0] * 9
            copy = dict(old['stockCopy'], destinationOffset=offset, sha256=None,
                        adjustments=[{'offset': 3, 'delta': code_address + offset - old['stockCopy']['sourceAddress']}])
            # Static dispatch entries stay on stock's own null stub (the declared copy source); the receiver
            # redirects ids to its local copy only at runtime. The native static-placement oracle relies on that.
            variant = dict(old, tableAddress=table, tableWords=arena, codeAddress=code_address, words=len(words),
                           code=code_bytes(masked).hex(), sha256=HASH(code_bytes(masked)), frame=symbols['frame'], nullInit=copy['sourceAddress'], nullProc=copy['sourceAddress'] + 1, stockCopy=copy, completeSha256=None)
            if variant['sha256'] == old['sha256'] and copy['adjustments'] == old['stockCopy']['adjustments']:
                variant['completeSha256'] = old['completeSha256']; copy['sha256'] = old['stockCopy']['sha256']
            variants.append(variant)
        products['resident-dsp.json'] = dict(baseline['resident-dsp.json'], **provenance, character=resident, variants=variants,
            receiverSource=receiver_source, receiverSourceSha256=sources[receiver_source])
        print('Compiled resident Character and four stock-free receiver templates.', flush=True)

        compiled_cf = []
        for key in ['DSP DYNLOAD STOCK', 'EUCLID', 'TAPE ECHO']:
            module = known[key]
            manifest = f'platform/{module.name}/manifest.py' if module.name in registry.PLATFORM_NAMES else f'modules/{module.name}/manifest.py'
            for unit in module.linked:
                if not unit.dram or unit.include is not None: continue
                text = (root / unit.source).read_text(); validate_source(text)
                obj = root / (unit.label + '.o')
                run(['m68k-elf-as', '-mcpu=54455', '-o', obj, unit.source], root)
                data = obj.read_bytes()
                compiled_cf.append({'label': unit.label, 'moduleId': module.name, 'version': versions.get(module.name),
                    'key': module.key, 'author': module.author, 'cpu': '54455', 'dram': True, 'source': unit.source,
                    'sources': hashes(unit.source, manifest), 'bytes': len(data), 'code': data.hex(), 'sha256': HASH(data)})
        products['coldfire-packages.json'] = dict(baseline['coldfire-packages.json'], **provenance, packages=compiled_cf)

        rom = []
        for old in baseline['rom-packages.json']['packages']:
            module = byid.get(old['moduleId'])
            source = old['source']; original = (root / source).read_text()
            text = wide_dial.source([]) if old['label'] == 'wide-dial' else original
            validate_source(text)
            asm, obj = root / (old['label'] + '.s'), root / (old['label'] + '.o'); asm.write_text(text)
            run(['m68k-elf-as', '-mcpu=' + old['cpu'], '-o', obj, asm], root)
            data = obj.read_bytes(); proofs = []
            for proof in old['proofs']:
                elf, binary = root / 'rom.elf', root / 'rom.bin'
                run(['m68k-elf-ld', f'-Ttext=0x{proof["base"]:x}', *[f'--defsym={key}=0x{value:x}' for key, value in proof['externals'].items()], '-o', elf, obj], root)
                run(['m68k-elf-objcopy', '-O', 'binary', '-j', '.text', elf, binary], root)
                raw = binary.read_bytes()
                if old['label'] == 'tape-time' and raw != byid['tapeecho'].cf_patches[0].pinned: raise ValueError('Authored Tape TIME source differs from its pinned reference')
                proofs.append(dict(proof, bytes=len(raw), sha256=HASH(raw), exports=exported_symbols(elf, root)))
            rom.append(dict(old, version=versions.get(old['moduleId']), key=module.key if module else old['key'],
                author=module.author if module else old['author'], sourceSha256=sources[source], bytes=len(data), code=data.hex(), sha256=HASH(data), proofs=proofs))
        products['rom-packages.json'] = dict(baseline['rom-packages.json'], **provenance, packages=rom)
        (root / 'table.inc').write_text('        .long 1\n        .long blob0,0,0,0,0,0,0,0\n        .align 4\nblob0:\n')
        obj = root / 'bootstrap.o'
        run(['m68k-elf-as', '-mcpu=5475', '-I', root, '-o', obj, root / 'tools/remix/loader.S'], root)
        data = obj.read_bytes()
        products['bootstrap-package.json'] = dict(baseline['bootstrap-package.json'], **provenance,
            sourceSha256=sources['tools/remix/loader.S'], bytes=len(data), code=data.hex(), sha256=HASH(data))
        print('Compiled eleven ColdFire runtime objects, four ROM units and the authored bootstrap.', flush=True)

        recipes = []
        for id in ORDER:
            module = byid[id]
            for slot, param in enumerate(module.params):
                if not (param.active and param.labels): continue
                views = module.name_views_for(slot)
                names = mode_names.complete(module, slot, views) if views else {}
                if slot == module.mode_slot: names = mode_names.with_selfname(names, slot, param.labels)
                encoded = {str(value): {str(key): label.decode('latin1') for key, label in row.items()} for value, row in names.items()}
                proofs = []
                for address in (0x400d6b36, 0x400d7376):
                    code = mode_names.emit(param.labels, address, names) if names else label_fmt.emit(param.labels)
                    proofs.append({'namesAddress': address, 'bytes': len(code), 'sha256': HASH(code)})
                recipes.append({'id': id, 'key': module.key, 'author': module.author, 'slot': slot, 'name': param.name.decode('latin1'),
                    'labels': list(param.labels), 'renames': encoded, 'wideMaximum': param.count - 1 if slot in module.wide_stepped_slots else None, 'proofs': proofs})
        repitch = byid['repitch']; patches = []
        for detour in repitch.detours:
            length, sha = fingerprint(detour.expect, detour.site)
            if detour.kind != 'jmp' or detour.unit != 'repitch': raise ValueError('Unsupported Repitch detour')
            patches.append({'address': detour.site, 'guardLength': length, 'guardSha256': sha, 'kind': 'detour', 'symbol': detour.symbol, 'bytes': detour.pad_to or 6, 'note': detour.note})
        for ref in repitch.symbol_refs:
            patches.append({'address': ref.addr, 'guardLength': 4, 'guardSha256': HASH(ref.expect.to_bytes(4, 'big')), 'kind': 'pointer', 'symbol': ref.symbol, 'addend': ref.addend, 'note': ref.note})
        for poke in repitch.pokes:
            length, sha = fingerprint(poke.expect, poke.addr)
            patches.append({'address': poke.addr, 'guardLength': length, 'guardSha256': sha, 'kind': 'poke', 'code': poke.write.hex(), 'note': poke.note})
        products['menu-recipes.json'] = dict(baseline['menu-recipes.json'], **provenance, recipes=recipes, repitchPatches=patches)

        descriptors = []
        for old in baseline['descriptor-recipes.json']['recipes']:
            module = byid[old['id']]
            if module.menu.donor_desc + 0x38 != old['donorAddress'] or module.menu.fx2_id != old['fxId']:
                raise ValueError(module.name + ': changed stock descriptor/ID needs locally verified guard metadata')
            integers = []; strings = []
            def integer(offset, size, value): integers.append({'offset': offset, 'width': size, 'value': value})
            def string(offset, maximum, value): strings.append({'offset': offset, 'width': maximum, 'value': value.decode('latin1')})
            name = native.FULLNAME[module.key]
            integer(native.P_ID_BYTE, 1, module.menu.fx2_id)
            string(native.P_ABBR, 5, module.menu.abbr); string(native.P_FULLNAME, 13, name)
            for slot, param in enumerate(module.params):
                if param.name is not None: string(0x16 + slot * 6, 6, param.name)
                if param.default is not None: integer(0x5e + slot, 1, param.default)
            if module.stepped_slots:
                for slot in range(12):
                    integer(0xca + slot * 4, 4, 0); integer(0xfa + slot * 4, 4, 0)
            for slot in module.stepped_slots:
                integer(0xca + slot * 4, 4, 0x4003c718); integer(0xfa + slot * 4, 4, 0x40047254 if module.params[slot].count is not None and module.params[slot].count <= 5 else 0); integer(0x12a + slot * 4, 4, 0)
            for slot in module.bipolar_slots:
                integer(0xca + slot * 4, 4, 0x4003c7a0); integer(0xfa + slot * 4, 4, 0); integer(0x12a + slot * 4, 4, 0x400328e4)
            for slot, param in enumerate(module.params):
                if param.count is not None: integer(0x9a + slot * 4, 4, param.count); integer(0x6a + slot * 4, 4, 0)
            lo, hi = native.penable(module.active_params, module.linked_params)
            integer(native.P_PENABLE_LO, 4, lo); integer(native.P_PENABLE_HI, 4, hi)
            descriptors.append(dict(old, sourceSha256=sources[f'modules/{module.name}/manifest.py'], integers=integers, strings=strings))
        products['descriptor-recipes.json'] = dict(baseline['descriptor-recipes.json'], **provenance, recipes=descriptors)
        groups = []
        for old in baseline['platform-writes.json']['groups']:
            module = known[old['key']]; rows = []
            for detour in module.detours:
                length, sha = fingerprint(detour.expect, detour.site)
                if detour.kind not in ('jmp', 'jsr') or detour.target is not None: raise ValueError('Unsupported native detour')
                rows.append({'address': detour.site, 'length': length, 'sha256': sha, 'note': detour.note, 'unit': detour.unit,
                             'symbol': detour.symbol, 'kind': detour.kind, 'writeLength': detour.pad_to or 6})
            manifest = f'platform/{module.name}/manifest.py' if module.name in registry.PLATFORM_NAMES else f'modules/{module.name}/manifest.py'
            groups.append(dict(old, source=manifest, sourceSha256=sources[manifest], detours=rows))
        products['platform-writes.json'] = dict(baseline['platform-writes.json'], **provenance, groups=groups)
        if stock_guard._cache is not None: raise RuntimeError('Stock must never be read during source compilation')
        if native._SCRATCH is not None: shutil.rmtree(native._SCRATCH, ignore_errors=True)

    if args.verify_existing:
        for name in ['dsp-packages.json', 'coldfire-packages.json', 'rom-packages.json']:
            key = 'id' if name == 'dsp-packages.json' else 'label'
            expected = {row[key]: row for row in baseline[name]['packages']}
            for row in products[name]['packages']:
                if row['code'] != expected[row[key]]['code']: raise ValueError(name + ': compiled code differs from native baseline for ' + row[key])
        if products['resident-dsp.json']['character']['code'] != baseline['resident-dsp.json']['character']['code']: raise ValueError('Resident Character differs from baseline')
        # Placement and dispatch bindings change composed firmware as much as code bytes do.
        for row, old in zip(products['resident-dsp.json']['variants'], baseline['resident-dsp.json']['variants']):
            if row != old: raise ValueError('Receiver differs from baseline: ' + ', '.join(sorted(key for key in row.keys() | old.keys() if row.get(key) != old.get(key))))
        if products['bootstrap-package.json']['code'] != baseline['bootstrap-package.json']['code']: raise ValueError('Bootstrap differs from baseline')
        for name, field in [('menu-recipes.json', 'recipes'), ('menu-recipes.json', 'repitchPatches')]:
            if products[name][field] != baseline[name][field]: raise ValueError(name + ': native recipes differ')
        for name, field in [('descriptor-recipes.json', 'recipes'), ('platform-writes.json', 'groups')]:
            strip_source = lambda rows: [{key: value for key, value in row.items() if key not in ('source', 'sourceSha256')} for row in rows]
            if strip_source(products[name][field]) != strip_source(baseline[name][field]): raise ValueError(name + ': native declarations differ')
        if [row['proofs'] for row in products['rom-packages.json']['packages']] != [row['proofs'] for row in baseline['rom-packages.json']['packages']]: raise ValueError('ROM relocation proofs differ')
        print('Every authored compiled package and receiver matches the existing browser/native baseline.', flush=True)

    os.chdir(APP)
    destination.mkdir(parents=True)
    files = {}
    for name in ASSET_NAMES:
        path = destination / name; dump(path, products[name]); files[name] = {'bytes': path.stat().st_size, 'sha256': HASH(path.read_bytes())}
    tree = HASH(json.dumps(sources, sort_keys=True, separators=(',', ':')).encode())
    dump(destination / 'module-build.json', {'schemaVersion': 1, 'kind': 'source-packages', 'sourceCommit': args.source_commit,
        'nativeRevision': revision, 'sourceTreeSha256': tree, 'moduleVersions': versions, 'sources': sources, 'files': files,
        'compilerSha256': HASH(Path(__file__).read_bytes()),
        'stockRead': False, 'qualification': 'assembly and relocation only; no new hardware, audio or stress qualification'})
    print('Stock-free source artifact written to ' + str(destination), flush=True)


if __name__ == '__main__': main()
