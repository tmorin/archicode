---
title: 'TDD: close out the editor modules, format the sources, document the build (W-9)'
type: tdd
status: accepted
owner: tmorin
date: 2026-10-27
run: 0188
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-001-editor-distribution.md
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-002-editor-architecture.md
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-003-editor-migration.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0187-editor-state-notifies/run-0187-editor-state-notifies.md
---

# Technical Design: close out the editor modules (W-9)

## Canonical impact

None. CLAUDE.md and README.md are the documents that change; no canonical register is declared.

## Decisions

- DEC-1: Prettier covers the sources of the page, `src/main/editor/**/*.{js,mjs}` (the 69 parts, `theme-boot.js`, `codemirror-loader.mjs`), through the `format` and `format:check` scripts; `.prettierignore` keeps only the generated page. `style.css` stays out: 25 tests read its rules as one-line text (`.button-group button + button { margin-left: -1px; }`), and Prettier would write each declaration on a line. `page.html` stays out (its include lines are not HTML Prettier can keep).
- DEC-2: the formatting is one commit of formatter output (`style:`), with the page rebuilt in the same commit so that every commit has a page equal to its assembly. `scripts/check-editor-moves.sh` does not look at a `style:` commit.
- DEC-3: Prettier changes the page (23,219 lines to 30,876), so `--check-identical` cannot prove it. The proof is the whole of the suites: node, coverage, lint, Java with the integration tests, e2e. Six tests matched the page text on one line or within 8 lines; their expressions now allow white space between tokens (five tests, then one more) and the window of the `modelsChanged()` test is 12 lines. No test of the comparison with the page of a release was touched.
- DEC-4: the coverage unit is a line whose first character ran, so a ternary or a call on several lines has lines that never run. The `editing` area went from 90+ to 89.49 %, under its floor of 90. The floor is not lowered: a test (`delete-confirmation-form.test.js`) runs the Confirm delete block of the form, which was not run by the node suite (e2e only), and `editing` is at 92.57 %. `--write-floor` raised `pages` (83.8 to 87.1 % of the lines) and `other` (75 to 76.4 % of the functions, 88.1 to 90 % of the lines). The `SECTIONS` markers are comments at the start of a line, kept by Prettier, and match once in the assembled page: no change to the script.
- DEC-5: lint is unchanged: it extracts the three inline scripts of the assembled page, whose lines are the lines of the page (`--where` maps them to a part), with `no-control-regex` off for the page as before. Zero findings.
- DEC-6: CLAUDE.md is changed where it was stale (`unsorted`, "today one part", 162, "not covered yet") and says the layers, the 69 parts, the redraw contract, the commit kinds and the check scripts. README.md gets a short section "Editor sources" (the manual in `src/doc` is for readers of the tool and has no contributor section; the editor page is described there as one page, which stays true).
