# Working on Octamod

Octamod is a static React/TypeScript configurator for octabam. Its build engine runs in a browser worker. GitHub Pages serves the app; a Cloudflare Worker, D1 and R2 serve the community. Same-origin Cloudflare Pages remains a supported fallback. Firmware processing stays local.

- Never commit or deploy Elektron firmware, extracted routines/tables, upgrade images or stock-containing generated code. Derive stock content from the user's selected 1.40C file at runtime.
- Per the user request on 30 September 2026, remember verified base firmware across sessions in local browser IndexedDB. Never upload, sync, log, bundle or redistribute firmware. Provide a remove-from-device control and revalidate the stored file on restore. Screenshot and audio-preview uploads are separate reviewed community assets; upload endpoints must reject firmware.
- Preserve module authorship and source provenance. Catalog metadata is pinned to an octamad commit; the native remixer remains the oracle for composition.
- Do not enable firmware download until the actual browser engine passes native byte-parity and rejection tests. Never substitute an unmodified image or mock binary.
- Use Node.js 24. npm run check runs lint, small domain tests, type checking and a static production build. Do not run firmware/DSP tests here.
- Public UI should explain selection and build status without exposing implementation details. Keep mobile and keyboard use working.
- Build with npm run build. dist/ is the GitHub Pages artifact directory (and Cloudflare fallback upload directory). Scaffolding does not authorize publishing, creating a public GitHub repository or attaching the user's real name to the site.

- Participation is account-free: guest comments, ratings, likes and author-directed issues. Do not implement GitHub sign-in or visitor accounts on the website. Do not request, fetch or store email addresses. PR authentication happens on GitHub itself.
- Every submitted module and media asset must respect Elektron’s and other parties’ intellectual property. Require original or properly licensed sources, attribution, a contributor declaration and reviewer verification. Never imply review is an automatic legal clearance.
- User configuration builds perform lightweight compatibility, placement and packaging integrity checks; never run the octabam stress/emulator test suite in the user flow.

- Every module version / update requires administrator approval, including octamad main changes. Submissions and updates use PRs only. Owner merge is approval; there is no second website approval step. Require a strictly increased module semantic version for source, documentation and media changes. Scope is the seven initial frontend modules plus Analog BD, MIDI Scenes, USB Audio (tracks + MAIN/CUE) and Scale Quantizer, requested on 1 October 2026, with required SDK infrastructure (including internal USB MIDI). Further modules are outside scope. Never execute unreviewed source on a trusted host. Keep the current approved publication while an update is pending or rejected. Stock firmware must never enter source-build automation.
- The admin workspace requires separate server-side authorization configured during backend setup; GitHub OAuth is no longer in scope. Do not add frontend-only access checks, unguarded preview overrides or public audit / private issue endpoints.

- Accepted architecture on 1 October 2026: one repository containing frontend, community API, SDK, module sources and developer documentation. GitHub Pages is the frontend target; Cloudflare Worker/D1/R2 is the initial backend. Keep a configurable API boundary for optional future self-hosting on the owner's webserver. See docs/DECISIONS.md and GOAL.md. Do not create a separate SDK repository by default.

- Module page content comes from sdk/octabam/modules/<id>/octamod.module.json, generated through scripts/modules.mjs. Keep strict schema, README, TESTING, licence and version pins synchronized.
