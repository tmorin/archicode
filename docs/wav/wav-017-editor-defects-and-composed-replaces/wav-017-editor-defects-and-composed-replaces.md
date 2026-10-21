---
type: wave
wave: 017
status: proposed
date: 2026-10-20
related:
  - docs/wav/wav-017-editor-defects-and-composed-replaces/wbc-017-editor-defects-and-composed-replaces.md
  - docs/wav/wav-016-band-tree-and-technology-map/wav-016-band-tree-and-technology-map.md
  - docs/wav/wav-016-band-tree-and-technology-map/prg-016-band-tree-and-technology-map.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 017 — Editor Defects and Composed Replaces

## Purpose

When this wave is done, a *Remove* button of a qualifier, an application or a use removes the item it sits on whatever the list holds, cancelling a dialog opened by saving the form of an element gives the form back as typed,
a *Move* says before it writes which sibling plateaus still declare the old reference (as a rename does), the save keeps a UTF-8 byte-order mark and a comment that follows a moved block, and `views generate -i` names the view
and the facet when a facet removes the element of a view, before it writes anything. A comparison two plateaus apart composes the `replaces` of the layers in between, so that a move made in two steps is a move; a patch can take an inherited field out;
the editor at 360 px is measured on the band as it is now. The manual and `CLAUDE.md` say all of it, and a workspace that uses none of it generates the same views as `archicode-0.15.0`.

## Non-Goals

- Does not change the dependencies derived from deployed applications (#124): it changes the output of three viewpoints and the Map and nobody has asked for it.
- Does not build `plateau merge` (#65), `--baseline-ref` (#25), the matrix of N plateaus (#24), deleting a plateau that others override (#112), a story drawn by the command line (#109) or the move of a group under a parent of an overridden plateau (#114).
- Does not make the editor and the command line read YAML 1.1 numbers the same (#103) nor follow an anchor inside brackets (#78): documented limits.
- Does not work on the cost of the kernel at 600 elements (#125) and does not remove the shims of #128.
- Does not look at the editor on a real screen, a real phone or with a screen reader (#29 stays the author's): a run that measures 360 px says what it measured, not what it saw.
- Does not close or reword an issue that no run closes. Does not cut a release.

## Decisions

Given by the author on 2026-10-20 (the recommendations of the review, accepted):

- **D1 (#94).** A patch can take a field out. The plan recommends the operator `REMOVE` with a `field` (additive in the kernel contract 5) over a `SET` with a null value, which cannot be told from a value; W-8 decides the details and records them.
- **D2 (#124).** Not in this wave: it stays open.
- **D3 (#112).** Not in this wave: the two-step procedure (edit the plateaus above, then delete) works.

## Decisions taken by this plan

Not the author's yet: the plan chooses so that an unattended wave can run.

- **T1.** The byte-identity base is the tag `archicode-0.15.0` (a jar built from `git archive` outside the repository). A run that changes `src/main` compares `views generate`, `query graph` and `diff` on every workspace that does not use what the run builds.
- **T2.** #123 is reproduced first, in the built-in browser if the form can be driven there, else in the node harness with the DOM the harness has; if it is not real the run closes the issue with the reason and changes nothing.
- **T3.** #89 composes the `replaces` on the host side (the command line and the editor build the target they hand to the kernel's `compare`) unless the kernel is the smaller place; both tools give the same table (a shared case). The tables of the manual that change are changed with the tool, and `BrightcartLayeredDiffTest.marketplaceAgainstBaselineIsP4ButForTheMoveThatTookTwoSteps` becomes the test of the composed table.
- **T4.** #82 is a measure first: if the top bar and Settings hold at 360 px on the band as it is, the run says so with numbers and closes the issue; otherwise it fixes only what it measured.
- **T5.** #121 gives one `error:` line that names the view and the facet; it does not skip the view (the author asked for it by name) and it writes nothing of the folders when the check fails.

## Wave Manifest

```yaml
wave_manifest:
  wave: 017
  slug: editor-defects-and-composed-replaces
  status: proposed
  sources: []
  phases:
    - id: P0
      name: Defects with a reproduction
      gate:
        criteria:
          - '`archicode views generate -i <view>` on a view whose element a facet removes exits 1 with one `error:` line that names the view and the facet and writes none of the folders of that run (a test, `ViewElementRemovedByFacetTest` or its equivalent)'
          - 'the three Remove buttons (`remove-qualifier`, `remove-application`, `remove-use`) remove the item they sit on in a list that holds an item with no value (a test for each, which fails on HEAD of wave 016); cancelling the dialog of `layer-confirm` and of `rename-siblings` gives the form back with the typed id, name and description, or #123 is closed with the reason that it is not real (run W-3)'
          - 'the dialog of *Move* names the sibling plateaus that keep the old reference and the views and steps that would break, asks before it writes, and writes byte-identical files when no sibling is concerned (tests on the layered Brightcart)'
          - 'a file saved by the editor keeps its byte-order mark, and a trailing comment of a block cut from one file and pasted in another goes with the block (tests; the file layout cases)'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: The 360 px measure and the two gaps of the layers
      gate:
        criteria:
          - 'the top bar and the Settings page at 360 px are measured on the layered Brightcart with numbers in the run, and the issue is fixed or closed on them'
          - '`archicode diff --plateau marketplace --against baseline` on the layered Brightcart gives the table of the model of the fixture (`+38 ~3 -6`, 11 moved / 2 split / 1 merged) with no `is not an element of the base plateau` warning, the editor gives the same table, and every other comparison of the fixture, the examples and the other fixtures is as it was (tests)'
          - 'a plateau can take an inherited field out by the operator W-8 chose, both tools apply it (a shared case), the editor writes it instead of refusing to clear an inherited text, and a patch of the old forms is read as before; `embed.sh --check` ok; the kernel contract number is said in the README of the kernel'
          - 'every example of `src/doc/examples` and every fixture that uses neither feature gives byte-identical `views generate`, `query graph` and `diff` with a jar built from `git archive archicode-0.15.0` outside the repository (except the rows of the table the compose changes)'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: The manual
      gate:
        criteria:
          - 'the manual builds, every example is loaded by both tools, `[[plateau-limits]]` and `CLAUDE.md` no longer list #82 (if closed), #89, #94, #119, #120, #121, #122, #123 as open, and the views of every example that has views are byte-identical to a jar built from `git archive archicode-0.15.0` outside the repository'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
  runs:
    - id: W-1
      slug: view-element-removed-by-a-facet
      phase: P0
      depends_on: []
      run: 0119
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: '`views generate -i` on a view whose element a facet removes says the view and the facet in one `error:` line and writes nothing, instead of a bare `dangling reference` after half the folders (#121)'
    - id: W-2
      slug: remove-buttons-address-the-file
      phase: P0
      depends_on: []
      run: 0120
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: 'the Remove button of a qualifier, an application and a use removes the item it sits on, by its place in the file and not in the list drawn (#120)'
    - id: W-3
      slug: cancel-keeps-the-typed-form
      phase: P0
      depends_on: []
      run: 0121
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: 'cancelling a dialog opened by saving the form of an element gives the form back as typed, or the issue is closed with the reason that it never happened (#123)'
    - id: W-4
      slug: move-names-the-sibling-plateaus
      phase: P0
      depends_on: []
      run: 0122
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: 'the dialog of *Move* says which sibling plateaus still declare the old reference, as the rename dialog does, before it rewrites the views and the stories (#122)'
    - id: W-5
      slug: save-keeps-bom-and-trailing-comment
      phase: P0
      depends_on: []
      run: 0123
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: 'the line-preserving save keeps a UTF-8 byte-order mark, and a comment after the last line of a moved block goes with the block (#119)'
    - id: W-6
      slug: editor-at-360-px
      phase: P1
      depends_on: []
      run: 0124
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: 'the top bar and the Settings page at 360 px, measured on the band as it is now, then fixed or the issue closed with the numbers (#82)'
    - id: W-7
      slug: compose-replaces-along-the-chain
      phase: P1
      depends_on: []
      run: 0125
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/comparison/**'
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/brightcart/**'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'a comparison between two plateaus several steps apart composes the `replaces` of the layers in between, so that a move made in two steps is a move, in both tools (#89)'
    - id: W-8
      slug: patch-takes-a-field-out
      phase: P1
      depends_on: [W-7]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/**'
        - 'src/main/java/io/morin/archicode/resource/plateau/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/brightcart/**'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'a plateau can say that an inherited field is gone, and the editor writes it instead of refusing to clear an inherited text (#94)'
    - id: W-9
      slug: manual-and-tutorial-017
      phase: P2
      depends_on: [W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'src/site/**'
        - 'CLAUDE.md'
        - 'docs/fixtures/brightcart-spec.md'
        - 'README.md'
      focus: 'the manual, the tutorial and `CLAUDE.md` say what the editor and the command line do at the end of this wave'
```

## Phase P0 — Defects with a reproduction

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `view-element-removed-by-a-facet` | — | `views generate -i` on a view whose element a facet removes says the view and the facet in one `error:` line and writes nothing (#121) | reproduce it on a copy of the layered Brightcart (the probe view of the issue); decide where the check goes (before the first folder is written, T5); the sentence names the view, the element and the facet; the view is not skipped; the other commands and a view whose element no facet removes are as before | the reproduction of the issue exits 1 with one line, no folder of that run is written (a test); the plain `views generate` of every fixture and example is byte-identical to `archicode-0.15.0`; closes #121 |
| W-2 | — | `remove-buttons-address-the-file` | — | the Remove button of a qualifier, an application and a use removes the item it sits on (#120) | the forms address the lists by `data-index`, the place in the list drawn, and the handlers splice the file list that still holds the item with no value: give each item the `fileIndex` the relationships already have (#105) and use it in the three handlers; no change to what is drawn | for `qualifiers: [a, null, b]`, `applications` and `uses` the Remove on the last item removes it and leaves the `null` where it was (three tests that fail on HEAD of wave 016); a list with no empty item writes the same file as before; closes #120 |
| W-3 | — | `cancel-keeps-the-typed-form` | — | cancelling a dialog opened by saving the form of an element gives the form back as typed, or the issue is closed with the reason that it never happened (#123) | reproduce first (T2) on `layer-confirm` and `rename-siblings`; if real, keep the typed id, name and description (view state, never model state, no `modelsChanged()`) across `closeAppDialog` for both dialogs; if not, change nothing and close the issue with what was seen | either a test that types, saves, cancels and finds the typed values (failing on HEAD) or the reason written in the run and on the issue; closes #123 |
| W-4 | — | `move-names-the-sibling-plateaus` | — | the dialog of *Move* says which sibling plateaus still declare the old reference (#122) | `renderMoveDialogBodyHtml` uses `renameSiblingImpact(oldRef, newRef, layer)` once the new parent is chosen (the new reference is `plan.newReference`) and asks before `commitMoveElement` writes; no sibling, no name at risk, a workspace with no plateau: no new dialog and byte-identical files | on the layered Brightcart a move of an element that `saas` and `inhouse` both declare lists both plateaus and the views that would break and writes nothing on *Cancel*; a move with no sibling writes what it wrote; closes #122 |
| W-5 | — | `save-keeps-bom-and-trailing-comment` | — | the line-preserving save keeps a byte-order mark, and a comment after the last line of a moved block goes with the block (#119) | the editor reads a file with a BOM as the browser gives it (the page does not see the mark) and writes it back where the file had it; `cutBlockFromText` and `pasteBlockInText` take a comment that follows the block and is not an introduction to the next element; the cases are shared where the command line has the same rule | a file with a BOM is saved with it; a moved block takes its trailing comment, a comment that belongs to the next element stays (tests, including the heuristic's limits); closes #119 |

**Gate:**

- `archicode views generate -i <view>` on a view whose element a facet removes exits 1 with one `error:` line that names the view and the facet and writes none of the folders of that run (a test, `ViewElementRemovedByFacetTest` or its equivalent)
- the three Remove buttons (`remove-qualifier`, `remove-application`, `remove-use`) remove the item they sit on in a list that holds an item with no value (a test for each, which fails on HEAD of wave 016); cancelling the dialog of `layer-confirm` and of `rename-siblings` gives the form back with the typed id, name and description, or #123 is closed with the reason that it is not real (run W-3)
- the dialog of *Move* names the sibling plateaus that keep the old reference and the views and steps that would break, asks before it writes, and writes byte-identical files when no sibling is concerned (tests on the layered Brightcart)
- a file saved by the editor keeps its byte-order mark, and a trailing comment of a block cut from one file and pasted in another goes with the block (tests; the file layout cases)
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P1 — The 360 px measure and the two gaps of the layers

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-6 | — | `editor-at-360-px` | — | the top bar and the Settings page at 360 px, measured on the band as it is now (#82) | measure in the built-in browser at 360x800 on a copy of the layered Brightcart: height of the top bar, right edge of every input of Settings, the heights of the stacked panels (T4); fix only what is past the window; if nothing is, say so and close | the numbers are in the run; either a test pins the layout the fix gives or the issue is closed with the numbers; closes #82 |
| W-7 | — | `compose-replaces-along-the-chain` | — | a comparison several steps apart composes the `replaces` of the layers in between (#89) | the host composes the `replaces` along the chain before it hands the target to `compare` (T3), in the command line (`PlateauComparer`/`KernelGraph`) and in the editor; the warning `is not an element of the base plateau` goes where the composed chain explains it; the comparison with the parent is unchanged; a shared case file for both tools; the manual's tables that change are named for W-9 | `diff --plateau marketplace --against baseline` gives `+38 ~3 -6`, 11 moved / 2 split / 1 merged, relationships `+35 ~1 -9` and no warning, and the editor gives the same (a shared test); the test that pinned the old table is the test of the new one; every other comparison of the fixtures and examples is as it was; closes #89 |
| W-8 | — | `patch-takes-a-field-out` | W-7 | a plateau can say that an inherited field is gone (#94) | the operator is `REMOVE` with a `field` (D1) unless W-8 finds a reason in its document; the kernel (Rust, the wasm re-embedded, the contract number and the README of the kernel), `resource/plateau/Patch` and the page apply it; which fields can go (the optional ones; `id`, `parent` and `elements` stay refused, and so does a field the kernel needs); the editor writes it where it refused to clear an inherited text (`patchFor`/`writePatchChange`), through `guardedLayerWrite`; a patch of the old forms reads as before | a shared case removes an inherited `description` and the plateau reads without it in both tools; the editor clears an inherited text and the file holds the patch; `embed.sh --check` ok; every workspace that has no such patch is byte-identical to `archicode-0.15.0`; closes #94 |

**Gate:**

- the top bar and the Settings page at 360 px are measured on the layered Brightcart with numbers in the run, and the issue is fixed or closed on them
- `archicode diff --plateau marketplace --against baseline` on the layered Brightcart gives the table of the model of the fixture (`+38 ~3 -6`, 11 moved / 2 split / 1 merged) with no `is not an element of the base plateau` warning, the editor gives the same table, and every other comparison of the fixture, the examples and the other fixtures is as it was (tests)
- a plateau can take an inherited field out by the operator W-8 chose, both tools apply it (a shared case), the editor writes it instead of refusing to clear an inherited text, and a patch of the old forms is read as before; `embed.sh --check` ok; the kernel contract number is said in the README of the kernel
- every example of `src/doc/examples` and every fixture that uses neither feature gives byte-identical `views generate`, `query graph` and `diff` with a jar built from `git archive archicode-0.15.0` outside the repository (except the rows of the table the compose changes)
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P2 — The manual

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-9 | — | `manual-and-tutorial-017` | W-1 to W-8 | the manual, the tutorial and `CLAUDE.md` say what the editor and the command line do at the end of this wave | the error of `views generate -i`; the Remove buttons; the dialogs (cancel keeps the form, Move names the siblings); the byte-order mark and the trailing comment; the 360 px result; the composed `replaces` and the tables of the manual that change; the operator that takes a field out; `[[plateau-limits]]` and the `CLAUDE.md` list lose what is done and keep #124, #112, #109, #114, #78, #103, #125 | the manual builds and every example is loaded by both tools; the views of every example that has views are byte-identical to `archicode-0.15.0`; closes — |

**Gate:**

- the manual builds, every example is loaded by both tools, `[[plateau-limits]]` and `CLAUDE.md` no longer list #82 (if closed), #89, #94, #119, #120, #121, #122, #123 as open, and the views of every example that has views are byte-identical to a jar built from `git archive archicode-0.15.0` outside the repository
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Dependency View

```
P0:  W-1   W-2   W-3   W-4   W-5
P1:  W-6   W-7 ── W-8
P2:  W-9 <── (W-1 to W-8)
```

## Risks

- **Everything but W-1 touches `standalone.html` or the node tests.** All runs `serialize`; no `concurrent-safe` verdict is claimed. They are dispatched one at a time, in the order W-1 to W-9. The pairs that share a path: W-2 to W-6 (`standalone.html`, the node tests), W-7 and W-8 (the kernel, the wasm, `standalone.html`, the Brightcart fixture), W-1, W-7 and W-8 (`workspace/**`), W-9 and every run (`CLAUDE.md`, the manual).
- **Edges.** W-8 needs W-7 only because both change the kernel and the wasm (re-embedding twice in parallel would conflict); W-9 needs every run.
- **W-7 and W-8 are the large ones.** Both touch the kernel contract or its adapter and re-embed with `embed.sh`; if one needs a kernel number it says so in its document and in the README of the kernel. Both are `standard`: nothing deletes data, touches credentials or waits for an open decision (D1 settles the operator; W-8 may change the details).
- **Byte-identity.** Every run that changes `src/main` compares `views generate`, `query graph` and `diff` of every workspace that does not use the change against a jar of `archicode-0.15.0` and says which workspaces and commands.
- **#123 may not be real.** W-3 reproduces before it fixes (T2); an honest "not real" is a valid outcome.
- **Hand-written files.** Nothing of the author's real workspace is in the repository; every file a run ships is loaded by the command line and by the editor in a test, and a failure that stays is pinned by a test that checks the message.
- **The size.** Nine runs, all `standard`, one at a time; no run needs a stronger model. A long wave may be interrupted; `complete-wave` resumes from the files.

## Completion Criteria

The three phase gates verified; `./mvnw -o verify -DskipITs=false`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass on the final tree; every shipped example and fixture is loaded by the command line and the editor in a test;
issues #82 (or its numbers), #89, #94, #119, #120, #121, #122 and #123 (or its reason) are closed by their commits; #124, #112, #109, #114, #78, #103, #125 stay open; every item a run lists as "not verified" is in the final report.
