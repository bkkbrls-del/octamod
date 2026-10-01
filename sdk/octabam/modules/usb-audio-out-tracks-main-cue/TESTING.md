# USB Audio testing

Version: `0.1.0-experimental`. Octabam evidence pin: `363861e31ee963c478fab2b190a0fabe1d7ce37b`.

Selected for the broadest recorded hardware evidence: MKI and MKII, sustained multi-track 24-bit captures and high MIDI receive traffic. The latest source includes track/MAIN alignment and a hardware-tested master-on CUE correction; startup artifacts and unmeasured host/platform cases remain. This import has no Octamod browser/native parity yet.

## Integration status

Source and catalog import only. Browser composition and stock-free source packaging for this module are pending. The existing Octamod native profile stays pinned separately. No firmware-dependent gates, emulator, DSP render or stress tests were run for this import. Original/licensed source and documentation are retained; the previous compiled packages have not been replaced.

## Historical gates

- `tools/verify/verify_usb.py` (upstream record; not run here).
- `tools/verify/verify_usb_align.py` (upstream record; not run here).

These gate references belong to the pinned upstream tree. Author encoder/regeneration tooling and the updated native builder are not all part of this trimmed SDK. Use the exact pinned upstream for reproduction in isolation; never run unreviewed code on a trusted host.

## Before enabling firmware builds

- Review imported rights, source pins and authored code; owner merge approves this exact module version.
- Adapt original-code compilation, placement, menu/descriptor recipes and required dependencies to this SDK.
- Recover every stock instruction/helper/table locally with fingerprint validation. Never put stock into automation or committed packages.
- Prove actual browser/native byte parity and rejection for each supported selection, including conflicts and dependencies.
- Record hardware limits separately; historical results do not qualify the imported revision.

USB MIDI lives under `../../platform/usb-midi/`. It is an internal requirement, not another public catalog option. The output-only twenty-channel layout was selected for MKI/MKII and sustained-stream evidence. USB input and USB CROSSBAR are not imported because this selected output does not require them.
