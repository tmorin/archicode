---
type: wbc
wave: 024
status: completed
date: 2026-10-26
related:
  - docs/wav/wav-023-fixes-and-tooling/wav-023-fixes-and-tooling.md
---

# Wave 024 — Fixes and editor modules — Business Case

## Context

Wave 023 (0.20.0) put formatting, lint, coverage, PMD and an end-to-end suite around the code, and left four issues open that it found on the way: #166 (`/favicon.ico` answers 404, Chromium logs a console error on every load; the e2e suite carries an exception for it), #167 (step 3 of the story `migration` of the example `domain_plateaus` plays an empty slide), #170 (the same mistake, a view with no element, has two sentences, one per tool) and #155 (two layout losses of the save, L3 and L4). The issue #161 asks to split `src/main/resources/editor-webapp/standalone.html` (23,167 lines, 2.4 MB, about 22,000 lines of JavaScript in one classic script plus the kernel as base64): the formatter, the linter and the review of the editor all stop at that file (`.prettierignore` leaves it out, `lint` and the coverage script extract its script to a scratch copy).

Nothing in the registers (`docs/bkg`, `docs/ana`) covers this ground; the items are GitHub issues of `tmorin/archicode`, which is where the repository keeps deferred work.

## Problems / Opportunities

- Three of the four fixes are cheap and leave a visible blemish (a console error on every load, an empty slide in a shipped example, two sentences for one mistake).
- Every wave since 014 has grown one file. A change to the editor is a diff of one 23,000-line file; the page cannot be formatted, only linted through a copy; the coverage areas are found by marker lines. Splitting it is a prerequisite of every later editor feature (#143, #162) being reviewable.
- The split touches a lot (52 files mention the page, the kernel embedding, the website step, the native image), so it is only safe if it is done in small steps with the node suite green after each, and once the small page edits of the fixes are settled.

## Options & Recommendation

1. **Fixes, then the split, in one wave (recommended).** The fixes first (they edit the page a little and the cases of the sentences), then a design run, then the extraction in steps. The page is quiet while it is cut.
2. **The split alone, fixes later.** Rejected: the fixes edit the page, and doing them during or after the cut means doing them twice in two layouts.
3. **The split with a bundler toolchain (esbuild or similar) at once.** Rejected as the default: the project has no JavaScript build step today, native ES modules do not load from `file://`, and the website step copies one file. A dependency-free assembly script that writes the one distributed file, checked in CI like `embed.sh --check`, fits the repository's existing pattern. The design run confirms it (Decision Prerequisite D1).
4. **Include #155 L3 and L4.** Rejected: the author decided on 2026-10-23 that they stay pinned limits (they need a list of lists, which only a patch `value` can hold). L2 is already fixed (wave 022).

## Vision

The four small issues are closed. The editor is a set of source files, each of a size that can be read, formatted and linted on its own, assembled into the one file that is still distributed (`editor serve`, jar and native, the website, a kept copy), and everything the editor does and writes is byte for byte what it was.
