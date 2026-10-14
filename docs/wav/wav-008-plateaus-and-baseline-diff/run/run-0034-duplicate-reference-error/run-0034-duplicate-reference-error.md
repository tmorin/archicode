---
type: run
run: 0034
status: completed
wave: 008
---

# Run 0034: Duplicate reference error

Wave 008 (`plateaus-and-baseline-diff`), item W-1 (phase P1). Focus: learn at once, with the two file names, that a reference is
declared twice. Document profile: `single-document` (the scope arrives settled by the wave's W-1 row; the design is one check in
the loader of the CLI and the same one in the loader of the editor, no live alternative worth a TDD); this file carries scope,
decisions, canonical impact, verification and findings.

## Context

A reference declared twice (the same element in two manifest files of the listed folders) produced no error and no warning in
the CLI: `ManifestParser` keeps the candidates in a `HashSet` (two identical copies merge by equality) and
`ElementIndexFactory` indexes them with `put`, so of two different copies the one that wins depends on the hash of the content,
not on the folder order nor on the file name. In the editor, `buildIndex` writes each record into a `Map` with `set`: the last
file in alphabetical order wins, and the tree shows both declarations. Views are indexed by id with `put` (the last of a
`LinkedHashSet` filled in the order the file system lists them), and stories were not indexed at all.

## Decisions

- **D1. What a duplicate is, one definition for the CLI and the editor.** A reference is the `id` of an element placed under its
  parent: the element that contains it in its file, or the `header.parent` of the manifest. It is declared by a manifest of its
  own, by an element nested at any depth in a manifest, or by a manifest placed under a parent. Two declarations of one reference
  in the same layer are a duplicate, whether they are in two files, in a file and in a manifest placed under its parent, or twice
  in one file. Two identical copies are as much a duplicate as two different ones (nothing says which file is meant). The same
  reference in the application and in the technology layers is **not** a duplicate (the two layers have separate indexes, in the
  CLI and in the editor).
- **D2. The CLI checks the content as written, not the objects it builds.** `ManifestParser.parse` records, while it reads each
  element manifest, the references of its `content` tree (`id`, then `elements[].id` recursively, skipping what has no `id`, as
  `indexElementRecursive` of the editor does) with the file that declares them, then fails once all the manifests are read.
  Checking the `Element` objects instead would have missed identical copies inside one file (the `Set` of children merges them)
  and would not have had the file name. The check is per call of `parse`, that is per set of manifests: W-2 will call it per plateau
  without change here.
- **D3. The error is an `ArchiCodeException`, as the dangling relationship and the unknown kind.** Raised from the loader, so
  `views generate` exits 1 before writing anything, with the stack trace the other errors have. The message names the reference
  and the files, written from the folder of the workspace with `/` (`manifests/a.yaml`), the files in alphabetical order (the
  order the file system lists them in does not leak), the references in alphabetical order, **all** the duplicates in one error,
  one per line:
  `the reference `shop` is declared twice: in `manifests/a.yaml` and `manifests/b.yaml``; three declarations:
  `declared 3 times: in `a`, `b` and `c``; one file twice: `declared twice in `a``; a file that declares it twice among others:
  `` `a` (twice) ``.
- **D4. The editor reports, and does not block.** Decided between "a blocking error at load" and "a visible error state". The
  editor reports other problems of a file as a state (the error badge of the file, the error panel of the file, the note above
  the tree for the TOML and JSON files it does not read) and keeps `fatalError` for a `workspace.yaml` it cannot read at all; a
  fatal error here would also stop the author from opening the files in the editor to fix them, which is the way out. So:
  `buildIndex` returns `duplicates` (`[{ layer, reference, sources, message }]`, same definition, same sort and same words as the
  CLI: `duplicateReferenceMessage` mirrors `ManifestParser.duplicateMessage`), kept in `AppState.duplicateReferences` and
  recomputed by every `buildIndex` (load and every edit), so that it clears when the duplicate is fixed. It shows as a red note
  (`role="alert"`) above the trees of Elements and above the list of Files with the messages, as a `duplicate` badge and a
  `Duplicate reference:` panel on each file that takes part, and **no diagram is drawn** while an element is duplicated (the
  diagram area says `Nothing is drawn` with the messages): the index still holds the last file for a duplicate, and drawing from
  it would be the silent choice again. Saving, editing and the Library are not blocked.
- **D5. Views and stories: the same defect, the same check (cheap, so applied).** Two view manifests with one `id`: the CLI put
  them both in the set and generated one file per id, the winner depending on the listing order; the editor lists both. Two stories
  with one id: ambiguous for the editor's `story=` links. `parse` and `buildIndex` record them in their own namespaces (`view`,
  `story`: a view and a story may share an id) and the message says `the view` / `the story` instead of `the reference`. In the
  editor, a duplicate view or story does not stop the diagrams of elements (nothing is chosen between elements there).
- **D6. Not covered, on purpose** (see Findings): an element written inline in `workspace.yaml` against a manifest; a view or a
  story of `workspace.yaml` against a manifest (the editor shadows it by design: "a manifest first").
- **D7. A workspace without a duplicate is unchanged.** The check only reads; the order in which the files are visited, and so
  every set the generation depends on, was not touched (`paths` and the file list are still the same `HashSet`s, the messages
  are sorted afterwards). Checked byte for byte, below.

## Canonical impact

None to canonical documents: `docs/` holds the run and wave records only. The rule is in the manual (`src/doc/README.adoc`, one
paragraph after the `manifests/user.yaml` example, with the message, and one in the editor chapter, after the paragraph on the
TOML and JSON manifests); the paragraphs of W-2 are not touched.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the loaders (CLI and editor), the harness, the baseline files; keep a build of HEAD for the before/after | done |
| T2 | CLI: record the declarations in `ManifestParser`, fail with one message per duplicate | done |
| T3 | Editor: `buildIndex` returns the duplicates; note, badges, file panel, no diagram | done |
| T4 | Tests: `DuplicateReferenceTest` (Java, 10) and `duplicate-reference.test.js` (15) with the same cases and the same words | done |
| T5 | Manual: the paragraph and the editor sentence | done |
| T6 | Before/after on the fixtures and on a copy of the real baseline and target; the CLI and the editor on one duplicate | done |
| T7 | `./mvnw verify`, `node --test`; a look at the real page | done |

## Acceptance criteria (the W-1 row)

- AC1. A test with two different copies and one with two identical ones fail with the message naming both files, in the CLI
  loader (`DuplicateReferenceTest.twoDifferentCopiesFailWithBothFiles`, `twoIdenticalCopiesFailAsWell`) and in the editor
  (`duplicate-reference.test.js`, the first two tests). Also tested: two folders, `header.parent` placement, nested element,
  twice in one file, three declarations and several references in a stable order, the two layers, views and stories, the
  words of the two sides, the markup of the report, fix and re-break by an edit in the editor, a diagram that is not drawn.
- AC2. A workspace without duplicates generates the same files as before: see Results.
- AC3. `./mvnw verify` and `node --test` pass: see Results.

## Review passes

Run inline (short document; no subagent dispatched).

- **KDMLLC.** K: one recording pass and one failure per loader, no new class; D: the message is written in one place per side and
  the unit cases of both sides assert the same strings; M: file against file, file against `header.parent`, nested against
  nested, same file, three declarations, two folders, two layers, views, stories; L: nothing is added to the model, the
  declarations are a local map; U/C: the manual's sentences were checked against the messages the two sides give.
- **C scan.** Claim "the CLI exits 1 like for a dangling relationship": checked on the built jar (exit 1, stack trace, nothing
  written). Claim "the CLI and the editor agree": checked on one duplicate with the CLI and the editor's own code (same line,
  character for character), and by the same cases in both test suites. Claim "the check does not change the generation of a
  workspace without duplicates": measured, not assumed. Claim "a duplicate inline in `workspace.yaml` is caught": **not true**, D6.
- **Open questions.** None left.

## Verification

All with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

### Results

- `./mvnw -o verify`: BUILD SUCCESS, 131 tests (121 before, plus the ten of `DuplicateReferenceTest`), 0 failures, 0 errors
  (integration tests skipped by default, as in `pom.xml`).
- `node --test "src/test/javascript/**/*.test.js"`: 607 tests (592 before, plus the fifteen of `duplicate-reference.test.js`),
  607 pass, 0 fail.
- **Before and after, byte for byte.** A jar of HEAD (before) and the jar of this run (after), `views generate` run in place on
  copies in the scratchpad of: the seven fixtures of the repository that have views (`src/doc/examples/domain_*`,
  `facet_example_step_1` and `_4`, `src/test/resources/viewpoint-kernel/workspace`) and **copies** of the author's baseline
  (`as-is`, 927 `.puml`) and target (`to-be`, 3411 `.puml`): 5003 `.puml` files in all, `diff -r` of the two trees empty and the
  `md5sum` of the sorted list identical. The two real workspaces have no duplicate (the CLI generated them with the new check,
  and the editor's code finds none). The originals were only read: the `md5sum` of their 91 files is the same before and after.
  Nothing of them is in the repository.
- **A duplicate, CLI and editor on the same folder** (a copy of the repository fixture with a copy of `app.mailer.yaml` named
  `app.zz-mailer-copy.yaml`): the CLI exits 1 with ``the reference `mailer` is declared twice: in `manifests/app.mailer.yaml` and
  `manifests/app.zz-mailer-copy.yaml` `` and writes nothing; the editor's code (`loadWorkspace` in the test harness) gives the same
  line, character for character.
- **The real page.** `editor serve` on that folder, looked at in a headless Firefox (the snap `firefox.geckodriver` over WebDriver,
  a small script of this run, a temporary profile), as in runs 0030 to 0033, because the built-in pane does not draw: the Map
  says `Nothing is drawn: a reference is declared more than once.` with the message; Elements and Files carry the red note with
  the message; Files marks the two files `duplicate`. Every screenshot named here was opened and looked at.
- `cargo test` and `embed.sh --check`: not run, the Rust and the wasm were not touched.

## Findings

- **For the wave (W-2 and later).** The check is per call of `ManifestParser.parse` and per call of `buildIndex`: each call is one
  set of manifests, so a plateau is one call of each, with its own `declarations`; W-2 must keep the plateaus in separate calls
  (the same reference in two plateaus is no duplicate, it is what the comparison is about) and may want the plateau in the
  message (`in plateau X`). The files are named from the folder of the workspace, which holds for a plateau path inside it.
  Manifest folders are read non-recursively (direct children), in the CLI and in the editor.
- **Not caught, recorded.** (1) An element written inline in `workspace.yaml` (`application:` / `technology:`) with the same
  reference as a manifest: still silent in the CLI (the editor does not read inline elements at all, so there is no editor side to
  agree with). (2) A view or a story of `workspace.yaml` with the same id as a manifest: the CLI keeps both and the editor shadows
  the older entry with the manifest on purpose; left as it is. Neither is a regression and both are one more `declare` call each if
  the wave wants them.
- **The message is in English on both sides** and its words are in two places (`ManifestParser.duplicateMessage`,
  `duplicateReferenceMessage`); each side has unit cases with the same strings, which is the guard.
- **The Map's navigation does not carry the red note** (the Map draws the message in its diagram area, and Elements and Files
  carry the note): one line to add if the author wants it everywhere.
- **Files touched outside `likely_paths`:** `src/doc/README.adoc` (asked for by the brief, and by the wave's W-2 `likely_paths`);
  nothing else outside this run's directory.
- **Not verified.** Chromium and Safari (Firefox only; the CSS is the one of the existing error panels); the built-in browser
  (could not draw a screenshot); the file System Access picker (served mode only); the `Duplicate reference:` panel of the file
  detail and the view/story variants on the real page (tested on the markup only); a duplicate between a TOML or JSON manifest and
  a YAML one (the CLI sees it, the editor does not read the TOML and JSON files and says so: that is the existing gap, not a new
  one); the native build (`-Dnative`, integration tests skipped by default).
