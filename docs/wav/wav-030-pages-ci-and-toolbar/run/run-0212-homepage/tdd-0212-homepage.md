---
title: Homepage
type: tdd
status: draft
run: 0212
wave: 030
owner: tmorin
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wbc-030-pages-ci-and-toolbar.md
  - src/site/index.html
  - src/test/javascript/site.test.js
  - .github/workflows/ci-build.yaml
  - https://github.com/tmorin/archicode/issues/195
---

# Homepage

# Summary

The presentation page `src/site/index.html` must show what ArchiCode produces in its first screen, say what each sample is for behind one button, give an agent a way in, show the plateau features, and carry the metadata that a search engine or an agent reads (#195). This run rewrites that one file, adds three static files beside it (`src/site/robots.txt`, `src/site/sitemap.xml`, `src/site/llms.txt`), adds the lines that copy them in the step "Assemble website" of `.github/workflows/ci-build.yaml`, and extends `src/test/javascript/site.test.js` so that the criteria 3 and 4 of gate P1 are checked by a test and not by reading. No command, no editor code and no manual text changes.

There is no PRD (profile TDD+pln), so traceability is incomplete: requirements are labelled `REQ-n` from the manifest of wave 030 (row W-2, the third and fourth criteria of gate P1), from the six findings and the acceptance written on #195, and from the scope column of W-2. No diagram: the change is one page and three flat files, with no new boundary and no branching flow.

# Scope

In scope: `src/site/index.html` (rewritten in place, same single-file, no-build form), `src/site/robots.txt`, `src/site/sitemap.xml`, `src/site/llms.txt` (new), the step "Assemble website" of `.github/workflows/ci-build.yaml` (copy lines and checks), `src/test/javascript/site.test.js`, the run record.

Out of scope: the manual (W-3 to W-5; `src/site/llms.txt` is updated again by W-5 to name Reference and Concepts), the editor's own texts, the generated guide, the Pages job structure (tag-only, untouched), a build step for the page (none exists, none added), a screenshot or other binary (DEC-1), a multi-page site (wave decision D2), analytics.

# PRD Traceability

No PRD. Requirements assumed from the wave manifest and #195.

- `REQ-1` (#195 finding 1): the first screen shows what is produced, a diagram beside the hero. Addressed (DEC-1, IMP-1).
- `REQ-2` (#195 finding 2, P1 gate 3): both samples are explained, one button each, no sample link shares the text of another sample link. Addressed (DEC-2, CTR-1, IMP-1, IMP-4).
- `REQ-3` (#195 finding 3): *Context* and *Problem* folded into two sentences, *Scope and limits* moved up. Addressed (DEC-3, IMP-1).
- `REQ-4` (#195 finding 4, P1 gate 3): a block for agents that names `archicode init`, `archicode guide`, `query graph`, `query schemas manifest` and links the model of ArchiCode. Addressed (DEC-4, IMP-1).
- `REQ-5` (#195 finding 5): *Get started* rewritten on install, `archicode init`, `views generate`, `editor serve`. Addressed (DEC-5, IMP-1).
- `REQ-6` (#195 finding 6): plateaus, `diff`, stories and `plateau fold` shown; footer with the manual, the releases, the editor. Addressed (DEC-6, IMP-1).
- `REQ-7` (P1 gate 3): exactly one `<h1>`, a `<title>` and a meta description that contain `C4`, `ArchiMate` and `PlantUML`. Addressed (DEC-7, CTR-2, IMP-1, IMP-4).
- `REQ-8` (P1 gate 4): `robots.txt`, `sitemap.xml`, `llms.txt` exist; the page has a canonical link, Open Graph tags and a JSON-LD `SoftwareApplication`; the publish step copies the three files into `target/site`; `site.test.js` passes. Addressed (DEC-7, DEC-8, CTR-2, CTR-3, IMP-2, IMP-3, IMP-4).
- `REQ-9` (W-2 scope): the hero diagram has a text alternative; the redirect of old manual anchors is kept; light and dark themes and 360 px are checked. Addressed (DEC-1, DEC-9, CTR-4, IMP-1, IMP-4).
- `REQ-10` (#195 acceptance): every command, option and link on the page is checked against the current tool. Addressed in part (DEC-10: commands are checked once against `--help` by the run and by a test of the command names; options are not tied to the binary by a test, DEF-5 and W-6).

# Technical Goals

- `TG-1` The first viewport (360 px and 1280 px wide) holds the claim, a diagram of an output and the button that opens the editor on a sample.
- `TG-2` Every fact the page states about a command is true of the packaged jar at the time of the run, and every link lands on something that exists.
- `TG-3` One test file, the existing `site.test.js`, holds every check of the page and the three files that can be automated in node. Two checks cannot and are named in the run record: the render (light and dark themes, 360 px) and the tag-only copy of the three files (ASM-3).
- `TG-4` No change that makes a currently published address stop working: `docs/#anchor` redirects, `editor/`, `editor/#/...sample=...`.

# Non-Goals

- No framework, no bundler, no external font, script or image: the page stays one file with inline CSS and SVG (as today, and as `harness.js` serves it as `GET /`).
- No generated diagram: the SVG is written by hand from a real overview of the example (DEC-1), not produced by the tool at build time.
- No version stamping of the three new files: only `index.html` and the editor are stamped.
- No `lastmod` in the sitemap and no `softwareVersion` in the JSON-LD (each would need the stamp, or says `dev`).

# Assumptions

- `ASM-1` The public address of the site is `https://tmorin.github.io/archicode/` (README.md line 87, `release-draft.sh` default `https://<owner>.github.io/<name>/docs/`, `pom.xml` developer url). Validated by the README and the script; a custom domain would change `CTR-3` only.
- `ASM-2` `llms.txt` follows the proposal at llmstxt.org: a Markdown file with one H1, a blockquote summary, and H2 sections of link lists with absolute URLs. This is a convention and not a standard; a reader that ignores it loses nothing. Not validated beyond the proposal text (Q-1 is settled on this).
- `ASM-3` The Pages publish step runs only on a release tag (`if: startsWith(github.ref, 'refs/tags/')`), so the copy lines are proved by a text test and, for real, only by the next release; the run record says so, as run 0211 did for the filter.
- `ASM-4` The page's own links to the manual use only anchors that the manual defines now and that W-3 keeps (every `[[id]]` is kept by the wave); `site.test.js` already checks this and keeps doing so.
- `ASM-5` `archicode query schemas manifest` is valid: `query schemas` takes a `TYPE` and the manual says "`archicode query schemas manifest`" (`[[guide]]`). Checked in the jar help for `query schemas`, which lists `TYPE` with default `workspace`; the value `manifest` is read from the manual, and the run runs it once (Observability).

# Constraints

- `CON-1` `src/site/index.html` is served by `harness.js` as `GET /` (`HOSTED_ROUTES`) and read by `hosted-acceptance.spec.js`, which clicks `getByRole('link', { name: 'Try the editor on a realistic project' }).first()` and expects its `href` to match `editor/#/timeline/applications`. That link text and href shape must stay on the hero link; the second sample's link must not contain that phrase (Playwright matches names as case-insensitive substrings).
- `CON-2` `site.test.js` reads the first bare `<script>` (the redirect, `/<script>([\s\S]*?)<\/script>/`) and the last `<script>` (the version footer and tabs, by `lastIndexOf`). A JSON-LD block must be `<script type="application/ld+json">` and sit between them or in the head after the redirect; it must not be a bare `<script>`.
- `CON-3` The stamp `<meta name="archicode-version" content="dev">` appears exactly once, spelled as is (test and `sed` in the publish step).
- `CON-4` Every `href="docs/..."` is `docs/` or `docs/#<lowercase-and-dashes>` naming a `[[id]]` of `src/doc/README.adoc` (existing test); the manual is not edited here.
- `CON-5` `src/site/` is in `.prettierignore`; `npm run format:check` does not read the page. The new JavaScript in `site.test.js` is formatted by Prettier.
- `CON-6` `scripts/changes.mjs` rule R-13 sends `src/site/index.html` to Java, Page and E2E, R-14 sends the other `src/site/**` files to Java and Page: no change to the map is needed and none is made.
- `CON-7` The CLAUDE.md of the repository forbids a wave or run id in a CLAUDE.md sentence; this run edits no CLAUDE.md. `docs/CLAUDE.md` named by the skill does not exist in this repository; the conventions followed are the root `CLAUDE.md` and the run documents of runs 0211 and earlier.
- `CON-8` Light and dark themes are tokens on `:root` with `@media (prefers-color-scheme: dark)` (existing). New colours are added as tokens in both blocks.

# Current State

- `src/site/index.html` (399 lines, one `<h1>` "Architecture as code", title "ArchiCode · Architecture as code", a description without C4, ArchiMate or PlantUML in the title). Sections: hero (sentence, three buttons: *Open the editor*, *Try the editor on a realistic project*, *Get started*), `context` and `problem` (two generic sections), `solution` (Model with a 29-line workspace card and the two-tab overview/detailed SVG card, *Editor, online* with a second copy of the sample button, Views, Queries), `start` (three cards: a hand-written workspace, the editor, Docker), `limits`, footer (version and container image only). One bare redirect `<script>` in the head, one bare script at the end.
- Two hrefs of the form `editor/#...` exist, identical (`sampleHrefs()` asserts length 2 and one distinct value).
- `.github/workflows/ci-build.yaml` "Assemble website" (tag only) copies the manual, the stamped page, the stamped editor and both samples (`brightcart.yaml`, `archicode.yaml`) and checks them with `test -f`, `cmp` and `grep`. The three files do not exist and are not copied.
- `site.test.js`: stamp once, redirect cases (`#editor-map` and `#_domain` redirect, `#problem` and empty stay), malformed hash, links into the manual, anchors of the page, `editor/` link, footer version, workflow contains `target/site/index.html`, `target/site/docs/`, `target/site/editor/index.html`, sample hrefs are `BROWSER_SAMPLES` ids, hint text.
- The commands the page may name exist in the packaged jar (run with JDK 25): `init [<folder>]`, `guide`, `query` (`graph`, `schemas TYPE`, `views`), `views generate` (`-i`, `-v`, `-o`, `--plateau`, `--against`, `--only-changes`), `editor`, `plateau` (`fold <plateau> [--dry-run]`, `list`), `stories generate`, `diff` (`--plateau`, `--against`, `--fail-on`, exit 3).
- Released version: 0.23.0 (the latest release page), native binaries and the container image `ghcr.io/tmorin/archicode`.

# Proposed Design

One page, same form, new order. Top to bottom:

1. Bar: brand, Docs, GitHub, Editor (unchanged).
2. Hero: the single `<h1>` and the lead sentence on the left; on the right (below on a phone) a `<figure>` with the overview SVG and a visible caption. Buttons: *Try the editor on a realistic project* (primary, Brightcart address), *Get started*. Under it the two folded sentences of Context and Problem, then the hint line.
3. What it produces: the model card and the two-tab diagram card (existing, kept), Views, Queries (kept).
4. Plateaus and stories (new, section `plateau-states`): the differentiator, with the commands `plateau list`, `diff --fail-on`, `plateau fold`, `stories generate`, linked to the manual anchors `plateaus`, `diff`, `stories`, `plateau-list`.
5. For agents (new): the block of DEC-4.
6. Try it (the editor, online): both samples explained.
7. Scope and limits (moved up from the end, text unchanged).
8. Get started (rewritten).
9. Footer: manual, releases, editor, container image, version.

- `DEC-1 — The hero figure is the existing overview SVG, inline, with a text alternative`
  - `Decision:` Copy the overview `<svg>` of the Model card into a `<figure class="hero-figure">` beside the lead, with its own marker id (`ah-hero`; ids must be unique), `role="img"` and an `aria-label` that names the four boxes and the three links, and a visible `<figcaption>` with the same sentence in plain words, without a line count ("Generated from a short YAML file: the person uses the platform, which uses an identity provider and a payment gateway"). The tab card below stays as it is.
  - `Rationale:` the SVG exists, is theme-aware (the `d-*` classes use the tokens), has no weight and no request, and an `aria-label` plus caption is the text alternative the gate asks for. It also means the hero diagram is the one the tool draws for the example (the overview of `EcommercePlatform`).
  - `Alternatives considered:` a screenshot of the editor (a binary under `src/site/` that goes stale at each editor change, needs a copy step and two themes, and must be re-taken by hand); moving the tabbed card into the hero (drags the 29-line YAML card out of the Model explanation and makes the first screen tall on a phone); a diagram generated by `views generate` at build time (a build step the site does not have).
  - `Tradeoffs:` the overview SVG is duplicated in the file (about 25 lines) and is hand-drawn, so it can drift from the tool; mitigated by DEF-1 (no test compares it to the tool), and the caption names the example, not a promise.
  - `Linked PRD IDs:` REQ-1, REQ-9.

- `DEC-2 — One sample button in the hero, both samples explained in one block, distinct link texts`
  - `Decision:` The hero keeps one link, *Try the editor on a realistic project*, to the Brightcart address (unchanged, CON-1). The second occurrence of that link is removed. The block "Try it in the editor" explains in two short items: Brightcart is a layered workspace with plateaus and stories (link text *Open the Brightcart sample*); the model of ArchiCode is the as-is model of ArchiCode itself, which agents and engineers can query (link text *Open the model of ArchiCode*, to `editor/#/timeline/applications?sample=archicode`). The block "For agents" links the model with the text *the ArchiCode model in the editor* (a third text, to the same address). No sample link shares the text of another.
  - `Rationale:` the gate says "no two links share the text"; `hosted-acceptance.spec.js` needs the hero text unchanged, and `.first()` is the hero (it is the first in document order).
  - `Alternatives considered:` rename the hero link (breaks the e2e spec, which this run does not touch and which runs in E2E on this change under R-13); two buttons in the hero (more weight in the first screen than #195 wants).
  - `Tradeoffs:` the second sample address is not tied to Brightcart's `plateau=marketplace&compare=past`, which only exist in Brightcart; the archicode address carries only `sample=`, as the manual states (README.adoc line 1815).
  - `Linked PRD IDs:` REQ-2.

- `DEC-3 — Context and Problem become two sentences under the hero; the sections go`
  - `Decision:` Keep the two ideas ("the architecture is not versioned and reviewed like the code" and "a diagram written as code is still written view by view and cannot be asked questions") as two sentences in a `<p class="why">` under the buttons. Delete the ids `context` and `problem`. Move the `limits` section before *Get started* with its three bullets unchanged (they are accurate, per #195).
  - `Rationale:` #195 finding 3; fewer sections before the first example.
  - `Alternatives considered:` keep them collapsed in `<details>` (hides content that justifies the tool from the one reader who needs it, and a `<details>` is one more control to test).
  - `Tradeoffs:` an old link `#problem` or `#context` to the page now falls through to the redirect script, which sends it to `docs/#problem`, and that is a harmless miss (the manual lands on its top). The test case that uses `#problem` as "an anchor of the page stays" moves to `#start` (CTR-4).
  - `Linked PRD IDs:` REQ-3.

- `DEC-4 — "For agents": four commands, one link, one sentence about the output`
  - `Decision:` A section `id="agents"`, text: an agent that has only the program starts with `archicode init my-architecture`, reads `archicode guide` (Markdown on the standard output, versioned, loads no workspace), checks a workspace with `archicode query graph` (JSON of the resolved elements and relationships), reads the exact keys of a kind with `archicode query schemas manifest`, and can read the model of ArchiCode itself in `docs/architecture` (the link is the editor sample of DEC-2; the repository folder is linked as `https://github.com/tmorin/archicode/tree/main/docs/architecture`). Four `<code>` blocks in one `<pre>`, each with a one-line comment. The page also links `llms.txt` (`href="llms.txt"`).
  - `Rationale:` #195 finding 4 and the third criterion of P1; the sentences come from the `[[guide]]` section of the manual, which is what the guide itself says.
  - `Alternatives considered:` a link only to the manual's agent how-to (does not exist until W-5).
  - `Tradeoffs:` the page names `query schemas manifest` before W-5 writes the how-to; the command exists and the manual names it (ASM-5).
  - `Linked PRD IDs:` REQ-4.

- `DEC-5 — Get started is install, init, generate, serve`
  - `Decision:` Three or four steps in cards: (1) install: the native program of a release (link `https://github.com/tmorin/archicode/releases`, and `docs/#install` for the checksum) or `docker run ... ghcr.io/tmorin/archicode` (kept from the page); (2) `archicode init my-architecture`; (3) `archicode views generate -i shop_overview` in that folder (the id is the one `init` prints; read in the manual, line `archicode views generate -i shop_o...`, and run by the task); (4) `archicode editor serve`, or the online editor.
  - `Rationale:` #195 finding 5. Each command is run against the jar by the task (Observability, check 3).
  - `Alternatives considered:` keep the hand-written 7-line workspace (does not use `init`, which is the shortest working path).
  - `Tradeoffs:` the Docker form of `init` needs the same `-v` and `-u` flags as `views generate`; the card shows both lines in one block.
  - `Linked PRD IDs:` REQ-5.

- `DEC-6 — Plateaus, diff, stories and fold are one section with four lines, linked to the manual`
  - `Decision:` Section `id="plateau-states"` (not `plateaus`, which is a manual id, DEC-9): one sentence on what a plateau is (a state of the architecture, layered on the one it overrides), then four commands with one comment line each (the lines below are illustrative: the task replaces them with what `archicode diff --help` and the manual's `[[diff]]` section say): `archicode diff --plateau target --against baseline`, `archicode diff --fail-on new,removed` (exit 3 in a build), `archicode plateau fold <plateau> --dry-run`, `archicode stories generate`. Links: `docs/#plateaus`, `docs/#diff`, `docs/#stories`, `docs/#plateau-list`. The exact values of `--fail-on` and `--plateau` are read from `archicode diff --help` and from the manual's `[[diff]]` section by the task, not from this TDD (Q-2).
  - `Rationale:` #195 finding 6: they are the differentiator and appear nowhere.
  - `Alternatives considered:` a screenshot of the plateau comparison in the editor (DEC-1 reasons).
  - `Tradeoffs:` more text on a page that is already long; kept to four lines.
  - `Linked PRD IDs:` REQ-6.

- `DEC-7 — Metadata is head markup in the page, one JSON-LD block, canonical to the Pages root`
  - `Decision:` `<title>` "ArchiCode · C4 and ArchiMate views as code, drawn with PlantUML" (the exact words `C4`, `ArchiMate`, `PlantUML` present); the description a sentence with the same three words and "YAML"; `<link rel="canonical" href="https://tmorin.github.io/archicode/">`; Open Graph `og:type website`, `og:title`, `og:description`, `og:url`, `og:site_name` (no `og:image`: no binary, DEF-2); `twitter:card` `summary`; a `<script type="application/ld+json">` with `@type` `SoftwareApplication`, `name`, `description`, `applicationCategory` `DeveloperApplication`, `operatingSystem` `Linux, macOS`, `license` `https://mit-license.org`, `url` the Pages root, `sameAs` the repository; no `offers`. Exactly one `<h1>`.
  - `Rationale:` the third and fourth criteria; the facts (MIT, Linux and macOS native programs, Docker anywhere) are in the pom and the manual `[[install]]`. The manual states C4 and ArchiMate views exist (CLAUDE.md of the repository: "renders C4/ArchiMate views"); the page claim is limited to what the tool does (PlantUML views, the C4 levels as viewpoints) and does not say it is certified.
  - `Alternatives considered:` `WebApplication` for the editor too (one type is enough and the editor is a feature); microdata attributes (scatter markup over the page).
  - `Tradeoffs:` the canonical and `og:url` are the address of the latest release's site; a fork publishing its own Pages keeps this address (ASM-1).
  - `Linked PRD IDs:` REQ-7, REQ-8.

- `DEC-8 — The three files are static, copied by two lines, checked by the step and by a test`
  - `Decision:` `robots.txt`: `User-agent: *`, `Allow: /`, `Sitemap: https://tmorin.github.io/archicode/sitemap.xml`. `sitemap.xml`: `urlset` (namespace `http://www.sitemaps.org/schemas/sitemap/0.9`) with three `<loc>`: the root, `docs/`, `editor/`, each with an absolute URL and no other tag. `llms.txt`: H1 `ArchiCode`, a blockquote of one sentence, an H2 "Start here" with absolute links to the manual root, `docs/#guide`, `docs/#init`, `docs/#install`, the editor, the repository (`https://github.com/tmorin/archicode`) and `docs/architecture` (`https://github.com/tmorin/archicode/tree/main/docs/architecture`); an H2 "Optional" with the releases page. The step "Assemble website" gains `cp src/site/robots.txt src/site/sitemap.xml src/site/llms.txt target/site/` and `test -f` and `cmp` for each, in the style of the samples.
  - `Rationale:` same pattern as the samples (copy then `cmp`); the three files are not stamped, so `cmp` against the source holds.
  - `Alternatives considered:` generating the sitemap from the manual's headings (a build step, no benefit for three URLs); a `lastmod` stamped by `sed` (unneeded, DEF-3).
  - `Tradeoffs:` `llms.txt` is a draft convention; W-5 edits it after this run (the wave plan, W-5, not a deferral).
  - `Linked PRD IDs:` REQ-8.

- `DEC-9 — The redirect script and the stamp are not touched; the theme and the narrow screen are checked by a render`
  - `Decision:` Leave the first `<script>` as it is except the comment, keep `getElementById(decoded hash)` as the test of "an anchor of this page". Rule: no id of the page equals a manual id, that is a `[[id]]` of `src/doc/README.adoc`, so that no address once published for the manual at the root is shadowed by the page and TG-4 stays true when W-3 to W-5 add ids. The page ids are `agents`, `plateau-states`, `try`, `start`, `limits`, `solution` and `site-version` (the footer span, which was `version`, a manual id); `context` and `problem` go (DEC-3). A test checks the rule (CTR-4). Two screenshots (light, dark) at 360 px and 1280 px are taken from the file in a browser by the task and described in the run record; no screenshot is committed.
  - `Rationale:` the redirect behaviour is a published contract (TG-4); the visual check has no automated form in this repository for this page.
  - `Alternatives considered:` a Playwright spec for the page (the E2E job already serves it, but adding a spec to a job just made conditional by W-1 widens this run; DEF-4).
  - `Tradeoffs:` the 360 px and dark checks are by eye, and the record says so.
  - `Linked PRD IDs:` REQ-9.

- `DEC-10 — The test asserts the page's facts, and names the commands it uses against the packaged help`
  - `Decision:` `site.test.js` gains tests for REQ-2, REQ-7, REQ-8, REQ-9 (CTR-4). The command names on the page are checked by a test that extracts every `archicode <word> [<word>]` from `<code>` and `<pre>` of the page and checks the first one or two words against a list in the test of the commands of the application (`views generate`, `query graph`, `query schemas`, `query views`, `init`, `guide`, `editor serve`, `plateau fold`, `plateau list`, `stories generate`, `diff`); the list is the one the Java `--help` prints today. The run runs the jar once for the options (Observability, check 3).
  - `Rationale:` it catches a misspelled or removed command at node-test speed; the full tie to the binary is W-6's job (generated command reference) and not duplicated here.
  - `Alternatives considered:` call the jar from the node test (the Page job has no jar; the test would be skipped there or need `mvnw package`); parse `--help` output stored in a fixture (a second copy of the truth).
  - `Tradeoffs:` the list in the test is a copy of command names; it goes stale when a command is renamed, and W-6 replaces it.
  - `Linked PRD IDs:` REQ-10.

# Repository Impact

- `IMP-1 — The page`
  - `Path(s):` `src/site/index.html`
  - `Change type:` modify (large)
  - `Why impacted:` REQ-1 to REQ-9, DEC-1 to DEC-7, DEC-9.
  - `Linked PRD IDs:` REQ-1 to REQ-9
  - `Risks / notes:` `harness.js` and `hosted-acceptance.spec.js` read it (CON-1); stamp, first and last bare script (CON-2, CON-3); the hero figure adds a second SVG marker id (`ah-hero`) that must not collide with `ah`, `ah2`; keep `lang`, `skip` link, `prefers-reduced-motion` and `:focus-visible` (accessibility is a quality bar of #195, "light and dark themes and 360 px checked").

- `IMP-2 — Static files`
  - `Path(s):` `src/site/robots.txt`, `src/site/sitemap.xml`, `src/site/llms.txt`
  - `Change type:` additive
  - `Why impacted:` REQ-8, DEC-8.
  - `Linked PRD IDs:` REQ-8
  - `Risks / notes:` absolute URLs tie them to ASM-1; `src/site/**` is Java and Page under R-14, no new rule.

- `IMP-3 — The publish step`
  - `Path(s):` `.github/workflows/ci-build.yaml` (step "Assemble website" only)
  - `Change type:` modify
  - `Why impacted:` REQ-8: the three files must reach `target/site`.
  - `Linked PRD IDs:` REQ-8
  - `Risks / notes:` tag-only (ASM-3): not provable by a pull request; the file is under `.github/**`, which runs all four jobs (R-06). The step is a `run: |` block under `set -euo pipefail`, so a missing file fails the tag run before "Publish website". No change to `needs`, `if` or permissions.

- `IMP-4 — The test`
  - `Path(s):` `src/test/javascript/site.test.js`
  - `Change type:` modify
  - `Why impacted:` see CTR-4.
  - `Linked PRD IDs:` REQ-2, REQ-7, REQ-8, REQ-9, REQ-10
  - `Risks / notes:` the cases that assume two identical sample hrefs and `#problem` change (CTR-4); the e2e spec is unchanged.

- `IMP-5 — The run record`
  - `Path(s):` `docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/run-0212-homepage.md`
  - `Change type:` modify
  - `Why impacted:` says what is proved where (the tag-only copy), the two screenshots' description, and the commands run against the jar.
  - `Linked PRD IDs:` REQ-9, REQ-8
  - `Risks / notes:` none.

# Canonical Impact

`None`. The model of ArchiCode in `docs/architecture/` has no element for the presentation page (`grep -ril "site/index" docs/architecture` is checked by the task; an element with `tags.path` `src/site` would be `CI-arc-1`, and none is expected). No domain invariant is enforced here, so there is no `CI-dom-`. Note that a change under `docs/architecture` would force `npm run sample:build`; this run makes none.

# Data Model and Contracts

- `CTR-1 — The sample links of the page`
  - `Current contract:` two `href`s `editor/#/timeline/applications?plateau=marketplace&compare=past&sample=brightcart`, identical, texts "Try the editor on a realistic project" twice; asserted by `sampleHrefs()` (length 2, one distinct value, ids in `BROWSER_SAMPLES`).
  - `Proposed contract:` the hero link keeps the current text and href. Every other link whose `href` starts with `editor/#` carries `sample=` with an id of `BROWSER_SAMPLES` or none (a plain `editor/` link has no hash). The Brightcart address appears once; the archicode address `editor/#/timeline/applications?sample=archicode` appears in the Try-it block and in For agents. The hero text appears once; every other link to `editor/#...sample=` has a text of its own, different from the hero text and from the other sample links (the rule of gate P1, not a rule on all `<a>`: the bar and the footer may repeat texts that carry no sample address).
  - `Affected files:` `src/site/index.html`, `src/test/javascript/site.test.js`, read by `src/test/e2e/hosted-acceptance.spec.js` (unchanged).
  - `Migration or compatibility notes:` the published address of the Brightcart sample does not change; the e2e spec finds the same link by name.
  - `Linked PRD IDs:` REQ-2.

- `CTR-2 — The head of the page`
  - `Current contract:` `<title>`, one description, an inline SVG icon, no canonical, no Open Graph, no JSON-LD.
  - `Proposed contract:` `<title>` and `<meta name="description">` contain `C4`, `ArchiMate` and `PlantUML`; `<link rel="canonical">` is `https://tmorin.github.io/archicode/`; `og:title`, `og:description`, `og:type`, `og:url`; one `application/ld+json` block that is valid JSON with `@context` `https://schema.org`, `@type` `SoftwareApplication`. The stamp meta appears once.
  - `Affected files:` `src/site/index.html`, `src/test/javascript/site.test.js`.
  - `Migration or compatibility notes:` additive for readers; the stamp contract is unchanged (CON-3).
  - `Linked PRD IDs:` REQ-7, REQ-8.

- `CTR-3 — The published site root`
  - `Current contract:` `target/site/` holds `index.html`, `docs/`, `editor/` (with `samples/`).
  - `Proposed contract:` it also holds `robots.txt`, `sitemap.xml`, `llms.txt`, byte-identical to `src/site/`. `robots.txt` names the sitemap by absolute URL; `sitemap.xml` lists exactly `https://tmorin.github.io/archicode/`, `.../docs/`, `.../editor/`; `llms.txt` links are absolute and each one is the root, `docs/`, `docs/#<id>` with an id the manual defines, `editor/`, or a `github.com/tmorin/archicode` address.
  - `Affected files:` `.github/workflows/ci-build.yaml`, the three files, `src/test/javascript/site.test.js`.
  - `Migration or compatibility notes:` additive; W-5 changes only the text of `llms.txt`.
  - `Linked PRD IDs:` REQ-8.

- `CTR-4 — site.test.js`
  - `Current contract:` see Current State.
  - `Proposed contract:` the test `a link to an anchor of the old manual ...` uses `#start` where it used `#problem`; `the sample button ...` accepts one Brightcart and one archicode address and checks every `sample=` id; new tests, each named for its criterion: one `<h1>`; `<title>` and description contain the three words; the hero text appears once and every other link to `editor/#...sample=` has a text of its own, different from the hero text and from the other sample links (after trimming and collapsing spaces); the bar and the footer may repeat a text that has no sample address; no id of the page equals a manual `[[id]]`; `sample=archicode` appears at least once; the agents block contains the four command strings and a link to `sample=archicode`; the three files exist, `robots.txt` names the sitemap, `sitemap.xml` has exactly the three `<loc>`, `llms.txt` has one H1 and its `docs/#id` links resolve to manual anchors; canonical, `og:title`, JSON-LD parse and `@type`; the workflow's step "Assemble website" mentions each of the three files in a `cp` and a `cmp`; the hero figure has an `aria-label` and a `figcaption`; every command string on the page starts with a name in the command list (DEC-10); the first bare `<script>` and the last one are still the ones the existing tests run.
  - `Affected files:` `src/test/javascript/site.test.js`.
  - `Migration or compatibility notes:` the Page job runs it (`npm run test:unit`); no jar needed.
  - `Linked PRD IDs:` REQ-2, REQ-7, REQ-8, REQ-9, REQ-10.

# Interfaces and Behavior

- `IF-1` The page at `/`: static HTML, no network request except the links followed; the inline script is progressive (without it both diagram views show).
- `IF-2` Links out: `docs/`, `docs/#<id>`, `editor/`, `editor/#...sample=<id>`, `llms.txt`, the releases page, the repository and its `docs/architecture` tree (github.com addresses, not Pages), the container image page.
- `IF-3` Files served at the root: `robots.txt`, `sitemap.xml`, `llms.txt` (plain text and XML, no behavior).
- Error states: none at run time; a wrong link is a 404 on Pages and is caught for the manual anchors by the test and for the rest by the run's link check (Observability).

# Flows and Processing Logic

- `FLOW-1 — A visitor`
  - `Trigger:` opens `https://tmorin.github.io/archicode/`.
  - `Steps:` sees the claim and the overview in the first screen; clicks the hero link; the editor opens on the Brightcart sample (`sample=brightcart`, one workspace in the browser); returns and clicks again, the same workspace.
  - `Branches / failure paths:` JavaScript off: both diagram views stack; an old link `/#editor-map` is sent to `docs/#editor-map`; an unknown hash with no id on the page goes to the manual.
  - `Final output / rendered result:` the page in light or dark by the browser's setting.
  - `Linked PRD IDs:` REQ-1, REQ-2, REQ-9.

- `FLOW-2 — An agent`
  - `Trigger:` reads `/llms.txt` or the section For agents.
  - `Steps:` runs `archicode init`, `archicode guide`, `archicode query graph`, `archicode query schemas manifest`; opens the model of ArchiCode.
  - `Branches / failure paths:` a program without the binary follows the manual links in `llms.txt`.
  - `Final output / rendered result:` the agent has the guide and the schema without a human.
  - `Linked PRD IDs:` REQ-4, REQ-8.

- `FLOW-3 — The tag run`
  - `Trigger:` a release tag; job `Build`, step "Assemble website".
  - `Steps:` stamps and copies the page, copies the three files, `test -f` and `cmp` each, `grep` the stamp, publishes `target/site`.
  - `Branches / failure paths:` a missing or different file fails the step and nothing is published (the site keeps the previous release).
  - `Final output / rendered result:` the root of the site holds the page and the three files.
  - `Linked PRD IDs:` REQ-8.

# Reliability, Performance, and Scalability

- A static page: no runtime failure beyond a broken link. The page stays one file; the additions are text and one 25-line SVG, so the weight stays under about 60 KB (checked by `wc -c`, not a gate).
- The publish step fails closed (`set -euo pipefail`, `cmp`), so a bad copy never reaches Pages.
- The test is a node test with no jar, so it runs in the Page job in seconds.

# Security and Privacy

- No script from another origin, no tracker, no form. JSON-LD and Open Graph carry public facts only. The page does not claim anything the manual or the tool does not do (C4 and ArchiMate are named as what the views follow; no "certified" or "compliant").
- Links to external hosts are the repository, the releases, the container registry, `mit-license.org`; none is added with a parameter or personal data.

# Observability and Verification

Run by the task, from the repository root, with JDK 25 for Java (`JAVA_HOME` of sdkman 25: the shell default is 21 and the jar fails on it):

1. `node --test src/test/javascript/site.test.js` exits 0 (the criteria 3 and 4 of P1 are in it), then `npm run test:unit`, `npm run format:check` and `npm run lint` exit 0.
2. The criteria are owned by CTR-4; the gate asks for these grep commands: `grep -c '<h1' src/site/index.html` prints 1; `grep -c 'sample=archicode' src/site/index.html` prints at least 1; `grep -o 'C4\|ArchiMate\|PlantUML' <(sed -n '/<title>/p;/name="description"/p' src/site/index.html) | sort -u` prints the three words; `test -f` for the three files.
3. The commands on the page against the packaged jar (`./mvnw -q package -DskipTests` if `target/quarkus-app` is absent; the existing jar was built by an earlier run): `archicode init <tmp>`, `views generate -i shop_overview` in it, `query schemas manifest`, `diff --help`, `plateau fold --help`, `stories generate --help`; the output of `init` names the view id used in Get started. Record the commands in the run record.
4. A link check: every `href` of the page is an anchor of the page, `docs/` or `docs/#id` (the test), `editor/...` (the test), or an external address that the task opens once with `curl -sI` (200 or 301 to 200; recorded, not a gate, since the network may be down).
5. Render check: open `src/site/index.html` (file URL) in the browser pane in light and dark and at 360 px and 1280 px; confirm the first screen holds the claim, the figure and the hero button, with no horizontal scroll at 360 px, and describe it in the run record.
6. `./mvnw test -Dtest=ManualExamplesTest` is not needed (the manual is untouched); `git diff --stat` shows no file outside `IMP-1` to `IMP-5`; `git diff src/test/e2e` is empty.
7. The tag-only copy: the YAML of the step is read, and `bash -n` on its `run:` text is run; the behaviour on a real tag is proved only by the next release (the record says so).

# Deployment and Rollout

Code-and-content only, no data and no service: the page goes live with the next release tag, through the existing step. Compatible: the old addresses keep working (TG-4). Staging verification is the render check of Observability (5) and the run of the Page and E2E jobs on the pull request. Rollback: revert the commit; the next tag publishes the previous page. This section is planning guidance and does not authorise a release.

# Risks and Tradeoffs

- `RISK-1` The e2e spec finds the hero link by name; a rewording breaks `hosted-acceptance.spec.js` in the E2E job. Mitigation: CON-1, DEC-2, and a node test that the first link whose text is the phrase has the Brightcart href.
- `RISK-2` The hand-drawn hero SVG drifts from what the tool draws. Mitigation: it is a copy of the existing overview; DEF-1.
- `RISK-3` The step copying the files is tag-only, so a typo is found at the next release. Mitigation: the text test, `bash -n`, `set -euo pipefail`; the record says it is not proved by the pull request.
- `RISK-4` A command or option on the page goes stale. Mitigation: DEC-10 for names, check 3 for options, W-6 later.
- `RISK-5` Absolute URLs in the three files and the canonical are wrong for a fork or a custom domain (ASM-1). Mitigation: one place to change per file; the test reads the URL from one constant.
- `RISK-6` An `og:` or JSON-LD fact overstates the product ("C4 and ArchiMate"). Mitigation: DEC-7 words it as what the views follow, the page claims no certification and says the views follow C4 and ArchiMate (DEC-7, Security and Privacy).

# Open Questions

- `Q-1` (settled) The `llms.txt` shape. Decision: ASM-2, the llmstxt.org layout with absolute links; no tool in the repository validates it, and the test checks the H1 and the links only.
- `Q-2` (settled) The exact option values the page shows for `diff` and `plateau`. Decision: the task reads them from `archicode diff --help` and the manual's `[[diff]]` section when it writes the page, and the test does not pin the values (only the command names, DEC-10).
- `Q-3` (settled) Whether to add `og:image`. Decision: no, no binary (DEF-2).

No question is open and none needs the author.

# Deferred Work

- `DEF-1` A check that the hero SVG equals what `views generate` draws for the example (no tool compares an inline SVG today).
- `DEF-2` An `og:image` (a screenshot or a generated card) once the project wants a link preview.
- `DEF-3` `lastmod` in the sitemap and `softwareVersion` in the JSON-LD, stamped with the release.
- `DEF-4` A Playwright spec of the page at 360 px in both themes (DEC-9 checks it by eye).
- `DEF-5` Tying every option shown on the page to the binary (W-6 makes the manual's reference generated; the page is not part of it).

# File Placement and Frontmatter

Saved as `docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/tdd-0212-homepage.md`, with `type: tdd`, `run: 0212`, `wave: 030`, `status: draft`, `owner`, `date` and `related`, as the TDD of run 0211.
