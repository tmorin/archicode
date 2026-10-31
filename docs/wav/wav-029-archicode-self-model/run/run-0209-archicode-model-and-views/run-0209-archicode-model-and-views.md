---
type: run
run: 0209
status: completed
profile: TDD+pln
wave: 029
---

# Run 0209: archicode-model-and-views

Wave 029 (archicode-self-model), manifest id W-1.

Files outside likely_paths: .gitignore, docs/wav/wav-029-archicode-self-model/**

Review pass: dispatched, Stage 5 (TDD, KDMLLC) and Stage 9 (pln) ran in agents other than the drafter; Stage 11 re-checked from the files.

## Canonical impact

None: the repository declares no canonical register (no `docs/CLAUDE.md`, no `arc` or `dom` register), so no CI-arc or CI-dom item is owed; the model in `docs/architecture` is a product artefact that W-2 guards.

## Verification

Stage 11, read back from the files and re-run: `archicode query graph` on `docs/architecture` exits 0 with empty stderr and 42 elements; `ArchitectureModelTest` 5 tests green under JDK 25; `architecture-model.test.js` 3 tests green; `query views` lists the 5 saved views by name; `./mvnw test-compile pmd:check`, prettier check and eslint exit 0; every `tags.path` exists; `git status --short src` lists only the two new test files; no generated view file in the folder and `.gitignore` covers `views*/`; the two sabotages (a dangling destination, a `views-foo` folder) each fail the node test. Not re-run: the full `./mvnw verify` and the full node suite (no file under src/main or the editor changed).
