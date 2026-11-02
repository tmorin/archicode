---
type: wave
wave: 030
status: planned
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/wbc-030-pages-ci-and-toolbar.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-002-diagram-toolbar.md
  - docs/wav/wav-031-graph-answers-impact/wav-031-graph-answers-impact.md
---

# Wave 030 — Pages, CI and toolbar

## Purpose

The homepage shows what ArchiCode produces and has an entry for agents; the manual is sorted by type of reading with a generated, tested command reference; a pull request that cannot reach the jar does not run the end-to-end suite; and the diagram toolbar is docked, grouped and tested in three browsers. Issues #192, #193, #194, #195 and #199 are closed.

## Non-Goals

- No change to the behaviour of the tools, except the toolbar of the editor (#194). The build gains a generated reference (#199), the commands do not change.
- No split of the manual into several files and no multi-page site: decided only once the content is sorted (D2), and the `docs/#anchor` links must keep working.
- No tutorial on `docs/architecture` (not planned on #193).
- No change to the editor's own texts outside the toolbar, and none to the generated guide.
- No release-note rewrite: the six `[[upgrade-0-NN]]` blocks move and keep their ids.
- No direction or spacing presets (RFC-001), no lateral rail (#179), no story player change.
- The query commands (#184, #187, #189) are wave 031, not this one.

## Decision Prerequisites

None blocks a run. Q1 and Q2 are answered below; Q3 is read at the start of W-6.

## Decisions of the author (2026-11-01) and open questions

- **Q1 (answered: build them as proposed). Toolbar proposals P-1, P-2, P-7, P-8 of #194** (five groups, the "saved with the view" dot, *Fold all*/*Unfold all*/*Facet* on a saved view's page, titles that say what happens) are "proposed, not yet answered"; the author may overturn them at the plan review. W-7 and W-8 build them as proposed unless the author says otherwise before the wave starts.
- **Q2 (answered: drop the two promises and note it in the record of W-5). The topics the *Best Practices* part promises** (label formatting, diagram styling, CI/CD): #193 says "write or drop". The CI page is written (W-5). Recommended: drop the other two promises, and say in the run record that they were dropped; if the author wants them, a ticket follows. W-5 does this unless told otherwise.
- **Q3 (open, decided by the design of W-6). Where the generated reference lives and how it is built** (#199): in the Asciidoctor build, a script, or a file the test regenerates. The run's design decides and records it; the constraint is that the test fails when the page and the binary disagree.

## Wave Manifest

```yaml
wave_manifest:
  wave: 030
  slug: pages-ci-and-toolbar
  status: planned
  sources:
    - '#192'
    - '#193'
    - '#194'
    - '#195'
    - '#199'
  phases:
    - id: P1
      name: CI, home page and skeleton
      gate:
        criteria:
          - '`node scripts/changes.mjs --list` exits 0 and prints, for every path of `git ls-files`, the rule it falls under, and `node --test src/test/javascript/changes-map.test.js` passes; that test shows `src/doc/README.adoc` runs Java and Page and not E2E or Kernel, `src/main/editor/page.html` and `.github/workflows/ci-build.yaml` run all four jobs, `CLAUDE.md` runs none, a path with no rule runs all four, and a push, a tag and a workflow_dispatch run all four'
          - '.github/workflows/ci-build.yaml has a job `Changes`, an `if` on each of `Java`, `Page`, `Kernel` and `E2E` that reads its outputs, and `Build` lists `Changes` in `needs` and fails on `failure` and `cancelled` (read the file; the behaviour on a push and a tag is not provable by a pull request and the run record says so)'
          - 'src/site/index.html has exactly one `<h1>`, a `<title>` and a meta description that contain `C4`, `ArchiMate` and `PlantUML`, a block for agents that names `archicode init`, `archicode guide`, `query graph` and `query schemas manifest` and links the model of ArchiCode, and no two links share the text "Try the editor on a realistic project"; `grep -c ''sample=archicode'' src/site/index.html` prints at least 1'
          - 'src/site/robots.txt, src/site/sitemap.xml and src/site/llms.txt exist, `src/site/index.html` has a canonical link, Open Graph tags and a JSON-LD `SoftwareApplication`, and the Pages publish step of .github/workflows/ci-build.yaml copies the three files into target/site; `node --test src/test/javascript/site.test.js` passes'
          - 'the top-level headings of src/doc/README.adoc (`grep -n ''^= '' src/doc/README.adoc`) are, in this order, Start here, Tutorials, How-to guides, Reference, Concepts and Upgrading, and the six anchors [[upgrade-0-17]] to [[upgrade-0-22]] sit under Upgrading'
          - 'every anchor `[[id]]` of `git show ff3bacd:src/doc/README.adoc` is still defined in src/doc/README.adoc, `grep -c ''^// - '' src/doc/README.adoc` prints 0 except the lines of the one ArchiMate/C4 mapping paragraph the run keeps, and `./mvnw test -Dtest=ManualExamplesTest` exits 0'
          - 'the record of run W-3 states the number of Asciidoctor warnings before and after the move, and the number after is not greater'
    - id: P2
      name: Prose, missing pages and generated reference
      gate:
        criteria:
          - '`grep -ciE ''journey|prowess|delve|unlock'' src/doc/README.adoc` prints 0, and under Concepts exactly one section is titled Plateaus (`grep -c ''^=\+ Plateaus$'' src/doc/README.adoc` prints 1) while every anchor of `git show ff3bacd:src/doc/README.adoc` is still defined'
          - 'src/doc/README.adoc has a How-to guide for CI that names `diff --fail-on` and the exit codes 1, 2 and 3, and a How-to guide for an agent that names `archicode guide`, `archicode init`, `query graph` and docs/architecture; `./mvnw test -Dtest=ManualExamplesTest` exits 0'
          - 'the Features section no longer promises an extension point the command line lacks (`grep -c ''Pluggable Viewpoint Service'' src/doc/README.adoc` prints 0), and the topics dropped from Best Practices under Q2 are named in the record of W-5'
          - 'a test fails when the command reference of the manual and the `--help` of the application disagree: it names every command that `java -jar target/quarkus-app/quarkus-run.jar --help` lists, recursively, and the reference in src/doc lists all of them; the run edits a copy to show the test fails, and `./mvnw test` exits 0'
          - 'src/site/llms.txt names the Reference and Concepts parts of the manual, and `node --test src/test/javascript/site.test.js` passes'
    - id: P3
      name: The diagram toolbar
      gate:
        criteria:
          - '`npm run test:unit` exits 0, and `grep -rc ''data-lit'' src/main/editor` prints 0 for every file'
          - '`npx playwright test` exits 0 on Chromium, Firefox and WebKit, including a spec for the toolbar of each surface and the address specs of run 0203 unchanged (`git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js` shows no removed line)'
          - 'the toolbar of the element page, both Maps, a saved view page and a story step comes before the canvas in the markup, each control belongs to exactly one group, a toggle has a constant label and `aria-pressed`, and one *Changes only* control writes `changes-only=1` as before (the node tests per surface name each check)'
          - '*Reset* is disabled when the diagram equals its origin and restores only Draw, Texts and Layout, and is absent on a saved view page; the dot appears on exactly the groups whose keys are in `VIEW_PROPERTY_ORDER`; at 360 px each group button shows its count (the specs assert it)'
          - '`scripts/byte-identity.sh` exits 0 with no new declared difference (JAVA_HOME of a JDK 25; it builds the base jar from the tag archicode-0.19.0 into ~/.cache/archicode-byte-identity/archicode-0.19.0), and `npm run editor:build` leaves `git status --short` unchanged'
          - 'src/doc/README.adoc describes the toolbar in the sections with the anchors [[editor-small-screen]] and [[editor-layout]], `./mvnw test -Dtest=ManualExamplesTest` exits 0, and `npm run format:check` and `npm run lint` exit 0'
  runs:
    - id: W-1
      slug: ci-changes-filter
      phase: P1
      depends_on: []
      run: 0211
      delegation: hard_judgment
      delegation_reason: 'changes the Build job that gates the publish and release jobs (live capability); provable only on the run of main and on a tag'
      likely_paths:
        - '.github/**'
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
      focus: 'a pull request that cannot reach the jar does not wait for the end-to-end suite'
    - id: W-2
      slug: homepage
      phase: P1
      depends_on: [W-1]
      run: 0212
      delegation: standard
      likely_paths:
        - 'src/site/**'
        - 'src/test/javascript/site.test.js'
        - '.github/workflows/ci-build.yaml'
      focus: 'see what ArchiCode produces in the first screen, try it, and, as an agent, find the way in'
    - id: W-3
      slug: manual-skeleton
      phase: P1
      depends_on: [W-2]
      run: 0213
      delegation: standard
      likely_paths:
        - 'src/doc/**'
      focus: 'find a part of the manual by the kind of reading it is, with every old link still working'
    - id: W-4
      slug: manual-concepts-and-voice
      phase: P2
      depends_on: [W-3]
      run: 0214
      delegation: standard
      likely_paths:
        - 'src/doc/README.adoc'
      focus: 'read one page about plateaus, in a plain direct voice, with one word for one thing'
    - id: W-5
      slug: manual-missing-pages
      phase: P2
      depends_on: [W-4, W-2]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/README.adoc'
        - 'src/site/llms.txt'
      focus: 'set up CI with the exit codes and let an agent drive the tool, from a how-to each'
    - id: W-6
      slug: generated-command-reference
      phase: P2
      depends_on: [W-5]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'pom.xml'
        - 'scripts/**'
        - 'src/test/java/io/morin/archicode/doc/**'
        - 'src/main/java/io/morin/archicode/cli/**'
      focus: 'trust that the command reference of the manual is what the binary says'
    - id: W-7
      slug: toolbar-structure
      phase: P3
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/editor/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - 'src/doc/README.adoc'
      focus: 'find the diagram controls in five groups above the canvas, with one pressed convention'
    - id: W-8
      slug: toolbar-state
      phase: P3
      depends_on: [W-7]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/editor/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - 'src/doc/README.adoc'
      focus: 'see what a view keeps, reset the rest, and use the toolbar on a phone'
```

## Phase P1 — CI, home page and skeleton

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-1 | `ci-changes-filter` | — | a pull request that cannot reach the jar does not wait for the end-to-end suite (#192) | `scripts/changes.mjs` (the corrected map of the issue and a `--list` mode over `git ls-files`), a `Changes` job with a job summary and one output per job, an `if` on each job, `Build` accepting `skipped` only for a job whose output is `false`, a push, a tag and a dispatch running everything, `src/test/javascript/changes-map.test.js` over a list of example paths with the default *all*; `.github/CLAUDE.md` says it | the first two criteria of P1 |
| W-2 | `homepage` | W-1 | see what ArchiCode produces in the first screen, try it, find the way in as an agent (#195) | the six findings of #195 in `src/site/index.html`: the overview or a screenshot beside the hero, both samples explained and one button, *Context* and *Problem* folded and *Scope and limits* moved up, a block for agents (`init`, `guide`, `query graph`, `query schemas manifest`, a link to the model), *Get started* rewritten on `archicode init`, plateaus, `diff`, stories and `plateau fold` shown, a footer with the manual, the releases and the editor; title and description with C4, ArchiMate and PlantUML; one H1; the hero diagram with a text alternative; canonical, Open Graph, JSON-LD; `sitemap.xml`, `robots.txt`, `llms.txt` and the copy step in the Pages publish job; the redirect of old manual anchors kept; light and dark themes and 360 px checked | the third and fourth criteria of P1 |
| W-3 | `manual-skeleton` | W-2 | find a part of the manual by its kind of reading (#193 b) | `src/doc/README.adoc` reordered by Diátaxis (Start here, Tutorials, How-to guides, Reference, Concepts, Upgrading) with a two-level table of contents; the six upgrade blocks moved under Upgrading with their ids; the `//` draft lines deleted except the ArchiMate/C4 mapping kept as one paragraph; the stale intros fixed (the Commands intro lists the eight groups, Features stops promising extension points); no other prose change; every `[[id]]` and `<<id>>` kept; Asciidoctor warnings counted before and after; the record lists each paragraph it moved or changed | the last three criteria of P1 |

**Gate:** the seven criteria of P1 in the manifest.

## Phase P2 — Prose, missing pages and generated reference

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-4 | `manual-concepts-and-voice` | W-3 | read one page about plateaus, in a plain voice (#193 c1) | one *Concepts* page for plateaus instead of the two parts (the 265 lines under Domain/Workspace and the 550-line part); the voice of D3 (direct, second person, one idea per sentence, one word per thing: plateau, layer, view, viewpoint, sample, workspace); the filler intros rewritten; ids kept | the first criterion of P2 |
| W-5 | `manual-missing-pages` | W-4, W-2 | set up CI and let an agent drive the tool (#193 c2) | a how-to for CI (`diff --fail-on`, exit codes 1, 2, 3) and one for an agent (`guide`, `init`, `query graph`, `query schemas manifest`, docs/architecture); the topics *Best Practices* promises are written or dropped as Q2 says; `src/site/llms.txt` updated to name the Reference and Concepts parts | the second, third and fifth criteria of P2 |
| W-6 | `generated-command-reference` | W-5 | trust that the command reference is what the binary says (#199) | the command reference (the Commands part) generated from the real `--help` of every command or checked against it, in a way Q3 settles in the run's design; a test that fails when the page and the binary disagree, shown on a copy; no change to a command | the fourth criterion of P2 |

**Gate:** the five criteria of P2 in the manifest.

## Phase P3 — The diagram toolbar

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-7 | `toolbar-structure` | — | find the diagram controls in five groups above the canvas, with one pressed convention (#194, run A) | P-5 the toolbar docked above the canvas on every surface (element in three viewpoints, both Maps, saved view, story step), before the canvas in the markup and in the Tab order; P-1 five groups (Draw, Texts, Layout, Compare, Frame), each control in exactly one; P-4 one *Changes only* toggle (`changes-only=1` unchanged); P-8 titles that say what happens; no `data-lit`, a constant label and `aria-pressed` on every toggle; node tests per surface; the end-to-end spec in the three browsers; `[[editor-layout]]` of the manual | the first three criteria of P3 and the markup part of the sixth |
| W-8 | `toolbar-state` | W-7 | see what a view keeps, reset the rest, use it on a phone (#194, run B) | P-3 *Reset to defaults* or *Reset to "name"*, restoring Draw, Texts and Layout only, absent on a saved view's page; P-2 the dot on the groups whose keys are in `VIEW_PROPERTY_ORDER`; P-6 one button per group with a count under 40 rem; P-7 *Fold all*, *Unfold all* and *Facet* on a saved view's page; DEC-5 *Open on diagram* remembers its view (session only); `[[editor-small-screen]]` of the manual; byte-identity and the address specs unchanged | the last three criteria of P3 |

**Gate:** the six criteria of P3 in the manifest.

## Dependency View

```
P1:  W-1 (CI)         W-2 (home page) ----------+
                      W-3 (skeleton) --+--> W-4 (concepts) --> W-5 (missing pages)
                                       +--> W-6 (generated reference)
P3:  W-7 (toolbar A) --> W-8 (toolbar B)
```

## Execution

**Sequential only, by the author's decision (2026-11-01): one run at a time, never two together.** The order is W-1, W-2, W-3 (P1), W-4, W-5, W-6 (P2), W-7, W-8 (P3). The `depends_on` edges above are only the genuine ones; the rest of the order is this decision, not a dependency, so a run that is moved does not drag others with it. The dispatcher runs one lane with a concurrency of 1.

## Risks

- **`src/doc/README.adoc` is edited by W-3, W-4, W-5, W-6, W-7 and W-8.** Verdict `serialize` for every pair: W-3 first (in P1), then W-4, W-5 and W-6 (P2), then W-7 and W-8 (P3). Moving the file once, first, is the point of the order.
- **`.github/workflows/ci-build.yaml` is edited by W-1 and W-2.** Verdict `serialize`: W-1 changes the jobs and `Build`, W-2 the Pages publish step; one file, two agents. Execution is sequential anyway.
- **W-2 and W-3:** `src/site/**` against `src/doc/**`, no common file; verdict `serialize` (by the sequential decision). The homepage links `docs/#anchor` ids; W-3 keeps every id (a gate criterion), so the two cannot disagree.
- **W-1 and W-6 share the glob `scripts/**`:** W-1 adds `scripts/changes.mjs`, W-6 may add a script of its own; different files, and they are in different phases. Verdict `serialize`.
- **W-1 and the publication.** The behaviour on a push and a tag, and `Build` with skipped jobs under a required check, are not proved by a pull request: the wave's pull request proves the filter, the run of `main` and the next tag prove the rest. `main` and tags keep running everything, so a false skip ends as a red `main`, not as an unchecked release. The record of W-1 says which part is proved where.
- **W-2 changes the Pages publish step**, which runs on a tag only. A mistake shows at the next release. The gate checks the copy step by reading; W-2's record says so.
- **W-6 changes the build** (a generated file or a test): a `pom.xml` or profile change is proved only on the run of `main`; if W-6 touches the pom, its record says so.
- **Moves hide changes.** W-3 is a move with no prose change; its record lists each paragraph it changed, so a reviewer can check the text is identical elsewhere.
- **The toolbar is proved in browsers.** Rows drawn by ELK are proved in a browser only, as a tendency (#194). The three-browser run of the end-to-end suite is the longest check of the wave.
- **Voice is a judgement.** D3 names it; W-4's review is the reader reading the page, not a test, apart from the filler-word grep.

## Completion Criteria

- The three gates hold.
- #192, #193 (its parts b, c1, c2), #194, #195 and #199 are closed by the wave's pull request, or the progress log says why one stays open.
- `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run test:e2e`, `npm run format:check` and `npm run lint` pass.
- `scripts/byte-identity.sh` passes with no new declared difference.
- Q1, Q2 and Q3 are answered and the progress log says how.
