# Active goal: Octamod

Build the definitive Octatrack firmware configurator: a polished, accessible website where anyone can discover effects, understand their sound and controls, assemble compatible firmware, and participate in the community without creating an account. No page should look generic or carelessly generated.

## Required outcome

- Guide a first-time visitor from their own stock 1.40C firmware through clear defaults, immediate compatibility checks, understandable errors, a real flashable download and installation instructions. Keep advanced selection fast.
- Explain each effect's purpose, sound, controls, practical uses, compatibility, authorship, storage and measured CPU/DSP costs. Distinguish unavailable measurements, emulator evidence and verified hardware results. Include real screenshots and audio previews where available.
- Support searching, filtering, sorting, comparing effects and discovering module sets. Support multiple named configurations with create, edit, rename, duplicate, delete, import/export and persistent verified base firmware.
- Offer guest comments, reviews, ratings, likes and module-author issue reporting without registration or email. Include abuse prevention, ownership, moderation and clear privacy expectations. No GitHub sign-in or visitor accounts on the Octamod website. The private admin workspace retains separate server-side access control, to be configured with the backend.
- modules should be submitted by PRs. Import repository descriptions, source links, test evidence and original/licensed media pinned to a commit. Support a private admin workspace for submissions, updates, media, moderation and publication history. The owner merging the PR is approval for that exact version, with no second website approval step. Every source, documentation, evidence or media update requires a greater semantic version.
- Deliver coherent navigation, readable typography, touch controls, keyboard access and mobile/tablet/desktop layouts on every route and its loading, empty, error and success states. Follow the existing dark, native-app design direction.
- Keep users' stock and generated firmware local. Explain custom firmware risks at selection/build/install points. Never distribute Elektron IP or infringing third-party source/media. Never claim unsupported hardware testing or legal clearance.
- Keep the core experience free of paid dependencies and within initial hosting free-tier constraints.

## Accepted repository and hosting structure

The initial catalog and SDK module integration are limited to **Spectrum, Modulation, Character, Mini Verb, Tape Echo, Euclid and Repitch**, plus their required internal build/platform infrastructure. Do not import the rest of octabam's catalog.

Use **one Octamod repository** for the React frontend, backend, developer SDK, module source, documentation and release tooling. The Octamod SDK is an octabam-derived, pinned, attributed source subtree and clear developer entry point in that repository. Do not create a separate SDK repository by default.

Use **GitHub Pages for the static frontend**. Use **Cloudflare Worker + D1 + R2 for the initial community backend** with a configurable API endpoint and working guest sessions and protected administration across the providers' free domains. The owner's **own webserver is a supported future backend alternative**; keep provider adapters separate from the HTTP contract. Same-origin Cloudflare Pages is the fallback if a material Pages limitation cannot be resolved. Prepare deployments for review before any public publication.

Compile original/licensed modules in isolated automation from reviewed GitHub source commits. Link approved artifacts to their exact source and review; only reviewed, merged and successfully built versions may enter a release. Compose user firmware locally, without uploading stock to the build service. Preserve octabam and each module's author/licence.

See [recorded decisions](docs/DECISIONS.md), including the no-website-sign-in decision accepted 1 October 2026. They supersede the earlier Cloudflare-only and separate-repository proposals while preserving the entire product scope.

## Completion evidence still required

Prove the first-time configuration-to-download flow in the actual browser, supported native parity and rejection cases, meaningful guest community behavior and protected moderation access, approved source-to-module integration, developer setup from the SDK, and responsive/accessibility quality across all routes and states. Run appropriate lightweight app checks. CPU-heavy firmware checks remain paused. Treat incomplete integration, placeholder media, unconfigured external services and unverified behavior as incomplete, and leave the goal active.
