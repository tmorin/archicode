---
type: run
run: 0227
status: completed
profile: TDD+pln
wave: 034
---

# Run 0227: editor-assets-beside-the-page

Run of wave 034, manifest id W-2.

## Verification

Stage 11, 2026-11-07, run from the repository root with Java 25, at HEAD bfd0581 (the change is committed). Exit 0 unless said: the gate-1 grep prints nothing; `npm run editor:check` (98 upward pairs, max 99); `npm run format:check`; `npm run lint`; `npm run test:unit` (3538 tests, 3537 pass, 1 skipped, 0 fail); `npm run test:coverage` (total 93.16 % lines, 96.32 % functions, every figure at its floor, floor file unchanged); `./mvnw verify -DskipITs=false` (1867 unit tests, 2 skipped, 58 integration tests, 0 failures); `./mvnw test-compile pmd:check`; `editor-offline.spec.js` with `--project=chromium` and `--project=firefox` (2 passed each, every host but 127.0.0.1 blocked); `scripts/byte-identity.sh` (344 commands compared, 274 identical, 69 accepted by the existing exceptions, 0 unexpected, no exception added); `npm run editor:build` and `npm run sample:build` leave the page, both samples and the assets with the same sha256. Re-read in the files: `esbuild` 0.28.2 in `package.json` and one entry in the lock; `codemirror.js`, `elk.js` and `THIRD-PARTY-NOTICES.txt` in the assets folder; the table of two assets in `EditorHttpServer` and its handler; the step "Assemble website" copies the folder and compares each file with `cmp`; rule R-07a in `scripts/changes.mjs`; the sentences in `src/doc/README.adoc`, the `CLAUDE.md` files and the model. Task-level proofs recorded in the prg, not re-run here: the non-vacuity of the offline spec on a jar with a broken bundle, the rehearsal of the website step, the `file://` measurement and the sizes and load times. Not proved: the real website step (a tag run), macOS and Windows determinism of the esbuild output, the native image, the real Safari, the `.wasm` halves of gates 3 and 5 (W-3).

## Review pass

Review pass: dispatched, the Stage 5 KDML review of the TDD ran in a leaf agent other than the drafter (8 findings, carried as gap-002 and resolved inside the tasks), and each of the 8 tasks was verified by a separate agent.

Files outside likely_paths: CLAUDE.md, README.md, docs/architecture/manifests/archicode.yaml, docs/architecture/manifests/views/view.contracts.yaml, src/main/rust/viewpoint-kernel/embed.sh, src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json, src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java
