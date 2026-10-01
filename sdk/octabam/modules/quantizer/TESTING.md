# Scale Quantizer testing

Version: `0.1.0-experimental`. Octabam evidence pin: `363861e31ee963c478fab2b190a0fabe1d7ce37b`.

Upstream records pitch/lock/key, ROOT, save/load and warm-boot checks, and MKI operation through the v2.9 line before its last two fixes. Those last fixes are emulator-verified. This import pins octatrick-modules v2.9 and has no Octamod native/browser parity yet.

## Integration status

Source and catalog import only. Browser composition and stock-free source packaging for this module are pending. The existing Octamod native profile stays pinned separately. No firmware-dependent gates, emulator, DSP render or stress tests were run for this import. Original/licensed source and documentation are retained; the previous compiled packages have not been replaced.

## Historical gates

Quantizer behavior is covered by the upstream octatrick remix/virtual-panel checks; no standalone gate is declared in its manifest.

These gate references belong to the pinned upstream tree. Author encoder/regeneration tooling and the updated native builder are not all part of this trimmed SDK. Use the exact pinned upstream for reproduction in isolation; never run unreviewed code on a trusted host.

## Before enabling firmware builds

- Review imported rights, source pins and authored code; owner merge approves this exact module version.
- Adapt original-code compilation, placement, menu/descriptor recipes and required dependencies to this SDK.
- Recover every stock instruction/helper/table locally with fingerprint validation. Never put stock into automation or committed packages.
- Prove actual browser/native byte parity and rejection for each supported selection, including conflicts and dependencies.
- Record hardware limits separately; historical results do not qualify the imported revision.
