---
type: run
run: 0221
status: completed
profile: TDD+pln
wave: 031
---

# Run 0221 query-impact

Run of wave 031 (graph-answers-impact), manifest id W-3.

## What the run delivers

`archicode query impact <reference>` (`workspace/Impact`, `cli/ImpactQuery`), with `--direction`, `--depth`, `--qualifier`, `--through relationships|deployments` and `--plateau`; `GetGraphQuery.buildGraph` is static and shared; the oracle `ArchitectureImpactTest` asks the command for Q01 to Q09 and keeps the old walk as a second oracle; the guide, the manual, `CLAUDE.md`, the site, `llms.txt`, the model of ArchiCode and its sample say the same.

## Verification (run on 2026-11-05, JDK 25.0.4-tem, offline Maven)

| Gate | Command | Exit | Result |
|---|---|---|---|
| Build, unit tests, integration tests, coverage, PMD | `./mvnw verify -DskipITs=false` | 0 | 1784 unit tests, 0 failures, 2 skipped; 46 integration tests (ImpactIT among them), 0 failures; JaCoCo "All coverage checks have been met"; PMD clean |
| PMD on sources and tests | `./mvnw test-compile pmd:check` | 0 | BUILD SUCCESS |
| JavaScript tests | `npm run test:unit` | 0 | 3509 pass, 0 fail, 1 skipped |
| Format | `npm run format:check` | 0 | all matched files use Prettier code style |
| Lint | `npm run lint` | 0 | `--max-warnings 0` |
| Samples | `npm run sample:build` | 0 | `git status --short` identical before and after |
| Unknown element | `query impact nowhere -w docs/architecture/.archicode.yaml` | 1 | one line on the error output: `error: the element ... does not exist: ...`; nothing on standard output |
| Depth 0 | same with `--depth 0` | 1 | `error: the depth must be 1 or more: `0`` |
| Depth -1 | same with `--depth -1` | 1 | `error: the depth must be 1 or more: `-1`` |
| Q01 through the packaged jar | `query impact archicode.kernel.engine ... --depth 1 --qualifier calls --qualifier "generated from"` | 0 | the six references of Q01 (kernel_wasm, commandline.viewpoint, commandline.workspace, editor.model, editor.application, editor.presentation) |
| Oracle questions Q01 to Q07 unchanged | `git diff ff3bacd -- impact-questions.json` | 0 | only Q08 and Q09 added; no changed line inside Q01 to Q07 |
| Documents | `grep -c 'query impact'` | 0 | `src/site/index.html` 2, `src/site/llms.txt` 1; `git diff --stat -- CLAUDE.md` is one line |
| Byte identity | `scripts/byte-identity.sh --no-build` (base built from the tag `archicode-0.19.0`) | 0 | 20 workspaces, 332 commands compared: 263 identical, 68 accepted by the declared exceptions and stdout changes, 0 unexpected, 0 DIFFERENT, self-check ok |

The harness, its exceptions and `scripts/byte-identity-stdout-changes.txt` were not edited by this run; they were already modified in the working tree before it started. `src/main/editor`, `.github`, `pom.xml` and `package.json` have no change.

## Proved where

- Proved by this run: everything in the table above, on Linux with JDK 25 and the packaged jar (`target/quarkus-app`).
- Not verified by this run: the native image (the Native job of CI under `./mvnw verify -Dnative` proves it; the reflection entries `Impact`, `Impact$Request`, `Impact$Direction` and `Edge` are checked here only by `NativeReflectionConfigTest`); the end-to-end browser suite (the editor is untouched, so nothing here exercises it).
- Proved only by CI: the Native job, the end-to-end suite, the other operating systems, and the publication steps (a pull request never publishes).

## Deferred items, ready to paste as GitHub issues (tmorin/archicode)

DEF-1
Title: Remove the old impact walk from ArchitectureImpactTest
Body: `query impact` answers Q01 to Q09 and the old walk in `ArchitectureImpactTest` is kept only as a second oracle. Delete the walk and its helpers, keeping the sabotage tests on a graph the command can read (a copy of the workspace with a coupling removed).

DEF-2
Title: query impact: several starts and a path between two elements
Body: `query impact` takes one start. Allow several starts and a `--to` that answers the path between two elements. It is another question than the impact of one element.

DEF-3
Title: query impact: the links between applications through their environments
Body: follow the application-to-application links that environments imply (the `derived_dependencies` of the kernel). It is another question, and a non-goal of the first command.

DEF-4
Title: query impact: -f and -q
Body: add the output format and the quiet options to `query impact` if a client needs them. None does today.

Review pass: dispatched, the TDD was reviewed in Stage 5 by a leaf agent other than its drafter and each task was verified by an independent agent.

Files outside likely_paths: docs/architecture/manifests/agent.yaml, src/main/resources/editor-webapp/samples/archicode.yaml, src/test/javascript/site.test.js, src/test/CLAUDE.md

Canonical impact: CI-arc-1 discharged (the qualifier `query impact` on the relationship of `agent` to `archicode.commandline`, sample rebuilt); CI-dom-1 not applicable.
