"""Import integrity and source hygiene only. Never evaluate an imported manifest."""
import ast
import hashlib
import json
from pathlib import Path
import unittest

APP = Path(__file__).resolve().parents[2]
SDK = APP / 'sdk/octabam'
REPORT = json.loads((APP / 'sdk/imports/octabam-363861e.json').read_text())


class RequestedImports(unittest.TestCase):
    def test_sources_match_the_recorded_import_without_gitlinks_or_binaries(self):
        for item in REPORT['files']:
            path = SDK / item['path']
            self.assertFalse(path.is_symlink())
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), item['vendoredSha256'], item['path'])
            self.assertRegex(item['revision'], r'^[a-f0-9]{40}$')
        roots = [SDK / 'modules' / id for id in REPORT['modules']] + [SDK / 'platform/usb-midi']
        for root in roots:
            for path in root.rglob('*'):
                self.assertFalse(path.is_symlink())
                self.assertNotIn(path.name, ['.git', 'out', 'downloads', 'vendor', '__pycache__'])
                self.assertNotIn(path.suffix.lower(), ['.bin', '.syx', '.o', '.elf', '.exe', '.dll', '.so', '.dylib', '.zip', '.wav'])

    def test_stock_expectations_are_lazy_fingerprints_not_copied_spans(self):
        declared = []
        for rel in sorted({guard['path'] for guard in REPORT['stockGuards']}):
            tree = ast.parse((SDK / rel).read_text())
            for node in ast.walk(tree):
                if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Name):
                    continue
                if node.func.id == 'stock_guard':
                    address, length, digest = [ast.literal_eval(arg) for arg in node.args]
                    self.assertRegex(digest, r'^[a-f0-9]{64}$')
                    declared.append({'path': rel, 'address': address, 'bytes': length, 'sha256': digest})
                if node.func.id in ('Detour', 'Poke'):
                    expect = next((kw.value for kw in node.keywords if kw.arg == 'expect'), node.args[1] if len(node.args) > 1 else None)
                    self.assertIsInstance(expect, ast.Call)
                    self.assertEqual(expect.func.id, 'stock_guard', rel)
        canonical = lambda rows: sorted((row['path'], row['address'], row['bytes'], row['sha256']) for row in rows)
        self.assertEqual(canonical(declared), canonical(REPORT['stockGuards']))

    def test_catalog_and_author_dependencies_are_exact_and_pending(self):
        catalog = json.loads((APP / 'sdk/catalog.json').read_text())
        pins = {item['id']: item['version'] for item in catalog['modules']}
        for id in REPORT['modules']:
            doc = json.loads((SDK / 'modules' / id / 'octamod.module.json').read_text())
            self.assertEqual(pins[id], doc['version'])
            self.assertEqual(doc['source']['revision'], REPORT['revision'])
            self.assertEqual(doc['build']['status'], 'pending')
            self.assertTrue((SDK / 'modules' / id / 'LICENSE').is_file())
        for id, pin in REPORT['authorPins'].items():
            sources = [item for item in REPORT['files'] if item['path'].startswith('modules/' + id + '/upstream/')]
            self.assertTrue(sources)
            self.assertEqual({item['revision'] for item in sources}, {pin['revision']})
        self.assertEqual(REPORT['dependencies']['usb-audio-out-tracks-main-cue'], ['platform/usb-midi'])
        self.assertTrue((SDK / 'platform/usb-midi/descriptors.py').is_file())
        self.assertIn('platform/usb-midi/', (SDK / 'platform/usb-midi/manifest.py').read_text())
        midi_manifest = ast.parse((SDK / 'modules/midi-scenes/manifest.py').read_text())
        units = [node for node in ast.walk(midi_manifest) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'Linked']
        self.assertEqual(len(units), 12)
        for unit in units:
            filename = ast.literal_eval(unit.args[1].right)
            self.assertTrue((SDK / 'modules/midi-scenes/upstream/gas' / filename).is_file())
        for filename in ['quantizer.s', 'core.s', 'keys.s', 'scale.s', 'manifest.py']:
            self.assertTrue((SDK / 'modules/quantizer/upstream/quantizer' / filename).is_file())


if __name__ == '__main__':
    unittest.main()
