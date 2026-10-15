---
type: wave
wave: 008
status: in-progress
date: 2026-10-14
related:
  - docs/wav/wav-008-plateaus-and-baseline-diff/wbc-008-plateaus-and-baseline-diff.md
  - docs/wav/wav-007-stable-stereotypes-and-nested-fills/wav-007-stable-stereotypes-and-nested-fills.md
  - CLAUDE.md
---

# Wave 008 — Plateaus and Baseline Diff

## Purpose

When this wave is done, a `workspace.yaml` can list its plateaus in `settings.plateaus`, each a complete folder, and the
CLI and the standalone editor draw any plateau and compare it with another. The kernel computes the difference between
two plateaus from their references; new, changed and removed elements and relationships are drawn in a language that does
not rely on colour alone, listed in a table of changes, and filtered to "changes only". A workspace without `plateaus`
generates exactly the same files as before. The result has been seen in the real editor page and with the CLI on a copy of
the author's real baseline and target.

## Non-Goals

- Does not implement `replaces`, the proposals of matches, the editor's trace on rename, nor an editor action to move an
  element under another parent (the author wants it): these form the next wave, with the chain of N plateaus, the
  timeline and the `compare` property of views and stories. Moved, split and merged elements are therefore drawn as
  removed plus new in this wave.
- Does not implement `from`, layers, tombstones or `fold` (option F): `from` is refused with a clear message.
- Does not read a baseline from git (`--baseline-ref`), nor a `--fail-on` CI command, nor Migration manifests
  (Plateau, Work Package, Deliverable).
- Does not convert the author's own workspaces to the plateau layout; they are only read, as copies, to check the result.
- Does not put any client text in the repository: fixtures are invented.
- Does not change the format of manifests, nor the meaning of a workspace without `plateaus`.
- Does not cut a release. The ban on `..` in `manifests.paths` is a breaking change to note in the release.

## Wave Manifest

```yaml
wave_manifest:
  wave: 008
  slug: plateaus-and-baseline-diff
  status: in-progress
  sources: []
  phases:
    - id: P1
      name: Plateaus in the loaders
      gate:
        criteria:
          - '`./mvnw verify` passes on JDK 25 and `node --test "src/test/javascript/**/*.test.js"` passes'
          - 'a test shows that a reference declared twice in one set of manifests fails, with a message naming both files, in the CLI loader and in the editor'
          - 'a workspace with `settings.plateaus` loads in the CLI (`--plateau`, `current`, last by default) and in the editor (a plateau selector); `from`, a missing `path`, `..`, an absolute path, a duplicate id or path, and `.` with several plateaus are refused with a clear message'
          - '`manifests.paths` with `..` or an absolute path is refused; both `manifests.paths` and `plateaus` together is an error; `settings.plateaus` is an ordered list'
          - 'the views generated for a workspace without `plateaus` are byte-identical before and after the wave (checked on the fixtures and on a copy of a real workspace)'
    - id: P2
      name: The comparison
      gate:
        criteria:
          - '`cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` passes and `src/main/rust/viewpoint-kernel/embed.sh --check` passes'
          - 'on an invented pair of plateaus the comparison gives the expected new, changed and removed elements and relationships, ignores `rendering-*` tags and the order of lists, and tells a wording-only change from a structural one'
          - 'the items and links of a view carry `change`, a container whose only descendants changed carries a discreet marker and is not `changed`, and `only_changes` keeps the context'
          - 'two generations of the same pair are byte-identical, and the views of a workspace compared with nothing are byte-identical to the ones of wave 007'
    - id: P3
      name: CLI and editor
      gate:
        criteria:
          - '`./mvnw verify` and `node --test "src/test/javascript/**/*.test.js"` pass'
          - '`archicode diff` and `views generate --baseline` give the same counts as the editor on the same pair (a test compares them), and write `views-<plateau>/` and `views-<plateau>-vs-<base>/`'
          - 'new, changed, removed (and the container marker) are told apart without colour in the PlantUML output and in the editor, with a legend, and the SVG export agrees'
          - 'the editor has the Plateau and Compare to controls, the Changes panel, the before and after inspector, the Changes only filter and the wording-only toggle, checked by tests on the markup and by a look at the real page'
    - id: P4
      name: Proof
      gate:
        criteria:
          - 'the manual describes plateaus, the comparison and the breaking change, and its example workspace loads'
          - 'on a copy of the real baseline and target (arranged as two plateaus), the counts are as measured by the design study (38 new, 5 removed, 25 to 26 changed elements; 79 new and 23 removed relationships), or the difference is explained in the run'
          - 'every item of "not verified" of the runs is listed in the final report'
  runs:
    - id: W-1
      slug: duplicate-reference-error
      phase: P1
      depends_on: []
      run: '0034'
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/**'
      focus: 'learn at once, with the two file names, that a reference is declared twice'
    - id: W-2
      slug: plateaus-setting
      phase: P1
      depends_on: []
      run: '0035'
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/resource/workspace/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/**'
        - 'src/doc/README.adoc'
      focus: 'list the plateaus of an architecture in one workspace.yaml and draw the one I choose'
    - id: W-3
      slug: compare-kernel
      phase: P2
      depends_on: [W-2]
      run: '0036'
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'get, for two plateaus, the same list of new, changed and removed things in the CLI and in the editor'
    - id: W-4
      slug: views-carry-change
      phase: P2
      depends_on: [W-3]
      run: '0037'
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/test/java/io/morin/archicode/viewpoint/**'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/**'
      focus: 'every box and link of a view knows what changed, and a view can show only the changes with their context'
    - id: W-5
      slug: cli-plateaus-diff
      phase: P3
      depends_on: [W-4]
      run: '0038'
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/rendering/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/doc/README.adoc'
      focus: 'see what a plateau changes from the command line, in a file I can review'
    - id: W-6
      slug: editor-plateau-compare
      phase: P3
      depends_on: [W-4]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'switch plateau and compare it with another one on the map, with a legend I can read without colour'
    - id: W-7
      slug: editor-changes-panel
      phase: P3
      depends_on: [W-6]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'list the changes, open one to see what changed in it, and hide the noise'
    - id: W-8
      slug: plateaus-manual-and-field-check
      phase: P4
      depends_on: [W-5, W-7]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/README.adoc'
        - 'src/doc/examples/**'
        - 'docs/wav/wav-008-plateaus-and-baseline-diff/**'
      focus: 'trust the feature on a real baseline and target, and learn how to use it from the manual'
```

## Phase P1 — Plateaus in the loaders

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0034 | `duplicate-reference-error` | — | learn at once, with the two file names, that a reference is declared twice | Today a reference declared twice is silent and the winner depends on the hash of the content (two identical copies merge; two different ones give an arbitrary winner); the editor keeps the last file in alphabetical order and shows both in its tree. Make the loader of the CLI fail with an error that names the reference and both files, and make the editor report the same instead of choosing. The check applies to one set of manifests (one plateau once W-2 lands). | A test with two different copies and one with two identical ones fail with the message naming both files, in the CLI loader and in the editor; a workspace without duplicates generates the same files as before; `./mvnw verify` and `node --test` pass |
| W-2 | 0035 | `plateaus-setting` | — | list the plateaus of an architecture in one workspace.yaml and draw the one I choose | `settings.plateaus`: an ordered list of `{id, name, horizon, path}` (`horizon` optional, free text, never parsed), `path` mandatory, relative, below the root, no `..`, no leading `/`, unique, `.` refused with several plateaus; `current` (last by default); `--plateau`; `from` refused with a message; `manifests.paths` stays as the sugar of one implicit plateau, with the same ban on `..` and absolute paths (a breaking change, said in the manual), an error if both keys are present; `plateaus` is a `List`, not a `Set`; `plateau add <id> --from <id>` copies a folder and adds the entry; the CLI loader, the editor's `loadWorkspace` (a root handle covers all plateaus) and a minimal plateau selector in the editor; saving keeps the comments of `workspace.yaml`. | The cases of the P1 gate refused with a clear message, each tested; a workspace without `plateaus` byte-identical; the plateau selector seen on the real page; the manual's settings section updated; `./mvnw verify` and `node --test` pass |

**Gate:** the criteria of the manifest for P1.

## Phase P2 — The comparison

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | 0036 | `compare-kernel` | W-2 | get, for two plateaus, the same list of new, changed and removed things in the CLI and in the editor | A pure function `compare` in the Rust kernel, a second entry point like `apply_facet`, additive contract (bump `CONTRACT_VERSION` if the caller must know). Match by reference; new and removed; changed from normalised properties (ignore `rendering-*` tags and the order of qualifiers, tags and relationships), with the nature of the change (name, description as wording, qualifiers, tags, applications and `uses`, relationships added or removed); relationships keyed by (source, destination, label), a pair with one removed and one new label read as "label changed"; a union model where every element and relationship carries `change`, and a sorted, byte-stable table of changes. Moved and split elements stay removed plus new. | `cargo test` on an invented pair covers each rule; the comparison of a plateau with itself is empty; `embed.sh --check` passes; the same input twice gives the same bytes |
| W-4 | 0037 | `views-carry-change` | W-3 | every box and link of a view knows what changed, and a view can show only the changes with their context | The views carry `change` on items and links, aggregated for a grouped link (all new, all removed, a mix is changed); computed stereotypes `new`, `changed`, `removed` are added last (a hand-written tag of the same name does not duplicate); a container whose only descendants changed carries a discreet computed marker, not `changed`; an `only_changes` view option keeps the changes, their ancestors and the ends of changed links as context, and respects the facets; adapt `KernelViewpointFactory`; a facet can read `change` like any field. | Fixtures and tests for each rule, including a view with no comparison byte-identical to wave 007's; a determinism test on a pair; `cargo test`, `embed.sh --check`, `./mvnw verify`, `node --test` pass |

**Gate:** the criteria of the manifest for P2.

## Phase P3 — CLI and editor

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-5 | 0038 | `cli-plateaus-diff` | W-4 | see what a plateau changes from the command line, in a file I can review | `--plateau` and `--baseline` (a plateau id; default the previous one in the list, a `baseline` key per plateau changes it); `archicode diff` (text, Markdown, JSON, wording-only hidable); `views generate --baseline` writing `views-<plateau>/` and `views-<plateau>-vs-<base>/` (facets keep their template); a default PlantUML style for the four states with a glyph, a line style and a label, never colour alone; first, check what PlantUML draws for dashed, dotted and struck text, and record it. | Tests on the output and the counts; the PlantUML of a pair rendered once to look at it; the manual describes the commands; `./mvnw verify` passes |
| W-6 | — | `editor-plateau-compare` | W-4 | switch plateau and compare it with another one on the map, with a legend I can read without colour | The Plateau and Compare to controls (the baseline is a plateau under the same root handle: no second picker); the encoding of the four states (glyph, line style, badge, translucent tint) that works on a box inside a box; a legend; the SVG and PNG export; the removed state in its own language, not the red dashed of a dangling reference; layout posed on the union so that boxes do not jump. | Tests on the markup and the export; the real page in light and dark with the real pair; `node --test` passes |
| W-7 | — | `editor-changes-panel` | W-6 | list the changes, open one to see what changed in it, and hide the noise | The Changes panel (counts, lists of elements and relationships); the inspector's before and after (properties and relationships added or removed); the Changes only filter; hide wording-only changes; selection in the URL. | Tests on the markup and the panel; the real page; `node --test` passes |

**Gate:** the criteria of the manifest for P3.

## Phase P4 — Proof

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-8 | — | `plateaus-manual-and-field-check` | W-5, W-7 | trust the feature on a real baseline and target, and learn how to use it from the manual | The manual gets a section on plateaus, the comparison, the states and their legend, the CLI and the editor, and the breaking change; an invented example workspace in `src/doc/examples` that loads; a field check on a copy of the real baseline and target arranged as two plateaus (the originals are never written: checksums before and after), generating with the CLI and looking at the real page in light and dark. | The manual builds and its example loads; the counts are the study's or the difference is explained; what was not verified is listed |

**Gate:** the criteria of the manifest for P4.

## Dependency View

```
W-1   W-2 --> W-3 --> W-4 --+--> W-5 ---------+
                            |                 +--> W-8
                            +--> W-6 --> W-7 -+
```

## Risks

- **Overlap W-1 / W-2** (same batch, no dependency): both touch `manifest/**`, `workspace/**` and `standalone.html`.
  Verdict: `serialize`, W-1 first (the duplicate error is the smaller change and W-2 applies it per plateau).
- **Overlap W-5 / W-6** (same batch, after W-4): both edit `src/doc/README.adoc`; W-5 is Java and CLI, W-6 is
  `standalone.html`. Verdict: `serialize`, W-5 first, because the manual is one file and the runs share one working tree.
- **W-7 follows W-6** by a real dependency (same file, same panel); W-8 follows both.
- **W-3 and W-4 share the Rust kernel** and are ordered by their dependency.
- **A breaking change.** Forbidding `..` in `manifests.paths` breaks a workspace that uses it (none in this repository).
  W-2 gives a message that says what to change; the manual and the release notes say it.
- **The meaning of "changed" is the hard part.** The design study measured 4 of 25 "changed" elements caused only by the
  hand-written tag, and 14 of 21 property changes that are wording only. W-3 must normalise and type the change, or the
  filter drowns.
- **PlantUML parity.** Dashed, dotted and struck text in a box title are approximations; W-5 checks first and records it.
- **ELK layout on the union** was not measured on a real platform (about 170 elements). W-6 looks at it on the real pair.
- **The client data** is copied to the scratchpad for the checks, never committed; fixtures are invented.
- **The editor cannot be fully automated.** As in waves 004 to 007, markup, CSS text and a look at the real page stand for
  the File System Access picker; each run says what it did not verify.
- **Stacked on wave 007.** This wave needs PR 21 (stable order, outline, wrapped labels). If PR 21 is rebase-merged first,
  rebase this branch on `main` before executing.

## Completion Criteria

- Every gate criterion of P1 to P4 holds.
- The branch carries one commit per run, plus the plan, and goes to a pull request to be rebase-merged.
- The progress log records the gates and what was not verified; the final report lists the ban on `..` as a breaking
  change and the follow-ups (`replaces`, the move action, N plateaus, timeline, git baseline).
