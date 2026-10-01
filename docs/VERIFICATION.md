# Verification record

## Browser firmware flow — 1 October 2026

Verified in the actual local frontend using the browser worker and a locally saved original OS 1.40C file. Stock and output bytes stayed local; this record contains identities only.

| Configuration | Stock FX2 | Download bytes | SHA-256 |
| --- | --- | ---: | --- |
| Mini Verb, Tape Echo, Euclid, Repitch | retained | 582260 | `91331100c6035b9961fa55c9757b6132eebb0c5b773c1d918052f08b558a78b0` |
| Spectrum, Modulation, Character, Mini Verb, Tape Echo, Euclid, Repitch | compact | 590072 | `1f5050c1ef1f0bc632bd354410be18d151828312f0d80cdafe2a21c4a02feb0d` |

Both identities equal the unchanged native builder plus the same-input native ELEK/ELUP packaging oracle at source revision `b8deefc88b2c3e5f3c6158e364eb741df1924e1d`. See `src/engine/assets/composition-proofs.json`; eight native profiles have OS, container and full-file fingerprints. All seven modules with all stock FX2 effects are rejected for formatter-cave overflow by both composers. The browser reports how to reduce that selection and offers no download.

Risk acknowledgement gates the build. Changing chooser settings invalidates the completed result and acknowledgement. Canceling a real compact build returns to the valid selection; the next build completes with the native identity above. The enabled Download .bin control was clicked in the actual browser. The downloaded file was independently read from the host Downloads folder: 590072 bytes with SHA-256 `1f5050c1ef1f0bc632bd354410be18d151828312f0d80cdafe2a21c4a02feb0d`, matching both the browser result and native oracle. Changing chooser settings afterwards removed the old download and acknowledgement; the overflowing selection remained blocked. Restoring the workspace reverifies the locally saved base. No native emulator, stress or audio-render checks were run for this verification.

Local parity and container round-trip checks do **not** qualify this catalog on hardware. Current module-specific limitations remain visible. Download is enabled for the supported fixed catalog and chooser profiles; arbitrary custom choosers and unapproved third-party packages remain unsupported.

## Application checks

`npm run check` passed lint, 113 tests in 26 files, TypeScript app/server checks and the static production build on 1 October 2026, before the SDK import. Further changes require a new check.

## Still required before completion

first-time base selection and rejection in the browser; project-path frontend and separate-origin guest API and administrator access verification; responsive and keyboard coverage across routes; a clean SDK developer setup; approved source-to-package publication; actual licensed screenshots/audio where available; production service configuration. No public deployment has occurred.


## Source-folder catalog and versions — 1 October 2026

The frontend now reads strict versioned manifests beside the seven imported source modules. `npm run check` passed 115 tests in 27 files, lint, TypeScript and static build after version pins were added. An independent disposable Git fixture proved that a README update without a version increase is rejected, and a greater semantic version plus exact catalog pin is accepted. The SDK scaffolder successfully created a disposable DSP module; the source skeleton is explicitly untested. Local community migrations 0004–0006 applied successfully. Source-to-package release automation and portable developer setup remain incomplete; the platform migration now has the separate parity evidence below.

Guest comment posting and the ownership-only Remove control were exercised in the actual browser against the local bearer-session Worker; the verification comment was removed afterwards. Existing guest rating/like state was retained. Worker dry-run bundling passed (77.69 KiB, 19.19 KiB gzip) without deployment.

## Trimmed SDK composition — 1 October 2026

The public SDK registry contains exactly the seven frontend modules. Two stock-loader declarations are isolated under `sdk/octabam/platform/`, with their controller dependencies outside the catalog. The stock null routine is absent from the source tree: the assembler reserves its nine-word tail and fills it from locally fingerprinted original firmware, with the loop end relocated. Stock detour/DSP-hook expectations likewise use guarded local reads.

In a disposable SDK copy using the same patched assembler/linker, Mini Verb + Tape Echo + Euclid + Repitch with stock FX2 produced 1,245,104 bytes, SHA-256 `1dbef0e5646ae3814224b88ca6ebda7fb911840a8ca2aa2af810ed5ef5e0cdac`. All seven modules with the compact FX2 chooser produced 1,250,126 bytes, SHA-256 `5162680d8bc342deb623cef00307f2a343f539a90f0bfcef59b59ceb4c60bb83`. Both complete native-image identities equal the unchanged upstream-source oracle. All seven with stock FX2 rejected with the same `wide dial hook (116 B) does not fit` error. Raw composed image sizes differ from the compressed downloadable upgrade sizes recorded above.

Temporary stock-containing inputs and outputs were removed. No emulator, stress or render checks ran. Reproduce with `scripts/verify-sdk-native.py`; hashes and scope are recorded in `sdk/verification.json`. Native setup portability, remaining source/provenance audit and reviewed source-to-package release automation remain required.

The full lightweight application check passed 116 tests in 28 files, lint, TypeScript and static build. Three additional synthetic SDK tests passed missing/altered-input rejection, bounds/fingerprint validation and native DSP record recovery without proprietary fixtures. Both DSP and ColdFire scaffolds were created and checked; they retain author attribution and a deliberate failing qualification gate until actual behavior checks are implemented.

## Guest-only community and separate administration — 1 October 2026

Website GitHub sign-in was removed: no OAuth routes, grants, callback cookies, GitHub identity in the session contract, or frontend sign-in code remain. Former `/api/auth/github`, `/callback` and `/complete` return 410 without redirects or cookies. Account-bound cloud configuration copies are retired (410); configurations stay on the device and move by export. Migration 0007 drops the one-use grant table and adds administrator sessions.

Administration is separate from guest identity. The backend owner configures `ADMIN_KEY_SHA256`; the administrator exchanges the key for an eight-hour, tab-scoped session sent in `X-Octamod-Admin`. Every `/api/admin/` route checks it on the server. Without a valid configured digest, access fails closed. Key attempts are throttled, sign-out revokes the session and rotating the key revokes all sessions. Issue reports, comment moderation and history are only under `/api/admin/`; reporters see their own reports through `/api/issues/mine`.

`npm run check` passed 125 tests in 30 files (including the four owner-merge approval tests and new administrator/guest isolation tests), the four synthetic SDK tests, lint, app/server TypeScript and the static build. Against the actual local Worker runtime (workerd) the retired routes returned 410, admin routes 403 and an unconfigured key 503. A disposable second Worker with its own D1 state and a temporary key accepted the correct key, refused a wrong one, kept a guest out of the admin inbox, showed the reporter only their own report and refused the revoked session. The temporary key and state were deleted. The new pages were not yet exercised in a browser.

## Source-built packages v4 — 1 October 2026

Native parity found a regression in the v3 source build. v3 bound the receiver's static null dispatch entries to its local stub copy (`dlstubinit`) instead of stock's null stub (`P:0x7c8` A / `P:0x588` B), so the patched OS extent no longer matched the native oracle. The SDK's dynamic-load notes state that static placement keeps the stock entries and only the running receiver redirects ids. A controlled A/B run showed v2 assets and v3 with only those two values restored both pass full parity.

The compiler now takes the static entries from the declared stock-copy source address, and `--verify-existing` compares the complete receiver record (placement, frame, dispatch bindings, stock-copy record and code), not only code bytes. The importer independently refuses receivers that rebind static null entries. v4 was compiled stock-free with the read-only native toolchain against the parity-proven v2 baseline. Its resident receiver file is byte-identical to v2; the ROM file differs from v2 only in the shared-dial guard source fingerprint. Source tree `d7a156941589e867236a470adc5fccb6c03a513d98bd7ae092ea3df17097c213`, compiler `36265406504e8e1d4bcaac1534ff5ecf3f639a6f854cebbfc044a167f1785bf5`, development build (no source commit or approval).

The import rejection proof accepted v4 and refused corrupt, stale-version, stale-source, incomplete-inventory, stock-read, non-zero stock-tail and null-rebinding artifacts without changing frontend assets; v3 is now refused because its compiler differs. After importing v4, `scripts/verify-composition-native.mjs` with the user's own original 1.40C matched all eight native OS, container and update identities, including 590072 B (all seven, compact) and 582260 B (four modules, stock FX2), plus the crowded-selection, wrong-slot, unsupported-chooser and modified-firmware rejections. No firmware was written. A stock-free copy of the v4 artifact and the proof script are kept locally under `.codex/source-builds/` (not tracked). No emulator, stress or render checks ran.

## Release pipeline review — 1 October 2026

The repository is now public at `repeat98/octamod`. The first push ran `pages.yml` and failed closed at the owner-merge step because `MODULE_APPROVER_GITHUB_ID` is not configured; nothing was built or deployed and Pages is not enabled. That run also showed the release scripts load their TypeScript helpers on the runner's Node 24 before `npm ci`. GitHub's REST API lists `2026-03-10` as a supported version, so the approval client's version header is valid.

Changes from the review: the six workflow actions are pinned to the commit SHAs of their current releases (checkout 7.0.1, setup-node 7.0.0, upload-artifact 7.0.1, download-artifact 8.0.1, upload-pages-artifact 5.0.0, deploy-pages 5.0.1; all Node 24 or composite, with the inputs used verified at those commits). Runners are pinned to `ubuntu-24.04`, and the toolchain image to the `ubuntu:24.04` index digest. The ineffective second `.dockerignore` was removed; `Dockerfile.dockerignore` is the one Docker applies. Release-mode import now also requires the CI build to reproduce the committed, locally parity-verified packages, with the commit stamp as the only permitted difference. Before this, CI-compiled bytes replaced the committed ones without any parity evidence.

A disposable clone with these changes committed exercised the real `build-modules-isolated.sh` with a stand-in for `docker run` (no daemon was available). It refused a mutable image tag, an existing output directory and a dirty checkout. The staged mount contained exactly the commit's tracked tree, one commit object and no history. Planted ignored files (`firmware/fake.bin`, `.dev.vars`) were absent. The compiler's release-mode Git checks passed on the read-only staged copy. With GitHub's API mocked, the production importer refused a merge by another account, a non-matching merge commit and a committed package that the build did not reproduce. It accepted the owner-merged, reproducible build and recorded the PR approval. The eight published packages differ from the committed v4 packages only in `sourceCommit`.

Still unverified: the Docker image build and real container isolation (network, capabilities, read-only root); whether the container's Ubuntu `binutils-m68k-linux-gnu` and its dsp56300 build reproduce the local packages (the reproduction gate fails closed if not); and a real owner-merged PR run on GitHub with Pages enabled.

The first owner-merged PR (#1, merge commit `3f68473`) showed that GitHub omits `merge_commit_sha` from the single-PR endpoint for read-only tokens. The release check therefore refused a genuine owner merge, twice, and published nothing. Approval now requires GitHub's own `merged` issue event to name this exact commit and the owner as the merging account, keeps every other PR check, and still compares `merge_commit_sha` whenever GitHub returns it. Because a push can start the check seconds before GitHub links the merge commit to its PR, the lookup retries for about 90 seconds. Against the live API without a token, the check approved `3f68473` as PR #1 merged by the owner and refused the PR's head commit.

The first release run past the approval check (merge of #2) built the image and compiled the DSP packages, then failed on ColdFire assembly. Ubuntu 24.04's `binutils-m68k-linux-gnu` is older than the local GNU binutils 2.47 (`m68k-elf`) that produced the committed packages and lacks the `.base64` directive. Nothing was published. The image now builds binutils 2.47 for `m68k-elf` from `binutils-2.47.tar.xz`, pinned by SHA-256 `154ab23b60070e8f27013c22977f1129425d67d1e8acd6e13010e617811e4cff`. The tarball was verified locally as signed by the chief binutils maintainer's key in GNU's official keyring.

With Docker running locally (linux/arm64; GitHub's runners are x86-64), the image built and the real `build-modules-isolated.sh` compiled a clean clone of main (`83c2ee9`) in the container. All eight packages are identical to the committed, parity-verified packages apart from `sourceCommit`. The production importer, with GitHub's API mocked and `merge_commit_sha` withheld, accepted them. With the script's flags, the container had no network route, a read-only root filesystem, a non-root user and only `/tmp` writable.

## Production deployment — 1 October 2026

The merge of #3 ran the complete release workflow: owner merge verified, isolated container compile, reproduction gate, app check and Pages deployment. https://octamod.app serves the site over HTTPS with a GitHub-issued certificate. `www.octamod.app` and `repeat98.github.io/octamod` redirect to it. The live firmware worker carries the approval record for PR #3 (commit `c2f5c5b`, merged by the owner) with the qualification note "assembly and relocation only".

The community Worker runs at `https://octamod-community.octamod.workers.dev` with a new D1 database (Western Europe) and migrations 0001–0007. It has no R2 binding. Against the live API: the session route answered for `https://octamod.app`, another origin was refused (403), the preflight from `https://octamod.app` was allowed, module data was readable, admin routes were refused (403), admin login reported "not configured" (503) before the key was set, and the retired sign-in routes returned 410.
