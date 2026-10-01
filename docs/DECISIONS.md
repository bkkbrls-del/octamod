# Octamod decisions

Accepted by the project owner on 1 October 2026. These decisions supersede earlier Cloudflare-only hosting and separate SDK repository proposals.

## One repository

Keep the React frontend, community API, Octamod SDK, module sources, developer documentation and release tooling in one Octamod repository. The SDK is a distinct directory and developer entry point within that repository, not a second GitHub repository. Preserve upstream octabam provenance, module author credits and all applicable licences. Start from a fresh, pinned source copy; never copy local firmware, downloads, build outputs, caches, secrets or another session's working changes. Repository ownership and public publication have not yet been configured.

## Hosting

Publish the static React frontend through GitHub Pages. Support project URLs and root/custom-domain URLs. Hash routes work without a server-side rewrite. Build and publish from an exact owner-merged PR commit; manual runs must prove the same approval. Deploying the website never supplies approval for an unreviewed module update.

Use a separate Cloudflare Worker with D1 and R2 as the initial backend on free tiers. The frontend has a configurable public API URL. The owner's own webserver is an allowed alternative: retain the HTTP contract and implement SQLite and file/object-storage adapters. Self-hosted deployment is not implemented yet and is not required to replace the initial Cloudflare backend.

The free GitHub/Cloudflare domains must work without third-party cookies. Persist an opaque community session on the user's device, authorize requests with a bearer header, restrict CORS and mutations to the configured frontend origin, with no GitHub OAuth or website sign-in flow. Private administration requires separate server-side access control when the backend is configured. No session token is put into a URL. Same-origin Cloudflare Pages remains a fallback.

A public repository exposes its owner and history; a branded URL does not provide anonymity. Do not attach the user's real name through invented authorship, deployment configuration or public repository creation.

## Firmware and updates

Firmware stays on the user's device throughout import, persistence, composition and download. Never upload or distribute Elektron firmware, extracted routines or tables, or stock-containing generated artifacts. SDK automation may compile original/licensed module source only. Restore stock content from the user's own 1.40C locally at composition time.

GitHub links identify source and metadata pinned to a commit. The owner merging a pull request approves that exact module version, including updates in the owner's repository. Every source, documentation, evidence or media change requires a greater semantic version; there is no second website approval step. Pending or rejected updates preserve the previous approved publication. No arbitrary repository code runs in the website or metadata importer. Isolate source compilation from secrets and publishing rights.

## Community and verification

Guest discussion, reviews, ratings, likes and author-directed issues need no account or email. Octamod has no GitHub sign-in or visitor accounts. Private administration uses separate server-side access control; its backend setup is still pending. Module screenshots and audio previews arrive through reviewed pull requests with source and rights declarations. Capture and load claims need evidence; distinguish illustrations, emulator checks and hardware tests.

Configuration builds perform compatibility, placement and packaging checks. They do not run the octabam stress/emulator suite. CPU-heavy firmware checks remain paused at the owner's request. Before enabling downloads, prove real browser composition against the native remixer and validate the resulting container. Full-image parity passes for eight supported profiles; actual browser composition and a downloaded file match the native oracle. The trimmed SDK also passes two complete native composition identities and the crowded-selection rejection. Production services, source-build releases and portable SDK setup remain pending.

## Module contributions: pull requests only

Accepted 1 October 2026 after the hosting decision. All new modules and module updates are submitted through GitHub pull requests in the Octamod repository. The website points to the repository and SDK development guide; it does not accept direct module submissions or approve module versions through its backend. Strict versioned manifests, contributor/readme templates, source/media rights rules and PR validation checks belong in the repository. Owner review and approval are required for every update. Guest discussion, ratings, likes and issue reporting still use the community backend. GitHub accounts are used only on GitHub itself for PR contributions; Octamod does not implement GitHub sign-in.


## Clarification — 1 October 2026

The owner merging a module PR is the approval for that update; no separate website approval step is required. Every module needs a semantic version and every source, documentation or media change requires a version increase. Initial SDK and frontend module scope is limited to Spectrum, Modulation, Character, Mini Verb, Tape Echo, Euclid and Repitch, with necessary build/platform infrastructure.

## No website sign-in — 1 October 2026

At the owner's request, remove GitHub sign-in from the Octamod requirements. Visitors comment, review, rate, like and report issues as guests without accounts or email. Module contributions and version approval remain GitHub PRs with owner merge; that repository workflow does not require website OAuth. Keep the private moderation/admin workspace protected with separate backend access control, configured with the owner during backend setup. Existing OAuth scaffolding is obsolete and must be removed before release.

## Catalog additions — 1 October 2026

The owner requested the latest Analog BD, MIDI Scenes, USB Audio and Quantizer implementations from sambanks/octabam. This expands the previous seven-module scope to eleven public modules, with required internal dependencies. The import is pinned to `363861e31ee963c478fab2b190a0fabe1d7ce37b`; MIDI Scenes retains its author's `63ca127bc99638602957f2b05747f8ed3bd9ba52` (1.40MIDISC8.2), and Quantizer retains `525f4b19b04dc3ba3f3bae3b25abbf48df34a10a` (v2.9).

Choose USB AUDIO OUT TRACKS MAIN CUE: it has the broadest documented hardware coverage (MKI and MKII, sustained multitrack captures and concurrent MIDI traffic). Import its required USB MIDI source internally under `sdk/octabam/platform/usb-midi/`. This selection is output-only; USB input and other output layouts are outside scope. Startup audio artifacts, host coverage gaps and remaining alignment limits stay documented. This is a judgment from the source evidence, not a new comparative hardware test.

Preserve the existing native composition pin and proof records. The new source pins describe the additions separately. They can be explored, compared and saved in configurations, but firmware composition rejects them until source packaging and actual-browser/native parity and rejection tests cover them. No firmware/DSP/emulator/stress tests were run during the import. Owner PR merge remains required before publication; the local import grants no release approval. See [the import record](../sdk/imports/octabam-363861e.json) and each module's TESTING.md.
