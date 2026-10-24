---
type: run
run: 0169
status: completed
wave: 023
profile: single-document
---

# Run 0169: eslint-javascript

Single-document profile (as runs 0164 to 0168). Wave 023, W-6, issue #160 step 4, Q3, T1, T4, T8, T9, V-C, V-E. The review passes of the trio were done against this one document: the scope below is the plan row of W-6, the open question (Q3) was decided by the author and is applied as written, and the consistency check is the table of findings against the files on disk.

## Scope and decisions

- **ESLint 10.12.0** (released 2026-10-02, 22 days before the run), `@eslint/js` 10.0.1 and `globals` 17.12.0, all pinned exactly in `devDependencies`; `package-lock.json` committed; CI already runs `npm ci`. 10.13.0 (2026-10-16) was left out: less than two weeks old.
- **Rules (`eslint.config.mjs`, flat config).** ESLint's recommended set (`@eslint/js`: `no-undef`, `no-unused-vars`, `no-redeclare`, `no-dupe-keys`, `no-unreachable`, `no-empty`, `no-useless-escape`, `no-control-regex`, `no-regex-spaces`, `no-irregular-whitespace`, `no-constant-condition`, `no-useless-assignment`, `preserve-caught-error`, ...) plus `no-shadow` and `eqeqeq`. None is about layout, quotes or semicolons (Prettier's). `no-unused-vars` is set to `args: none, caughtErrors: none`: an ignored callback argument or an unused `catch (e)` is not a bug (this is an option, not a rule turned off; the page has dozens of `catch (e)` that ignore `e`). The first run of the four rules named by the plan found 49 findings in the tests and 20 in the page; the recommended set was added because it found 30 + 39 more, all of them cheap to read, and none of them noisy except one (below).
- **What is linted.** `src/test` (119 CommonJS tests and helpers; the 3 `.mjs` generators as ES modules), `eslint.config.mjs`, `scripts/`, and `target/eslint-editor/*` (the extracted scripts of the page). Browser globals come from the `globals` package for the page; the classic scripts are `sourceType: script`, the CodeMirror loader `module`. `no-undef` is on everywhere and found nothing.
- **The extraction (`scripts/extract-editor-script.mjs`, documented in its header).** Copies the three executable inline blocks of `standalone.html` (`theme-boot.js`, `module.mjs`, `page.js`; the base64 `application/octet-stream` data block is left out) to `target/eslint-editor/` (git-ignored with `target/`), each padded with blank lines so a line of the copy is the line of the HTML (checked: a seeded error on line 1030 of the HTML is reported at `page.js:1030`). It fails when it does not find exactly three scripts. `npm run lint` = extraction, then `eslint --max-warnings 0`.
- **CI.** Step "Lint the JavaScript" in `Build`, after "Check the format". `format` and `format:check` now also cover `eslint.config.mjs` and `scripts/**/*.mjs`.
- **T8/T9.** No baseline file. One rule is off, with its count and reason written in the config (see the table).

## Findings by rule, before and after

All rules above, over the tree as it was at the start of the run (tests = `src/test`, including the generators; page = the three extracted scripts).

| Rule | Tests before | Page before | After | How |
| --- | ---: | ---: | --- | --- |
| `no-undef` | 0 | 0 | 0 | |
| `no-unused-vars` | 25 | 6 | 0 | unused requires, helpers, constants and destructured names removed; in the page: `indentOf`, `wordsOf` (two aliases), `rewriteReferencePrefix` (a dead function and its comment) and the destructured `record`, `shows`, `hideUnlinked` of the diagram draw |
| `no-shadow` | 23 | 7 | 0 | inner names renamed (tests); page: `styled` (a parameter of the save), `i` and `j` (a callback and a helper of the comment matching), `e` twice (a `catch (e)` inside `handleAppClick(e)`), `field` twice (a parameter named like its function) |
| `eqeqeq` | 1 | 7 | 0 | `x == null` became `x === null \|\| x === undefined`, `x != null` became `x !== null && x !== undefined`, on plain variables and properties |
| `no-control-regex` | 7 | 16 | tests 0; page 16 off | tests: `.some()` over the code points instead of a regex; page: rule off, see below |
| `no-useless-escape` | 8 | 8 | 0 | `[\[{]` to `[[{]`, `[,\[\]{}]` to `[,[\]{}]`, `[\/\\]` to `[/\\]` (same set of characters) |
| `no-regex-spaces` | 10 | 0 | 0 | ` {2}` instead of two spaces in a regex |
| `no-useless-assignment` | 1 | 11 | 0 | `let x = null;` became `let x;` where the initial value is overwritten on every path (ESLint's flow analysis); one dead assignment removed in a test |
| `no-irregular-whitespace` | 1 | 3 | 0 | a literal byte-order mark in the page's `/^<BOM>/` is now `/^﻿/` (the page already wrote it that way elsewhere); an em space in a test regex is now ` ` |
| `no-constant-condition` | 2 | 0 | 0 | `a > b ? a : b` on constants is `Math.max(a, b)` (tests, same value) |
| `no-redeclare` | 0 | 1 | 0 | `isPlainObject` was declared twice with the same body; the second is deleted |
| `preserve-caught-error` | 1 | 0 | 0 | `{ cause: e }` added to the error the seed generator rethrows |
| **Total** | **79** | **59** | **0** | |

138 findings, 122 fixed, 16 left by one rule turned off.

## Rule turned off (T9)

- **`no-control-regex`, in the editor script only, 16 findings** (lines 2066, 2404, 2418, 2790, 2818, 2911, 2912, 3023, 3065, 3082, 3218, 3472, 3495, 3503, 4002, 14758 of the page before the run). They are the point of the code: the YAML save puts marks `\u0001` to `\u0007` in the text while it rewrites a line and finds them again, the class `\u0000-\u001f` decides whether a scalar needs quotes (the same rule as the command line's emitter), and a NUL joins the parts of a change key. A rewrite as code points would be a change of the bytes the editor writes, which T1 forbids proving by anything but the node suite and the comparison with the released page; the rule has nothing to say about them. The reason is written in `eslint.config.mjs`. The same rule is on for the tests, where the 7 findings were fixed.

## Bugs found

None that changed behaviour. What the rules showed is dead code, not defects: `rewriteReferencePrefix` was never called (the code calls `rewriteUiReferences` directly; the function was a wrapper of it that also rendered), `isPlainObject` was declared twice with the same body (a function declaration: the second won, identically), and two aliases in the comment matching were unused. No undefined name, no duplicate key, no unreachable code, no assignment in a condition, no fall-through.

## Edits in the page (T1)

Only renames, deletions and equivalent spellings, made one rule at a time, each followed by `npm run test:unit` (2576 tests): `no-useless-escape` (green), `no-useless-assignment` (green), `no-unused-vars` and `no-redeclare` (green), `eqeqeq` (green), `no-shadow` and `no-irregular-whitespace` together (green). The save comparison with the previous release page (`save-keeps-quotes-and-comments.test.js`, `delete-plateau-as-released.test.js` and the other tests that open the pages of the tags) is part of that suite. The diff of `standalone.html` is 41 lines added and 63 deleted (`git diff --numstat`), all outside the base64 `.wasm` block; `embed.sh --check` passes.

## Verification

- **Gates (JDK 25 for Java and Maven):** `./mvnw verify -DskipITs=false` exit 0 (1380 unit tests, 2 skipped as before; 39 integration tests, 0 failures); `cargo test` exit 0 (240 passed); `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` exit 0; `embed.sh --check` exit 0 (the committed `.wasm` is the one the sources build); `npm run test:unit` 2576 of 2576 pass (also after each page rule, and at the end); `npm run format:check` exit 0; `npm run lint` exit 0.
- **T4/V-E, a seeded error in a test file:** `const seededUnused = 1; console.log(seededUndefinedName);` appended to `viewpoint-kernel/discovery.test.js`: `npm run lint` printed `no-unused-vars` and `no-undef` at 329:7 and 329:37, exit 1. Restored from a copy (`git diff` of the file is empty for that line).
- **T4/V-E, a seeded error in the page's script:** `const seededPageUnused = seededUndefinedName;` inserted after line 1029 of `standalone.html`: `npm run lint` printed the same two rules at `page.js:1030` (= line 1030 of the HTML), exit 1. The page was restored from a byte copy (`cmp` identical) and `npm run lint` exited 0.
- **V-C byte identity:** `scripts/byte-identity.sh --no-build` on the fresh `target/quarkus-app` against the jar of `archicode-0.19.0`, with the exceptions file as the earlier runs left it (W-1 and W-2 sentences; this run adds none): exit 0: 20 workspaces, 332 commands compared, 330 identical, 1 accepted (the self-check's dangling-reference sentence), 0 unexpected, self-check ok. The Java side was `./mvnw verify -DskipITs=false` just before, so `target/quarkus-app` carried the edited page.
- **Generators (T1):** `node src/test/resources/brightcart/generate.mjs` and `.../replaces-large-pair/generate.mjs` re-run after the renames: exit 0, `git status` lists only the two `.mjs`, so every fixture they write is byte-identical.
- **Not verified:** the CI step itself on a runner (the workflow was edited, not run); Node 22 (CI) against ESLint 10 was not run, the machine has Node 24 (ESLint 10 supports `^20.19 || ^22.13 || >=24`, and `actions/setup-node` with `22` resolves to a 22.x above 22.13).

## Canonical impact

Canonical text changed: CLAUDE.md "Build & Test" (a paragraph and the command for `npm run lint`, the coverage of `format:check`) and the `Build` job of `ci-build.yaml`. No architecture-level impact: no component, contract or flow of the application changed; the editor page changed only by renames, deletions and equivalent spellings.
