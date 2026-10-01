"""USB MIDI -- the firmware's dormant USB-MIDI half, completed.

OS 1.40C ships a USB-MIDI transmit encoder and the EP2 primitives that
nothing reaches, and no receive decoder. markandrus (octemu, MIT) wired it
in: grown configuration descriptors (MSC + AudioControl + MIDIStreaming,
EP2 bulk both ways), EP2 brought up at SET_CONFIGURATION, EP2 completions
dispatched from the USB ISR into a new receive decoder that feeds the same
byte path DIN MIDI uses, and both transmit senders (channel messages and
the realtime bytes) mirrored into the dormant encoder. The port sits on
the DRAM platform instead of his in-image free zone; README.md has what
differs and what was measured.
"""

from remix.stock_guard import stock_guard
import importlib.util
import pathlib

from remix import schema
from remix.schema import Category, Proof, Detour, Kind, Linked, Module, SymbolRef

# Manifests are executed from source, not imported as a package; the
# descriptor generator beside this file is loaded by path.
_spec = importlib.util.spec_from_file_location(
    "usbmidi_descriptors", pathlib.Path(schema.__file__).resolve().parents[2] / "platform/usb-midi/descriptors.py")
descriptors = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(descriptors)

H = bytes.fromhex

MODULE = Module(
    name="usb-midi", key="USB MIDI", kind=Kind.CF_PATCH,
    category=Category.MIDI_USB, author="markandrus/octemu", author_url="https://github.com/markandrus/octemu",
    proof=Proof.HARDWARE, proof_note="Sam's MKII (image 64, 25 Sep 2026: enumerates, receives 7,950 msg/s); Tim's MKI (OCTATRICK9, 26 Sep 2026); transmit from the unit not measured",
    doc="Class-compliant USB-MIDI in and out on the OT's own USB port, mirroring the DIN ports (markandrus/octemu).",
    linked=(
        # his unit, verbatim: the build re-links it at his zone address and
        # compares with his usb-midi.py's blob (1,124 B, from our stock bytes)
        Linked("usbmidi", "platform/usb-midi/usbmidi.s", cpu="54455", dram=True,
               reference=(0x400d24f0, "6291d91e923145be62719eee56c2ca823d36c2d71ae538550e70b5533d404e60")),
        Linked("usbmidi_clamp", "platform/usb-midi/clamp.s", cpu="54455", dram=True),
        # the four configurations for THIS remix (124 B, or 250 B with USB
        # AUDIO's function added) and the absolute `cfg_len` the clamps read
        Linked("usbmidi_cfg", "platform/usb-midi/cfg.s", cpu="5475", dram=True,
               include=descriptors.remix_inc),
    ),
    detours=(
        Detour(0x4001d9ca, stock_guard(0x4001d9ca, 6, "65ff3635f24fa02328d135abf8590188c4ae5f1a399f6747c196a9f1c8b4f2db"), "usbmidi", "usbmidi_setcfg_shim",
               "SET_CONFIGURATION body: bring EP2 up, 512-byte packets at high speed"),
        Detour(0x4001e606, stock_guard(0x4001e606, 6, "2fc3d5168f6ee3ffb4b419a9cbbe48a7837d42e9e47db7bb5bced5cd13b62dc0"), "usbmidi", "usbmidi_isr_shim",
               "usb_isr UI path: EP2 completions -> decode / re-prime / kick"),
        Detour(0x40010bc8, stock_guard(0x40010bc8, 8, "ba7573adceae0b4d98e7fca043628b41525f9bf3ec50663e051c89a57a79cb35"), "usbmidi", "usbmidi_send_shim",
               "midi_send entry: queue the message for the USB encoder", pad_to=8),
        Detour(0x400108b0, stock_guard(0x400108b0, 6, "48904c9ab44972c2a8aad8d9544735e58fe9a7e98b8ad8ddbff57f5abc16274b"), "usbmidi", "usbmidi_prio_shim",
               "priority (realtime) byte sender: queue the byte for the USB encoder"),
        Detour(0x4001daec, stock_guard(0x4001daec, 6, "effa769bdedb0e393f0b05f3920eb7cc91977b77c87f424480b99748334893aa"), "usbmidi", "usbmidi_clrfeat_shim",
               "CLEAR_FEATURE(ENDPOINT_HALT): answer for EP2 instead of stalling"),
        # GET_DESCRIPTOR(CONFIG / OTHER_SPEED): the responder's two hardcoded
        # clamps (moveq #32,d0 / cmpl d2,d0 / bcs +4) become min(wLength, cfg_len)
        Detour(0x4001d858, stock_guard(0x4001d858, 6, "ce8e3c8561e797040ed32749c3daacef88676d43c50fe2b7d0e65139e39ef86a"), "usbmidi_clamp", "usbmidi_clamp1_shim",
               "config responder: clamp the reply to the grown configuration's length"),
        Detour(0x4001d896, stock_guard(0x4001d896, 6, "ce8e3c8561e797040ed32749c3daacef88676d43c50fe2b7d0e65139e39ef86a"), "usbmidi_clamp", "usbmidi_clamp2_shim",
               "other-speed responder: the same clamp"),
    ),
    # GET_DESCRIPTOR(CONFIG): the responder's four `pea <table>` operands.
    symbol_refs=(
        SymbolRef(0x4001d882, 0x400e201c, "usbmidi_cfg", "cfg_fs", "full-speed configuration"),
        SymbolRef(0x4001d88a, 0x400e203c, "usbmidi_cfg", "cfg_hs", "high-speed configuration"),
        SymbolRef(0x4001d8c0, 0x400e207c, "usbmidi_cfg", "cfg_os_hs", "other-speed (type 7), 512-byte EPs"),
        SymbolRef(0x4001d8c8, 0x400e205c, "usbmidi_cfg", "cfg_os_fs", "other-speed (type 7), 64-byte EPs"),
    ),
)
