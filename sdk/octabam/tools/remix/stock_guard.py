"""Guarded reads from the developer's own original OS; no stock spans carried.

Declarations can be inspected without firmware. Resolving their contents
fails closed when local stock is absent or altered. DSP fingerprints use big-endian three-byte words.
"""
from pathlib import Path
from dataclasses import dataclass
import hashlib, re

ROOT = Path(__file__).resolve().parents[2]
BASE = 0x40000400
OS_SHA256 = "164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e"
_cache = None


def _verified_image():
    global _cache
    if _cache is None:
        source = ROOT / "out/raw/section_3_MAIN_OS.bin"
        if not source.is_file():
            raise ValueError("Local original 1.40C extraction is required; never upload firmware")
        raw = source.read_bytes()
        if hashlib.sha256(raw).hexdigest() != OS_SHA256:
            raise ValueError("SDK stock extraction is not original OS 1.40C")
        _cache = raw
    return _cache


def _read_stock_span(address, length, sha256):
    if not isinstance(address, int) or not isinstance(length, int):
        raise ValueError("Stock guard requires integer address and length")
    image = _verified_image()
    offset = address - BASE
    if offset < 0 or length < 1 or offset + length > len(image):
        raise ValueError("Stock guard is outside the original OS")
    value = image[offset:offset + length]
    if hashlib.sha256(value).hexdigest() != sha256:
        raise ValueError("Stock guard identity differs; refusing module declaration")
    return value


def _read_dsp_span(tag, address, count, sha256):
    if tag not in ("A", "B") or not isinstance(address, int) or address < 0 or not isinstance(count, int) or not 1 <= count <= 4096:
        raise ValueError("Invalid guarded DSP span")
    image = _verified_image()
    from dsp_modmap import modules, PAYLOADS
    va, length = next((va, length) for name, va, length in PAYLOADS if name == tag)
    records, blob = modules(image, va, length)
    words = []
    for at in range(address, address + count):
        record = next((r for r in records if r[0] == 0 and r[1] <= at < r[1] + r[2]), None)
        if record is None:
            raise ValueError("Guarded DSP span is outside original P memory")
        offset = record[3] + (at - record[1]) * 3
        words.append(int.from_bytes(blob[offset:offset + 3], "little"))
    canonical = b"".join(word.to_bytes(3, "big") for word in words)
    if hashlib.sha256(canonical).hexdigest() != sha256:
        raise ValueError("DSP stock guard identity differs")
    return tuple(words)


def _fingerprint(value):
    if not isinstance(value, str) or not re.fullmatch(r"[a-f0-9]{64}", value):
        raise ValueError("A stock reference requires an exact SHA-256")


@dataclass(frozen=True, eq=False)
class LocalStockSpan:
    """A declaration, resolved only when bytes are actually needed locally."""
    address: int
    length: int
    sha256: str

    def read(self):
        return _read_stock_span(self.address, self.length, self.sha256)

    def __len__(self): return self.length
    def __bytes__(self): return self.read()
    def __getitem__(self, key): return self.read()[key]
    def __iter__(self): return iter(self.read())
    def __eq__(self, other):
        if isinstance(other, LocalStockSpan):
            return (self.address, self.length, self.sha256) == (other.address, other.length, other.sha256)
        if isinstance(other, (bytes, bytearray, memoryview)): return self.read() == bytes(other)
        return NotImplemented
    def __add__(self, other): return self.read() + other
    def __radd__(self, other): return other + self.read()
    def hex(self): return self.read().hex()


@dataclass(frozen=True, eq=False)
class LocalDspSpan:
    tag: str
    address: int
    count: int
    sha256: str

    def read(self):
        return _read_dsp_span(self.tag, self.address, self.count, self.sha256)

    def __len__(self): return self.count
    def __getitem__(self, key): return self.read()[key]
    def __iter__(self): return iter(self.read())
    def __eq__(self, other):
        if isinstance(other, LocalDspSpan):
            return (self.tag, self.address, self.count, self.sha256) == (other.tag, other.address, other.count, other.sha256)
        if isinstance(other, (tuple, list)): return self.read() == tuple(other)
        return NotImplemented


def stock_guard(address, length, sha256):
    """Declare a protected CPU span without opening firmware during import."""
    _fingerprint(sha256)
    if type(address) is not int or address < BASE or type(length) is not int or not 1 <= length <= 64 * 1024 * 1024:
        raise ValueError("Invalid stock reference")
    return LocalStockSpan(address, length, sha256)


def stock_dsp_words(tag, address, count, sha256):
    _fingerprint(sha256)
    if tag not in ("A", "B") or type(address) is not int or address < 0 or type(count) is not int or not 1 <= count <= 4096:
        raise ValueError("Invalid guarded DSP span")
    return LocalDspSpan(tag, address, count, sha256)
