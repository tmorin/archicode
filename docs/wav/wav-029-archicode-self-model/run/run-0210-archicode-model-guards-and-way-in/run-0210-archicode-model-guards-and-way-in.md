---
type: run
run: 0210
status: completed
profile: TDD+pln
wave: 029
---

# Run 0210: archicode-model-guards-and-way-in

Run of wave 029 (archicode-self-model), manifest id W-2.

Review pass: dispatched, the Stage 5 KDMLLC review ran in a different agent from the drafter; its findings were applied by task-001 (see the prg).

Files outside likely_paths: .gitignore (one ignore line for the views that `views generate` writes beside docs/architecture, from wave 029 W-1, not from a task of this run)

Canonical impact: none for the canonical architecture documents: the run adds tests, one model relationship (editor core owns the read schema, demanded by Q05) and a CLAUDE.md section, and changes no canonical contract or domain invariant.

## Verification

Stage 11, 2026-10-31, JDK 25.0.4: `./mvnw test -Dtest="Architecture*Test"` 21 tests, 0 failures (drift 6, impact 10, model 5); `./mvnw test-compile pmd:check` exit 0; `node --test src/test/javascript/architecture-model.test.js` 3 pass; `npm run format:check` pass; `git status --short src` lists only the new test files and `src/test/javascript/architecture/`, nothing under `src/main`; `git diff --numstat -- CLAUDE.md` 4 additions, 0 deletions; issues #184 to #189 resolve and are open; no `views*` folder in the repository. The one model edit is the relationship editor core to read_schema (qualifier owns), demanded by Q05 and checked by its sabotage test.
