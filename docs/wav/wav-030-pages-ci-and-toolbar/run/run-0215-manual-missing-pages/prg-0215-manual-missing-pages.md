---
type: prg
status: completed
run: 0215
wave: 030
---

# Progress Log: Run 0215

## Log

- 2026-11-01: Stage 4 drafted tdd-0215-manual-missing-pages.md (no PRD, REQ-1 to REQ-7; DEC-1 to DEC-6): two how-to sections (`howto-ci`, `howto-agent`) before Best Practices, Best Practices promises dropped per Q2 plus Viewpoint Utilization (Q-1 settled), explicit ids `reference`/`concepts` for llms.txt, new node test manual-howto.test.js, the voice-test exemption removed; commands and exit codes run on the jar (JDK 25); Q-2 (image release tag for the CI example) open, not a blocker.
- 2026-11-01: Stage 5 KDMLLC review of tdd-0215-manual-missing-pages.md by a leaf agent (not the drafter), C scan against README.adoc, llms.txt, site.test.js, manual-skeleton/voice tests, ci-build.yaml and the jar (JDK 25): intrinsic principles Acceptable, C Needs revision; 8 findings (0 S3, 4 S2, 4 S1) recorded under Findings for the main agent to apply; no TDD text changed except the review line; Q-2 is resolvable (F4), no blocker.
- 2026-11-01: Stage 6 resolved the TDD's open questions: Q-2 settled from ci-build.yaml and application.properties (release image tagged by the Quarkus default, the `--version` number; `latest` only on main), the example pins `:<version>`, the registry itself not checked; Q-1 reworded as decided by the drafter, open to the author at the plan review (F8); Q-3 stays settled; no blocker. The other Stage 5 findings (F1-F7) are not applied here.

## Findings

### Stage 5 review of the TDD (KDMLLC, 2026-11-01), to apply

Verdict: KISS 4 Acceptable, DRY 4 Acceptable, MECE 3 Acceptable, LEAN 3 Acceptable, LUCID 3 Acceptable, C 3 Needs revision. Overall Acceptable. Top concern: the CI page's promise ("a build that fails on an architecture change") is wider than `diff --plateau to-be --against baseline` delivers, and the node test cannot see the commands of the CI job.

Verified true on the jar (JDK 25) and the files: ids `guide`, `init`, `install`, `diff`, `errors-and-warnings`, `manifest-schema`, `viewpoints` are defined; `= How-to guides` at 874, `= Reference` at 965, `= Concepts` at 3203; `diff ... --fail-on removed,moved` exits 3 on `domain_plateaus`; `query graph`, `query schemas manifest`, `query graph -w docs/architecture/.archicode.yaml` exit 0; no `docs/CLAUDE.md`; homepage ids and the 91-id fixture assertion are as stated; `site.test.js` reads `^\[\[id\]\]`; `Pluggable Viewpoint Service` grep is 0.

- F1 (S2, LUCID and C-DOC) The CI idea is "fail when the architecture changes", but the command compares two plateaus of the same checkout (`--plateau to-be --against baseline`), not the branch with main or the previous commit; with the example it fails whenever the plan itself removes or moves something. Evidence: TDD TG-1, Summary, FLOW-2 vs `[[diff]]` (README.adoc:2620+, `--against`: "any plateau of the tree"). Fix: say in TG-1, DEC-2 and the page shape that the check guards a plateau against another plateau (for example "the to-be must not remove or move what the baseline has"), name that a comparison with an earlier commit is not offered, and drop "when the architecture changed" from FLOW-2 and the exit-3 line ("the comparison holds a change of a listed state").
- F2 (S2, C-DOC) The node test cannot check the commands of the CI job. DEC-6 and CTR-1 read lines of `[source,shell]` listings that start with `archicode`, while ASM-3 and DEC-2 put the commands in a GitHub Actions job as `docker run ... ghcr.io/tmorin/archicode diff ...` (a YAML listing, the form of `src/site/index.html:424`); ASM-3 says the job's commands are those of the node test, which is false as written. Fix: make DEC-6 also read, in every listing of the two sections, the arguments after `ghcr.io/tmorin/archicode` as an `archicode` command line, and say the listing language is not a filter; also read short options (`-w`, `-f`) and accept the global `-w` before the command (both orders exit 0 on the jar).
- F3 (S2, C-DOC) CTR-2 says the generated ids `_reference` and `_concepts` "keep working if Asciidoctor still emits them next to the explicit one". An explicit `[[id]]` replaces the generated id, so `docs/#_reference` and `docs/#_concepts` stop existing (they exist today in `target/generated-docs/index.html`). Deployment says "no address is removed", which is then false for those two. Fix: state that the explicit ids replace the generated ones, that no link in the repository uses them (the grep finds only this TDD; run it with this file excluded), and word the compatibility line "no id of the 91 is removed; two generated part ids are replaced".
- F4 (S2, C-UNCHECKED, resolves Q-2) The image tag scheme is readable now. `.github/workflows/ci-build.yaml:385-387` pushes `latest` only on a main snapshot; `:396-401` (release) sets no tag, so the Quarkus default applies (the project version, the number `archicode --version` prints). The consequence is that the untagged `ghcr.io/tmorin/archicode` of the homepage is the main snapshot, not a release. Fix: settle Q-2 as: the example pins `ghcr.io/tmorin/archicode:<version>` with the number `--version` prints, and the page says the untagged name is the latest main build; the task still confirms the default tag against the registry or Quarkus documentation before writing the sentence (not proved here). Log the homepage's untagged example as an observation (out of scope: W-2, `index.html` is not touched by this run).
- F5 (S1, DRY and LEAN) FLOW-2 restates the CI page shape of Proposed Design and its branches restate DEC-2's exit-code table; Observability 2 and 4 repeat the same node-test and grep runs; Summary and Scope list the same files. Fix: delete FLOW-2 (keep FLOW-1), merge Observability 4 into 2.
- F6 (S1, C-DOC) Current State says README.adoc is 3770 lines; it is 3793 now (the part headings are still at 874, 965 and 3203). Fix: the number, or drop the count and keep the heading lines.
- F7 (S1, LUCID) `REQ-3` is a proof (no example file touched), not a requirement, and its "Addressed (IMP-1)" is circular. Fix: label it as a gate check, or fold it into REQ-1 and REQ-2.
- F8 (S1, LUCID) Q-1 is "settled" by the drafter, but Q2 of the wave names two promises and the author answered only those; dropping Viewpoint Utilization is a third. Fix: keep DEC-4, but word Q-1 as "decided by the drafter, the author may overturn at the plan review" (RISK-5 already says so; the Open Questions entry should match).

Not findings (checked): the Best Practices bullets are pinned by no test except the voice exemption; `manual-skeleton.test.js` asserts no Best Practices text; `manual-voice.test.js:38-41` exemption is dead after DEC-4; the new ids `howto-ci`, `howto-agent`, `reference`, `concepts` collide with no homepage id.

### Application of the Stage 5 findings (task-001, 2026-11-01)

Measured facts re-read on the working copy: `README.adoc` 3793 lines, parts at 874, 965 and 3203; `ci-build.yaml` lines 385-387 (`tag=latest` on main) and 396-401 (release, no tag); `grep -rn '#_reference\|#_concepts' src README.md docs --exclude-dir=wav` and the same for `#_reference` over the repository without `wav` print nothing. No finding contradicts a measured fact.

| Finding | Status | Where in the TDD |
|---|---|---|
| F1 | applied | TG-1, Proposed Design (CI page shape), DEC-2: a plateau guarded against another plateau, no comparison with an earlier commit; FLOW-2 and its "architecture changed" wording are gone |
| F2 | applied | ASM-3, CTR-1, DEC-6: every listing whatever its language, arguments after `ghcr.io/tmorin/archicode` read as an `archicode` command line, short options, global `-w` before the command |
| F3 | applied | CTR-2, Deployment: explicit ids replace `_reference` and `_concepts`; no id of the 91 removed, two generated part ids replaced; grep run with the records excluded |
| F4 | applied | Q-2 stays settled (Stage 6); Security and Privacy aligned; homepage untagged example kept as an observation in Q-2; the confirmation of the default tag against the Quarkus documentation stays with the task that writes the sentence |
| F5 | applied | FLOW-2 deleted (FLOW-1 kept); Observability 4 merged into 2, items renumbered 1 to 6 |
| F6 | applied | Current State: the line count is 3793 and the heading lines are kept |
| F7 | applied | REQ-3 labelled a gate check, verified by Observability 2 and 6 |
| F8 | applied | Q-1 worded decided by the drafter, open to the author at the plan review (already so since Stage 6; RISK-5 and DEC-4 agree) |

## Record of the run (task-007, 2026-11-01)

### What changed

- `src/doc/README.adoc`: under `= How-to guides`, `[[howto-ci]]` "Check the architecture in a build" and `[[howto-agent]]` "Work with an agent", in that order, before `== Best Practices`; Best Practices keeps only Design Guidelines and Source Code Organization and points to the two pages; explicit part ids `[[reference]]` and `[[concepts]]` replace the generated `_reference` and `_concepts`.
- `src/site/llms.txt` links `docs/#reference`, `docs/#concepts`, `docs/#howto-ci`, `docs/#howto-agent`.
- `src/test/javascript/manual-howto.test.js` is new; the exemption in `src/test/javascript/manual-voice.test.js` is removed.

### Topics dropped from Best Practices

Three bullets promised pages the manual does not have and are removed (`grep -c "Pluggable Viewpoint Service" src/doc/README.adoc` prints 0):

- Diagrams Styling
- Label Formatting
- Viewpoint Utilization (a third topic beyond the two Q2 names, decided by the drafter, Q-1)

A ticket follows if the author wants any of them written (DEF-1). The viewpoints are already the chapter `[[viewpoints]]` of Reference.

### Exit codes run on the jar (JDK 25, copy of `domain_plateaus` and an `init` folder, scratchpad `r7`)

| Command | Exit |
|---|---|
| `query graph` (domain_plateaus) | 0 |
| `diff --plateau to-be --against baseline --fail-on removed,moved` | 3 |
| `diff ... --fail-on weird` | 1, one `error:` line ("`--fail-on` does not know the state `weird`") |
| `diff --bogus` | 2 (Picocli "Unknown option" and usage) |
| `diff ... --format markdown --no-wording` | 0 |
| `init my-arch`, `guide`, `query schemas manifest` | 0 |
| `query graph -w my-arch/.archicode.yaml` | 0 |
| `query graph -w docs/architecture/.archicode.yaml` | 0 |

Exit 0 of `--fail-on` with no listed state is read in `PlateauComparisonIT.diffFailOnExitsZeroWhenNoListedStateChanged`, not rerun here. `views generate` and the dangling-reference case (exit 1 of `query graph`) were not rerun by this task.

### Reader pass

Read from the page source and the built `target/generated-docs/index.html`: ids `howto-ci`, `howto-agent`, `reference`, `concepts` exist and the table of contents lists both new sections; `_reference` and `_concepts` are gone as the TDD states. Render in the browser pane: NOT CHECKED (the pane refused to open the `file://` page). The two pages were read as text only.

Observations from the reading, no missing fact found:

- The CI page ends the exit-code table with "3 ... the architecture changed" and "Treat 3 as the architecture changed"; the finding F1 wanted the narrower wording (a listed state of the comparison changed). The first cell says it well; the closing sentence is wider. Left for the author at gate-001.
- The CI example pins `:${ARCHICODE_VERSION}` set to `0.0.0`, the registry was not checked for the tag scheme (stated on the page).
- The untagged `ghcr.io/tmorin/archicode` of the homepage (`src/site/index.html`) is the latest main build, not a release; the homepage is out of scope (W-2) and not touched.

### Open for the author

- Q-1: dropping Viewpoint Utilization is the drafter's decision, open at the plan review (gate-001).

### Deferred items (GitHub issue candidates, tmorin/archicode)

- DEF-1: pages for diagram styling, label formatting and viewpoint utilization, if the author asks.
- DEF-2: a CI example run by the repository's own workflow (`diff --fail-on` on `domain_plateaus`).
- DEF-3: the command reference generated from `--help` (W-6), so `manual-howto.test.js` can read it.
- DEF-4: a page for stories and for the facets in a build.

## Lessons Learnt

- Nothing yet.
- 2026-11-01: Stage 8 drafted pln-0215-manual-missing-pages.md (7 sequential tasks: amend TDD with F1-F8, baseline plus manual-howto.test.js red, CI page, agent page, Best Practices/part ids/llms.txt/voice exemption, proof on the jar with mutation checks, reader pass and record; gate-001 carries Q-1, decided by the drafter and open to the author; autonomy override noted); complete_wave.py run --stage implement exits 0, run status set to planned; no blocker.
- 2026-11-01: Stage 9 consistency check of pln-0215-manual-missing-pages.md by the C scan against the TDD (no PRD) and the repository: every cited TDD ID exists, no invented scope, every likely_files entry exists or is the one new file (manual-howto.test.js), commit ff3bacd resolves, no `#_reference`/`#_concepts` link in src or README.md; one edit, TG-3, TG-4 and TG-5 added to the source_requirements of task-005 and task-002 (they were uncited), plus the re-scan line in section 2; blocking_gaps is empty, so none is carried to Stage 10; Q-1 stays open to the author at gate-001 (not a blocker); no flow map in the pln, complete_wave.py run --stage implement exits 0; the TDD still carries FLOW-2, the 3770 count and the CTR-2 wording until task-001 applies F1-F8.
- 2026-11-01: Stage 11 verified the criteria against the files (node tests 55 of 55, test:unit, format:check, lint, ManualExamplesTest and PlateauComparisonTest, 0 Asciidoctor lines, ids and links read); pln set to done, run and prg to completed; backlog sweep not applicable (no docs/bkg, no check-backlog.py in this repository); Q-1 stays open to the author at gate-001; browser-pane render and the jar and mutation checks are read from the records of task-006 and task-007, not rerun.
