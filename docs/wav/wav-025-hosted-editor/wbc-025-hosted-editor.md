---
type: wbc
wave: 025
status: proposed
date: 2026-10-27
related:
  - docs/wav/wav-024-fixes-and-editor-modules/wav-024-fixes-and-editor-modules.md
---

# Wave 025 — Hosted editor — Business Case

## Context

Wave 024 (merged 2026-10-27) split the editor page into 69 source files under `src/main/editor/`, assembled into the one distributed `standalone.html`, formatted and linted file by file; wave 023 added Playwright, which drives Chromium and Firefox (and WebKit, one project away). The open issues, evaluated on 2026-10-27:

- **#162**, the hosted editor (https://tmorin.github.io/archicode/editor/): today it needs `showDirectoryPicker`, so a visitor in Firefox or Safari sees "use a recent Chrome" and can do nothing, and a visitor in Chrome must already own a folder of manifests. The issue is fully specified and decided (the bundle separator `--- # file: <path>`, IndexedDB behind a third directory handle, a committed and checked Brightcart bundle, a 10 MB import limit, `storage.persist()`), and its two prerequisites are now met (the page in parts; an end-to-end framework that drives Firefox).
- **#175**, a bug: the indentation of the plateau tree stops growing at depth 6 (`Math.min(depth, 6)` at three places: `presentation/pages-plateaus-files.js:100`, `presentation/plateau-band.js:60` and `:107`), so a long chain of plateaus reads as siblings.
- **#65**, `plateau fold`: the author decided on 2026-10-23 (D13) that an analysis run comes first (several plateaus above, siblings, `--archive`), then code. The by-hand recipe exists (`[[fold-by-hand]]`).

Not in this wave: #143 (a view built on relationships: decided, large, touches the Rust kernel, the command line and the editor; wave 026), #134 and #135 (importers: blocked until the author finds a public sample of the format under a compatible licence, D12; their texts also still say `workspace.yaml` and views, which the decisions of 2026-10-21 left out of v1), #24 (a matrix of N plateaus: no mock-up, the issue asks for the author's design note first), #155 L3 and L4 (limits pinned on 2026-10-23). Nothing in `docs/bkg` or `docs/ana` exists for this ground.

## Problems / Opportunities

- The public page is a dead end outside Chromium, and a visitor has no project to look at. The editor is the product's showcase; making it usable with nothing installed is the largest adoption gain on the list, and it is now cheap to add because the editor already reaches its files through one interface (the directory handle) that `editor serve` implements a second time.
- #175 is a visible defect on the same Plateaus page the sample (Brightcart has a fork and four plateaus) exercises first.
- #65 has stalled for lack of its analysis; one document run settles it at low cost and lets a later wave build or drop it.

## Options & Recommendation

1. **#175, #162 and the #65 analysis (recommended).** One theme (the editor anyone can open), a short fix first, then the four runs the issue itself proposes, and a documents-only run on the side.
2. **#162 alone.** Smaller, but leaves a known bug on the page the sample shows and leaves #65 undecided for another wave.
3. **#143 in place of #162.** Rejected for this wave: the kernel contract and the naming of a relationship are still to be settled, and a wave on the kernel, the command line, the editor and the manual is too wide to review next to a persistence feature.
4. **Include an importer (#135).** Rejected: no licensed public sample, so no test can prove compatibility with a real export.

## Vision

Someone with nothing installed opens the site, presses one button and is in the editor on the Brightcart sample, in Chrome, Firefox or Safari. Their changes stay in their browser, they can export the workspace to one YAML file and import it back byte for byte, and nothing on their file system is read or written unless they pick a folder. The plateau tree reads as a sequence at any depth. The question of folding a plateau into the one above has an analysis that says what to build, or not to.
