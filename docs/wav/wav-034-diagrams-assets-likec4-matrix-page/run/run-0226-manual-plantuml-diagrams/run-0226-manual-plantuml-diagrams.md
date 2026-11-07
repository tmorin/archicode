---
type: run
run: 0226
status: completed
profile: single-document
wave: 034
---

# Run 0226 manual-plantuml-diagrams

Run of wave 034 (manifest id W-1, phase P1, source #209). Single-document: this file carries scope, decisions, canonical impact, tasks, verification and findings; there is no prd, tdd or pln.

## Problem

The manual (`src/doc/README.adoc`, built to `target/generated-docs/index.html` by `asciidoctor-maven-plugin` 3.2.0 in `generate-resources`) has 18 `[plantuml, <name>]` blocks. The plugin loads `asciidoctorj-diagram` 3.2.1, which does not carry PlantUML: on the starting repository every block renders the text `Could not load PlantUML. Either require 'asciidoctor-diagram-plantuml' ...` (18 times in `target/generated-docs/index.html`, 0 `<img>`, 0 `.png`). The build exits 0, so nobody saw it, and the website at `/docs/` shows 18 error texts. The job `Java` installs `graphviz` (PlantUML needs `dot`) but nothing else.

## Done when

1. With a JDK 25, `rm -rf target/generated-docs && ./mvnw -o generate-resources -Dmaven.test.skip` exits 0, `grep -c "Could not load PlantUML" target/generated-docs/index.html` prints 0, `ls target/generated-docs/*.png | wc -l` prints at least 18, and the page holds 18 `<img src="*.png">`.
2. `grep -c asciidoctorj-diagram-plantuml pom.xml` prints at least 1.
3. A step of the job `Java` in `.github/workflows/ci-build.yaml`, after "Build artifacts", holds the text `Failed to generate image`; its command, run in a scratch folder on a copy of the page where one block is replaced by that text, exits non-zero, and on the real page exits 0. The same command exits non-zero when the page holds fewer images than `src/doc/README.adoc` has `[plantuml` blocks.
4. `.github/CLAUDE.md` says what the step does; the comment of the job `Java` no longer says the manual "draws with graphviz" alone.
5. `./mvnw test-compile pmd:check` and `npm run format:check` exit 0 (the gate of P1); `npm run test:unit` passes (`changes-map.test.js` and `site.test.js` read the workflow).

## Decisions

- **D-1 The dependency.** Add `org.asciidoctor:asciidoctorj-diagram-plantuml:1.2024.0` to the `<dependencies>` of `asciidoctor-maven-plugin` in `pom.xml`, next to `asciidoctorj-diagram`, with a literal version like its neighbour. Reason: the wave verified `1.2024.0` loads on JDK 25; the starting repository already caches it in `~/.m2`. Checked in this run on a scratch copy of the pom with JDK 25.0.4: 18 PNG files in `target/generated-docs/`, 18 `<img src="<name>.png">` in the page, 0 error text, 49 s.
- **D-2 The check is a workflow step, not a Maven setting and not a Java test.** One step of the job `Java`, after "Build artifacts" and before the coverage upload, shell only, no new file. It runs on every pull request that touches Java (the manual is built by `./mvnw verify` on all of them) and on tags, where the same `target/generated-docs` becomes the artifact `manual` the website takes: the page the website publishes is the page that was checked.
- **D-3 What the step asserts**, on `target/generated-docs/index.html`: (a) the page exists; (b) the text `Failed to generate image` is absent; (c) the number of `<img src="...png"` is at least the number of lines of `src/doc/README.adoc` that start with `[plantuml`. (c) catches a block that renders nothing without the error text, (b) the error text the extension writes. Checked on scratch pages built with D-1: a block of non-PlantUML text and a block with a PlantUML syntax error each gave `Failed to generate image` once and no PNG for that block; a valid block gave one `<img>` and one PNG. The starting page (dependency missing) holds the same text 18 times. So a broken source and a missing dependency are both caught; a missing `dot` was not tried. The step prints the counts on failure. "At least" in (c) because a future `image::` of the manual must not fail the build.

## Rejected

- `<failIf>` of `asciidoctor-maven-plugin`: the wave's note says it was tried and the build still exits 0 with the errors; not retried.
- `DIAGRAM_PLANTUML_CLASSPATH` or a `plantuml-native` binary: both depend on the machine of the reader (CI, a developer, the release job); the Maven dependency is the one form that works from a clean checkout.
- A Java test that reads the generated page: `-Dplugin.asciidoctor.skip=true` is passed by the jobs `E2E`, `Build` and `Native`, where there is no page; a test would need its own skip rule for what a workflow step already scopes to the job that builds the manual.
- A script under `scripts/` with a node test: the check is five lines of shell and is proved by the run's own evidence; a file would need a rule in `scripts/changes.mjs` and a test for five lines.

## Tasks

All four done at Stage 10 (inline: single-document run, no pln, so no delegation tier).

1. `pom.xml`: D-1. Rebuild the manual (done-when 1, 2).
2. `.github/workflows/ci-build.yaml`: the step of D-2 and D-3, and the comment of the job `Java`. Prove it both ways on a scratch copy of the page (done-when 3).
3. `.github/CLAUDE.md`: the step in the paragraph of the jobs, one sentence, no history (done-when 4).
4. Format, PMD, `npm run test:unit` (done-when 5).

## Canonical impact

None. `docs/architecture/` models the program, the editor and their contracts; it holds no element for the build of the manual, `pom.xml` plugins or the workflow steps (grep `asciidoctor|graphviz` in `docs/architecture` finds nothing; the one `PlantUML` hit is the rendering package, which this run does not touch). `src/doc/README.adoc` says nothing about how the manual is built. The ripple is `.github/CLAUDE.md` (task 3).

## Open questions

- Q-1 (open, not a blocker) Does PlantUML 1.2024.0 draw on the `ubuntu-latest` runner of the job `Java` (headless AWT, `graphviz` from apt)? Proposed default: yes, `graphviz` is installed by the job already and AWT is headless without a display; proved only by the CI run of the pull request, so the hand-off says it is unproved until then. Not answerable on this machine.
  Stage 3: re-examined, kept open as an assumption. The repository gives no more: `ci-build.yaml` installs `graphviz` in the job `Java` (line 79) and the manual is built there already; no job runs PlantUML on the runner before, and an external fact about a hosted image cannot be looked up without running it. The step of D-2 turns a wrong answer into a red job (`Failed to generate image` or too few images), so the assumption fails loudly, not silently. Not a blocker for the later stages.
  Stage 6: single-document run, so there is no TDD and no other open question; Q-1 is the only one and is a fact about a hosted runner that only a CI run can answer. PlantUML sets AWT headless itself and the job `Java` already installs `graphviz`; the decision stays the stated assumption, guarded by the D-2 step. Left open as a note, not a blocker.

## Findings

- The starting message and the step's string are different texts of the same failure: 18 `Could not load PlantUML` and 18 `Failed to generate image` in the starting page. The step looks for the second, which the wave fixed; the first would not be caught by it if the extension changed its wording, so (b) of D-3 (the image count) is not redundant.

- The website takes `target/generated-docs` as the artifact `manual` (job `Java`, tags only, `include-hidden-files: true`) and `Assemble website` runs `cp -r target/generated-docs/. target/site/docs/`: the PNGs sit at the root of that folder (18 files, 2.0 MB with `.asciidoctor`), so they reach `/docs/` with no change to those two steps. Unproved until a tag run, as the rest of the website (wave Risks).
- The job `Java` runs on a pull request only when `scripts/changes.mjs` raises it: `.github/**` raises all four (R-06) and `pom.xml` raises `Java` and `E2E` (R-10), so this run's own pull request exercises the step.

## Verification

Stage 10, run by the leaf agent that implemented (JDK 25.0.4, offline Maven):

1. `rm -rf target/generated-docs && ./mvnw -o generate-resources -Dmaven.test.skip`: exit 0; `grep -c "Could not load PlantUML"` 0; `ls target/generated-docs/*.png | wc -l` 18; `<img src="*.png">` in the page 18; `Failed to generate image` 0.
2. `grep -c asciidoctorj-diagram-plantuml pom.xml`: 1.
3. The `run:` of the step "Check the manual has its diagrams" taken from the workflow with a YAML parser and run with `bash -eo pipefail` in scratch folders (as the Actions shell runs it): real page exit 0 (18 blocks, 18 images, 0 failed); a copy where one `<img` is replaced by the text `Failed to generate image` exit 1 (17 images, 1 failed); a copy with one image fewer and no error text exit 1 (17 images); no page exit 1.
4. `.github/CLAUDE.md` names the step and what it asserts; the comment of the job `Java` says PlantUML and graphviz and names the step.
5. `./mvnw -o test-compile pmd:check` exit 0; `npm run format:check` exit 0; `npm run test:unit` 3519 pass, 0 fail, 1 skipped.

Not verified here: Q-1 (PlantUML on the `ubuntu-latest` runner), the pull request's own CI run, and the website at `/docs/` after a tag.

Stage 11 (a leaf agent, re-run from scratch, JDK 25.0.4): done-when 1 to 5 hold. Manual rebuilt offline with exit 0: 0 `Could not load PlantUML`, 18 PNG, 18 `<img src="*.png">`, 0 `Failed to generate image`, 18 `[plantuml` blocks; `asciidoctorj-diagram-plantuml` once in `pom.xml`. The `run:` of the step, taken from the workflow with a YAML parser and run with `bash -eo pipefail` on scratch copies: real page exit 0, a page with one image replaced by the error text exit 1, no page exit 1. The step sits after "Build artifacts" in the job `Java`. `./mvnw -o test-compile pmd:check`, `npm run format:check` exit 0; `npm run test:unit` 3519 pass, 0 fail, 1 skipped. Diff review: `git diff --stat` shows `pom.xml`, the workflow and `.github/CLAUDE.md` for this run, no debug leftover. `.github/CLAUDE.md` holds no id, date or history.

Files outside likely_paths: none

Canonical obligations: none (Canonical impact: None; no CI-arc or CI-dom item, no analysis fulfilled). `docs/bkg/parked/` and `tooling/docs/check-backlog.py` do not exist in this repository, so no expiry sweep applies.

Still not verified: Q-1 (PlantUML on the `ubuntu-latest` runner, open and not a blocker), the pull request's CI run, the website at `/docs/` after a tag.

## Review

Review pass: dispatched. This stage ran in a leaf agent, other than the main agent that launched it. The run file held only its frontmatter when the stage began, so the same leaf agent wrote the body above before reviewing it: the review is not independent of the drafting, and the main agent should read it as such.

KDMLLC, referent read: `pom.xml` (asciidoctor plugin), `.github/workflows/ci-build.yaml`, `.github/CLAUDE.md`, `scripts/changes.mjs`, `src/doc/README.adoc`, `target/generated-docs`, `docs/architecture/`, and three scratch Maven runs of the manual on JDK 25.0.4. Intrinsic scores: KISS 5, DRY 4, MECE 4, LEAN 4, LUCID 4; C 4. Overall: strong.

| ID | Principle | Severity | Evidence | Applied |
|----|-----------|----------|----------|---------|
| F-1 | C-DOC | S3 | the first draft of D-4 said PlantUML draws an error picture for a syntax error and the step cannot catch it; a scratch block with a syntax error gave `Failed to generate image` and no PNG | yes: D-4 removed, D-3 states the checked behaviour |
| F-2 | C-DOC | S2 | "Rejected" named `Native`, `Build` and "the integration jobs" as the jobs that skip the manual; `ci-build.yaml` lines 279, 390, 405, 550 are `E2E`, `Build` and `Native` | yes |
| F-3 | MECE-MISSING | S2 | D-3 did not say what the step does when the page is missing | yes: (a) the page exists |
| F-4 | MECE-MISSING | S2 | nothing said whether the PNGs reach the website; `cp -r target/generated-docs/.` and the artifact `manual` carry them | yes: Findings |
| F-5 | C-DOC | S2 | "Findings" said a pull request touching `pom.xml` runs all four jobs; R-10 raises `Java` and `E2E` | yes |
| F-6 | DRY | S1 | Done-when 3 and D-3 both describe the step; one states what to prove, the other what it checks | kept: they have different owners |
| F-7 | LEAN | S1 | Done-when 5 asks for `npm run test:unit`, beyond the gate of P1 | kept: `changes-map.test.js` and `site.test.js` read the workflow |
