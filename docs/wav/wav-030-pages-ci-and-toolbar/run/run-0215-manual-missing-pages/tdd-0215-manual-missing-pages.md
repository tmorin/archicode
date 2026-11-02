---
title: Manual missing pages
type: tdd
status: draft
run: 0215
wave: 030
owner: tmorin
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0214-manual-concepts-and-voice/tdd-0214-manual-concepts-and-voice.md
  - src/doc/README.adoc
  - src/site/llms.txt
  - src/test/javascript/manual-voice.test.js
  - src/test/javascript/site.test.js
  - https://github.com/tmorin/archicode/issues/193
---

# Manual missing pages

# Summary

Review pass: done (2026-11-01, Stage 5, KDMLLC with the C scan; run by a different agent from the drafter, so the review is independent of the drafting). Findings F1 to F8 are in `prg-0215-manual-missing-pages.md`, section Findings, each with its row of status; they are applied in this file (task-001).

The manual sorted by run 0213 has a part `= How-to guides` that holds only `== Best Practices`, whose first paragraph promises six topics, two of which have a section. Nobody who wants to put ArchiCode in a build, or hand it to an agent, finds a page for it. This run writes those two pages (a CI how-to and an agent how-to), settles the Best Practices promises as Q2 decided (the topics that will not be written are dropped, the one that will be, CI/CD, becomes the CI page), and tells `src/site/llms.txt` where the Reference and Concepts parts are. No command changes; every command and exit code the pages show was run on the packaged jar while this TDD was drafted (see Current State).

There is no PRD (profile TDD+pln), so traceability is incomplete: requirements are labelled `REQ-n` from the manifest of wave 030 (row W-5, the second, third and fifth criteria of gate P2, decision Q2). No diagram: the change is text in one file, one text file and one test, with no new boundary and no branching flow.

# Scope

In scope: `src/doc/README.adoc` (two new sections of `= How-to guides`, the Best Practices introduction and its topic list, one link in Features, two part ids), `src/site/llms.txt`, a new node test `src/test/javascript/manual-howto.test.js`, the removal of one exemption from `src/test/javascript/manual-voice.test.js`, the run record.

Out of scope: the generated command reference and the test that compares it with `--help` (W-6); any change to a command, an option, a message or an exit code; the editor chapters; new tutorials; a tutorial on `docs/architecture` (the wave excludes it); the topics Best Practices drops (Q2); the homepage `src/site/index.html` (W-2, already names the agent commands); a split of the manual into several files (D2).

# PRD Traceability

No PRD. Requirements assumed from the manifest of wave 030.

- `REQ-1` (W-5 scope, gate P2 criterion 2): a How-to guide for CI that names `diff --fail-on` and the exit codes 1, 2 and 3. Addressed (DEC-1, DEC-2, CTR-1).
- `REQ-2` (W-5 scope, gate P2 criterion 2): a How-to guide for an agent that names `archicode guide`, `archicode init`, `query graph`, `query schemas manifest` and `docs/architecture`. Addressed (DEC-1, DEC-3, CTR-1).
- `REQ-3` (gate check, not a requirement of its own; gate P2 criterion 2): `./mvnw test -Dtest=ManualExamplesTest` exits 0 and no file of `src/doc/examples` is touched. Verified by Observability 2 and the `git diff --stat` of Observability 6.
- `REQ-4` (W-5 scope, Q2, gate P2 criterion 3): the topics Best Practices promises are written or dropped; the dropped ones are named in the record of W-5; `grep -c 'Pluggable Viewpoint Service' src/doc/README.adoc` prints 0. Addressed (DEC-4); the grep already prints 0 on the base copy.
- `REQ-5` (W-5 scope, gate P2 criterion 5): `src/site/llms.txt` names the Reference and Concepts parts and `node --test src/test/javascript/site.test.js` passes. Addressed (DEC-5, CTR-2).
- `REQ-6` (gate P2 criterion 1 and the wave's tests, held by W-3 and W-4): every id of `git show ff3bacd:src/doc/README.adoc` stays defined, the filler words stay out. Addressed (DEC-6).
- `REQ-7` (rule of `CLAUDE.md` "tested how the user will use it"): every command line the new pages show is true: it exists, takes the options shown, and exits with the code the page says. Addressed (DEC-6, Observability 3). Partly: the CI service wrapper (a workflow file) cannot be run by the repository's tests (ASM-3, RISK-2).

# Technical Goals

- `TG-1` A reader who wants a build to fail when one plateau of the workspace changes what another plateau holds (for example the to-be must not remove or move what the baseline has) finds one page, in the order of the job: which check, which command, what the exit code says, a runnable example, how to show the table in a pull request. The check compares two plateaus of the same checkout; a comparison with an earlier commit or with another branch is not offered by the command, and the page says so.
- `TG-2` A reader who is an agent (or sets one up) finds one page: what to read first, how to start, the loop, how to learn the exact shape of a file, how to read a model that exists.
- `TG-3` Best Practices promises nothing that has no page.
- `TG-4` An agent that reads `llms.txt` finds the Reference, the Concepts and the two how-tos.
- `TG-5` A later run cannot make the pages lie: a test reads the commands and options they show.

# Non-Goals

- No page for label formatting or diagram styling (Q2: dropped).
- No `archicode validate` or other command, and no CI integration of the project itself.
- No new fact about a command: the pages point to the Commands part for details and repeat only what they need (the exit codes, the `--fail-on` states).
- No rewrite of the Commands chapter `Errors, warnings and exit codes`, which stays the one place that defines the codes; the CI page links to it.
- No glossary and no screenshot.

# Assumptions

- `ASM-1` `= How-to guides` holds only `== Best Practices` (lines 874 to 964 of the working copy, the file has the uncommitted result of run 0214). Validate: `grep -n '^= \|^== ' src/doc/README.adoc` shows it before editing.
- `ASM-2` No test pins the bullets of the Best Practices topic list. Validate: `grep -rn 'Seamlessly\|Viewpoint Utilization\|Diagrams Styling' src/test` finds only `manual-voice.test.js:39-41`, the exemption of the CI/CD bullet. (The comment there says the skeleton test pins the bullet byte for byte; no assertion of `manual-skeleton.test.js` does, and the comment is corrected by DEC-4.)
- `ASM-3` The CI wrapper of the page is a GitHub Actions job that runs the OCI image `ghcr.io/tmorin/archicode` with `docker run`, the form the homepage already shows; the repository cannot run it. Validate: the arguments after `ghcr.io/tmorin/archicode` in it are read by the node test as an `archicode` command line (DEC-6) and are the ones of the run in Observability 3; the page says which line is the runner's and not ArchiCode's.
- `ASM-4` `docs/architecture` is read from a clone of the repository (it is not in the binary): `archicode query graph -w docs/architecture/.archicode.yaml`. Validate: `CLAUDE.md` says the same, and the run executes it on the jar.
- `ASM-5` `reference` and `concepts` are free as explicit ids of the manual and of the homepage. Validate: `grep -n '^\[\[reference\]\]\|^\[\[concepts\]\]' src/doc/README.adoc` prints nothing before editing; the homepage ids are `agents`, `ah`, `ah2`, `ah-hero`, `limits`, `main`, `plateau-states`, `site-version`, `solution`, `start`, `top`, `try` and the test of `site.test.js` ("no id of the page is an id of the manual") guards it.
- `ASM-6` The workspace of the example `domain_plateaus` holds a change of every state, so `diff --fail-on` on it exits 3 for each listed state; the exit 0 is shown on the bookshop of `src/test/resources/plateau-comparison` by `PlateauComparisonIT.diffFailOnExitsZeroWhenNoListedStateChanged`, not on a shipped example. Validate: Current State.

# Constraints

- `CON-1` The ids of `git show ff3bacd:src/doc/README.adoc` stay defined; `manual-skeleton.test.js` has a fixture of exactly 91 ids and asserts that count, so the new ids are not added to the fixture (the new test pins them).
- `CON-2` The six parts stay as they are, in order: `manual-skeleton.test.js` asserts the level-0 headings.
- `CON-3` The voice of run 0214: no gate word and no filler word outside listings and code spans (`manual-voice.test.js`), one word per thing (plateau, layer, view, viewpoint, sample, workspace), a plateau is never called a state; the states of `--fail-on` are the states of a row of the comparison and are called that.
- `CON-4` The explicit anchor of the llms.txt links must be a `[[id]]` at the start of a line (`manualIds()` in `site.test.js` reads `^\[\[...\]\]`), and `llms.txt` has one `# ` and only links that `site.test.js` accepts: `https://tmorin.github.io/archicode/docs/#id` with a defined id, or the three site addresses, or the repository.
- `CON-5` No command, message or exit code changes (wave Non-Goals). `PlateauComparisonTest` pins one sample of `diff` in the manual (`theManualShowsWhatTheCommandPrintsOnTheWarehouse`); the pages do not copy a table.
- `CON-6` Prettier covers `src/test/javascript/**/*.js`; ESLint runs on it with `--max-warnings 0`.

# Current State

Measured on the working copy while drafting (JDK 25 from sdkman, `target/quarkus-app/quarkus-run.jar` already built, `src/doc/examples/domain_plateaus` copied to a scratch folder):

- `src/doc/README.adoc` (the result of run 0214, uncommitted; 3793 lines when read on the working copy for this amendment) has `= How-to guides` at line 874, `== Best Practices` right after, with six bullets (Design Guidelines, Source Code Organization, Diagrams Styling, Label Formatting, Viewpoint Utilization, CI/CD Integration) and two sections, `=== Design Guidelines` and `=== Source Code Organization`. Four of the six bullets have no section. `= Reference` starts at 965, `= Concepts` at 3203. Neither part has an explicit id; both have only the generated one.
- `== Features` ends with a `.CI/CD Integration` paragraph ("Run ArchiCode in your CI/CD pipelines...") that points nowhere.
- The facts the CI page needs already exist in the Commands part: `[[errors-and-warnings]]` defines the exit codes 0 (done), 1 (an error), 2 (a usage error) and 3 (only `diff --fail-on`); `[[diff]]` documents `--fail-on` with its states `new`, `changed`, `removed`, `moved`, `split`, `merged`, `contains-changes`, `any`, `--no-wording`, `--format markdown|json|text` and `--width`.
- Run on the jar, in the folder of `domain_plateaus` (plateaus `baseline` and `to-be`): `diff --plateau to-be --against baseline --fail-on new` exits 3; `--fail-on moved,removed` exits 3; `--fail-on contains-changes` exits 3; `diff --plateau nope --fail-on any` exits 1 with `error: unknown plateau `nope`: the plateaus of this workspace are `baseline` and `to-be``; `diff --bogus` exits 2 with `Unknown option: '--bogus'` and the usage; `diff --plateau to-be --against baseline --fail-on weird` exits 1 with `error: `--fail-on` does not know the state `weird`: use ...`; `plateau list` and `query graph` exit 0. (Under JDK 21 the jar exits 1 with no message: it needs Java 25, a thing the page says.)
- `archicode guide` is documented at `[[guide]]` (first line `archicode guide <version>`, about 24 KB, kept under 30 KB by a test); `archicode init` at `[[init]]`; `query schemas manifest` at `[[manifest-schema]]`; the loop and the one-line errors are in the guide and `[[errors-and-warnings]]`. There is no `validate` command, and `[[guide]]` says so.
- `src/site/llms.txt` has one `# `, a `## Start here` list (Manual, Guide, Init, Install, Editor, Repository, Architecture of ArchiCode) and `## Optional`. It names no part of the manual. `site.test.js` ("llms.txt has one h1 and only links...") accepts `docs/#id` only for an id that `^\[\[id\]\]` defines.
- `manual-voice.test.js` exempts one line, `BEST_PRACTICES_CI_BULLET` (`/^- CI\/CD Integration: Seamlessly integrate ArchiCode\b/`), and its comment says run W-5 removes it with the list. `manual-skeleton.test.js` asserts no Best Practices text. `grep -c 'Pluggable Viewpoint Service' src/doc/README.adoc` prints 0.
- `docs/architecture` is the ArchiCode model of ArchiCode; `archicode query graph -w docs/architecture/.archicode.yaml` is the command `CLAUDE.md` gives. The model does not name the manual or `llms.txt` (`grep -rn 'README.adoc\|llms' docs/architecture` is empty).
- `PlateauComparisonIT` and `DiffFailOnTest` already run `diff --fail-on` (exit 3, exit 0, one `error:` line) on the shipped example and the bookshop; no test reads the manual's how-to text, which does not exist.

# Proposed Design

Content, in one file plus one text file, pinned by one node test.

`src/doc/README.adoc`, `= How-to guides`, in this order:

1. `[[howto-ci]]` `== Check the architecture in a build`
2. `[[howto-agent]]` `== Let an agent work on a workspace`
3. `== Best Practices` (kept, with a shorter introduction, DEC-4)

Shape of the CI page (about 70 lines; each item one short paragraph or one listing):

- Goal and the idea: a build that fails when a plateau changes what you said must not change, the guard of one plateau against another plateau (the to-be must not remove or move what the baseline has). The page names that a comparison with an earlier commit is not offered.
- The check, as one command line, `archicode diff --plateau to-be --against baseline --fail-on removed,moved`, the states and what each means in one line each (a pointer to `<<diff>>` for the rest), and why to list states and not `any`.
- What the exit code says, in a four-row table: 0 (nothing listed changed, or the comparison is only informative), 1 (the workspace is wrong or a plateau is unknown: one `error:` line on the error output), 2 (a usage error: an option that does not exist), 3 (the comparison holds a change of a listed state). Links to `<<errors-and-warnings>>`. The rule for a script: treat 3 as "the architecture changed", 1 and 2 as "the check could not run", and tell the two apart.
- The workspace check that comes first: `archicode query graph > /dev/null` exits 1 on a dangling reference (one line per problem).
- Show the table in the pull request: `--format markdown` to a file or a comment, `--no-wording`.
- One example of a GitHub Actions job that runs both commands from the OCI image, with a comment saying which lines belong to the runner; for another service, the same two commands.
- A requirement that the program needs Java 25 or the OCI image or the native file (pointer to `<<install>>`).

Shape of the agent page (about 60 lines):

- Goal: an agent that has the program and nothing else.
- Read once, `archicode guide` (versioned first line, self-contained, no workspace needed), pointer to `<<guide>>`.
- Start, `archicode init my-architecture` (never overwrites), pointer to `<<init>>`.
- The loop: write a manifest, `archicode query graph`, `archicode views generate`; one `error:` line per problem, the first one found; there is no `validate` command; exit codes (pointer).
- The exact shape of a kind: `archicode query schemas manifest` (one JSON object; `kinds[<header.kind>].content`; what the schema cannot say is in the guide), pointer to `<<manifest-schema>>`.
- A model to read: `docs/architecture` in a clone of the repository, `archicode query graph -w docs/architecture/.archicode.yaml`, and the same model in the editor (`sample=archicode`, link as the homepage has it); how to follow the `relationships` of an element (the `qualifiers` the manifests use). Pointer to the page `CLAUDE.md` is not made (it is a repository file, not manual content).
- Ask the tool before the code: `query graph | jq` example (the one the homepage shows), and `diff --fail-on` as a check (pointer to the CI page).

`src/site/llms.txt`: a new section `## Reference and concepts` between `## Start here` and `## Optional`, with four links: the Reference part (`docs/#reference`), the Concepts part (`docs/#concepts`), the CI how-to (`docs/#howto-ci`), the agent how-to (`docs/#howto-agent`), each with a line saying what a reader finds.

## Section map of Best Practices after the run

| Before | After |
|---|---|
| intro "holds the guidelines below" + six bullets | one sentence + two bullets (Design Guidelines, Source Code Organization) + one sentence pointing to `<<howto-ci>>` and `<<howto-agent>>` for the two things people ask for most |
| `=== Design Guidelines`, `=== Source Code Organization` | unchanged |

# Repository Impact

- `IMP-1` — The manual
  - Path(s): `src/doc/README.adoc`
  - Change type: modify (two new sections, a new introduction and list in Best Practices, one link in Features, two explicit ids on the part headings `= Reference` and `= Concepts`)
  - Why impacted: REQ-1, REQ-2, REQ-4, REQ-5.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4, REQ-5, REQ-6.
  - Risks / notes: the only file whose existing text changes; nothing under `src/doc/examples` changes; the six parts and the 91 ids stay (CON-1, CON-2). The two ids go on the line above the part heading (`[[reference]]` then `= Reference`).
- `IMP-2` — Llms.txt
  - Path(s): `src/site/llms.txt`
  - Change type: modify (one section, four links)
  - Why impacted: REQ-5.
  - Linked PRD IDs: REQ-5.
  - Risks / notes: the Pages publish step already copies and compares it (W-2); the links must be accepted by `site.test.js` (CON-4).
- `IMP-3` — The test of the pages
  - Path(s): `src/test/javascript/manual-howto.test.js`
  - Change type: additive
  - Why impacted: REQ-1, REQ-2, REQ-4, REQ-5, REQ-7; TG-5.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4, REQ-5, REQ-7.
  - Risks / notes: a node test, picked up by `npm run test:unit` and the job `Page`; it reads the manual from `MANUAL_HOWTO_PATH` or the repository (as `manual-voice.test.js` does) so that the run can show it fail on a copy.
- `IMP-4` — The voice test
  - Path(s): `src/test/javascript/manual-voice.test.js`
  - Change type: modify (remove the constant `BEST_PRACTICES_CI_BULLET` and its use, and the two comment lines above it)
  - Why impacted: the bullet leaves with the list (DEC-4); an exemption without a line to exempt is dead.
  - Linked PRD IDs: REQ-4, REQ-6.
  - Risks / notes: none; the test then reads the whole file with no exemption.
- `IMP-5` — The record
  - Path(s): `docs/wav/wav-030-pages-ci-and-toolbar/run/run-0215-manual-missing-pages/**`
  - Change type: additive
  - Why impacted: gate P2 criterion 3 asks that the dropped topics are named in the record of W-5.
  - Linked PRD IDs: REQ-4.
  - Risks / notes: the record names Diagrams Styling, Label Formatting and Viewpoint Utilization as dropped (DEC-4) and says a ticket follows if the author wants them.

Not touched, and the run proves it with `git diff --stat`: `src/doc/examples/**`, `src/main/**`, `src/site/index.html`, `src/site/sitemap.xml`, `src/test/javascript/manual-skeleton.test.js`, `src/test/javascript/manual-anchors.json`, `.github/**`.

# Canonical Impact

None. The repository declares no `arc` or `dom` register (`docs/CLAUDE.md` does not exist), and the ArchiCode model in `docs/architecture` names neither the manual nor `llms.txt` (`grep -rn 'README.adoc\|llms' docs/architecture` is empty), so no element or relationship goes stale. `CI-arc-1` and `CI-dom-1` are not raised.

# Data Model and Contracts

- `CTR-1` — The two how-to sections as an addressable contract
  - Current contract: no `[[howto-ci]]` and no `[[howto-agent]]`; `= How-to guides` holds only Best Practices.
  - Proposed contract: two level-1 sections (`==`) of `= How-to guides` with the explicit ids `howto-ci` and `howto-agent`, placed before `== Best Practices`. The CI section contains the strings `diff --fail-on`, `archicode query graph` and the digits 1, 2 and 3 as exit codes in a table with `<<errors-and-warnings>>`; the agent section contains `archicode guide`, `archicode init`, `query graph`, `query schemas manifest` and `docs/architecture`. Every `archicode ...` command line of a listing in the two sections, whatever its language (shell or YAML), and every argument list after `ghcr.io/tmorin/archicode` in a `docker run` line of the CI job read as an `archicode` command line, starts with a command of the Commands part and uses only options (long and short, such as `-w` and `-f`) the Commands part documents; the global `-w` is accepted before the command as well as after it (both orders exit 0 on the jar).
  - Affected files: `src/doc/README.adoc`, `src/test/javascript/manual-howto.test.js`.
  - Migration or compatibility notes: additive; the anchors are new, so nothing outside links to them yet except `llms.txt` (CTR-2). They are not in the 91-id fixture (CON-1); the new test pins them.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-7.
- `CTR-2` — The two part ids and llms.txt
  - Current contract: the parts `= Reference` and `= Concepts` have generated ids (`_reference`, `_concepts`) that `llms.txt` could not use (the test reads explicit `[[id]]`); `llms.txt` links the manual as a whole.
  - Proposed contract: `[[reference]]` on the line before `= Reference` and `[[concepts]]` on the line before `= Concepts`; `llms.txt` links `https://tmorin.github.io/archicode/docs/#reference`, `.../docs/#concepts`, `.../docs/#howto-ci`, `.../docs/#howto-agent`. The explicit ids replace the generated ids `_reference` and `_concepts` (an explicit `[[id]]` replaces the generated one), so `docs/#_reference` and `docs/#_concepts` stop existing (they exist today in `target/generated-docs/index.html`). No link in the repository uses them: `grep -rn '#_reference\|#_concepts' src README.md docs --exclude-dir=wav` prints nothing, and `grep -rn '#_reference' . --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git --exclude-dir=wav` prints nothing (the records of the waves and this TDD quote the string and are excluded).
  - Affected files: `src/doc/README.adoc`, `src/site/llms.txt`.
  - Migration or compatibility notes: no id of the 91 is removed; two generated part ids are replaced (the `_reference` and `_concepts` addresses stop existing, nothing links to them); no id of the homepage collides (ASM-5).
  - Linked PRD IDs: REQ-5.
- `CTR-3` — The Best Practices topic list
  - Current contract: six bullets that name topics; four have no section.
  - Proposed contract: a list of the topics that have a section, each a bullet that names the section; no bullet for Diagrams Styling, Label Formatting, Viewpoint Utilization or CI/CD Integration; the CI/CD promise is kept by a sentence that points to `<<howto-ci>>`.
  - Affected files: `src/doc/README.adoc`, `src/test/javascript/manual-voice.test.js` (the exemption goes).
  - Migration or compatibility notes: removal of four bullets; no id is removed (none of the bullets had one).
  - Linked PRD IDs: REQ-4, REQ-6.

# Interfaces and Behavior

- `IF-1` The reader of the manual in a browser: sees the two sections first under How-to guides, in the table of contents (the book has `:toclevels: 1`, so each `==` is an entry), and reaches them by `docs/#howto-ci` and `docs/#howto-agent`.
- `IF-2` The reader of `llms.txt` (an agent): sees the section `## Reference and concepts` with four links, the same four addresses the manual defines.
- `IF-3` The reader who runs a command from a page: gets what the page says. The page says for each command line what it prints or which exit code it gives; the node test checks the command and its options exist (DEC-6) and the run checks the codes (Observability 3).
- Error states: a command line that the page shows and the program does not have makes the node test fail with the line number; an id the test pins that is missing fails it; a link of `llms.txt` to an id the manual lacks fails `site.test.js`.

# Flows and Processing Logic

- `FLOW-1` — Writing the pages and proving them
  - Trigger: the plan's tasks, in order.
  - Steps: (1) baseline: the Asciidoctor warnings and the id-to-heading pairs of the build of the base copy (as run 0214 did) and the greps of Current State; (2) the node test `manual-howto.test.js`, red: the sections and the strings are absent; (3) write the CI section, then the agent section, then Best Practices and Features; (4) the two part ids and `llms.txt`; (5) remove the exemption of the voice test; (6) run the test, the three neighbouring node tests (`manual-skeleton`, `manual-voice`, `site`), `ManualExamplesTest` and the build; (7) run every command line of the pages on the jar and record the exit codes; (8) mutation checks on a copy; (9) the record names the dropped topics.
  - Branches / failure paths: a gate word or a filler word in the new text fails `manual-voice.test.js` (rewrite it, no exemption); a new id that collides with the homepage fails `site.test.js` (rename it); an Asciidoctor warning that was not there before is fixed or listed.
  - Final output / rendered result: `target/generated-docs/index.html` with the two new entries under How-to guides and the part ids.
  - Linked PRD IDs: REQ-1 to REQ-7.

# Reliability, Performance, and Scalability

Content only. The one risk of reliability is a page that drifts from the tool: the node test checks commands and options, the existing `DiffFailOnTest`, `PlateauComparisonIT` and `AgentWalkIT` check the behaviour the pages state, and W-6 adds a test that compares the whole command reference with `--help`. The pages are short on purpose: what the tool does is in the Commands part, defined once.

# Security and Privacy

The CI example runs a published image and passes the checkout as a volume; it holds no secret, no token and no deploy step, and the page says the job only reads files. The example pins nothing it cannot name: it tells the reader to pin the image to a release tag (`ghcr.io/tmorin/archicode:<version>`) as for any build tool. The release image is tagged with the project version by the Quarkus default (Q-2, read in `ci-build.yaml`); the untagged name is the latest main build, which the page says.

# Observability and Verification

1. Before editing: `node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/site.test.js` passes; the Asciidoctor lines (`./mvnw -o generate-resources`, the lines that match `asciidoctor: (WARNING|ERROR|INFO)`) and the id-to-heading pairs of `target/generated-docs/index.html` are kept; the greps of Current State give the same numbers.
2. After: `node --test src/test/javascript/manual-howto.test.js` and the three tests above pass; `npm run test:unit`, `npm run format:check` and `npm run lint` exit 0; `./mvnw test -Dtest=ManualExamplesTest` and `./mvnw test -Dtest=PlateauComparisonTest` exit 0; the Asciidoctor warnings after are not more than before and the id-to-heading pairs equal the ones before except the two new sections and the two part ids; the gate commands pass: `grep -c 'Pluggable Viewpoint Service' src/doc/README.adoc` prints 0, the new test shows both sections name what the gate lists, every id of `git show ff3bacd:src/doc/README.adoc` is defined (the skeleton test), `site.test.js` passes with the new links.
3. The commands run, by script, on the jar (JDK 25) in a copy of `domain_plateaus` and in an `init` folder: every `archicode ...` line of the two pages, with its exit code, listed in the record: `diff --plateau to-be --against baseline --fail-on removed,moved` exits 3; the same with `--fail-on weird` exits 1; `diff --bogus` exits 2; `query graph` exits 0 and on a copy with a dangling reference exits 1 with an `error:` line; `guide`, `init`, `query schemas manifest` exit 0; `query graph -w docs/architecture/.archicode.yaml` exits 0. The exit 0 of a `--fail-on` with no listed change is read in `PlateauComparisonIT.diffFailOnExitsZeroWhenNoListedStateChanged`; the record names it.
4. Mutation checks on a copy (the test reads `MANUAL_HOWTO_PATH`; the record says what was done, nothing broken is committed): delete `diff --fail-on` from the CI section, change one option of a command line to one the Commands part lacks, remove `[[howto-agent]]`, move a section after Best Practices, put back the CI/CD bullet; each makes `manual-howto.test.js` or `manual-voice.test.js` fail. For `llms.txt`, point one link to `docs/#nowhere` and see `site.test.js` fail.
5. A reader pass by eye: the two pages read top to bottom, rendered in `target/generated-docs/index.html`, with the table of contents looked at.
6. `git diff --stat` shows only the files of IMP-1 to IMP-5 (against the state at the start of the run, since the run 0214 files are uncommitted).

# Deployment and Rollout

Content and one test: no data, no service, no pom change, no workflow change. The manual and `llms.txt` go live with the next release tag through the existing Pages step (unchanged; `src/doc/README.adoc` runs the Java and Page jobs, `src/site/llms.txt` the Page job, a new node test the Page job). The publish of the Pages is not proved by a pull request (wave Risks); this run changes no step of it. Compatible: no id of the 91 is removed; two generated part ids (`_reference`, `_concepts`) are replaced by the explicit ones and nothing in the repository links to them. Rollback: revert the commit.

# Risks and Tradeoffs

- `RISK-1` The pages repeat a fact that the Commands part says (the exit codes, the `--fail-on` states) and the two drift. Mitigation: the CI page states each only in one line and points to `<<errors-and-warnings>>` and `<<diff>>`; the node test pins the digits and the option names; W-6 compares the reference with `--help`.
- `RISK-2` The GitHub Actions job is not run by the repository's tests. Mitigation: it only wraps the two commands that the run executes; the page says so; ASM-3. Accepted.
- `RISK-3` The node test checks that a command exists, not that its output is as the prose says. Mitigation: the prose says only the exit code and the first words of one `error:` line, which `DiffFailOnTest`, `PlateauComparisonIT` and the run's script check.
- `RISK-4` An agent page in a manual that agents read as a book goes stale as the guide changes (24 KB, generated in part). Mitigation: it points to the guide for content and says only the order of use.
- `RISK-5` Dropping Viewpoint Utilization goes one step further than Q2 (which names two topics). Mitigation: DEC-4 says why; the viewpoints are already the chapter `[[viewpoints]]` of Reference; the record names it, so a ticket is a one-line decision (Q-1).
- `RISK-6` A new `==` between Start here and Best Practices changes how the table of contents reads (three entries under How-to guides). Accepted: the purpose.
- `RISK-7` W-6 and W-7 to W-8 edit the same file after this run and bring the filler or lose an id. Mitigation: the three node tests run in the Page job for every later run.

## Decisions

- `DEC-1` — Where the two pages live
  - Decision: two `==` sections at the top of `= How-to guides`, before Best Practices, with the ids `howto-ci` and `howto-agent`, titled "Check the architecture in a build" and "Let an agent work on a workspace".
  - Rationale: a how-to is a task (Diátaxis, the sort of run 0213); the two tasks people ask for come before the general guidelines; explicit ids keep the address stable if a title changes and give `llms.txt` a link (CON-4).
  - Alternatives considered: sections under Best Practices (rejected: they are tasks, not guidelines, and Best Practices has no table-of-contents weight, `toclevels: 1` shows only `==`); one page "Integrate ArchiCode" for both (rejected: two readers, two goals, and the gate asks for two guides); a new part (rejected: the six parts are fixed by CON-2).
  - Tradeoffs: Best Practices moves down two entries.
  - Linked PRD IDs: REQ-1, REQ-2.
- `DEC-2` — The CI page: one check, the exit code first, a runnable example
  - Decision: the page gives one command (`diff --plateau to-be --against baseline --fail-on removed,moved`) built on the example `domain_plateaus`, a guard of one plateau against another plateau (not of a branch against main, which the command does not offer), explains the codes 0, 1, 2 and 3 in a table, puts the load check (`query graph`) first, shows `--format markdown` for a pull request comment, and ends with a GitHub Actions job on the OCI image; it does not define the codes (it links `<<errors-and-warnings>>`).
  - Rationale: the reader's question is "what makes my build red, and why"; 3 is the one code only `--fail-on` gives and the one a script must tell from 1 and 2; the OCI image is the form that works on any runner and that the homepage shows; the codes stay defined once.
  - Alternatives considered: `--fail-on any` as the example (rejected: it fails on every change, which is a review and not a guard; the page says when to use it); a native-file download in the job (rejected for the example: it needs the checksum and the file name per version, see `<<install>>`); several CI services (rejected: the two commands are the portable part).
  - Tradeoffs: the job is not run by the repository (RISK-2).
  - Linked PRD IDs: REQ-1, REQ-7.
- `DEC-3` — The agent page: order of use, no copy of the guide
  - Decision: the page gives the order (guide, init, loop, schemas, a model to read, ask before coding), one command each, and a pointer for the detail; `docs/architecture` is introduced as a workspace to read with `query graph -w docs/architecture/.archicode.yaml` from a clone, and the same model in the editor (`sample=archicode`).
  - Rationale: the guide is the self-contained text for an agent and is tested; the manual page tells a human who sets up an agent where it starts, and tells an agent that reads the manual the same thing in less text; copying the guide would add a third place that drifts.
  - Alternatives considered: a tutorial on `docs/architecture` (excluded by the wave); the whole guide inlined (rejected: 24 KB, duplicate); only a pointer (rejected: the gate asks the page to name the commands and the model).
  - Tradeoffs: the page is short and leans on three other sections.
  - Linked PRD IDs: REQ-2.
- `DEC-4` — The Best Practices promises
  - Decision: the introduction becomes one sentence and the list keeps the two topics that have a section (Design Guidelines, Source Code Organization); Diagrams Styling and Label Formatting are dropped (Q2); Viewpoint Utilization is dropped too (no section, and the chapter `[[viewpoints]]` of Reference says what the viewpoints draw); CI/CD Integration is no longer a promise, the CI page exists and one sentence points to it; the Features paragraph `.CI/CD Integration` gets a link to `<<howto-ci>>`; the exemption of `manual-voice.test.js` and its stale comment go.
  - Rationale: Q2 says drop what will not be written and say so in the record; a bullet with no section is a broken promise; Viewpoint Utilization has the same shape as the two dropped topics and none of the gate's grep depends on it.
  - Alternatives considered: write the three topics (rejected: Q2, and no fact exists to base them on without new content); keep the bullets and mark them "to come" (rejected: the Pluggable Viewpoint Service finding was the same promise).
  - Tradeoffs: one decision beyond Q2's two topics (RISK-5, Q-1).
  - Linked PRD IDs: REQ-4, REQ-6.
- `DEC-5` — Llms.txt links by explicit part ids
  - Decision: give the part headings `= Reference` and `= Concepts` the explicit ids `reference` and `concepts`, and link the four ids from a new section of `llms.txt`.
  - Rationale: `site.test.js` accepts `docs/#id` only for a `[[id]]` at the start of a line; the generated ids are not read by it and change with the title.
  - Alternatives considered: link `docs/#_reference` (rejected: not an id the test knows, and breaks if the title changes); extend `site.test.js` to read generated ids (rejected: wider change, and the explicit id is the manual's own rule for an address); link only `docs/` (rejected: the gate says name the parts).
  - Tradeoffs: two ids that are not in the 91-id fixture, pinned by the new test instead (CON-1).
  - Linked PRD IDs: REQ-5, REQ-6.
- `DEC-6` — One node test for the pages
  - Decision: `manual-howto.test.js` reads the manual as text (`MANUAL_HOWTO_PATH` or the repository), and checks: the two ids are defined, in order, as `==` sections of `= How-to guides` before `== Best Practices`; each required string of CTR-1 appears in its section; the exit codes 1, 2 and 3 are all in the CI section; every `archicode ...` line of every listing of the two sections (the listing language is not a filter) and the arguments after `ghcr.io/tmorin/archicode` in the `docker run` line of the CI job, read as an `archicode` command line, start with a command that has a section in the Commands part and use only options, long or short (`-w`, `-f`), that appear in the Commands part outside these two sections, with the global `-w` accepted before the command; `reference` and `concepts` are defined before `= Reference` and `= Concepts`; Best Practices has no bullet for the dropped topics; `llms.txt` links the four ids. Checks of words and of structure, not of prose.
  - Rationale: the repository's rule (CLAUDE.md) is that the editor, the command line and their texts agree through cases that a test reads; a how-to that names a command or option that does not exist is the failure a user finds first. The Commands part is the written reference of the options until W-6 generates it.
  - Alternatives considered: a Java integration test that runs the commands (rejected here: `PlateauComparisonIT`, `DiffFailOnTest` and `AgentWalkIT` already run them; the run executes the page's own lines once, Observability 3); no test (rejected: nothing then stops a later run from breaking the pages).
  - Tradeoffs: it does not prove the output a page quotes; W-6 widens the check.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4, REQ-5, REQ-7.

# Open Questions

- `Q-1` (decided by the drafter; the author may overturn it at the plan review). Does the run drop Viewpoint Utilization, which Q2 of the wave does not name (Q2 names two promises; this is a third)? Yes, DEC-4; the record names it and says a ticket follows if the author wants the topic written. Impact if the author disagrees: one bullet and one section to write, no other part moves.
- `Q-2` (settled in Stage 6). Does the OCI image have release tags, so the example can pin `ghcr.io/tmorin/archicode:<version>`? Yes, by the Quarkus default. Read in `.github/workflows/ci-build.yaml` (lines 385-387 and 396-401) and `src/main/resources/application.properties` (`quarkus.container-image.registry=ghcr.io`, `group=tmorin`, `name=archicode`): the release step sets no `quarkus.container-image.tag`, so the Jib extension tags the image with the project version, the number `archicode --version` prints; the main-snapshot step sets `tag=latest`. Decision: the example pins `ghcr.io/tmorin/archicode:<version>` with the number `--version` prints, and the page says the untagged name is the latest main build, not a release. Not proved against the registry (no network check in this stage): the task that writes the sentence confirms the default tag in the Quarkus container-image documentation first. Observation, out of scope (the homepage `src/site/index.html` is not touched by this run): its untagged example resolves to the main snapshot.
- `Q-3` (settled). Does the CI page add a `validate` step? No: there is no such command (the guide says so); `query graph` is the load check.

# Deferred Work

- `DEF-1` Pages for diagram styling, label formatting and viewpoint utilization, if the author asks (a ticket, not a bullet).
- `DEF-2` A CI example run by the repository's own workflow (a job that runs `diff --fail-on` on `domain_plateaus`), to make RISK-2 zero; a CI change, outside this run.
- `DEF-3` The command reference generated from `--help` (W-6), after which `manual-howto.test.js` can read it instead of the hand-written Commands part.
- `DEF-4` A page for stories and for the facets in a build.

# File Placement and Frontmatter

This file is `docs/wav/wav-030-pages-ci-and-toolbar/run/run-0215-manual-missing-pages/tdd-0215-manual-missing-pages.md`, after `tdd-0214-manual-concepts-and-voice.md`. Frontmatter: `title`, `type: tdd`, `status: draft`, `run: 0215`, `wave: 030`, `owner`, `date`, `related`.
