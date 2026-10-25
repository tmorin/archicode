---
type: run
run: 0175
status: completed
wave: 023
profile: single-document
---

# Run 0175: e2e-suite

Single-document profile (as runs 0164 to 0174). Wave 023, W-13, Q7, Q8, T5, T11, V-I, V-E. The end-to-end suite of the editor, written with Playwright's test runner (the choice of run 0174), run by `npm run test:e2e` and by the `Build` job.

Scope as the brief and the plan row of W-13 give it, and the review passes of the trio done against this document: the open questions are none (Q7 was answered by 0174; Q8 is shortened below with a reason for each cut), and the consistency check is the list of the Q8 flows against the specs below, flow by flow.

## Answer in six lines

1. **The suite is in `src/test/e2e/` and runs with `npm run test:e2e`**: 17 tests in five spec files, each run on Chromium and on Firefox (34 tests), one worker, no retry, against `archicode editor serve` started from `target/quarkus-app/quarkus-run.jar` on a free port, on a copy of a shipped example (or of a small workspace the spec writes) in a temp folder, one server and one copy per test.
2. **Green three times in a row** on this machine (34 passed each: 1.7, 2.4 and 2.0 minutes at a load average of 3 to 4; 1.2 minutes at a load below 1), after `./mvnw verify -DskipITs=false` had rebuilt the jar. It **fails on a seeded break** of the page and names the step and the spec line (below); a failure leaves a screenshot, a video, a trace and `error-context.md`.
3. **No file of the page changed** (`cmp` with the copy taken at the start: identical; `git status` shows nothing under `src/main`), and `scripts/byte-identity.sh --no-build`: 20 workspaces, 332 commands, 330 identical, 1 accepted by the exceptions file, 0 unexpected, self-check ok.
4. **CI**: five steps in `Build` after "Keep the Java coverage report" (version, cache, install, run, upload on failure); estimated cost 3 to 6 minutes cold and 2.5 to 4.5 with the browser cache (the tests dominate: about 2 minutes here; a hosted runner is slower per core: the pull request's CI run is the measure).
5. **WebKit is not a project** (reason below). **One finding, no editor bug**: nothing new beyond #166.
6. **What it does not test**: the browser's folder picker and what hangs on it, the real Safari and the stock Firefox, the native runner, a GitHub runner (not run from here).

## What was built

- `package.json`, `package-lock.json`: `@playwright/test` **1.64.1 exact** in `devDependencies` (the lock gains `@playwright/test`, `playwright`, `playwright-core`: 14 MB + 5 MB, nothing else); scripts `test:e2e` (`playwright test`); `format` and `format:check` cover `src/test/e2e/**/*.js` and `playwright.config.js`; `lint` covers `playwright.config.js` (`src/test` was already in it, so the e2e files too).
- `playwright.config.js`: `testDir: src/test/e2e`, `outputDir: target/e2e/test-results`, `workers: 1`, `fullyParallel: false`, `retries: 0`, `forbidOnly` on CI, test timeout 60 s, `expect` 10 s, `actionTimeout` 15 s (a click on something that never appears fails in 15 s naming the locator, not at the end of the 60), reporters `list` and `html` (`target/e2e/report`, never opened), trace, screenshot and video `retain-on-failure`, projects `chromium` and `firefox`. `target/` is already git-ignored, so no `.gitignore` change.
- `src/test/e2e/harness.js` (about 110 lines with the comments): `startServer(example, files)` makes a temp folder, copies the example, writes the given files over it, asks the operating system for a free port, spawns `<JAVA_HOME>/bin/java -jar <jar> editor serve --host 127.0.0.1 -p <port> -w <copy>/.archicode.yaml`, reads its output until `editor serve is up and running: <url>` (the token is in the URL), and returns `{ url, dir, read, write, exists, stop }`; `stop` kills the server and deletes the copy. A start that exits or takes 60 s is an error that prints what the process said. `ARCHICODE_E2E_JAR` names another build (how the suite is shown to fail; the spawn line is the one place to change for the native runner). Nothing is left behind: after the runs there is no `/tmp/archicode-e2e-*` folder and no `editor serve` process.
- `src/test/e2e/fixtures.js`: Playwright's `test` with the fixture `serve` (a start has a 120 s fixture timeout of its own, so a slow JVM start on a busy machine does not use the test's; every server it started is stopped when the test ends) and the **automatic** fixture `pageErrors`, which fails any test whose page says an error on the console or throws. The one exception is the `/favicon.ico` resource, with a comment that names #166.
- `src/test/e2e/workspace.js`: the small workspace of the specs (`CORNER_SHOP`: a comment above a list item, a trailing comment, a double-quoted and a single-quoted string, a person and a relationship) and `changedLines`.
- Five spec files (named `.spec.js`, in `src/test/e2e/`, which neither the unit suite's glob `src/test/javascript/**/*.test.js` nor the coverage script's `SUITE` can pick up).

## The flows: kept and cut

| Flow of Q8 | Spec and test | Kept as | Reason for the shape |
| --- | --- | --- | --- |
| Open a served folder; the landing/error card | `open-and-pages`: a folder without `.archicode.yaml` | The card, its two buttons, then **Try again** after the file is written by another process | The card and its buttons are DOM; *Try again* is a click handler and a re-read through the server handle |
| The six pages load with no console error | `open-and-pages`: the pages of a shipped example | One test walks Applications, Environments, Elements, Plateaus, Stories, Files and Settings by their buttons on `domain_plateaus`, each at its address and with a mark of its content; a second draws Environments on `domain_technology_map` (the first example has no technology) | One server for the seven pages (a test per page would start seven JVMs for nothing); the console check is the automatic fixture, on every test |
| Edit a description and save, read the file | `edit-and-save`: name and description; the layered two-click save | On the small workspace: name and description change, **exactly those two lines differ**, the trailing comment, the quotes of the neighbours and the other two files are byte for byte; on `domain_plateaus`: the first *Save all changes* asks, **Cancel writes nothing and gives the form back**, the second asks again and *Write in baseline* leaves `Save all changes (1)`, one more click writes one line | The two clicks of a layered example are the real UX (run 0174), said in the test; the small workspace carries the comments the examples lack |
| Create an element | `edit-and-save`: creating a child element | *Add child*, the form, *Create*, *Save all changes*; the file is the old text followed by the new element, the address names it | |
| Rename with the dialog | `edit-and-save`: renaming an element | `web` to `site` on the layered example: the dialog *Writing in baseline changes other plateaus*, *Write in baseline*, the second click; then the story `story.migration.yaml` and the patches of `plateau.to-be.yaml` name `shop.site`, and no manifest names `shop.web` | The dialog is a `role="dialog"` with focus; the follow-through in other files is the contract |
| (not in Q8) Cancel and leaving a form | `edit-and-save`: two tests | The page's own `confirm()` boxes (*Cancel and discard what you typed*; *what you typed in this form has not been saved*) answered by the test, with *No* the form keeps its text, with *Yes* the folder is read again | Browser dialogs are exactly what Node cannot show; Playwright dismisses them unless a test answers |
| Draw a view and see its boxes | `diagram-and-compare`: a view of an element | Elements, Shop, *Detailed*: the boxes `shop`, `shop.web`, `shop.catalog`, `customer`, the link `shop.web` to `shop.catalog`, the status line; a click on a box selects the element (the inspector on the right says `shop.catalog` and its description) | The SVG in a real page; the click goes through the delegated handler |
| Compare two plateaus; the Changes panel | `diagram-and-compare`: comparing two plateaus | The band's two lists, the address `plateau=to-be`, the marked box `contains-changes`, "14 changes", the cascade of the removals, the Plateaus page, and the **keys `j` and `k`** that walk the changes (the selected change, `aria-current`, and the address follow) | The figures are the table `PlateauComparisonTest` pins for the example; the keys are a document listener that needs a real focus |
| Play a story in the player (keys, Escape, focus) | `story-player`: three tests | Play, the dialog and its address `play=migration&step=0`, `#app` made `inert`, Right, End, Home, Escape; the focus back on *Play*; the menu of the steps; twelve Tabs that stay in the player; Back closes it and Forward reopens it at its step; a link to a step opens it; a changed step is drawn with its comparison key | Focus, `inert`, the history and the keys are all browser; what each step draws is compared box by box in Node (`story-player-modal.test.js`) |
| The address opens the right page; Back and Forward | `address`: three tests | A link to an element opens it and a reload comes back; an address that is no page (`#/map`) opens Applications and is written back; Back and Forward walk Applications, Elements, Files | The history is the browser's |

Cut, with the reason: **a rename that the dialog of sibling plateaus questions** (`rename-siblings`): it needs two plateaus that do not stand on each other and a view or a story that names the element, and no shipped example has them (the Brightcart fixture does, but it is not a shipped example and the harness would need a second source); the unit suite proves it (`move-sibling-plateaus.test.js`, `rename-sibling-plateaus.test.js`) and the page's dialog is the same markup as the `layer-confirm` dialog this suite does click. **A saved view of `viewpoint: map` on Environments with applications and relationships toggled**: Q8 does not list it and the unit suite compares the boxes and links with the command line (`expected-boxes.json`). Nothing in Q8 was dropped for flakiness.

## Browsers: WebKit is not a project

Decision: **Chromium and Firefox**. WebKit was driven by run 0174 only after three system libraries were copied by hand; on this machine (no `sudo`) the suite cannot be run on WebKit, so I could not verify a project I would be adding, and CI `--with-deps` is documented but untried. Playwright's WebKit is not Safari, the editor is written for Chromium's File System Access API, and the cost is 293 MB of browser (25 s) plus the three libraries on every contributor's machine. The hosted editor (#162) is what needs the third engine: it is one more project in `playwright.config.js` and the word `webkit` in the install command (both written in the config's comment and in CLAUDE.md).

## Evidence

**V-I (a): seeded breaks make the suite fail with the step and the file named.** The page is inside the jar, so the break is made in a **copy** of `target/quarkus-app` whose `standalone.html` is rewritten (`ARCHICODE_E2E_JAR=<copy>/quarkus-run.jar`); `src/main/resources/editor-webapp/standalone.html` is not touched (`cmp` with the copy taken at the start: identical at the end, `git status` clean under `src/main`).
1. A renamed `data-action` (`save-all-changes` to `save-all-changez`, 4 occurrences), `npx playwright test edit-and-save --project=chromium`: 4 of 6 tests fail in 16 s each, with `TimeoutError: locator.click: Timeout 15000ms exceeded. Call log: - waiting for locator('[data-action="save-all-changes"]')` and the source: `> 33 | await page.locator('[data-action="save-all-changes"]').click();` at `src/test/e2e/edit-and-save.spec.js:33:58` (the test title says the flow: "editing a name and a description rewrites those two lines..."). The two tests that never press that button (the two confirm boxes) pass.
2. A save that writes the wrong line (the bytes the server handle `PUT`s have `id: "web"` rewritten to `id: "wev"`), the same test: it fails in 1.4 s with `expect(received).toEqual(expected)` and `+     "      id: \"wev\"",` as the one line that should not be there, at `edit-and-save.spec.js:38:68`, over the `- Expected / + Received` diff.
**(b) Three consecutive green runs of the unchanged tree**, `npm run test:e2e`, after `./mvnw verify -DskipITs=false` (jar of 19:26): run 1 34 passed, 1.7 min (wall 1 m 43 s); run 2 34 passed, 2.4 min (wall 2 m 25 s); run 3 34 passed, 2.0 min (wall 2 m 0 s); load average 3.0 to 4.4 from the author's other work and the build of the run; no retry, no flaky line. During the writing of the specs the whole suite ran six more times green (1.2 minutes at a load below 1).
**(c) Chromium and Firefox both**: each test runs under both projects (34 = 17 x 2); per-test times 1 to 2 s on Chromium, 2 to 4 s on Firefox.
**(d) A failing assertion leaves its files**: in the second break above, under `target/e2e/test-results/edit-and-save-editing-a-na-cfb89--keeps-the-rest-of-the-file-chromium/`: `test-failed-1.png` (89 KB), `video.webm` (109 KB), `trace.zip` (1.3 MB, `npx playwright show-trace`) and `error-context.md` (14 KB, the page as an accessibility tree and a prompt for an agent); and the report `target/e2e/report/index.html` with `data/` and `trace/`.
**Lint and format have teeth over the e2e files** (V-E): an unused variable, an undefined name, `==` and an empty block appended to `src/test/e2e/address.spec.js` give `npm run lint` exit 1 with four findings (`no-unused-vars`, `no-undef`, `eqeqeq`, `no-empty`) at the lines; badly formatted code gives `npm run format:check` a `[warn]` for that file and exit 1; the file was restored (`cmp` with its backup) and both commands are green again.
**The unit suite does not see the specs**: `src/test/javascript/**/*.test.js` is the glob of `test:unit` and `SUITE` of the coverage script; the specs live in `src/test/e2e` and are named `.spec.js`.

## CI

Steps added to `Build` of `.github/workflows/ci-build.yaml`, after "Keep the Java coverage report" and before "Publish snapshot artifacts" (so the jar of `./mvnw verify` is there; `JAVA_HOME` is set by `actions/setup-java` and the harness uses it, as the shell's `java` on a runner is not 25):
1. "Find the Playwright version": `node -p "require('@playwright/test/package.json').version"` into a step output (the lock pins it, `npm ci` installed it).
2. "Cache the Playwright browsers": `actions/cache@v6` (the version this file already uses), `~/.cache/ms-playwright`, key `<os>-playwright-<version>-chromium-firefox`.
3. "Install the browsers of the end-to-end tests": `npx playwright install --with-deps chromium firefox` (the revisions are the pinned version's; a cache hit downloads nothing, `--with-deps` runs apt either way).
4. "Run the end-to-end tests": `npm run test:e2e`, `id: e2e`.
5. "Keep the end-to-end results": `actions/upload-artifact@v7.0.2` of `target/e2e` as `e2e-results`, `if: failure() && steps.e2e.outcome == 'failure'` (a failure of an earlier step does not upload an empty artifact), 7 days. No server of ours, no token, no secret, no paid plan.
The YAML parses (`yaml.safe_load`; the step names in order are as above). **Estimate, not measured on a runner**: browser download 30 to 60 s on a runner plus apt 10 to 30 s (cold), 15 to 25 s for the cache restore and the same apt (hit); the tests 1.2 minutes here at a low load and 2 minutes at a load of 3 to 4, so 2 to 3 minutes on a hosted runner (a JVM start per test); in all **about 3 to 6 minutes cold and 2.5 to 4.5 with the cache**. The pull request's CI run is the measure.

## Gates (all run at the end, on the final tree)

| Gate | Result |
| --- | --- |
| `./mvnw verify -DskipITs=false` | BUILD SUCCESS, 8 m 29 s: 1492 unit tests (0 failures, 2 skipped), 39 integration tests, the JaCoCo checks met |
| `cargo test`; `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`; `embed.sh --check` | pass; pass; "the committed WebAssembly is the one the sources build (794741 bytes)" |
| `npm run format:check`; `npm run lint` | pass; pass |
| `npm run test:coverage` | 2580 pass, 0 fail, 1 skipped; 92.67 % of the lines and 96.18 % of the functions (as at the end of run 0173), the floor holds; 4 m 32 s |
| `npm run test:timing` | pass (11.4 and 13.8 times, the limit is 16) |
| `npm run test:e2e` | 34 passed, three times (above) |
| `scripts/byte-identity.sh --no-build` (V-C) | 20 workspaces, 332 commands, 330 identical, 1 accepted by the exceptions (the self-check line), 0 unexpected, self-check ok; 20 m 20 s |

## Findings (for the wave; nothing was fixed)

1. **No editor bug beyond #166.** The `/favicon.ico` 404 is still there, and the suite's one exception for it is commented with the issue: it is dead code in Playwright's headless shell and in its Firefox (neither requests the icon), and live in a full Chromium (`channel: 'chromium'`), which the suite does not use; remove it when #166 is fixed.
2. **Playwright dismisses `confirm()` boxes unless a test answers them.** Two flows of the page rest on native `confirm()` (Cancel, leaving a form with typed text); an e2e test that does not register a `dialog` handler silently takes "No". The two tests that cover them register one.
3. **The element form on a layered workspace writes in two clicks of one button** (said by 0174, kept as the test of the real flow). The unlayered workspace writes at the first.
4. **The files of a rename are written one after the other**: a test that reads the second file right after the first changed saw the old text on Firefox (my first version of the rename test failed there, once, at the `to-be` patches); the test now waits for the last file with `expect.poll`. That is a property of the page (a write of several files is not atomic), not a flake of the suite: a reader who closes the folder in the middle sees a half-renamed workspace, which the page's own checks name when it is opened again.
5. **A step of the migration story draws "Nothing to show"** for `warehouse` in `to-be`: "Overview of warehouse — 1 item, 0 links" and the message "this element has no relationships (the deep viewpoint includes what is inside it)". It is the shipped example's step 3 ("The inventory moved to the warehouse"), so the step the author wrote to show a move shows an empty slide in the overview. Not a bug of the code (the overview draws relationships), but the example's step may want the `detailed` viewpoint; the author to decide.
6. **Cost note**: Playwright's `html` reporter writes a 0.5 MB `index.html` and the traces next to it on every run (also a green one); it is under `target/` and uploaded on failure only.
7. **The machine**: load average 3 to 5 during the gates (the author's other sessions). The suite is serial and passed at that load; the Firefox timeouts of 0174 came from `--workers=4` at a load of 13.

## Files outside the manifest's `likely_paths`

W-13's `likely_paths`: `package.json`, `package-lock.json`, `src/test/e2e/**`, `scripts/**`, `eslint.config.*`, `.prettierignore`, `.github/workflows/ci-build.yaml`, `CLAUDE.md`. Touched outside them: **`playwright.config.js`** (a new file at the repository root: Playwright reads its config from there by default; `npm run test:e2e` could name another path with `-c`, but the root is the convention and the format and lint globs name it). Nothing else: `scripts/` and `.prettierignore` are unchanged, and no file under `src/main`, `pom.xml` or the Rust is touched. The two wave files are not written.

## Not verified, and why

- **The CI run on a runner** (the install, the cache, `--with-deps`, `JAVA_HOME` from `setup-java`, the upload): a workflow cannot be dispatched from here. The YAML parses; the commands are the ones run here.
- **WebKit** and **the packaged native runner** (not built here).
- **Playwright with the stock Firefox and Safari** (it drives its own builds).
- **A cache hit** (the key, the restore time).

## Tasks (the document's own list)

| Task | Status |
| --- | --- |
| T1 Dependency pinned exact, lock | done |
| T2 `playwright.config.js` | done |
| T3 Harness and fixtures | done |
| T4 Specs for the flows of Q8 (five files, 17 tests) | done |
| T5 Prettier and ESLint cover the files; seeded findings | done |
| T6 CI steps | done (not run on a runner) |
| T7 Seeded breaks, three green runs, both browsers, failure files | done |
| T8 CLAUDE.md | done |
| T9 Gates and V-C | done |

## Canonical impact

**`CLAUDE.md`, "Build & Test"** (done in this run): the line of `npm run test:unit` no longer says that an e2e suite comes later; a line for `npm run test:e2e`; and one paragraph, "End-to-end suite", after "Maven needs no Rust", which names the two suites (`npm run test:unit` / `npm run test:coverage`: unit and integration; `npm run test:e2e`: end to end), the folder `src/test/e2e`, `npx playwright install --with-deps chromium firefox` once, the harness and its copy per test, the flows, the cut, one worker and no retry, where a failure leaves its files, `ARCHICODE_E2E_JAR` and `JAVA_HOME`, the CI steps, the lint and format coverage, and what the suite does not test (the folder picker and what hangs on it, the real Safari and the stock Firefox, the native runner). **No architecture impact**: no class, contract, key or sentence of the product changed, and `src/main` is byte-identical (V-C above).

## Progress log (written as it happened)

- 2026-10-25 start. Read run 0174, the plan row, Q7, Q8, T5, T11, V-E, V-I and the prg. JDK 25 from sdkman, Node v24.12.0. `@playwright/test` 1.64.1 added with `npm install --save-dev --save-exact`; Chromium 156 and Firefox 157 installed (1 m 16 s here).
- Exploration of the page with throwaway scripts (outside the repository) gave the selectors: `data-action` buttons, `#edit-id-input`, `#edit-name-input`, `#edit-description-input`, `#create-*-input`, `#band-plateau`, `#band-compare`, `g.dg-node[data-ref]`, `g.dg-link[data-from][data-to]`, `#panel-right`, `#story-player` and `[data-player-action]`; and two facts that shaped the specs (the `confirm()` boxes, the empty overview of `warehouse`).
- Spec files written one at a time and run on both browsers: `open-and-pages` 6 green; `edit-and-save` 12 (one failure on Firefox found the non-atomic multi-file write, fixed in the test); `diagram-and-compare` 4 (two wrong guesses of the page's words fixed); `story-player` and `address` 12 (one wrong guess of the step's picture fixed). Whole suite 34 green, 1.2 minutes.
- Wiring: package.json scripts, Prettier, ESLint block for `src/test/e2e/**/*.js` and `playwright.config.js` (CommonJS, `globals.node` and `globals.browser`), CI steps, CLAUDE.md, `ARCHICODE_E2E_JAR`, `actionTimeout`.
- Seeded breaks, seeded lint and format findings, three green runs, then the gates and V-C. Leftovers of my exploration (one `editor serve` process and its temp folder, from a script that timed out) were killed and deleted; the suite leaves none.
