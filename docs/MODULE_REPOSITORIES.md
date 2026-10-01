# Module folder and website contract

A module is a folder under `sdk/octabam/modules/<id>/` containing native source, `manifest.py`, `octamod.module.json`, README, TESTING, licence and optional media. Start with `npm run module:new`. See [SDK setup](../sdk/README.md) and [contribution rules](../CONTRIBUTING.md). Submissions and all updates use PRs; merging the PR is owner approval. No direct module upload or separate website approval remains.

## Schema version 2

[The downloadable template](../public/module-repository.example.json) and `src/catalog/module-contract.ts` define the strict contract. Unknown fields, missing sections, invalid versions, unsafe paths, impossible control defaults, mismatched label counts and invalid media declarations are rejected. Source is never executed by metadata validation.

| Field | Required content |
| --- | --- |
| id, key, name, version, category | Stable folder/build identity, readable name, semantic module version and category |
| author | GitHub author login and complete credits |
| nativeManifest | `manifest.py` beside this file |
| presentation | Library summary, page overview, family/label, highlights and practical usage |
| controls | Every active control: name, default, count, description, labels or null |
| compatibility | Original OS 1.40C, location, conflicts and explicit limitations |
| resources | Storage/processing label, display, optional numeric value, unit, evidence method, exact conditions/source; unknown numbers are null |
| tests | TESTING path, honest result summary, hardware status, exact evidence commit and declared gates |
| license | SPDX expression, local licence file and accurate source/media declaration |
| media | Relative path, hardware/emulator/audio type, caption, alt text, credit, licence and original/source provenance |

A display string may report a range or several quantities while its scalar value stays null. `method: unmeasured` forbids a numeric claim. Static prices and emulator instruction counts are not hardware percentages. Historical hardware results do not qualify a later revision.

## Build and version checks

`npm run modules:generate` validates source folders and writes `src/catalog/module-documents.json`. The module library, pages, controls and resource explanations consume that generated content. `sdk/catalog.json` lists only the seven initial frontend modules, each at an exact version, and retains the native source pin. New source folders do not silently enter the configurator.

`npm run modules:check` rejects stale generated content and missing local documentation/media. `--base origin/main` also requires a strictly greater semantic version whenever any file in an existing module folder changes. PR CI runs it against the exact base SHA. Sources, docs and media are reviewed together. No `.bin` or `.syx` file belongs in the source or media folder. No symlink may escape the folder.

## Publication

The owner merging a PR is the approval for the update. The subsequent release must compile original/licensed code in isolation, record the merged commit, module versions and checksums, and preserve the previous release if a build fails. Native package generation and source-to-release integration still need verification; generating web content alone does not install arbitrary third-party code. Stock firmware must never reach automation or the community API.
