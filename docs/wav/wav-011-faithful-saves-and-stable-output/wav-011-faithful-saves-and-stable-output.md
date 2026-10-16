---
type: wave
wave: 011
status: proposed
date: 2026-10-16
related:
  - docs/wav/wav-011-faithful-saves-and-stable-output/wbc-011-faithful-saves-and-stable-output.md
  - docs/wav/wav-010-clean-failures-and-faithful-saves/wav-010-clean-failures-and-faithful-saves.md
  - CLAUDE.md
---

# Wave 011 — Faithful Saves and Stable Output

## Purpose

When this wave is done, the editor's save keeps the comments, blank lines, quotes and boolean words of every line it does not
mean to change, and the comment of the line it changes (#50, #52, #53, #54). `archicode query views` and
`archicode query schemas` print the same output on every run and every build (#48, #49), and `removed`, `split` and `merged`
have line styles that tell them apart in the generated views, in the editor and in both keys (#55). The thresholds of the
candidates of `replaces` have been run against a large invented pair with known answers and the CI builds a native image (#33,
#29). A workspace that hits none of these defects generates exactly the same files as before, except the order of the two
`query` outputs and the line style of the three states.

## Non-Goals

- Does not decide #39 (the rule for listing candidates stays: only for a plateau that uses `replaces`), nor #34 (no contract
  change of the kernel; `compare.rs` may change a threshold, not its output shape).
- Does not touch #43, #44, #27, #37 (no ruling yet), nor #24, #25, #26, #30 (not planned).
- Does not check the candidates on a real workspace and does not close #33: the check is on an invented pair. The issue gets
  a comment saying what was and was not shown; the author closes it.
- Does not check what only a person or another machine can: other browsers, the folder picker, a screen reader, the manual read
  by a third party. They become a checklist on #29.
- Does not change the format of manifests.
- Does not put any text from a real workspace in the repository: the new pair and every fixture are invented.
- Does not cut a release and does not write release notes; it leaves the note of the changed output where the release will
  find it (see W-2 and W-3).

## Wave Manifest

```yaml
wave_manifest:
  wave: 011
  slug: faithful-saves-and-stable-output
  status: proposed
  sources: []
  phases:
    - id: P1
      name: Saves and output that stay as they were
      gate:
        criteria:
          - 'a test per case compares the saved text with the original and shows that only the intended lines differ: a rewritten scalar with an end-of-line comment (#50), with a comment and a blank line above it (#52), a file with `yes`, `no`, `on`, `off` values (#53), and a changed flow collection with comments inside its brackets, quoted keys and a boolean word (#54)'
          - 'on the 80 YAML files of the repository, six edits each, a file the edit does not concern is saved byte-identical, and the run says which edits it ran'
          - '`archicode query views -f json` and `archicode query schemas` give byte-identical output over 20 runs of the same jar, and over the jars of two builds of the same commit'
          - 'the generated PlantUML of `removed`, `split` and `merged` uses three line styles that differ pairwise in the line alone, `plantuml-1.2024.7.jar` renders them, and the keys of the CLI views, the editor and the two manual tables (`editor-compare`, `plateau-comparison`) describe the same lines'
          - 'the files generated for the workspaces of the repository that have no comparison are byte-identical to those of a jar built from the commit before the wave; those with a comparison differ only on the `LineStyle` of the three states'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
          - 'the editor page was looked at in the built-in browser (light and dark) on an invented copy with a removed, a split and a merged element'
    - id: P2
      name: Checks kept in the repository
      gate:
        criteria:
          - 'the large invented pair is committed with its list of planted answers, and a test fails if the candidates listed for it leave the recorded precision and recall'
          - 'the CI workflow has a job that builds the native image (`-Dnative`), and `ci-build.yaml` still parses and keeps its publish steps unchanged'
          - 'issue #29 has a checklist of what only a person can check, with the native image ticked or linked to the job'
          - '`./mvnw -o verify`, `cargo test`, `embed.sh --check` and `node --test` pass on the final tree'
  runs:
    - id: W-1
      slug: editor-faithful-saves
      phase: P1
      depends_on: []
      run: '0055'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
      focus: 'save a manifest from the editor and see only the lines I changed differ, comments included'
    - id: W-2
      slug: sorted-query-output
      phase: P1
      depends_on: []
      run: '0056'
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/GetViewsQuery.java'
        - 'src/main/java/io/morin/archicode/cli/GetSchemasQuery.java'
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/test/java/io/morin/archicode/cli/**'
        - 'src/doc/README.adoc'
      focus: 'diff or store the output of query views and query schemas without noise from one build to the next'
    - id: W-3
      slug: distinct-dashes
      phase: P1
      depends_on: []
      run: '0057'
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/rendering/plantuml/**'
        - 'src/main/java/io/morin/archicode/resource/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/io/morin/archicode/rendering/**'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'tell removed, split and merged apart by their line in a rendered comparison'
    - id: W-4
      slug: candidates-large-pair
      phase: P2
      depends_on: [W-1, W-3]
      run: '0058'
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/resources/replaces-large-pair/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/**'
      focus: 'know how many candidates of replaces are right on a pair as large as a real one, without a real workspace'
    - id: W-5
      slug: native-build-ci
      phase: P2
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - '.github/workflows/**'
        - 'pom.xml'
        - 'src/main/resources/META-INF/native-image/**'
        - 'src/main/resources/reflect-config.json'
      focus: 'see a broken native image on the pull request that breaks it, not after a release'
```

## Phase P1 — Saves and output that stay as they were

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `editor-faithful-saves` | — | save and see only my lines differ | in `patchYamlLines`/`patchYamlText`: the end-of-line comment and its spacing carried to the rewritten scalar (#50); a comment or blank line above a rewritten line kept above it (#52); a YAML 1.1 boolean word found as the editor read it, so the line-preserving save is not abandoned (#53); the comments inside the brackets of a changed flow collection, the quotes of its keys and the original word of a boolean the edit did not set (#54). The rule of wave 010 stays: a result is accepted only if re-reading it gives the emitter's value. | one test per case comparing saved text with the original, as `move-editor.test.js` does; the six edits on the 80 YAML files; #50, #52, #53, #54 closed by commits or re-filed with the reason |
| W-2 | — | `sorted-query-output` | — | diff the output of `query` without noise | `GetViewsQuery` collects views in a list sorted by id then layer (#48); the properties of `query schemas` in a fixed order, after finding whether the generator or the serialisation moves them, and whether the native image does the same (#49); the manual says the output is sorted, and the commit says the order changes once, for whoever writes the release notes | 20 runs and two builds give one output for each command; a Java test fixes the order; the sets of views of the 13 workspaces are unchanged |
| W-3 | — | `distinct-dashes` | — | tell `removed`, `split` and `merged` apart by line | dash-gap pairs for the three states that differ pairwise, carried by the style model (PlantUML takes a pair in `LineStyle`, the integer `lineStyle` does not carry one today); the editor's patterns and the key of both tools and the two manual tables changed to match (#55) | a Java test of the three pairs; `plantuml-1.2024.7.jar` renders a fixture with the three states; the editor looked at in light and dark; byte-identity on workspaces without a comparison |

**Gate:** see the manifest, phase P1.

## Phase P2 — Checks kept in the repository

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-4 | — | `candidates-large-pair` | W-1, W-3 | know how many candidates are right on a pair as large as a real one | an invented pair of plateaus of several hundred elements with planted renames, moves, splits, merges and decoys (siblings alone under a parent, same names in different kinds, close descriptions of unrelated things), a test that records precision and recall of `compare`'s candidates, and the thresholds (`CLOSE_DESCRIPTION`, `LEAST_WORDS`, the lone-sibling rule) changed only if the planted answers show a false positive the rule should not make; the relationships of a split element looked at in `gap.md` on the same pair; a comment on #33 saying what was shown and that it was an invented pair (#33) | the pair and its answers committed, the test, a comment on #33 |
| W-5 | — | `native-build-ci` | — | see a broken native image before a release | a job in `ci-build.yaml` that builds the native image and runs the native tests (`-Dnative`), parallel to `Build`, with the Maven cache; the reflection configuration fixed if the first build shows a gap; the body of #29 rewritten as a checklist of what only a person can check, the native image linked to the job (#29) | `ci-build.yaml` parses with its publish steps unchanged; a native build run locally if GraalVM or Mandrel is available, otherwise reported as not run and left to the job on the wave's pull request |

**Gate:** see the manifest, phase P2.

## Dependency View

```
P1:  W-1     W-2     W-3
       \             /
P2:     W-4 <-------        W-5
```

## Open Questions

- **Where a native job runs** (W-5): on every pull request and push (the default of the run, in parallel with `Build`) or only on
  `main` and tags. A native build costs several minutes of CI per pull request; the run takes the default and says the cost, and
  the author changes the `on:` of the job if it is too much.
- **Where the note of the changed output goes** (W-2, W-3): the repository has no changelog or release-notes file (releases are
  cut by `maven-release-plugin`). The runs put the note in the manual and in the commit message body, and in this wave's
  progress log under Findings. The author writes the release notes from there.

## Risks

- **Overlap, W-1 and W-3** (`src/main/resources/editor-webapp/standalone.html`, `src/test/javascript/**`): `serialize`. They edit
  different functions (the save, the diagram patterns) but each run commits its own files, and a shared file cannot be split
  cleanly between two commits. Whoever dispatches runs W-1 first.
- **Overlap, W-2 and W-3** (`src/doc/README.adoc`): `serialize`, for the same reason (two sections of one file, one commit
  each).
- **Overlap, W-1 and W-2**: none (`standalone.html` and `src/test/javascript/**` against `cli/**`); the README is touched by W-2 and
  W-3 only. `concurrent-safe` for the pair, but W-2 is serialized after or before W-3 by the line above, so in practice the batch
  is at most two runs wide.
- **Overlap, W-4 and W-1, W-3** (`standalone.html`, `src/test/javascript/**`, the embedded wasm): resolved by the edges `W-1 -> W-4`
  and `W-3 -> W-4`. W-4 may re-embed the wasm if it changes a threshold.
- **Overlap, W-4 and W-5**: none by path. `concurrent-safe`: W-5 touches the workflow and the native reflection configuration, W-4
  the kernel, its tests and fixtures. If W-4 adds a Java class that needs reflection registration, it edits `reflect-config.json`
  and W-5 may too; the run that finds it says so and the second one rebases.
- Byte-identity is the invariant every run can break quietly (the save, the sort, the style). Each run compares against a jar of
  the previous commit on the repository's workspaces and says which workspaces and commands it ran.
- W-3 changes the generated views of every comparison once; the files committed under `src/doc/examples` and
  `src/test/resources` that hold a comparison are regenerated by the run, and it lists them.
- W-5 cannot see the GitHub runner; a workflow that is valid but red on the runner is found on the wave's pull request, not before.
- A comment on a GitHub issue is outward-facing; W-4 and W-5 comment on #33 and #29 only (the author's own rulings name them),
  and say in the progress log what they posted.

## Completion Criteria

Both phase gates verified; the manual and the `CLAUDE.md` architecture paragraph describe the sorted `query` output, the three
line styles and the save's comment handling where they mention the old behaviour; `./mvnw -o verify`, `cargo test`,
`embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass on the final tree; the native job is green on
the wave's pull request; the issues #48, #49, #50, #52, #53, #54, #55 are closed by their commits or re-filed with the reason;
#33 and #29 carry their comment and checklist; every item a run lists as "not verified" is in the final report.
