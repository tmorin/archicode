---
type: run
run: 0164
status: completed
wave: 023
profile: single-document
---

# Run 0164: view-without-properties-and-mistake-sweep

Single-document profile (a small, well-specified run; the wave plan holds the requirements and the design). Wave 023, W-1, issue #158.

## Scope and decisions

- **#158.** `KernelViewpointFactory.create` read `Objects.requireNonNull(view.getProperties())`; a view or a story step with no `properties` key is now an empty properties node, as `mapLists` and `mapParts` already treated it. A map needs no element and draws. The editor needs no change: `viewProblem` already reads `isPlainObject(view.properties) ? view.properties : {}` and says `This view has no element.` for both forms (pinned by a new node test).
- **Sentence (the T1 exception).** `the view %s has no element` becomes ``the view %s has no element: write the reference of one in `properties.element` `` (the issue asks the line to name the key). It moves for `properties: {}` too: both forms give the one line. The CLI and the editor have never used the same words for this case (CLI: `the view x has no element`; editor: `This view has no element.`); not changed here, not a `negative-cases.json` case (those alter the layered Brightcart and check the load; a saved view with no element loads fine and fails only when drawn).
- **V-A, the sweep.** `MistakeSweepTest` + `src/test/resources/known-traces.json` (empty). Mutations per manifest: each key of the header and the content (three levels, first item of a list stands for the others) removed, set to `null`, and each non-empty list/map emptied; the commands are `query graph`, `views generate`, `views generate -i <id>` for a view, `stories generate` for a story. Verdict clean = exit 0, or only `error:` lines with exit 1 (`warning:` lines allowed).
- **Autonomy used in lieu of gates.** No PRD/TDD/pln documents (profile). No question needed the author.

## Findings of the sweep

- Full sweep (`-Darchicode.sweep.all=true`, 20 workspaces, 8,611 mutated workspaces, 459 s) before the fix was written into the test run: no failure after the #158 fix. With the fix reverted, `-Darchicode.sweep.only=domain_plateaus` fails at `plateaus/story.migration.yaml content.steps[0].properties removed` with the `NullPointerException`: the sweep has teeth (T4) and the same bug was in a story step (same factory), fixed by the same change.
- Sampled sweep that the build runs (richest manifest of each kind per workspace): 1,190 mutated workspaces, 183 s.
- No other one-key trace exists in the shipped manifests; `known-traces.json` is empty, no issue filed.
- Not covered by the sweep (by design of V-A): `.archicode.yaml` mutations, two-key mistakes, TOML manifests (not rewritten), items other than the first of a list.

## Verification

See the final report; results are recorded in the run's report to the orchestrator and in the commit.

## Canonical impact

CLAUDE.md: one paragraph (the sentence, the sweep, its switches). No architecture-level impact.
