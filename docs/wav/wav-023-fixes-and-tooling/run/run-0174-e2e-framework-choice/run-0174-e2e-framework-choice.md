---
type: run
run: 0174
status: completed
wave: 023
profile: single-document
---

# Run 0174: e2e-framework-choice

Single-document profile (as runs 0164 to 0173). Wave 023, W-12, Q7, Q8, T5, T11, V-I. The end-to-end framework for ArchiCode, chosen by trying each candidate on the same two flows against `archicode editor serve`. Research only: nothing in the repository changed but this folder (`git status` shows the same two modified wave files as at the start, and this directory); every trial ran in the scratch folder `/tmp/w12-scratch` (deleted at the end). The review passes of the trio were done against this document: the scope is the plan row of W-12 and Q7 (nothing to resolve, Q7 gives the criteria), and the consistency check is the table below against the rows of each candidate, which are the measured lines.

This is a restart: the first executor was interrupted by an overload and wrote nothing here; its 248 `/tmp/archicode-e2e-*` folders, `~/.cache/puppeteer` (643 MB, rebuilt here so that Puppeteer's download is measured) and `~/.config/Cypress` (created 2026-10-24 22:46, before this run) were deleted.

Measure date 2026-10-25. Machine: Linux 6.8 (Ubuntu), 8 cores, 31 GB, load average 0.5 to 5 from the author's other work (one overload of my own, said below). Node v24.12.0, and v22.23.4 (the tarball of nodejs.org, in the scratch folder) for the Node 22 checks. JDK 25 (`~/.sdkman/candidates/java/25*`). The application: `target/quarkus-app/quarkus-run.jar` of the working tree.

## Answer in five lines

1. **Winner: Playwright, its own test runner (`@playwright/test` 1.64.1, Apache-2.0).** The only candidate that drove Chromium, Firefox **and** WebKit on both flows with no setup problem beyond three system libraries for WebKit (which `--with-deps` installs on CI); 18 of 18 runs green on the three browsers, 60 of 60 in a ten-fold repeat, no sleep in the flows (auto-waiting locators), a trace, a screenshot, a video and a page snapshot written for an agent on every failure, 19 MB of `node_modules`, plain `.js` that Prettier and ESLint read with the repository's own configuration.
2. **Runner-up: WebdriverIO 10.1.0** (MIT): Chrome and Firefox, 6 of 6 green, strict selectors and auto-waiting, standard WebDriver, plain `.js`; it lost on no WebKit, a 103 MB tree, no trace or video, and a habit of picking the browser it finds on the machine (the snap Firefox here made it fail). The fallback inside the winner is the Playwright **library** under `node --test` (same engine, 2 of 2 green on the three browsers, nothing else new to learn, but no trace, no `expect`, no report): if the author wants one runner for both suites.
3. **Cypress lost on cost and on shape**, not on browsers: it also drove Chromium, Firefox and (experimental) WebKit, but an 822 MB binary, a test that runs inside the browser (the disk read-back and the server are `cy.task` calls), and a per-test server that made the spec restart in a loop (found no cause; a server started once per run works). **Selenium** and **Puppeteer** work on Chrome and Firefox but wait for nothing by themselves and have no WebKit here.
4. **What the choice leaves untested:** the browser's own folder picker (`showDirectoryPicker`) and everything behind it (the remembered folders in IndexedDB, the native `createWritable`), the real Safari and the stock Firefox (Playwright drives its own builds), and the packaged native runner (not built here; only the spawn line changes). The served-folder path (`serverDirectoryHandle`) is what the suite tests, and it is the path the hosted editor of #162 will share.
5. **W-13 adds:** one `devDependency` (`@playwright/test`, exact), a `playwright.config.js`, `src/test/e2e/` (a harness of about 60 lines and the specs), `npm run test:e2e`, three CI steps in `Build` (browser install `--with-deps chromium firefox`, a cache of the browsers, the tests, the report upload on failure) and about 2 to 4 minutes of CI time cold, 1.5 to 3 cached (an estimate, below); `workers: 1` and `retries: 0`.

## The table of trials

Same two flows in each (below). Times are wall seconds measured here (load average 0.5 to 2 unless said). "Drove" is what I ran for real.

| | Playwright runner | Playwright library + `node --test` | Puppeteer + `node --test` | Selenium + `node --test` | WebdriverIO (mocha) | Cypress |
| --- | --- | --- | --- | --- | --- | --- |
| Version, release date, licence | 1.64.1, 2026-10-14, Apache-2.0 | same package | 25.16.0, 2026-10-22, Apache-2.0 | 4.51.0, 2026-10-09, Apache-2.0 | 10.1.0, 2026-10-18, MIT | 16.2.0, 2026-10-14, MIT |
| `node_modules` (MB), npm time | 19, 2 s | 19, 2 s | 33, 15 s (with Chrome) | 26, 2 s | 103 (328 packages), 19 s | 33 (+13 with webkit), 18 s (with the binary) |
| Browsers, MB (time) | Chromium 681 or 273 shell only (46 s), Firefox 310 (16 s), WebKit 293 (25 s) | same | Chrome 403 + shell 274 (in the 15 s), Firefox 326 (13 s) | Chrome 403 + driver 23 (13 s on first run), Firefox 326 + 6 (29 s on first run) | Chrome 403 + 24 (13 s on first run), Firefox 326 (14 s on first run) | the Cypress binary 822 MB; no browser of its own (Electron, deprecated); mine were handed in |
| Drove here | **Chromium, Firefox, WebKit** | Chromium, Firefox, WebKit | Chrome, Firefox; no WebKit | Chrome, Firefox; no WebKit | Chrome, Firefox; no WebKit | Chromium, Firefox, WebKit (experimental) |
| Node 22 | yes (22.23.4) | yes | yes (needs >=22.12) | yes | yes (needs >=22.19) | yes |
| Time, two flows (C = Chromium/Chrome, F = Firefox, W = WebKit) | all three 13.7 to 14.6 s; C 1.0 and 1.3 s, F 2.4 to 3.4 and 2.3 to 2.8 s, W 1.6 and 2.6 to 3.1 s | C 2.3 s, F 5.1 s, W 4.5 s (one file) | C 2.9 to 6.2 s, F 5.5 to 5.9 s | C 3.1 to 3.2 s, F 6.9 s | C 4.7 to 5.3 s, F 6.5 to 7.1 s | C 17 to 22 s, F 13.0 to 13.4 s, W 10.4 to 11.2 s (a 6 to 8 s start) |
| Failures in 3 consecutive runs | 0 of 18 (6 tests x 3); also 60 of 60 in `--repeat-each=10` | 0 of 18 | 0 of 12 | 0 of 12 | 0 of 12 | 0 of 18 (once per run server) |
| Auto-waiting | locators and `expect`, `expect.poll` | the same locators | `waitForSelector` by hand; `page.click` does not wait | `driver.wait` by hand; nothing waits | actions wait to exist; strict selectors | commands retry their assertion |
| A wrong selector reads | "Test timeout of 30000ms exceeded. Error: locator.click: ... Call log: - waiting for locator('[data-action="save-all-changez"]')" and the source line with a caret | "locator.click: Timeout 5000ms exceeded. Call log: - waiting for locator(...)" | "Error: No element found for selector: [data-action=\"save-all-changez\"]" at once, a stack of library frames | "TimeoutError: Waiting for element to be located By(xpath, //*[@data-action=\"save-all-changez\"]) Wait timed out after 10113ms" | "Can't call click on element with selector ... because element wasn't found" | "Timed out retrying after 10000ms: Expected to find element: `[data-action=\"save-all-changez\"]`, but never found it." and the source |
| A wrong expected line reads | `expect(received).toEqual(expected)` with `- Expected + Received` and the source line | `node:assert` `+ actual - expected` diff | the same | the same | the same plus its own rendering | chai `+ expected - actual` and a screenshot |
| Trace, screenshot, video | all three, kept on failure (`trace.zip` 1.4 MB with a viewer, `.png` 100 KB, `.webm` 138 KB) plus `error-context.md` (an accessibility snapshot and an instruction for an agent) | none unless the test writes it | none unless written | none unless written | none unless written (a hook) | a screenshot on failure; video optional |
| Headless | default | default | `headless: true` | `--headless=new`, `-headless` | `--headless=new`, `-headless` | `--headless` |
| Plain JS/TS for Prettier and ESLint | yes; checked with the repository's config (below) | yes | yes | yes | yes | yes, with `cy` globals to declare |
| Maintenance | Microsoft, a release every few weeks | | Chrome team | Selenium project | OpenJS | Cypress.io, runner MIT |

## The flows

Both flows run against `archicode editor serve -p <free port> -w <copy>/.archicode.yaml` on a copy of `src/doc/examples/domain_plateaus` in a temp folder, one server and one copy per test (462 ms to start). (1) Open the served URL: the page opens on Applications (`#/timeline/applications`, the tab `set-page` Applications), with no console error and no page error. (2) Elements, unfold Shop, select Web site, *Edit*, replace the description, *Save all changes*, answer *Write in baseline* (the example is layered, so a write in baseline changes `to-be` too and the page asks), wait for *Save all changes (1)*, click it again, read `plateaus/baseline/shop.yaml` back and assert that **exactly one line differs**, the description line, with its indentation and quotes (the line-preserving save is the contract).

The spike of the winner (`@playwright/test` 1.64.1), formatted with the repository's Prettier options (`singleQuote`, `printWidth: 120`, `trailingComma: none`); `ESLint` with the repository's `eslint.config.mjs` reports nothing on it (checked through `--stdin-filename src/test/e2e/editor.spec.js`):

```js
import { test as base, expect } from '@playwright/test';
import { startServer } from '../../harness/serve.mjs';

const test = base.extend({
  served: async ({}, use) => {
    const s = await startServer('domain_plateaus');
    await use(s);
    await s.stop();
  }
});

test('opens the served folder and shows the Applications page with no console error', async ({ page, served }) => {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(served.url);
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
  await expect(page.locator('[data-action="set-page"]', { hasText: 'Applications' })).toBeVisible();
  await expect(page).toHaveURL(/#\/timeline\/applications/);
  expect(errors).toEqual([]);
});

test('edits a description, saves, and the manifest on disk has the line', async ({ page, served }) => {
  const file = 'plateaus/baseline/shop.yaml';
  const before = served.read(file);
  await page.goto(served.url);
  await page.locator('[data-action="set-page"]', { hasText: 'Elements' }).click();
  await page.locator('[data-action="toggle-element"]').first().click();
  await page.locator('[data-action="select-element"]', { hasText: 'Web site' }).click();
  await page.locator('[data-action="toggle-element-edit"]').first().click();
  await page
    .locator('textarea')
    .filter({ hasText: 'The front of the shop.' })
    .fill('The front of the shop, edited by the e2e test.');
  await page.locator('[data-action="save-all-changes"]').click();
  await page.getByRole('button', { name: 'Write in baseline' }).click();
  await expect(page.locator('[data-action="save-all-changes"]')).toHaveText('Save all changes (1)');
  await page.locator('[data-action="save-all-changes"]').click();
  await expect.poll(() => served.read(file)).toContain('description: "The front of the shop, edited by the e2e test."');
  const after = served.read(file);
  const a = before.split('\n'),
    b = after.split('\n');
  expect(b.length).toBe(a.length);
  expect(b.filter((l, i) => l !== a[i])).toEqual([
    '      description: "The front of the shop, edited by the e2e test."'
  ]);
});
```

`playwright.config.js` (14 lines):

```js
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
```

The harness `serve.mjs` (65 lines, shared by the six candidates): `startServer(example)` makes a temp folder (`mkdtempSync`), copies the example into it (`cpSync`), asks the operating system for a free port (`net.createServer().listen(0)`, read the port, close), spawns `java -jar target/quarkus-app/quarkus-run.jar editor serve -p <port> -w <copy>/.archicode.yaml` (the `java` of `JAVA_HOME`, else the sdkman 25), reads its standard output until the line `editor serve is up and running: http://127.0.0.1:<port>/?token=...` appears (the token is in the URL: a request without it is refused with 403), and returns `{ url, dir, read(rel), stop() }`; `stop()` sends SIGTERM, waits for the exit and removes the copy. For W-13 the paths become `process.cwd()`-relative, the JDK comes from `JAVA_HOME` only, and the spawn line is the one place to change for the native runner (`<runner> editor serve ...`).

## Decision

**Playwright's test runner.** Against Q7:

1. *A real browser against `editor serve`, on a free port*: yes, six candidates.
2. *Headless, no paid plan, no server, no secret (T5)*: yes (Playwright has no cloud; Cypress's Cloud is optional and not used).
3. *The folder*: the served folder is what is tested; see "What it leaves untested".
4. *The file read back*: a Node-side `fs.readFileSync` in the test. This is where Cypress pays (everything of Node goes through `cy.task`).
5. *Stability*: three runs and a ten-fold repeat with no failure on one worker; the only failures I saw were under overload (below). Auto-waiting without a sleep; `retries: 0`.
6. *Cost*: 19 MB of `node_modules` and 0.6 to 1.3 GB of browsers; Apache-2.0; 1.64.1 of 2026-10-14 (the npm `time` shows daily alpha builds, the stable is a few weeks old); Node 22 works.
7. *Browsers*: Chromium, Firefox and WebKit, all driven here; the winner had to drive Chromium and Firefox at least and drives the three.
8. *Agents*: the failure says the step and shows the line, and leaves a screenshot, a video, a trace and `error-context.md` (a snapshot of the page as an accessibility tree and a prompt for an agent); plain `.js`.

Why not the others, in one line each: **WebdriverIO** (runner-up) has no WebKit, no trace, a larger tree and a browser-picking trap; **Cypress** is the heaviest (822 MB), runs the test inside the browser, asks for installed browsers, and its per-test server looped; **Selenium** has no auto-wait and Firefox hung on the machine's snap install; **Puppeteer** has no WebKit, `page.click` does not wait, and it has no runner or reporter of its own (so it pairs with `node --test`, which has no trace).

Caveats of the choice, said: Playwright drives **its own builds** of Firefox (a patched build) and WebKit (a Linux build of the engine, not Safari); the other candidates drive stock Firefox. The stock-browser difference is for the hosted editor (#162) to weigh, not for this suite.

## What the choice leaves untested

- **The browser's folder picker.** `window.showDirectoryPicker` is a user gesture that opens an operating-system dialog; no candidate scripts it (Playwright cannot click a native dialog; a stubbed picker would test the stub). So the suite never exercises: the landing card's *Open folder* path, the browser's permission prompt, the *remembered folders* (an IndexedDB store of directory handles, which needs a real handle), and the native `FileSystemFileHandle.createWritable` write (the suite tests `serverFileHandle`, the second implementation of the same interface, whose `PUT`s the server writes). The two implementations share the seam, so the page code above the seam (parse, edit, line-preserving save, dialogs, diagram, stories) is the same; the native handle code below it is not tested by this suite.
- Chromium-only behaviours that depend on the native handle (and Firefox/Safari, which have none: #162's browser-backed third handle will be pure JavaScript over IndexedDB, so Playwright **can** test it in Firefox and WebKit, which is a reason for this choice).
- The real Safari, the stock Firefox, macOS and Windows, and the packaged native runner (not built here: `target/*-runner` does not exist, and CLAUDE.md says the Native job needs Mandrel; the harness would only change its spawn line).
- A run on a GitHub runner: I may not dispatch a workflow here; the CI numbers below are estimates.

## What W-13 adds

- **Dependency:** `@playwright/test` 1.64.1, exact, in `devDependencies` (`package-lock.json` pins it). Nothing else: `playwright-core` comes with it (19 MB).
- **Files:** `playwright.config.js` at the root (`testDir: 'src/test/e2e'`, `workers: 1`, `retries: 0`, `forbidOnly` in CI, `reporter: [['list'], ['html', { open: 'never' }]]` if the author wants the report, trace/screenshot/video `retain-on-failure`, projects `chromium` and `firefox`, WebKit optional), `src/test/e2e/serve.mjs` (the harness) and the specs `src/test/e2e/*.spec.js` (named `.spec.js` so that the unit suite's `node --test "src/test/javascript/**/*.test.js"` can never pick them up), `.gitignore` entries `test-results/` and `playwright-report/`, the two scripts in `package.json` (`test:e2e` = `playwright test`), the globs of `format` and `format:check` (today `src/test/javascript`, `src/test/resources/**/*.mjs`, `scripts`) extended to `src/test/e2e/**`, CLAUDE.md naming the two suites (T11) and the CI step.
- **CI (estimates, not measured on a runner; the downloads were measured here):** in `Build`, after `./mvnw verify` (the jar exists): `actions/setup-node` is already there; add `npx playwright install --with-deps chromium firefox` (here: Chromium 46 s for 681 MB, `--only-shell` would drop 400 MB, Firefox 16 s for 310 MB, on a home line; a runner downloads faster, so 30 to 60 s plus the apt step of `--with-deps`, 10 to 30 s), an `actions/cache` of `~/.cache/ms-playwright` keyed on the Playwright version (restores 0.6 GB in about 15 to 25 s; `--with-deps` still runs apt), the tests (two flows on two browsers took 9 to 10 s here; a suite of the 8 to 10 flows of Q8 on two browsers, about 1 to 2 minutes), and `actions/upload-artifact` of `test-results/` on failure only (a trace is 1.4 MB). **About 2 to 4 minutes added when cold, 1.5 to 3 when the cache hits.** No server of ours, no secret, no paid plan.
- **Rules for the suite (found by trying):** one worker (see below); a free port and a temp copy per test (they work); `expect.poll` for the file read-back, never a sleep; the page's `/favicon.ico` 404 is a console error in full Chromium (and the stock Firefox requests it too, 404 in the network log; I did not check its console) but not in Playwright's default headless shell nor in Playwright's Firefox, so the "no console error" check either filters `favicon.ico` or the server answers it (an editor finding, below); the layered example asks *Write in baseline* before the file write (the flow of a real author, keep it); a seeded break (V-I) is a renamed `data-action` or a save that writes another line, and the two deliberate failures of this run show the messages.
- **Under overload** (my own mistake: I ran `--repeat-each=5 --workers=4`, load average 13 to 14 for two minutes on the author's machine): 5 of 30 Firefox tests hit Playwright's 30 s test timeout (the first one of them was the plain page-open test: the JVM start and the browser launch were starved; the others passed on Chromium and WebKit). With one worker the 60 tests of `--repeat-each=10` all passed. So: `workers: 1`, a generous `timeout` for the fixture (the server start), and a sentence in CLAUDE.md that the suite is not run in parallel.

## What the in-app browser tools of an agent give (not tried, as asked)

The browser pane of the desktop application (`mcp__Claude_Browser__*`) lets an agent open the served URL, read the page as an accessibility tree or as text, click, type, resize the window, read the console and the network, and take screenshots: a quick way to **see** a page, reproduce a failure that CI reports, explore selectors before writing a spec, or check the layout at a phone width. It is not an end-to-end suite: nothing is repeatable or asserted in a file, there is no gate in CI, it needs a desktop session, it drives one browser (the one the application embeds, Chromium-based), each site may need the author's approval, and the file read-back is a separate shell command. Use it as a non-CI complement (exploration and the reproduction of a red e2e run); the suite is the gate.

## Findings (for the wave; nothing was fixed)

1. **`GET /favicon.ico` is a 404 and a console error in full Chromium (the stock Firefox requests it too).** The page has no `<link rel="icon">` (`standalone.html`; `grep` finds none) and `EditorHttpServer` answers `/favicon.ico` with 404. Reproduction: `archicode editor serve`, open the URL in Chrome with the console open: "Failed to load resource: the server responded with a status of 404 (Not Found)". A "no console error" check in a full browser fails on it (Puppeteer Chrome, WebdriverIO Chrome and Playwright with `channel: 'chromium'` showed it, Selenium filtered it from the start; Playwright's default headless shell and Playwright's Firefox did not request it). Small: either an inline `<link rel="icon" href="data:,">` or a 204 for `/favicon.ico`. Author to decide whether to file.
2. **A cost for W-13, not a bug: the saves of an element on a layered workspace take two clicks of the same label.** *Save all changes* in the element form writes the draft (and asks *Write in baseline* when other plateaus inherit it), then the page shows *Save all changes (1)* and a second click writes the file; a flow that stops after the first click reads an unchanged file (my first spike did). The button keeps one name for two steps; W-13's flows say both.
3. Cypress: a server started and stopped per test through `cy.task` makes the spec restart in a loop; started once per run it works. I did not find the cause; the editor page alone is not the cause (it survives its server stopping, checked in Playwright: no navigation, no error).
4. The three libraries WebKit needs (`libavif16`, `libgav1-1`, `libyuv0`) are missing on this Ubuntu 24.04 machine; on CI `playwright install --with-deps` (or the runner image) has them. W-13 should say it in CLAUDE.md for contributors ("install with `npx playwright install --with-deps`").
5. A Selenium Manager or WebdriverIO run picks the browser it finds, which on this machine is the snap Firefox that hangs under it: pin or force a download. Playwright ignores system browsers. This is a strong practical argument for the winner.

## Tasks (the document's own list)

| Task | Status |
| --- | --- |
| T1 Clean the first executor's leftovers | done |
| T2 Harness (free port, temp copy, URL, folder, stop) | done |
| T3 Try Playwright (runner and library) on the two flows, three browsers, three runs, failures, Node 22 | done |
| T4 Try Puppeteer, Selenium, WebdriverIO, Cypress the same way | done |
| T5 Decide, name the runner-up, list what is untested and what W-13 adds | done |
| T6 Comment on #162 | done (see Verification) |
| T7 Delete the scratch folder and the browser caches | done (see Cleanup) |

## Trial rows (written as measured, one candidate at a time)

Common: Node v24.12.0 here (Node 22.23.4 from the nodejs.org tarball in the scratch folder for the Node 22 checks), JDK 25, jar `target/quarkus-app/quarkus-run.jar`, machine load average below 1.5 during the Playwright trials. The two flows, same in every candidate: (1) open the served folder, see the Applications page (the heading, the `set-page` tab, address `#/timeline/applications`), no console error and no page error; (2) Elements, unfold Shop, select Web site, Edit, replace the description, *Save all changes*, answer the dialog *Write in baseline* (the example is layered: baseline's description also changes `to-be`), wait for *Save all changes (1)*, click it again, read `plateaus/baseline/shop.yaml` back and assert that exactly one line differs, the description line, with its indentation and quotes. Example copy: `src/doc/examples/domain_plateaus` in a temp folder per test, `editor serve -p <free port>` per test (462 ms to start).

### Playwright (`@playwright/test` 1.64.1, Apache-2.0, released 2026-10-14; `playwright` 1.64.1 the library)

- Install: `npm install` 2 s (19 MB `node_modules`, 48 MB npm cache; a cold cache gives the same 2 s); browsers by `npx playwright install <browser>`: chromium 46 s, 681 MB on disk (with ffmpeg 5 MB) (Chromium 403 MB + headless shell 273 MB; `--only-shell` would keep the shell alone, 273 MB), Firefox 157.0 16 s 310 MB, WebKit 25 s 293 MB; all three 1.3 GB.
- Browsers driven here: **Chromium (156.0.8078.4), Firefox (157.0): both flows green. WebKit: green after I supplied `libavif16`, `libgav1-1` and `libyuv0` (downloaded with `apt-get download`, unpacked and copied into the WebKit folder: no sudo here); without them the launch fails with "Host system is missing dependencies to run browsers ... sudo apt-get install libavif16" (then `libgav1.so.1`, `libyuv.so.0`). CI: `playwright install --with-deps` does the apt part on the runner.**
- Runner (`npx playwright test`, config of 12 lines: 1 worker, `retries: 0`, trace/screenshot/video `retain-on-failure`): the two flows, three projects, 6 tests: 9 to 14 s wall for all three browsers; per test Chromium 1.0 s and 1.3 s, Firefox 2.4 to 3.4 s and 2.3 to 2.8 s, WebKit 1.6 s and 2.6 to 3.1 s (server start included). Three consecutive runs of the three browsers: 6/6, 6/6, 6/6 (and 4/4 x3 for Chromium+Firefox before WebKit worked); on Node 22.23.4 6/6.
- Library under `node --test` (`import { chromium, firefox, webkit } from 'playwright'`, a `before`/`after` that launch and close the browser, `withServed` helper): the two flows, 2.3 s Chromium, 5.1 s Firefox, 4.5 s WebKit per run (the files, 2 tests); 3 runs of each: 2 pass, 0 fail, nine times; on Node 22 pass. Auto-waiting is the same engine (the locators), but no trace, screenshot, video or `expect` with polling comes with it: the assertions are `node:assert`, the screenshot is code to write.
- Failure reads (runner; Chromium): a wrong selector, `data-action="save-all-changez"`: "Test timeout of 30000ms exceeded. Error: locator.click: Test timeout of 30000ms exceeded. Call log: - waiting for locator('[data-action="save-all-changez"]')" and the source line with a caret (`> 32 | ...click();`); 30.3 s to fail (the default; `timeout`/`expect.timeout` lower it). A wrong expected line: "Error: expect(received).toEqual(expected) // deep equality  - Expected  - 1  + Received  + 1  Array [ -   "      description: \"The front of the shop, edited by the E2E test.\"", +   "      ... e2e test.\"" ]" with the source line, in 1.5 s. Attached on failure: `test-failed-1.png` (100 KB), `video.webm` (138 KB), `trace.zip` (1.4 MB, `npx playwright show-trace`), and an `error-context.md` (11 KB) that is a snapshot of the page as an accessibility tree with an instruction written for an agent ("Explain why, be concise ... Provide a snippet of code with the fix"). Library under `node --test`: "locator.click: Timeout 5000ms exceeded. Call log: - waiting for locator(...)" and an `AssertionError` with a `+ actual - expected` diff; nothing else, unless the test writes it.
- Headless: the default; nothing to set. Auto-waiting: on every locator action and on `expect(...).toBeVisible()` etc.; `expect.poll` for the file on disk. No sleep in the two flows. Retries: a config line, set to 0.
- Found while writing the flows (a property of the page, not of Playwright): *Save all changes* in an element's form first opens the dialog "Writing in baseline changes other plateaus" (`Write in baseline`) on a layered example, and a second *Save all changes (1)* is the click that writes the file; a flow that stops after the first click reads an unchanged file (the first run of my spike did).
- Prettier/ESLint: plain `.js` (or `.ts`) files; nothing to configure for Prettier; ESLint reads them like the other tests (`globals` for the page code inside `evaluate` callbacks if any).
- Maintenance: Microsoft; `@playwright/test` published on 2026-10-14 (1.64.1), a minor every few weeks; Node `>=20` (`engines`).

### Puppeteer (`puppeteer` 25.16.0, Apache-2.0, released 2026-10-22) under `node --test`

- Install: `npm install` 15.3 s including the download of Chrome (403 MB) and Chrome headless shell (274 MB) by its postinstall; `npx puppeteer browsers install firefox` 13.4 s, 326 MB (Firefox 158.0.1); `node_modules` 33 MB (27 packages); 22 MB npm cache. Total 1.04 GB for Chrome + shell + Firefox. Node `>=22.12.0` (`engines`): the CI's Node 22 is enough, and 2/2 on Node 22.23.4.
- Browsers driven: **Chrome (new headless) and Firefox (WebDriver BiDi): both flows green, 3/3 each**; **no WebKit** (Puppeteer drives Chrome and Firefox only).
- Time (two flows, one file, browser launch and two server starts included): Chrome 5.97 s, 6.22 s, 2.94 s (varies by 2x for no reason I found), Firefox 5.88 s, 5.82 s, 5.54 s. Failures over the three runs: 0 of 6 runs.
- Failure reads (Chrome): a wrong selector in `page.click(...)`: "Error: No element found for selector: [data-action="save-all-changez"]" with a stack of `puppeteer-core` frames (`assert`, `CdpFrame.click`), in 2 s: **`page.click` does not wait** for the element, so a flow needs a `waitForSelector` before every action (I wrote them), where Playwright's locators wait. `waitForSelector` with a wrong selector waits its 30 s timeout. A wrong expected line: `node:assert` diff (`+ actual - expected`), nothing else. No trace, no video, no screenshot unless the test writes them (`page.screenshot` exists; there is no trace viewer).
- Assertions are `node:assert`; there is no `expect` with retries, so every wait is `waitForFunction`; the file on disk is read once at the end, after waiting for the page's own signal (the *Save all changes (1)* label going away).
- **Found: a console error from the browser itself.** In full Chrome headless the page requests `/favicon.ico` and the server answers 404 (Firefox requests it too: 404 in the response log), so the browser logs "Failed to load resource: the server responded with a status of 404 (Not Found)" as a console error; Puppeteer's Chrome headless shell and Playwright's headless shell do not request it (no error). The page has no `<link rel="icon">` (grep of `standalone.html`), so any "no console error" check in a full browser needs the server to answer `/favicon.ico` or the check to filter it. I filtered `/favicon.ico` in the Puppeteer test (`m.location().url`); reported as an editor finding below.
- Headless: `headless: true` (new headless Chrome), `'shell'` for the old one. Retries: none built in. Prettier/ESLint: plain `.js`. Maintenance: the Chrome team; released 2026-10-22.

### Selenium WebDriver (`selenium-webdriver` 4.51.0, Apache-2.0, released 2026-10-09) under `node --test`

- Install: `npm install` 1.7 s, 26 MB `node_modules` (17 packages); `engines` `>= 22.0.0` and 2/2 on Node 22.23.4. **No browser step of its own: Selenium Manager (a binary inside the package) downloads the driver and a browser the first time a `Builder` runs**: first run with Chrome 13.2 s, cache 425 MB (Chrome for Testing 403 MB + chromedriver 23 MB); Firefox 29.4 s on its first run, +331 MB (Firefox 326 MB + geckodriver 6 MB); cache 756 MB, in a folder `SE_CACHE_PATH` that I set to the scratch folder (by default `~/.cache/selenium`). The browser version is the latest stable unless pinned (`SE_*` or capabilities `browserVersion`), so "a pinned browser install step" is a pin by configuration, not by lock file.
- **Trap met: it uses the browser it finds.** This machine has a snap Firefox (`/usr/bin/firefox`, the user's own, running) and a snap `geckodriver`: with the default Selenium Manager the Firefox run hung (2 minutes without a result; I stopped the test, and two snap-confined `geckodriver` processes stayed that I could not kill: permission denied by the snap confinement; the user's own Firefox processes were not touched). With `SE_FORCE_BROWSER_DOWNLOAD=true` and `/snap/bin` out of the `PATH` Selenium downloaded its own Firefox and ran. On a GitHub runner the preinstalled Chrome and Firefox would be found instead (a version Microsoft/GitHub chose, not the one we pin).
- Browsers driven here: **Chrome (`--headless=new`) and Firefox (`-headless`): both flows green, 3/3 each; no WebKit**: Selenium reaches WebKit only through Safari's driver (macOS) or WebKitGTK's `WebKitWebDriver` (apt `webkit2gtk-driver` plus the WebKitGTK libraries, a root install: not tried).
- Time (two flows, one file, browser and server starts included): Chrome 3.08 s, 3.19 s, 3.23 s; Firefox 6.85 s, 6.92 s, 6.94 s. Failures: 0 of 6 runs. Console errors: asserted for Chrome through the `BROWSER` log (the 404 of `/favicon.ico` filtered; see Puppeteer); **not asserted for Firefox: geckodriver has no browser log endpoint** (WebDriver BiDi would be needed).
- No auto-waiting: every step is `driver.wait(until.elementLocated(...))` that I wrote (an `act(action, text)` helper using an XPath, since the text filter has no locator); a missed wait fails at once with "no such element".
- Failure reads: a wrong selector: "Error [TimeoutError]: Waiting for element to be located By(xpath, //*[@data-action="save-all-changez"])  Wait timed out after 10113ms" and a stack of `selenium-webdriver/lib/webdriver.js` (11.5 s); a wrong expected line: the `node:assert` diff. No screenshot, trace or video unless the test calls `driver.takeScreenshot()`.
- Prettier/ESLint: plain `.js`. Maintenance: the Selenium project, 4.51.0 on 2026-10-09.

### WebdriverIO (`webdriverio` 10.1.0 with `@wdio/cli`, `@wdio/local-runner`, `@wdio/mocha-framework`, `@wdio/spec-reporter`, all 10.1.0; MIT; `webdriverio` released 2026-10-18)

- Install: `npm install` 18.9 s, **103 MB `node_modules` (237 top-level folders, 328 packages), 154 MB npm cache**; Node `>=22.19.0` (`engines`: the CI's `22` gives 22.x latest, fine; a pin to 22.12 would fail), 2/2 on Node 22.23.4. Browsers: none to install by hand; the runner downloads the browser and the driver on the first run into the temp folder (`/tmp/chrome` 403 MB, `/tmp/chromedriver` 24 MB, `/tmp/firefox` 326 MB, geckodriver apart): 12.9 s for the first Chrome run, 13.8 s for the first Firefox run. About 0.8 GB of browsers.
- Config: `wdio.conf.js` of 18 lines (capabilities, `framework: 'mocha'`, the spec reporter); tests are mocha `describe`/`it` files with `$`/`$$` selectors (`$('[data-action="set-page"]=Applications')` text selectors) and `expect` from `@wdio/globals`; the Node-side harness (start the server, read the file) is plain `import` in the test because the testrunner runs the spec in Node and drives the browser by WebDriver (BiDi).
- **Trap met (same as Selenium): it takes the browser it finds.** Firefox with `browserName: 'firefox'` alone found the snap Firefox/geckodriver of this machine: "WebDriverError: Process (pid=...) unexpectedly closed with status 1 when running ".../session"" three retries, then fail; with `browserVersion: 'stable'` and `/snap/bin` out of the `PATH` it downloaded Firefox 158.0.1 and passed. Chrome downloaded itself (Chrome 156.0.8078.47) with no setting.
- Browsers driven: **Chrome (`--headless=new`; I also passed `--no-sandbox`, untested without) and Firefox: both flows green, 3/3 each; no WebKit** (Safari only, on macOS).
- Time (wall of `npx wdio run`, one spec, launches included): Chrome 5.31 s, 4.66 s, 4.87 s (the tests 2.1 to 2.4 s); Firefox 7.13 s, 6.78 s, 6.46 s (tests 2.9 to 3.2 s). Failures: 0 of 6.
- Console errors: `browser.getLogs('browser')` works in Chrome (it returned the `/favicon.ico` 404 when I did not filter it: "http://127.0.0.1:40205/favicon.ico - Failed to load resource: ... 404"); not available in Firefox (geckodriver), so the Firefox run asserts none.
- Auto-waiting: actions wait for the element to exist (`waitforTimeout`, set to 10 s) but a missing element fails with "wasn't found"; **strict selectors** (new in 10): `$('[data-action="toggle-element"]')` that matches two elements fails with "strict mode violation: ... resolved to 2 elements, expected 1" and I had to write `$$(...)[0]`: a good guard against a selector that picks the wrong thing.
- Failure reads: wrong selector: "Can't call click on element with selector "[data-action="save-all-changez"]" because element wasn't found  Error: ... at async Context.<anonymous> (file:///.../fail-sel.js:32:5)", 14.3 s; wrong line: `node:assert` diff plus WDIO's own "actual expected" rendering. The runner prints geckodriver's own `WARN geckodriver: JavaScript error: chrome://remote/content/shared/Realm.sys.mjs ...` lines (noise) on every Firefox run. Screenshot of the failure: not by default (a hook `afterTest` with `browser.saveScreenshot` is the documented way); no trace, no video without a service.
- Prettier/ESLint: plain `.js`; the specs use globals (`browser`, `$`) unless imported from `@wdio/globals` (I imported them). Maintenance: OpenJS Foundation project, 10.1.0 on 2026-10-18.

### Cypress (`cypress` 16.2.0, MIT, released 2026-10-14)

- Install: `npm install` 17.9 s, which also downloads the Cypress binary into `CYPRESS_CACHE_FOLDER`: **822 MB** (the Electron app), `node_modules` 33 MB (171 packages), 46 MB with `playwright-webkit` added for WebKit; `engines` `^22 || ^24 || >=26` (22.23.4 passes). **Cypress downloads no browser besides its Electron**, which it calls "deprecated" in 16 ("Warning: The Electron browser is deprecated as a test browser and will be removed in a future version of Cypress"): Chrome or Firefox must be installed (on a GitHub runner they are; here I handed it the Playwright Chromium and the Puppeteer Firefox by path, `--browser <path>`).
- Browsers driven here: **Chromium 156 (path), Firefox 158 (path), WebKit 27 (`experimentalWebKitSupport: true` and `npm i playwright-webkit`, which uses the same WebKit as Playwright; "experimental")**: both flows, 3/3 each.
- Time (`cypress run --spec`, two tests, wall including 6 to 8 s of start): Chromium 36.7, 34.5, 32.8 s while an orphan `Cypress: Config Manager` process of my earlier hung runs burned a core (killed), then 22.0, 21.8, 21.5 and 17.0 s; per test 2.1 to 5.7 s (1.3 and 2.4 s in one run). Firefox 14.1, 13.4, 13.0, 13.1 s (tests 2.9 to 3.7 s); WebKit 11.2, 11.0, 10.4 s (tests 1.2 to 2.7 s). Failures over the three recorded runs of each: 0 of 9.
- **It could not run the flows the way the others do.** Four attempts to run with the Electron browser and the Chromium (6 spec files, ~14 runs): a test whose `beforeEach` starts `editor serve` through `cy.task` and stops it afterwards makes the spec restart every 4 s (30 `serve` calls in 60 s, never a green tick, no failure message; ended by `timeout`, leaving a `Cypress: Config Manager` at 100% CPU; with the Electron browser "renderer process crashed" after 1 min 36 s). The page is not the cause (served statically it passes, `cy.task` alone passes, a server started outside Cypress passes, 7.2 s to visit). **What works: one server per run** (`cy.task('serve')` idempotent, stopped in `after:run`); a fixed folder shared by the two tests, so there is no per-test isolation of the temp copy unless the test resets it (`cy.task`). I did not find why a per-test start/stop loops (the cause is in how Cypress reloads the spec iframe; nothing in the page restarts it).
- Architecture facts that cost: the test runs inside the browser (in an iframe of the runner), so the Node harness is reachable only through `cy.task` (serialisable arguments and results; the file read-back is a task), the commands are asynchronous chains and `async`/`await` is not supported on them, and `cy.visit` of the 2.4 MB page took 7.2 s the first time (the proxy rewrites the page; `modifyObstructiveCode: false` did not matter).
- Auto-waiting and retries: commands retry their assertion until `defaultCommandTimeout` (set to 10 s). Failure reads: wrong selector: "AssertionError: Timed out retrying after 10000ms: Expected to find element: `[data-action="save-all-changez"]`, but never found it." with a stack of the spec source, a screenshot written on the failure (`... (failed).png`), 15 s to fail; wrong expected line: "AssertionError: expected [ Array(1) ] to deeply equal [ Array(1) ]  + expected - actual  -[ '      description: "...e2e test."' ] +[ '      description: "...E2E test."' ]" and the screenshot, with a stack through `cypress_runner.js` frames. Video off (`video: false`), no trace viewer.
- Console errors: `cy.spy(win.console, 'error')` in `onBeforeLoad`; Cypress itself fails a test on an uncaught exception of the page. The `/favicon.ico` 404 is not a console call, so it did not show.
- Prettier/ESLint: plain `.js`, but the specs use globals (`cy`, `Cypress`, `describe`, `expect`) that ESLint needs declared (`globals.mocha` plus a `cy` entry) and Cypress adds its own types/plugin if wanted. Maintenance: Cypress.io; a commercial company, the runner is MIT and the Cypress Cloud is optional (not used).

## Not verified, and why

- **A run on a GitHub Actions runner** (setup, install time, `--with-deps`, the cache): a workflow cannot be dispatched from here (the brief forbids it). The CI minutes are estimates from measured downloads.
- **The packaged native runner:** not built here (needs Mandrel; `target/*-runner` is absent). The harness has one spawn line to change.
- **WebKit with `--with-deps`:** I supplied the three libraries by hand (no `sudo`), copied into the browser's `sys/lib`; the run with them is real, the apt route is the vendor's documented one.
- **Playwright with the repository's ESLint:** only the one spec, through `--stdin-filename`; the config is not changed here (W-13 may need `globals.node` already present for `src/test`).
- **Why Cypress loops with a per-test server**, and whether Selenium's Firefox hang with the snap install is Selenium's or snap's.
- **Console errors under Firefox** for Selenium and WebdriverIO (geckodriver has no log endpoint): asserted on Chrome only.
- **`eslint`/`prettier` of the five other candidates' spikes:** plain JS, not run.
- **Stock Firefox and Safari under Playwright:** not the same binaries (said above).

## Verification

- Every number above is in a row below or in a log of the scratch folder, measured on 2026-10-25. The winner's spike (formatted file above) passes on Chromium, Firefox and WebKit on the machine (`npx playwright test --workers=1`: 6 passed, 27.6 s under a load average of 5 to 6) and failed as intended on a wrong selector and on a wrong expected line.
- Three consecutive runs per candidate and browser, as listed in the table; the Playwright ten-fold repeat 60 of 60 on one worker.
- The comment on issue #162: posted (the URL is in the final report of the run).
- No file of the repository changed but this folder: `git status --short` shows the two modified wave files and this directory only, as before. The only outward-facing action is the comment on #162.

## Cleanup

Deleted at the end: `/tmp/w12-scratch` (4.6 GB: the scratch folder, `node_modules`, the Playwright, Puppeteer, Selenium and Cypress browser caches inside it, the Node 22 tarball, my npm cache folders), `/tmp/chrome`, `/tmp/chromedriver`, `/tmp/firefox` (WebdriverIO's downloads, 753 MB), `~/.config/Cypress` and `~/.cache/Cypress` (the first, 892 KB, created the evening before by the first executor and touched by my runs, the second created by my runs). Not deleted: the default npm cache `~/.npm/_cacache` (the Playwright install went through it, 48 MB), and `/tmp/geckodriver` (dated 2026-07-17, not mine). Left: two `geckodriver` processes of the snap Firefox that I could not stop (snap confinement refused `kill`; they hold no files); they exit with the session.

## Canonical impact

None: this run changes no canonical text, no architecture and no contract. `CLAUDE.md`, `package.json`, `ci-build.yaml`, ESLint and Prettier configuration change in W-13, if the author keeps the choice (the "Build & Test" paragraph naming the two suites, `npm run test:e2e`, the CI steps, the lint and format globs).

