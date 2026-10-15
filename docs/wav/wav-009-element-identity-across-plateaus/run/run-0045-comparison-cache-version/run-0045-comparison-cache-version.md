---
type: run
run: 0045
status: completed
wave: 009
---

# Run 0045: Comparison cache version

Wave 009 (`element-identity-across-plateaus`), item W-4 (phase P2). Focus: a render of the editor with a comparison on does not
serialise the whole model. Document profile: `single-document`, as runs 0042 and 0043: the scope arrives settled (the W-4 row and
D-6 of the wave plan, issue tmorin/archicode#32), the work is one counter and one cache key in `standalone.html`, and there was no
live alternative worth a PRD, a TDD or a pln. This file carries scope, decisions, canonical impact, verification and findings. The
review passes were run inline (no subagent), see "Review passes".

## Context

`comparisonState()` (`standalone.html`) is called from `buildKernelInput`, from the rendering of the trees (`treeChangeOf`), from
the Changes panel and from `render()` (`currentRouteHash`). Each call built the two inputs of the kernel's `compare`
(`comparisonInput()`: both layers of both models) and `JSON.stringify`d them, only to compare that string with the key of its cache.
So every render of a page with a comparison on paid a full serialisation of the two models, however many times it called it.
Measured below: on 3,060 elements per plateau, 77 to 111 ms per call to `comparisonState()` when nothing had changed.

## Scope

In: a version counter of the two models, a single function that bumps it, the cache keyed on it, the tests, this document. Out: the
other keys of the page that serialise a kernel input (`diagramCache`, `treeQuietCache`: issue #37), any change of what the comparison
computes, the wasm, the CLI.

## Decisions

Taken by the wave (not reopened): D-6, the cache of the comparison is keyed on a version counter of the two models, bumped by loads
and edits, not on their serialised content.

Taken by this run:

- **S1. How the counter works.** `modelVersion` (a module-level `let`, declared just above `createInitialAppState`) is a number that
  only goes up. `comparisonCache` is `{ version, index, baselineIndex, value }`; `comparisonState()` serves `value` while
  `comparisonCache.version === modelVersion` and, as a net, while `AppState.index` and `AppState.baseline.index` are the very objects
  the answer was computed from. Otherwise it calls `loadedKernel.compare(comparisonInput())` and stores the answer with the current
  version. Neither the models nor their serialisation are read to decide. `comparisonInput()` (the only place that builds the
  input of `compare`) runs only on a miss.
- **S2. The choke point: `modelsChanged()`.** One function, `modelVersion++`. **The rule for any future edit: any new way to change
  one of the two models (the plateau drawn, `AppState.index`; the one it is compared with, `AppState.baseline.index`) calls
  `modelsChanged()` once the change is made and before anything is drawn from it.** That covers every place that assigns
  `AppState.index` or `AppState.baseline`, and any code that changes a record of either model in place. Runs 0046 and 0047 (replaces
  write, move) write the content nodes and end in `rebuildIndexAndRender()` like every edit of the plateau drawn, which already
  calls it: they need nothing more unless they bypass that function. A call that was not needed costs one more `compare`; a call that
  is missing shows an answer that is out of date. The doc comment of `modelVersion` in `standalone.html` states the same rule.
- **S3. Where it is called (all the places found).** Found by grepping every assignment of `AppState.index` and `AppState.baseline`
  and `AppState = createInitialAppState()`, then reading how the content of a model is mutated:
  - `createInitialAppState()` (a new state holds new models: close folder, another folder, the error paths; six assignments of
    `AppState` use it);
  - `loadWorkspace`: after the models are emptied at its start (a load that stops on an error leaves them so) and after
    `AppState.index = index` (a load, a reload from disk, a change of plateau through `switchPlateau`, Cancel/discard, the server
    mode, which all go through it);
  - `loadBaseline` (both its paths: nothing to compare, and the baseline read) and the failure path of `loadBaselineSafely`
    (Compare to through `setCompareTo`, Reload through `reloadBaseline`, and the load above);
  - `rebuildIndexAndRender`, after `resolveRelationships(index)` and before `render()`: this is the end of every edit of the
    plateau drawn (`commitElementEdit` for fields, renames and inbound references, `commitCreateTopLevelElement` and
    `commitCreateChildElement` for creation, `commitDeleteElement`, `commitFileEdit` and `reloadManifestFile` for a file edited as
    text or read again from disk, `commitSettingsEdit`).
  No other code changes a record of a model after `buildIndex`: the records are built fresh each time, `resolveRelationships` runs
  before the bump, and the content nodes that edits mutate are always followed by a rebuild before anything is drawn.
- **S4. The net, and why it stays.** The identity check of the two index objects costs two pointer comparisons and turns a forgotten
  `modelsChanged()` on a replacement of a model (the likeliest slip) into a recompute instead of a stale answer. It does not catch a
  record changed in place; for that, the rule above. The cache keeps references to one old pair of models until the next miss; no
  other holder.
- **S5. Behaviour is preserved, with one narrowing.** The answer of the cache, `value.shown`, the address hash and every drawing are
  computed by the same code from the same models. What changes is only when `compare` runs again: before, when the serialised
  content changed; now, on every bump, so also after an edit that leaves the content equal (a settings edit, a file saved with the
  same content, a baseline read again, a comparison turned off and on). That is one more kernel call per such event, the same answer.
  Conversely, an edit that restored the content of an earlier state used to hit the cache of the earlier answer; it now recomputes.
- **S6. One existing test changed.** `plateau-compare.test.js`, "compare is called through the embedded module…" changed a record
  by assigning to `state.index.application.get('shop.db').name`, which is not an edit the page can make (every edit ends in a
  rebuild); it now makes the edit with `sandbox.commitElementEdit('shop.db', …)`, the way the page does. The assertions are the same.
- **S7. A rule that is checked, not only written.** A test reads the script of the page and fails if a line assigns
  `AppState.index` or `AppState.baseline` without `modelsChanged()` in the eight lines that follow, or if `createInitialAppState`
  does not call it, or if the cache is keyed on a serialisation again.

## Canonical impact

None to ratify. `CLAUDE.md` (architecture paragraph on plateaus) is not edited: W-7 owns it, and nothing it says changes (the editor
still compares the drawn plateau with another one under the same root handle). The user manual does not describe the cache. The rule
of S2 lives in the doc comment of `modelVersion` in `standalone.html`, where the code that has to follow it is, and here.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the wave (D-6, gate P2), runs 0042 and 0043, issue #32, `comparisonState`, every place that assigns or mutates a model | done |
| T2 | `modelVersion`, `modelsChanged()`, the calls (S3), `comparisonState` keyed on the version (S1) | done |
| T3 | `comparison-cache.test.js` (11 tests); the one existing test of S6 | done |
| T4 | Check that the new tests fail on the old page | done |
| T5 | Measure on an invented pair of 3,060 elements per plateau | done |
| T6 | Full node suite, `embed.sh --check`, wasm block byte-identical | done |

## Acceptance criteria (the W-4 row and the gate of P2)

- AC1. The comparison is keyed on a version counter: `comparison-cache.test.js` "the version decides…" (a record changed in place
  is seen only after `modelsChanged()`), and the source scan test (no `comparisonCache.key`, no `JSON.stringify(input)` before the test).
- AC2. A load, an edit and a change of baseline each invalidate it: "a load asks again, once…", "an edit of the plateau drawn…"
  (rename, creation, deletion, edit of a file, one compare each), "an edit of the settings moves the version too", "Cancel…",
  "a change of Compare to, and a reload of the baseline, ask again…", "a change of plateau asks again…". Each also asserts that the
  answer is the right one for the new models and that the reads that follow do not ask again.
- AC3. A plain render does not serialise the models: "a render with a comparison on keeps the answer… and serialises neither
  model" runs `render()`, the trees, `currentRouteHash`, `buildKernelInput` three times with a spy on the sandbox's `JSON.stringify`
  and on `compare`: no `compare` call, no serialisation that holds an element of either model. A control test shows the spy sees the
  serialisation of `comparisonInput()`.
- AC4. Behaviour unchanged: the 767 tests that existed pass (S6 for the one edited); the wasm block is byte-identical.

## Review passes

Run inline (one document; no subagent dispatched, as in runs 0042 and 0043).

- **KDMLLC.** K: one counter, one function, one cache key; no new abstraction, no listener, no deep-compare. D: `comparisonInput()`
  is still the only builder of the input of `compare`; the rule is written once (the doc comment of `modelVersion`) and referenced by
  S2 here. M: the five ways a model changes (load, edit of the plateau drawn, Compare to, Reload, change of plateau) each have a
  test; "Cancel" is its own test because it is its own button. L: the other keys that serialise a model are left (issue #37), nothing
  of the kernel or the CLI is touched. U: the name says the event (`modelsChanged`), the doc comment says the rule and the cost of a
  missing or a needless call. C: see below.
- **C scan.** Claim of the issue, "called from `buildKernelInput`, `treeChangeOf`, `render()` via `currentRouteHash`": true (grep).
  Claim "every edit ends in `rebuildIndexAndRender`": checked on the six call sites, one per `commit*` / `reload*` function, and by
  grepping `AppState.index =` (three assignments, all followed by a bump). Claim "records are not mutated after `buildIndex`":
  grepped for assignments to the fields `toKernelElements` reads (`name`, `description`, `qualifiers`, `tags`, `replaces`, `uses`,
  `applications`, `relationships`, `kind`); the hits are `buildIndex` itself, `resolveRelationships` (`rel.resolved`, before the
  bump), and writes to the content nodes of the manifests (`child.name`, `rel.destination`, `target.name` of a saved view), which are
  followed by a rebuild or are not a model. One trap noted: the records share arrays with the content nodes (`qualifiers`, `tags`),
  so a mutation of a content node *is* a mutation of the model until the rebuild; every such mutation is inside a `commit*` that
  rebuilds before it returns. The brief's "existing tests must stay the same" holds but for S6. Claim of the previous behaviour, "the
  key depended only on the models": true; it did not depend on the plateau ids, which the result takes fresh on each call.
- **Open questions.** None.

## Verification

All with the repository's own commands; run in the main worktree while run 0044 was editing Java sources (no Maven here).

- `node --test "src/test/javascript/**/*.test.js"`: exit 0, 778 tests (767 before, 11 new), 778 pass, 0 fail.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (651048 bytes)".
  `embed.sh` itself was not run. The line of `standalone.html` that holds the base64 block is byte-identical to `HEAD`'s (compared
  with `cmp`).
- The new tests against the old page (the `standalone.html` of `HEAD` put back for the run, then restored): 7 of the 11 fail. The
  one that fails for the behaviour is "a render with a comparison on… serialises neither model" (the old `comparisonState()`
  serialises both models on each call). The others fail because they read `modelVersion` or call `modelsChanged()`, or scan the
  source for it (the edit, settings, Compare to, in-place, replacement and source-scan tests); they prove the new mechanism, not a
  defect of the old one. The load, Cancel, change-of-plateau tests and the control test pass on both pages, which is what
  "behaviour unchanged" asks.
- Measured on an invented pair (a generated script, not committed): 60 systems of 50 containers, a relationship per container,
  3,060 elements per plateau, 176 changes. The first `compare` takes about 400 ms in both versions (unchanged, the kernel's work).
  `comparisonState()` with nothing changed: **old 77 and 111 ms per call, new 0.011 ms** (20 calls, two runs each, Node v24.12.0 on this
  machine, wasm run by Node). A render of the page calls it several times (the trees, the panel, the address, each diagram), so the
  saving per render is a multiple of that. What the numbers do not show: the cost of `render()` itself in the harness (about 0.1 ms
  in both, it has no layout and no DOM and does not reach every caller), the cost in a browser (no browser was used), and a
  workspace with a different shape.

## Not verified

The editor in a real browser (no browser was driven; the harness runs the page's script on the real kernel, without layout or DOM).
`./mvnw` was not run (run 0044 owns the Java side in the same tree, and this run touches no Java; the jar embeds
`standalone.html`, so a build of the wave's end will carry it). The flaky test named in the brief did not fail.

## Findings

- The comparison is not the only full serialisation on a render of a diagram: `diagramCache` and `treeQuietCache` are keyed on a
  `JSON.stringify` of a kernel input, which holds the elements of the model (the union, with a comparison on), plus
  `diagramModelFingerprint()`, a full walk of the model. Not in #32; filed as issue #37, to key them on `modelVersion` too.
- Wave 009 impact: W-5, W-6 (runs not yet numbered) write `replaces` and move elements through the line-preserving save and
  `commitElementEdit`/`rebuildIndexAndRender`; they inherit the cache for free as long as they end in that function (S2). If a run
  adds a path that changes a model without it, it calls `modelsChanged()`; the source-scan test only catches an assignment of
  `AppState.index`/`AppState.baseline`.
