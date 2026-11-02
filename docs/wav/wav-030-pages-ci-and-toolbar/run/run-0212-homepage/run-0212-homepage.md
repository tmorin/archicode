---
type: run
run: 0212
status: completed
profile: TDD+pln
wave: 030
---

# Run 0212: homepage

Run W-2 of wave 030 (pages, CI and toolbar), manifest id W-2.

Review pass: dispatched, the Stage 5 KDMLLC review of the TDD ran in a different agent from the drafter; its findings F-1 to F-10 are in the prg and go to the main agent to apply to the TDD.

Files outside likely_paths: .github/workflows/ci-build.yaml, src/site/robots.txt, src/site/sitemap.xml, src/site/llms.txt

## Verification (task-006, 2026-11-01)

Run from the repository root. Nothing was committed. JDK 25 (sdkman 25.0.4-tem) for the jar; the jar `target/quarkus-app/quarkus-run.jar` was present and reports `archicode 0.23.0` (it was built by an earlier run, not rebuilt here).

### Gates

| Command | Exit |
|---|---|
| `node --test src/test/javascript/site.test.js` (25 tests, 25 pass, 0 fail) | 0 |
| `npm run test:unit` | 0 |
| `npm run format:check` | 0 |
| `npm run lint` | 0 |
| `grep -c '<h1' src/site/index.html` | prints 1 |
| `grep -c 'sample=archicode' src/site/index.html` | prints 2 |
| the words in `<title>` and the meta description | C4, ArchiMate, PlantUML |
| `src/site/robots.txt`, `sitemap.xml`, `llms.txt` | exist |
| `git diff src/test/e2e` | prints nothing |

`git diff --stat` and `git status --short` show, beyond the baseline of run 0211 and the wave documents (`.github/CLAUDE.md`, `scripts/changes.mjs`, `src/test/javascript/changes-map.test.js`, the wave manifest and prg, `sample-brightcart.test.js`), only the files of this run: `src/site/index.html`, `src/site/robots.txt`, `src/site/sitemap.xml`, `src/site/llms.txt`, `src/test/javascript/site.test.js`, `.github/workflows/ci-build.yaml` (the step Assemble website; the file also carries run 0211's removed lines) and this run directory. The baseline is not separable by diff alone because nothing was committed, so this line was read by eye against the file list of the plan.

### Commands of the page against the jar

Run in a scratch folder with the jar of `archicode 0.23.0`:

- `archicode -V` exit 0
- `archicode init <tmp>` exit 0; it writes `.archicode.yaml`, `manifests/customer.yaml`, `manifests/shop.yaml`, `manifests/view.shop_overview.yaml` and `.gitignore`, and the view id `shop_overview` used in Get started exists
- `archicode views generate -i shop_overview` in that folder, exit 0, a `plantuml` output is written under `views/`
- `archicode query graph` in that folder, exit 0
- `archicode query schemas manifest`, exit 0
- `archicode diff --help`, `plateau fold --help`, `plateau list --help`, `stories generate --help`, `guide --help`, each exit 0

The options shown on the page exist in the help of the jar: `diff --plateau`, `--against` (with `baseline`), `--fail-on` (the list accepts `new` and `removed`), `plateau fold <plateau> --dry-run`. The shown `diff --fail-on new,removed` and `plateau fold target --dry-run` lines were not run against a workspace that has plateaus, only against the help text; `diff`, `plateau list` and `stories generate` were not executed on the `init` workspace.

### Links

- Page anchors `#top`, `#start`, `#main` exist once each. The manual anchors the page links (`serve-the-editor`, `plateaus`, `plateau-list`, `install`, `init`, `domain`, `diff`, `stories`) each have one `[[id]]` in `src/doc/README.adoc`.
- External addresses opened once with `curl -sI`, all answered 200: `https://github.com/tmorin/archicode`, `.../releases`, `.../tree/main/docs/architecture`, `.../pkgs/container/archicode`, and `https://tmorin.github.io/archicode/`. Recorded, not a gate. The docs/architecture tree answers 200 for the repository as pushed today.

### Tag-only step Assemble website

- The run text (lines 419 to 443 of `.github/workflows/ci-build.yaml`) was extracted: `bash -n` exits 0.
- A dry run of that same text with `GITHUB_REF_NAME=archicode-9.9.9` in a scratch copy holding the three files, the page and the editor page (with a placeholder docs folder) exits 0 and writes `index.html`, `robots.txt`, `sitemap.xml`, `llms.txt`, `docs` and `editor` under `target/site`.
- Proved where: the text of the step by `site.test.js` and `bash -n`, and the copy and cmp lines by the local dry run, on this machine. The step runs only on a release tag, so the behaviour in the GitHub Actions run, the Publish website step and the three files being served from GitHub Pages are proved only by the next release. This run does not release, tag or push.

### Render check, by eye

Browser pane, file opened as a static snapshot (it shows as a `data:` page). By eye:

- 1280 px by 800 px: two columns; the claim (h1 "Architecture as code"), the lead, the hero button "Try the editor on a realistic project", the figure and its caption are all in the first screen (button bottom at 436 px, figure bottom at 540 px). No horizontal overflow reported by the script beyond the vertical scrollbar width (scrollWidth 1265 of 1280).
- 360 px: one column; the bar, the claim, the lead, the hero button and "Get started" fit in the first screen; the figure is below the first screen at this width, which differs from the objective in the TDD ("the first screen holds the claim, the figure and the hero button"), and I did not change the page to fix it. No element wider than the viewport outside code blocks, and scrollWidth equals 360, so no horizontal page scroll.
- Dark theme: not checked. The pane renders a local document with light defaults and ignores the color scheme emulation, so the dark palette was only read in the CSS, not looked at. The light theme was looked at.
- Not looked at: the rest of the page below the first screen at either width, the tab buttons of the diagram in the pane, and any other browser.

### Not run

- `./mvnw` anything (the manual is untouched, so `ManualExamplesTest` was not needed).
- The E2E job (`hosted-acceptance.spec.js`, Playwright); `git diff src/test/e2e` is empty and the hero link text is unchanged, but the spec itself was not run.
- The real publish, which needs the next release tag.
