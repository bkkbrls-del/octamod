# Contributing to Octamod

Contribute modules, fixes, documentation, screenshots and audio through GitHub pull requests in this one repository. Guest site comments and author issue reports do not require registration or email. The owner merging your PR approves that module version; the website has no second approval queue.

## First module

1. Fork and clone the Octamod repository. Use Node 24 and `npm ci`.
2. Read [the SDK quickstart](sdk/README.md), then run `npm run module:new -- my-module --kind dsp --author your-github-login` (or `--kind coldfire`). Keep source and site metadata together under `sdk/octabam/modules/my-module/`.
3. Implement the native contribution, assign a free ID where applicable, document all controls and declare claims/conflicts. Supply your own stock OS only in ignored local storage when native development requires it.
4. Record actual quality/stress results, tested commit, conditions and every command/result in TESTING.md. Separate static estimates, emulator evidence, historical hardware evidence and current hardware qualification. A passing assembly or metadata check is insufficient.
5. Validate the strict site manifest. Run `npm run modules:generate` for catalog changes and `npm run check`. New modules also need approved engine package integration and native parity/rejection evidence before they can be included in `sdk/catalog.json`; metadata alone cannot install executable code.
6. Open a PR against the Octamod repository. Include authorship/licence/media-rights declarations and validation results. Updates must remain reviewable as one source/documentation change.

## Required version increase

Every module requires a semantic `version` in octamod.module.json. Any change in its folder requires a strictly greater version than main, including code, native manifest, descriptions, README, evidence and media. Update the matching catalog entry when that module is already included. Run `npm run modules:check -- --base origin/main` after rebasing onto current main. Never overwrite a released version. Explain parameter-layout/ID migrations and old-project compatibility for breaking changes.

## Intellectual property

Only original or properly licensed source and media may be submitted. Keep every author and full licence text, document third-party provenance, and give accurate declarations. Do not include Elektron firmware images, extracted instructions/routines/tables, stock slices, upgrade/SysEx files or infringing third-party work in source, media, PRs or build artifacts. Firmware-dependent content must come from the user's local verified OS at composition time. Hashes/addresses/lengths are the guard pattern. Review and contributor declarations are not automatic legal clearance.

## Screenshots and audio

Store assets in the module's media/ folder and list them in the manifest, with capture type, caption, alt text, credit, licence and original/source provenance. Hardware captures and emulator captures must be labelled accurately. PNG/JPEG/WebP: 5 MB maximum; WAV/MP3/Ogg: 12 MB maximum; eight assets maximum. No executable files, firmware, path escapes or symlinks. Empty media is honest when no licensed capture exists; it does not satisfy the completion requirement for real media where available.

## Review and release

The maintainer checks behavior, tests, resource claims, provenance and compatibility in the PR. Require owner review and successful checks on the latest revision before merge; configure [protected-branch reviews and required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) when the repository is created. Merge is approval. A release binds the module version and source commit to immutable compiled-package hashes. Release automation never sees firmware, so it cannot prove native parity itself: a PR that changes compiled packages must include them, rebuilt with `npm run modules:build -- --vendor <toolchain> --output <new-dir>` and `npm run modules:import -- <new-dir> --development`, plus native parity results from your own original OS. After merge, automation recompiles the reviewed commit without network, credentials or firmware and publishes only if it reproduces the committed packages exactly (apart from the commit stamp). The browser composes approved packages with the user's local base. Pending PRs never replace the current release. A failed release build keeps the previous release intact.

Repository, Pages publication and backend credentials are configured by the owner. The site is published at https://octamod.app with its community API on Cloudflare. Record native qualification that has not run as pending, not passed; `npm run check` does not perform firmware, DSP or hardware qualification.
