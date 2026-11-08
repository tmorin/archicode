---
type: run
run: 0232
status: completed
profile: TDD+pln
wave: 035
---

# Run 0232: editor-page-built-by-maven

Run of wave 035, manifest id W-2.

Review pass: dispatched (the KDML review of the TDD, Stage 5, runs in a leaf agent in a fresh context, not in the agent that drafted the TDD at Stage 4).

## Canonical impact

None to a canonical register: `docs/` declares no `arc` or `dom` register, so CI-arc and CI-dom do not apply; the model of ArchiCode is updated (the elements of the page, the WebAssembly and the bundles name their sources, IMP-13) and ArchitectureDriftTest and ArchitectureImpactTest pass in `./mvnw verify -DskipITs=false`.

## Verification

Stage 11 ran the full suite once after the entry of `EditorFiles.java` in `src/main/editor/java-names.json` and the matching expectation of `check-editor-layers.test.js`: `npm run test:unit`, `npm run test:coverage`, `npm run format:check`, `npm run lint`, `./mvnw test-compile pmd:check` and `./mvnw verify -DskipITs=false` exit 0, as do `npm run editor:check` and `scripts/byte-identity.sh` (exceptions file unchanged). REQ-1 to REQ-7 were re-read against the files and hold. The pln is `done` and the run `completed`. Unproved until a tag run (Q-1): the arm and macOS native targets, the website step, a cold runner; the two Playwright projects of the phase gate were not run here. The detail is in the prg.
