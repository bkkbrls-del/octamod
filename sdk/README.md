# Octamod SDK

The developer entry point for the Octamod monorepo. The SDK, module source, web content and configurator stay together. It derives from [octabam](https://github.com/sambanks/octabam); original MIT copyright and component credits are retained under `octabam/LICENSE` and `octabam/THIRD_PARTY.md`.

The initial import includes **Spectrum, Modulation, Character, Mini Verb, Tape Echo, Euclid and Repitch**. It comes from a fresh upstream clone pinned to the exact fork revision in [UPSTREAM.json](UPSTREAM.json). On 1 October 2026, the owner expanded scope to Analog BD, MIDI Scenes, USB Audio (tracks + MAIN/CUE) and Scale Quantizer. Their latest source import and author pins are recorded in [imports/octabam-363861e.json](imports/octabam-363861e.json). USB MIDI is included as an internal dependency. Further octabam modules remain outside scope. Its required stock-loader infrastructure is isolated under `octabam/platform/`, outside the public module catalog. Two supported compositions and the crowded-selection rejection match the native builder byte for byte; the copied upstream Makefile is not yet a supported standalone firmware build command.

## Start without firmware or native compilation

Use Node 24 from the monorepo root:

```sh
npm ci
npm run modules:check
npm run module:new -- my-filter --kind dsp --author your-github-login
```

Use `--kind coldfire` for a CPU contribution. The scaffolder refuses to overwrite an existing module. It creates source, `manifest.py`, versioned `octamod.module.json`, README, TESTING, licence and a media directory. DSP scaffolds use an example ID; select an unused ID and write actual gates before use. The generated native verification gate fails deliberately until it is replaced with meaningful module-specific checks. A scaffold never becomes an installed or published module automatically.

Module folders are `sdk/octabam/modules/<id>/`. Website metadata is plain JSON, validated without evaluating Python. After editing a catalog module, increase its semantic version and update its exact version in `sdk/catalog.json`. Regenerate:

```sh
npm run modules:generate
npm run check
```

The eleven frontend pages read the generated catalog from these folders. Fields include controls, practical uses, compatibility, resource measurement methods/conditions, evidence revision, authors, licences and real media provenance. Read [the module contract](../docs/MODULE_REPOSITORIES.md) and [contribution rules](../CONTRIBUTING.md).

## Native development

Native source and reference tools are retained under `octabam/`, with historical namespace/path compatibility. Read `octabam/docs/remixer/MODULES.md` and `PLACEMENT.md` before altering memory claims. Do not execute uploaded or unreviewed manifests on a trusted workstation. Compilation must run in isolation without credentials; user firmware never enters automation.

The native toolchain requires Python 3.10+, CMake, a patched DSP56300 assembler/disassembler, GNU m68k-elf tools and locally supplied original OS 1.40C for composition and firmware-dependent gates. The platform migration has passed local native composition parity. Portable developer setup and approved source-to-package automation are still being adapted. CPU-heavy emulator/stress checks remain paused in this task. Compiled module code, packaging parity and hardware qualification are separate proofs.

Displaced ColdFire module/platform expectations and DSP hook expectations were changed to address/length/hash guards. The receiver’s nine-word stock null routine is recovered and relocated only at local build time, never retained in the SDK source. `stock_guard.py` reads and verifies the developer's own ignored local extraction; absent or altered firmware fails closed. A copied stock-label table was removed. No stock firmware, extracted output, submodule checkout, vendor binary or upstream Git history is imported. The remaining native tooling/source needs a provenance audit before SDK release. `npm run sdk:check` covers guarded reads using original synthetic fixtures, with no firmware or emulator input. `docs/VERIFICATION.md` records native parity separately.

## Verify native composition locally

With a locally patched toolchain and your own ignored original 1.40C extraction:

```sh
python3 scripts/verify-sdk-native.py --raw-os /local/path/section_3_MAIN_OS.bin --vendor /local/path/vendor
```

The recorded verification used a temporary SDK copy, verified the original seven public modules and the internal loader, compares two complete native-image hashes and the overcrowding rejection, then removes the temporary firmware-containing outputs. It does not run audio renders, stress tests or the emulator. It produces proof of composition, not hardware qualification or a flashable download. The expanded source tree still needs native integration; the verifier rejects pending imports before evaluating their source. The copied upstream Makefile remains a reference until portable SDK setup and local packaging are finished. See [verification.json](verification.json) for the recorded identities.

## Versions and approval

Every module has a semantic version. Code, native declarations, web descriptions, controls, evidence or media changes require a strictly greater version. Patch versions suit compatible fixes; minor versions suit compatible additions; major versions identify changed stored parameter layouts, IDs or behavior requiring migration. Never reuse an already released version for different contents.

**The owner merging the PR is the approval.** There is no second website approval step. Require owner review and passing checks on the current PR revision before merge. Automation builds the merged source commit and records module versions, source and artifact identities. A failed build keeps the previous release available. Protect main against unreviewed direct changes before enabling publication.

## Requested source imports

The four additions have `0.1.0-experimental` manifests, exact per-module `source` pins and `build.status: pending`. They appear in the local library, comparison and saved configurations, but compatibility and the browser composer refuse firmware builds containing them. Existing compiled/native artifacts remain separate and have not been rebuilt or relabelled as covering the additions. The current release compiler supports the original seven only and refuses this expanded catalog, so publication stays blocked until the additions are integrated and independently verified.

MIDI Scenes vendors only its twelve required GNU assembly units, README and MIT licence from 1.40MIDISC8.2. Quantizer vendors only its v2.9 implementation, documentation and MIT licence. Neither imports the other modules in its author's repository. USB MIDI source is under `octabam/platform/usb-midi/` and registered internally; it is not a public catalog entry. The chosen USB Audio module sends twenty output channels at high speed, with no USB audio input.

Import validation is static: `npm run sdk:check` checks the recorded source hashes, stock guards, author pins and required dependency files without evaluating imported Python. Every embedded stock expectation in the new declarations was replaced with an address/length/hash guard; no stock routines or firmware outputs were copied. Each TESTING.md separates upstream historical evidence from pending Octamod composition, packaging and hardware qualification. No firmware/DSP gates run as part of this import.
