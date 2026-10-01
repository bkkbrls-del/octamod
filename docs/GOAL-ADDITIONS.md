# Additions for the in-app goal

Retain the full Octatrack configurator objective and add these accepted decisions:

- Host the static React frontend on GitHub Pages. Keep a configurable HTTP API boundary for the community backend. Prepare Cloudflare Worker/D1/R2 deployment and a self-hosted option on the owner's webserver, which the owner currently prefers to explore. Avoid paid dependencies; keep firmware processing entirely on the user's device.
- Use one monorepo for the frontend, backend, module sources, SDK, developer documentation and release tooling. Finish most of the web implementation first, then freshly clone octabam and adapt it into an attributed, licensed Octamod SDK. Give the SDK its own clear directory, version and developer entry point.
- Handle all new modules, module updates and media contributions through GitHub pull requests only. The Submit page directs contributors to the repository and development guide. Every update requires owner approval; passing CI or pushing a commit cannot publish a module automatically.
- Module folders are the source for their frontend pages: enforce a strict versioned manifest covering descriptions, controls, author credits, licensing, compatibility, resource measurements, test evidence, screenshots and audio previews. Supply reliable scaffolding, thorough module READMEs, test-report templates and contribution rules, with validation that rejects incomplete or unsafe metadata and paths.
- Use “modules,” “module configuration” and “module set” in Octamod's interface and documentation; retire “remix” terminology. Keep only necessary upstream file paths/command compatibility while the SDK transition is implemented.
- Preserve guest comments, reviews, ratings, likes and author-directed issue reporting without requiring accounts or email. PR contributions happen on GitHub. Octamod has no GitHub sign-in or visitor accounts; private administration uses separate backend access control.
- Prepare the finished web implementation and SDK for backend setup by morning where feasible. Do not pause prematurely; stop only after the full requested implementation is verified or at the owner's explicit request.

Latest clarification: PR merge by the owner is approval, with no second website review step. Require module semantic versions and an increase for every source/docs/media update. Initial scope is only the seven existing frontend modules, plus necessary SDK infrastructure.
