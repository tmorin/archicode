---
type: run
run: 0168
status: completed
wave: 023
profile: single-document
---

# Run 0168: prettier-javascript-tests

Single-document profile (as runs 0164 to 0167). Wave 023, W-5, issue #160 step 2, T3, T11, V-C, V-D, V-E. The options are those of run 0167 (`.prettierrc.yaml`), not reopened.

## Scope and decisions

- **One mechanical change.** `prettier --write` on the 119 `src/test/javascript/**/*.js` files and the 3 `.mjs` generators (`src/test/resources/brightcart/description.mjs`, `src/test/resources/brightcart/generate.mjs`, `src/test/resources/replaces-large-pair/generate.mjs`). 121 of the 122 files changed (one was already formatted).
- **Scripts.** `format` and `format:check` take `"src/**/*.java" "src/test/javascript/**/*.js" "src/test/resources/**/*.mjs"`; new `test:unit` = `node --test "src/test/javascript/**/*.test.js"` (T11). The CI step `Test the viewpoint kernel` now runs `npm run test:unit` (same command); `Check the format` already ran `format:check`. CLAUDE.md "Build & Test" uses `npm run test:unit` (with the raw command in its comment) and says what `format:check` covers. `standalone.html` stays out.
- **One edit that is not formatter output, and why.** `brightcart-layered.test.js` (the test "the generator fails when a variant says nothing...") mutates the *source text* of `description.mjs` with a string replace on `    runToday: '**Run** (case N44)`. Prettier breaks that line after `runToday:`, so the replace matched nothing and the test failed (0 !== 1). The search string now carries the line break (`runToday:\n      '**Run** (case N44)`); the test then passes and still tests the same thing. This is the one hand edit of the run, in a file the formatter also reformatted. The commit therefore is "formatter output plus one search string".

## Verification

- **V-D `--debug-check`:** `prettier --debug-check` over the 122 files, exit 0 (AST compared after reformat).
- **Second `--write` is a no-op:** checked by md5 of all 122 files before and after a second `--write`: 0 differences, on the final tree. Finding: on the first pass, `replaces-large-pair/generate.mjs` was not a fixed point (a `.slice(6, 9).forEach(...)` member chain at line 731 changes shape on the second pass: Prettier member-chain instability); the committed file is the second-pass result, a fixed point (a third pass: unchanged). CLAUDE.md says so.
- **Diff scope:** `git status`: 118 test `.js`, the 3 `.mjs`, `package.json`, `CLAUDE.md`, `.github/workflows/ci-build.yaml` and this folder. Total 123 files, +25,004 / -5,780 (30,763 changed lines; run 0167 measured 28,405 for the `.js` alone, plus 2,384 for the `.mjs`).
- **Generators (T1):** `node src/test/resources/brightcart/generate.mjs` and `node src/test/resources/replaces-large-pair/generate.mjs` re-run after formatting (and before): exit 0, `git status --short src/test/resources` lists only the three `.mjs`, so every fixture they write is byte-identical. The test that runs the generator in a copy (`brightcart-layered.test.js`) passes (6/6). The `--sweep` mode of the second generator was not run.
- **T4:** appended `const   wrong = {a:1,"b" :  2}` to `viewpoint-kernel/discovery.test.js`; `npm run format:check`: `[warn] src/test/javascript/viewpoint-kernel/discovery.test.js`, exit 1. Restored from a copy; `format:check` exit 0.
- **What I read for meaning changes:** Prettier does not touch the content of template literals, regular expressions, string contents or comment text (only re-indents comments and wraps code around them), and `--debug-check` compares the AST, which includes all of those. I also searched the tests for code that reads the JS sources as text: the one hit above (`brightcart-layered.test.js`); the other tests read JSON, YAML and the page, not these `.js` files. Long single-line template literals and comments stay long (they are not wrapped).
- **Gates (JDK 25):** `./mvnw verify -DskipITs=false` exit 0 (1380 unit tests, 2 skipped as before; 39 integration tests, 0 failures; run before the one search-string edit, which no Java test reads); `cargo test` exit 0, 240 passed; `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` exit 0; `embed.sh --check` exit 0; `npm run test:unit` exit 0, 2576 tests, 2576 pass (baseline before the change: 2576); `npm run format:check` exit 0.
- **Not verified:** the CI run itself (the `npm run test:unit` in the workflow step); `--sweep` of the large-pair generator.

## Canonical impact

Canonical text changed: CLAUDE.md "Build & Test" (the `test:unit` script, the coverage of `format:check`, the two-pass note) and `ci-build.yaml` (the node suite runs through the script). No architecture-level impact: no component, contract or flow changed; no application behaviour moved.
