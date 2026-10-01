"""Stock-free fixtures for guarded local reads; no proprietary input needed."""
from pathlib import Path
import hashlib, sys, tempfile, unittest
from unittest.mock import patch

NATIVE = Path(__file__).resolve().parents[1] / "octabam"
sys.path.insert(0, str(NATIVE / "tools"))
import toolpath
from remix import stock_guard as guards
import dsp_modmap


class LocalStockGuards(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="octamod-synthetic-guard.")
        self.root = Path(self.directory.name)
        self.words = [0x123456, 0x654321, 0x345678]
        # One synthetic P record and a terminator, with no firmware-derived data.
        words = [0, len(self.words), 0x40] + self.words + [4]
        self.image = b"".join(w.to_bytes(3, "little") for w in words)
        self.path = self.root / "out/raw/section_3_MAIN_OS.bin"
        self.path.parent.mkdir(parents=True)
        self.path.write_bytes(self.image)
        self.patches = [patch.object(guards, "ROOT", self.root),
                        patch.object(guards, "OS_SHA256", hashlib.sha256(self.image).hexdigest()),
                        patch.object(guards, "_cache", None),
                        patch.object(dsp_modmap, "PAYLOADS", [("A", guards.BASE, len(self.image))])]
        for p in self.patches: p.start()

    def tearDown(self):
        for p in reversed(self.patches): p.stop()
        self.directory.cleanup()

    def test_declarations_never_read_firmware_during_source_compilation(self):
        self.path.unlink()
        cpu = guards.stock_guard(guards.BASE, 6, "0" * 64)
        dsp = guards.stock_dsp_words("A", 0x40, 2, "0" * 64)
        self.assertEqual(len(cpu), 6)
        self.assertEqual(len(dsp), 2)
        self.assertIsNone(guards._cache)
        self.assertEqual(cpu.sha256, "0" * 64)
        self.assertNotIn("bytes", repr(cpu))
        with self.assertRaisesRegex(ValueError, "Local original"): bytes(cpu)
        with self.assertRaisesRegex(ValueError, "Local original"): tuple(dsp)

    def test_missing_or_changed_local_input_fails_closed(self):
        self.path.unlink()
        with self.assertRaisesRegex(ValueError, "Local original"):
            bytes(guards.stock_guard(guards.BASE, 1, "0" * 64))
        self.path.write_bytes(self.image + b"changed")
        with self.assertRaisesRegex(ValueError, "not original"):
            bytes(guards.stock_guard(guards.BASE, 1, "0" * 64))

    def test_cpu_reads_require_bounds_and_exact_identity(self):
        value = self.image[4:8]
        self.assertEqual(guards.stock_guard(guards.BASE + 4, 4, hashlib.sha256(value).hexdigest()), value)
        for address, count in [(guards.BASE - 1, 1), (guards.BASE, 0), (guards.BASE, len(self.image) + 1)]:
            with self.assertRaises(ValueError):
                bytes(guards.stock_guard(address, count, "0" * 64))
        with self.assertRaisesRegex(ValueError, "identity differs"):
            bytes(guards.stock_guard(guards.BASE + 4, 4, "0" * 64))

    def test_dsp_reads_use_native_record_map_and_canonical_fingerprint(self):
        digest = hashlib.sha256(b"".join(w.to_bytes(3, "big") for w in self.words)).hexdigest()
        self.assertEqual(guards.stock_dsp_words("A", 0x40, 3, digest), tuple(self.words))
        with self.assertRaisesRegex(ValueError, "identity differs"):
            tuple(guards.stock_dsp_words("A", 0x40, 3, "0" * 64))
        with self.assertRaisesRegex(ValueError, "outside"):
            tuple(guards.stock_dsp_words("A", 0x3f, 3, digest))
        for tag, address, count in [("C", 0x40, 3), ("A", -1, 3), ("A", 0x40, 0), ("A", 0x40, 4097)]:
            with self.assertRaisesRegex(ValueError, "Invalid"):
                guards.stock_dsp_words(tag, address, count, digest)


if __name__ == "__main__": unittest.main()
