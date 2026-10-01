# MIDI Scenes testing

Version: `0.2.0-experimental`.

## Standalone author evidence (not Octamod qualification)

| Field | Value |
|-------|-------|
| Product | MIDISC2.0 standalone (author midisc repo) |
| Revision | `4f9a89453fdcdd39a3cd57f010ffa489cac721cd` |
| Reporter | module author (`bkkbrls-del`) — **author-reported** |
| Date | 1 October 2026 |
| Hardware | Elektron Octatrack (author unit; MK model not separately logged in this note) |
| Image | Desktop `MIDISC8.20.bin` / GitHub MIDISC2.0 rebuild path (`release20.json`) |
| Scenarios | Sequencer pattern commit / Direct Jump next-step; MIDI scenes follow ACT pattern Part immediately; no sequencer freeze after JSR+RTS sync cave |
| Result | Author reports expected Part/scene behaviour restored; sequencer no longer bricks |
| Limits | Author-reported only. No Octamod owner witness log, no MK serial, no automated on-device capture in this repo. Does **not** qualify Octamod browser/native composition of this module version. |

## Octamod pin (relocatable gas)

Octabam evidence pin: `363861e31ee963c478fab2b190a0fabe1d7ce37b` (1.40MIDISC8.2-derived gas). Historical OKMS1 / 0.1.1 loader-free matrix results apply to that earlier pin only.

## Integration status

Catalog/docs updated to MIDISC2.0 with `build.status: pending`. Firmware builds for MIDI Scenes are rejected in single and mixed selections until a relocatable 2.0 port plus browser/native parity and rejection gates land. Other requested modules remain on their verified 0.1.1 pins.

## Historical gates

- `tools/verify/verify_midiscenes.py` (upstream record; not run for this metadata update).

## Validation recorded for this PR

Commands and results are appended after local `npm run check` / `modules:check` in the PR body. Preview of the module page (credits, MIDISC2.0 text, pending-build status) should be confirmed before merge.

## Before enabling firmware builds

- Port MIDISC2.0 into relocatable units (or equivalent stock-free recipe) for this SDK.
- Prove actual browser/native byte parity and rejection for each supported selection.
- Keep standalone author results separate from Octamod qualification.

## Local validation (this PR revision)

Ran on Windows with Node.js v22.22.0 (repo .nvmrc requests 24; CI Ubuntu uses Node 24). Python 3.12 via python (sdk-check / scaffold tests use platform-aware interpreter).

`	ext
npm run modules:check -- --base upstream/main
# Validated 11 module folders; 11 version-pinned catalog entries; version bumps checked against 074a503…

npm run check
# modules:check + sdk:check + eslint + vitest + production build — pass
`

Preview of the module page (credits, MIDISC2.0 text, pending-build status) should still be confirmed in the GitHub Pages preview after push.
