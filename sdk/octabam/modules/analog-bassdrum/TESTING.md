# Analog BD testing

Version: `0.1.0-experimental`. Octabam evidence pin: `363861e31ee963c478fab2b190a0fabe1d7ce37b`.

Upstream records exact render/state and source/AMP/effects checks on both cores. ANALOGBD1 ran on an MKI; the current engine browser, louder output and eight-track revision still await hardware qualification. No Octamod native/browser parity has been run for this import.

## Integration status

Source and catalog import only. Browser composition and stock-free source packaging for this module are pending. The existing Octamod native profile stays pinned separately. No firmware-dependent gates, emulator, DSP render or stress tests were run for this import. Original/licensed source and documentation are retained; the previous compiled packages have not been replaced.

## Historical gates

- `tools/verify/verify_analog_bassdrum.py` (upstream record; not run here).
- `tools/harness/bd808.py` (upstream record; not run here).
- `tools/harness/bd909.py` (upstream record; not run here).
- `tools/harness/verify_analog_bd_exact.py` (upstream record; not run here).
- `tools/harness/verify_analog_bd_levels.py` (upstream record; not run here).
- `tools/verify/verify_analog_bassdrum_cf.py` (upstream record; not run here).
- `tools/verify/verify_analog_bassdrum_port.py` (upstream record; not run here).
- `tools/verify/verify_analog_bassdrum_ui.py` (upstream record; not run here).

These gate references belong to the pinned upstream tree. Author encoder/regeneration tooling and the updated native builder are not all part of this trimmed SDK. Use the exact pinned upstream for reproduction in isolation; never run unreviewed code on a trusted host.

## Before enabling firmware builds

- Review imported rights, source pins and authored code; owner merge approves this exact module version.
- Adapt original-code compilation, placement, menu/descriptor recipes and required dependencies to this SDK.
- Recover every stock instruction/helper/table locally with fingerprint validation. Never put stock into automation or committed packages.
- Prove actual browser/native byte parity and rejection for each supported selection, including conflicts and dependencies.
- Record hardware limits separately; historical results do not qualify the imported revision.
