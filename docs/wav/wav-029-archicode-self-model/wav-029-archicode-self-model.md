---
type: wave
wave: 029
status: completed
date: 2026-10-31
related:
  - docs/wav/wav-029-archicode-self-model/wbc-029-archicode-self-model.md
  - CLAUDE.md
  - src/main/editor/layers.json
---

# Wave 029 — The ArchiCode model of ArchiCode

## Purpose

`docs/architecture/` holds a workspace (`.archicode.yaml` and manifests, no plateau) that models ArchiCode as it is: the application layer, the contracts that couple the CLI and the editor, and a minimal technology layer, shown by four or five saved views. Both tools load it in a test, a drift guard keeps its layers and packages true, an impact oracle answers fixed questions from `archicode query graph`, and `CLAUDE.md` points to it. The frictions met while building it are open GitHub issues.

## Non-Goals

- No history: no plateau, no `replaces`, no story.
- No generated view files, and none committed (`views*/` is git-ignored).
- No metrics (lines, counts of upward pairs): they would go stale and ArchiCode carries none.
- No model of the 69 parts of the editor: only its 6 layers.
- No reverse completeness check (code that is not modeled does not fail a test).
- No rewrite of `CLAUDE.md`: one short paragraph is added.
- No model of the wave and run process.
- No change to the product to remove a friction: each becomes an issue.

## Wave Manifest

```yaml
wave_manifest:
  wave: 029
  slug: archicode-self-model
  status: completed
  sources: []
  phases:
    - id: P1
      name: The model and its loading
      gate:
        criteria:
          - 'docs/architecture/.archicode.yaml exists and `archicode query graph -w docs/architecture/.archicode.yaml` exits 0 on the packaged or built application'
          - 'a Java test and a node test each load docs/architecture and pass (`./mvnw test` and `npm run test:unit`)'
          - 'docs/architecture holds 4 or 5 saved views (manifests of kind view) and no generated folder (`git ls-files docs/architecture | grep -c "views-"` prints 0)'
          - 'no file under src/ was added or changed except test files for the model'
    - id: P2
      name: Guards and way in
      gate:
        criteria:
          - 'the impact oracle test lists 6 to 8 questions and passes; each question names its expected elements'
          - 'the drift guard test fails when a modeled editor layer is renamed or reordered in a copy of layers.json, and passes on the repository'
          - 'CLAUDE.md contains a paragraph that names docs/architecture and the exact `query graph` command, and its other lines are unchanged (git diff shows additions only)'
          - 'each friction recorded in the progress log of the wave has a GitHub issue on tmorin/archicode, or the log says there is none'
  runs:
    - id: W-1
      slug: archicode-model-and-views
      phase: P1
      depends_on: []
      run: 0209
      delegation: standard
      likely_paths:
        - 'docs/architecture/**'
        - 'src/test/java/io/morin/archicode/doc/**'
        - 'src/test/javascript/**'
      focus: 'open the ArchiCode model of ArchiCode in the editor and see how the CLI, the kernel and the six layers of the editor fit together'
    - id: W-2
      slug: archicode-model-guards-and-way-in
      phase: P2
      depends_on: [W-1]
      run: 0210
      delegation: standard
      likely_paths:
        - 'docs/architecture/**'
        - 'src/test/java/io/morin/archicode/doc/**'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'ask what a change touches with one command and trust the answer because tests keep the model true'
```

## Phase P1 — The model and its loading

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-1 | `archicode-model-and-views` | — | open the model in the editor and see the structure | `docs/architecture/.archicode.yaml`; application layer: CLI packages (`cli`, `workspace`, `manifest`, `resource`, `viewpoint`, `rendering`), the Rust/WASM kernel with its entry points, `editor serve`, `guide`, `init`, the editor as its 6 layers with the rule "a layer uses the layers before it"; contracts as components with qualified relationships (mirror of, generated from, validated by): kernel wasm, the shared `*-cases.json`, `READ_SCHEMA` and the Java classes, `standalone.html` and its readers, byte-identity goldens; minimal technology layer (dev machine, GitHub Actions, GitHub Pages, GitHub release page); 35 to 45 elements; paths written in `tags`; 4 or 5 saved views (overview, editor by layers, CLI and kernel, contracts, deployment); the upward pairs of the editor shown at the level of pairs of layers if `check-editor.mjs --list` allows it, else recorded as a friction; a Java test and a node test that load the workspace | both tools load the workspace without error; the saved views are listed by `archicode query views`; the editor opens it in a test without a console error |

**Gate:** the four criteria of P1 in the manifest.

## Phase P2 — Guards and way in

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-2 | `archicode-model-guards-and-way-in` | W-1 | ask a change question, trust the answer | impact oracle (6 to 8 questions with expected elements, answered from `query graph`: change the kernel contract; change a sentence both tools say; change `standalone.html`; change a layer of the editor; and others chosen from real couplings); one-way drift guard (each modeled editor layer is in `layers.json` in the same order; each element that carries a path in `tags` points to an existing path); the paragraph in `CLAUDE.md`; GitHub issues for the frictions | the two tests pass and fail when the model or `layers.json` is made wrong in a copy; the `CLAUDE.md` diff is additions only; the issues exist |

**Gate:** the four criteria of P2 in the manifest.

## Dependency View

W-1 → W-2 (a straight line: the oracle and the guard need the model to exist).

## Risks

- **Overlap W-1 and W-2:** both list `docs/architecture/**` and the test folders, but W-2 depends on W-1, so they never share a batch. No verdict needed.
- **Tests under `src/test`:** the model lives under `docs/`, outside the roots that `MistakeSweepTest`, `ManifestCorpus`, `ShippedFilesTest` and `scripts/byte-identity.sh` walk (all rooted at `src/`), so they do not widen. A test that walks `docs/architecture` is new and its own. W-1 must keep that true, and say so in its record if a root changes.
- **Convention of the repository:** every shipped file is loaded by both tools in a test. W-1 therefore needs a node test as well as a Java test; the wave counts it in W-1, not as a later add-on.
- **A model that drifts:** hand-written relationships are the part that goes stale. The oracle (W-2) is the only guard on relationships; it covers the questions it asks, not the whole graph. The wave accepts that limit (no reverse completeness check).
- **Granularity:** too coarse, the oracle says "everything is touched"; too fine, the views are unreadable. The 6 layers (not the 69 parts) and 35 to 45 elements are the starting point; if the oracle shows it is wrong, W-2 adjusts the model rather than the questions.
- **Frictions are not fixed here:** a run that finds the tool in the way records an issue and models around it.

## Completion Criteria

- Both gates hold.
- `./mvnw verify` and `npm run test:unit` pass on the repository with the model and its tests.
- `npm run format:check` passes for the files the wave adds.
- The progress log lists the frictions and their issues.
