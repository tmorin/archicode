---
type: run
run: 0167
status: completed
wave: 023
profile: single-document
---

# Run 0167: prettier-scripts-and-java-in-ci

Single-document profile (as runs 0164 to 0166: the wave plan holds the requirements and the design). Wave 023, W-4, issue #160 steps 1 and 2 (config only), Q2, T1, T4, V-E. No repository file other than tooling config is rewritten; the 118 JavaScript test files wait for W-5.

## Scope and decisions

- **Scripts.** `package.json` gains `"private": true` and two scripts: `format` (`prettier --write "src/**/*.java"`) and `format:check` (`prettier --check "src/**/*.java"`). Dependencies and `package-lock.json` are unchanged (`prettier` 3.9.9, `prettier-plugin-java` 2.11.0; `npm ci` is clean, 0 vulnerabilities). W-5 adds the JavaScript globs to both.
- **CI.** Three steps in the `Build` job of `ci-build.yaml`, after "Set up Node.js" (which gains `cache: "npm"`): "Install the Node.js dependencies" (`npm ci`; there was no install step at all, the node suite needs no package), "Check the format" (`npm run format:check`), then the existing tests. The step name matches the CLAUDE.md "Build & Test" heading text for the command. `CLAUDE.md` replaces the raw `npx prettier --write` with the two scripts and says the JavaScript tests are added by W-5.
- **`.prettierignore`** (new): `standalone.html` (#161), `src/site/`, `node_modules/`, `target/`, `src/main/wasm/`, the kernel's `target/`.
- **Q2, options for JavaScript** (override for `*.js` and `*.mjs` in `.prettierrc.yaml`): `singleQuote: true`, `printWidth: 120`, `trailingComma: none`; `semi`, `tabWidth` (2), `arrowParens`, `bracketSpacing` stay at Prettier's defaults (each non-default was measured and is worse, below). Confirmed that the config, applied to a copy, gives byte for byte the same file as the measured candidate.

## Q2 measurement

Scratch copy of `src/test/javascript` (119 `.js` files, 37,422 lines; 113 tests and 6 helpers); `prettier --no-config --write` with the flags shown, tab width 2. "Lines" is `diff -r | grep -c '^[<>]'` (removed plus added lines); the repository was not touched.

| quotes | width | trailing comma | lines changed | files changed |
|---|---|---|---|---|
| single | 120 | none | **28,405** | 117 |
| single | 120 | es5 | 28,854 | 116 |
| single | 120 | all | 28,930 | 116 |
| single | 100 | none | 39,757 | 119 |
| single | 100 | es5 | 40,141 | 119 |
| single | 100 | all | 40,229 | 119 |
| double | 120 | none | 53,881 | 119 |
| double | 120 | es5 | 53,998 | 119 |
| double | 120 | all | 54,052 | 119 |
| double | 100 | none | 62,547 | 119 |
| double | 100 | es5 | 62,663 | 119 |
| double | 100 | all | 62,743 | 119 |

Variations on single / none: width 120 tab 4: 73,440; arrowParens avoid: 30,347; no bracket spacing: 34,672; no semicolons: 70,072; width 140: 21,189; width 160: 16,311. The chosen set is the best of the candidate grid of the brief (single quotes, 100/120, no trailing comma). Wider widths change fewer lines still (the code has many lines past 160 columns); 120 was kept because it is the Java width and what the wave plan says the code is written to. If the author prefers the least churn, 140 saves 7,200 lines.

## Other JavaScript

`git ls-files`: 119 `.js` (all under `src/test/javascript`: 113 `*.test.js` and 6 helpers `harness`, `layered-folders`, `library-page`, `mem-folder`, `save-generator`, `story-player-page`), 3 `.mjs` (`src/test/resources/brightcart/description.mjs`, `generate.mjs`, `src/test/resources/replaces-large-pair/generate.mjs`), 2 `.html` (`standalone.html`, `src/site/index.html`). Nothing JavaScript under `src/main/resources` but the page, and no vendored file.

- The 6 helpers change by 37 to 292 lines each with the chosen options (harness 199, library-page 175, save-generator 292, story-player-page 163, mem-folder 49, layered-folders 37).
- The 3 `.mjs` generators: 2,384 lines changed (2,752 lines in all).
- `standalone.html`: Prettier would take it from 23,189 to 41,732 lines (64,535 changed lines) and `--check` fails on it; out (#161).

**File set decided for W-5:** `src/test/javascript/**/*.js` (113 tests and the 6 helpers, 119 files; the 118 of the issue were counted before one more was added or counted differently, the measure here is 117 changed of 119) plus `src/test/resources/**/*.mjs` (3 generators). W-5 formats the `.mjs` in the same commit, and must re-run both generators and show `git status` clean for the fixtures they write (formatting a generator cannot change what it writes, the run shows it). Globs for the scripts: `"src/**/*.java" "src/test/javascript/**/*.js" "src/test/resources/**/*.mjs"`. Out: `standalone.html`, `src/site/index.html`, JSON, YAML, Markdown, Asciidoc.

## T4: the check fails on a wrong file

`printf '\nclass   Wrong{ int  x ;}\n' >> src/main/java/io/morin/archicode/ArchiCodeException.java; npm run format:check`: `[warn] src/main/java/io/morin/archicode/ArchiCodeException.java`, exit 1. Restored from a backup (`git diff` empty for the file); `npm run format:check`: exit 0.

## Verification

- `./mvnw verify -DskipITs=false` (JDK 25): exit 0, 39 integration tests, 0 failures, BUILD SUCCESS.
- `cargo test`: exit 0, 240 passed. `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`: exit 0. `embed.sh --check`: exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: exit 0 (run after Maven, never together).
- `npm run format:check`: exit 0 on the tree as it is.
- `git status`: only `ci-build.yaml`, `.prettierrc.yaml`, `CLAUDE.md`, `package.json`, `.prettierignore` and this folder (plus the orchestrator's wave files, untouched by this run). `package-lock.json` unchanged. Not run: the CI step on a runner (`actions/setup-node@v4` `cache: npm` and `npm ci` there); T1 byte-identity needs no sweep since no source, resource or output moved.

## Canonical impact

Canonical text changed: CLAUDE.md ("Build & Test": the two scripts replace the raw command) and `ci-build.yaml` (three steps, the npm cache). No architecture-level impact: no component, contract or flow changed.
