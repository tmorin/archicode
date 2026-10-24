---
type: wbc
wave: 023
status: proposed
date: 2026-10-24
related:
  - docs/wav/wav-022-agent-way-in/wav-022-agent-way-in.md
  - docs/wav/wav-022-agent-way-in/prg-022-agent-way-in.md
  - CLAUDE.md
---

# Wave 023 — Fixes and Tooling — Business Case

## Context

Wave 022 was merged on 2026-10-24 (PR #157, last commit `6e50a2e`). The backlog was reviewed the same day. Ten issues are open:

| Issue | What | Review |
|---|---|---|
| #158 | A saved overview view with no `properties` fails with a NullPointerException and a stack trace | Bug, found by wave 022, left alone there because its rule was byte identity with 0.19.0. The first mistake someone who writes a view by hand makes. **In this wave.** |
| #159 | The `unable to find the element` error names no file and no source | Found by wave 022, same reason. The layered check already says `x has a relationship towards y, which does not exist`; the plain load does not. **In this wave.** |
| #160 | Formatting and analysis: Prettier and rustfmt in CI, clippy, ESLint, a research for Java (no server) | The author decided on 2026-10-24 (formatter per language, ESLint yes, SonarLint only if it runs with no server, a research decides). Steps 1 to 5 **in this wave**; step 6 waits for the research. |
| #161 | Split `standalone.html` into modules | Asked by the author on 2026-10-24. Its first open question (one bundled file, or modules served) is the author's. **Not in this wave** (see Options). |
| #155 | Save: L3 and L4 (a list of lists) | Pinned limits since 2026-10-23: only a patch `value` can hold a list of lists. **Not in this wave.** |
| #143 | A view built on relationships | The author accepted the answers on 2026-10-23 (D11). A wave of its own, the next one. |
| #135, #134 | Importers | Blocked by the author (a public Structurizr sample). |
| #65, #24 | `plateau fold`, N plateaus at once | Not ready for a wave (an analysis run, a mock-up by the author). |

Nothing in the registers (`docs/bkg`, `docs/ana`) covers this: neither folder exists, and the sources are the GitHub issues.

What the repository has today, read from it: Prettier is configured for Java only and run by hand (`ci-build.yaml` does not run it); the 118 JavaScript test files do not match Prettier's defaults; `rust-toolchain.toml` pins 1.97.1 with `profile = "minimal"`, so `cargo fmt` and `cargo clippy` do not run at all; there is no analysis of any language (Sonar left CI on 2026-10-04). What guards quality is the tests. Wave 022's own review found seven points (an unquoted folder in a printed hint, a check that followed symbolic links, a copied regex, ...) that no tool flagged.

## Problems / Opportunities

Two kinds of thing, one wave.

1. **Two small defects of the command line that the next author meets first.** A view without `properties` ends in a stack trace, and a dangling reference does not say where it is. Both were found by the agent work of wave 022: an agent that writes manifests will meet them before anything else. A wave that fixes them also asks the broader question, whether any other mistake of the author ends in a stack trace, with a sweep over the shipped files rather than a guess.
2. **Coverage nobody can read.** The only Java coverage report (`target/jacoco-report`) counts the `@QuarkusTest` classes alone and says 47 % of instructions and 32 % of branches; the plain unit tests, the Rust kernel's 240 tests and the 2565 node tests have no figure that CI reads. The author wants line coverage above 90 % at a high quality, which first needs a measure that is true.
3. **A repository that depends on its author's care.** Nothing stops an unformatted or suspicious change from reaching `main`; with agents writing more of the code, that is the cheapest thing to automate. The part that needs a decision is Java (no server): that is a research, not a build change.

## Options & Recommendation

- **A. The two fixes only.** Small, but leaves #160 (decided by the author) waiting, and the next wave (#143) would grow a large editor diff with no format check.
- **B. The two fixes, then formatting, analysis, coverage above 90 % and no finding left. Recommended.** The fixes first: they are small, they change error sentences, and the sweep may find siblings. Then the tooling in the order of #160: rustfmt/clippy, Prettier (Java, then JavaScript tests), ESLint, and the Java research last, because it measures the code as the fixes leave it. Eight runs, none sensitive; the last waits for the author's answer on the Java tool.
- **C. B plus the split of `standalone.html` (#161).** Rejected for now. The split is a design wave: its first question is the author's (a build step that bundles one file, or modules served and the single-file use dropped) and it touches 52 files that mention the page. It also benefits from the tooling: a formatter and a linter in CI are the safety net of a 23,000-line move. It is the natural wave 024 or 025.
- **D. B plus L3 and L4 of #155.** Rejected: decided on 2026-10-23 to stay pinned limits; the save is the most delicate part of the editor and the exposure is a list of lists in a patch `value`.

## Vision

When this wave is done, an author's mistake that the command line can name ends in an `error:` line and never in a stack trace (a test sweeps the shipped files to show it), a dangling reference says which file and which element declares it, and a pull request whose Java, JavaScript tests or Rust are not formatted by their tool fails the `Build` job, as does a clippy warning, an ESLint finding or a line coverage of 90 % or below for the Java or the Rust kernel. Every finding those tools report is fixed, not baselined, and the tests that bring the coverage up assert behaviour (the author's decisions of 2026-10-24: a high level of quality). The share of the editor script that the tests run is measured and cannot go down. For Java, the author holds a short, evidenced recommendation for static analysis with no server; once they accept it, it runs and its findings are fixed too.
