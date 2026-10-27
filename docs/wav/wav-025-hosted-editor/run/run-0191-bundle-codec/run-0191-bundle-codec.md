---
type: run
run: 0191
status: completed
profile: TDD+pln
wave: 025
---

# Run 0191: bundle-codec

Wave 025 (hosted-editor), manifest id W-3.

## Canonical impact

Canonical impact: none; a new part of the editor (`persistence/bundle.js`) and its tests, no register is declared and no contract moves (`bundleWorkspaceFiles` and `unbundleWorkspaceFiles` are not called by the page yet; Export and Import of run W-5 will).

Files outside likely_paths: none

Review pass: dispatched, the Stage 5 review of the TDD was made by an agent independent of its drafter (findings in the prg); the orchestrator read the codec (`persistence/bundle.js`, 218 lines, no module state, no large allocation) and the two test files against the TDD before closing the run.

## Verification

Commit `33ccda5` (`feat: the workspace bundle codec ... (#162)`), then, on that tree:

- `node --test bundle-cases.test.js`: 103 tests, 103 pass (the cases file `src/test/resources/editor-bundle/bundle-cases.json`: refused paths `..`, absolute, hidden, a path twice, over the size, a BOM, CRLF, a `---` inside a file).
- `node --test bundle-roundtrip.test.js`: 61 tests, 61 pass: 20 shipped workspace folders found under `src` (the rule of `scripts/byte-identity.sh`), each bundled, unbundled, byte for byte, the same text whatever the order of the files, no two paths differing by case.
- Mutation: with `BUNDLE_SEPARATOR_PREFIX` broken (`--- # fileX: `) and the page rebuilt, the cases test fails 73 of 103; restored, 103 of 103.
- `npm run test:coverage`: 2850 tests, 2849 pass, 0 fail, 1 skipped by design; "the figure holds the floor of scripts/editor-coverage-floor.json" (no floor lowered).
- `npm run lint`, `npm run format:check`, `npm run editor:check` exit 0; upward pairs 99 of `ratchet.max` 99.

Found on the way: the first version of `bundle-roundtrip.test.js` compared `bundle.carried` (objects `{ path, bytes }`) to a list of paths. The failed assertion made node print the bytes (a `Uint8Array` of another `vm` realm, shown as an object with one key per byte), which exhausted the memory of the machine and killed Claude Desktop three times. Fixed in the test (it compares the paths), not in the codec. Not run: `./mvnw verify` (no Java file changed) and `scripts/byte-identity.sh` (the command line is unchanged).
