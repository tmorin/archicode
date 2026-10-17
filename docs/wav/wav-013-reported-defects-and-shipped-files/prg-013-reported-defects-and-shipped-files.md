---
type: prg
status: active
date: 2026-10-17
related:
  - docs/wav/wav-013-reported-defects-and-shipped-files/wav-013-reported-defects-and-shipped-files.md
wave: 013
---

# Progress Log: reported-defects-and-shipped-files

## Log

- 2026-10-17: wave drafted from the issues left by waves 011 and 012 and from the recommendations agreed after wave 012. The timeline of the editor is #72 and the recursive `manifests.paths` is #73 (both filed for this request, not part of the wave).

- 2026-10-17: scope widened at the author's request ("as many bug fixes as possible"): every open issue that is a defect was already in; added the lossy saves nobody filed (W-4) and a run of the fixture's negative variants (W-7, phase P4).
- 2026-10-17: wave started (`complete-wave`), plan status `in-progress`, on branch `feat/faithful-saves-and-stable-output` in the main worktree (one branch, one pull request, #63; one commit per run). Runs execute one at a time, in the order W-1, W-2, W-3, W-4, W-5, W-6, W-7 (one working tree, one `target/`; the plan's verdicts are `serialize`). Seven runs, all `standard`, one in flight at a time.
- 2026-10-17: batch 1a dispatched: W-1 `fixture-layered-off-repo` (run 0064), tier `standard`, `run-executor` at the default model, 1 run.
- 2026-10-17: W-1 `fixture-layered-off-repo` (run 0064) returned `completed`; status file `completed` (single-document). Verified by the orchestrator on the tree: `git ls-files src/test/resources/brightcart/layered` is empty; `node generate.mjs` leaves the folder unchanged and prints "the layered rendition resolves to folders/ for the four plateaus"; `generate.mjs --layered <empty dir>` writes baseline, saas, inhouse, marketplace and `workspace.yaml` there; `node --test` 967/967; `prettier --check` clean. Reported by the run and not re-run: `./mvnw -o verify` 412 tests, `cargo test` 173, `embed.sh --check`, the diff of the `--layered` output against the previously committed folder (identical), the timing pairs. Out-of-path files: none. Not verified: clean timings (shared machine).
- 2026-10-17: W-1 committed as one commit on the branch.

- 2026-10-17: batch 1b dispatched: W-2 `shipped-files-loaded` (run 0065), tier `standard`, `run-executor` at the default model, 1 run (W-1 is committed).
- 2026-10-17: W-2 `shipped-files-loaded` (run 0065) returned `completed`; status file `completed` (single-document, no prg of its own: its decisions and findings are in the run file). Verified by the orchestrator on the tree: `cargo test` 173, `embed.sh --check` ok, `node --test` 1009/1009, `prettier --check` clean, `./mvnw -o -q verify` exit 0; a manifest with `kind: archicode.morin.io/plateau` on a copy gives exit 1 and one `error:` line that says `kind: plateau` is not supported yet and points at #30. Reported by the run and not re-run: the list of 17 `workspace.yaml` (28 workspace-and-plateau pairs) plus 13 workspace files the manual includes under other names, the empty exceptions list (an entry without a reason, naming no file, or that loads, fails the tests), the pinned messages (unknown header key and unknown kind unchanged), the alteration shown to fail the CLI test. Found and fixed by the run: `src/doc/examples/domain_workspace/empty.yaml` had `settings.manifests.path` where the key is `paths` (it was in no test). Out-of-path files: `LayeredPlateauRefusalTest.java` (needs the package-private `CliHarness`), `src/test/resources/shipped-files/exceptions.json`, `empty.yaml`. Not verified: byte comparison against a jar of `6575892` (only the failing path of the parser changed), that the Java and page copies of the sentence match (two literals, compared by eye), the page in a browser.
- 2026-10-17: W-2 committed as one commit on the branch.
- 2026-10-17: **gate P1 verified, with one criterion reworded.** (1) `layered/` not tracked, regeneration clean, `--layered` writes it and the resolver agrees: from W-1, re-run by the orchestrator. (2) the double run covers `saas` and `marketplace`; the time before and after is in W-1's report (class still above a minute: see Findings). (3) a Java test and a node test load every shipped workspace; **"altering a fixture manifest with an unknown key makes both fail" does not hold as worded**: the editor accepts an unknown key in a manifest header (the command line refuses it), so only the Java test fails on it; the node test fails on an unknown kind and on a `plateau` header key. The criterion was reworded in the plan to say that, and the difference is added to W-7's scope and gate (negative variants: an unknown header key). (4) both refusals pinned by tests and seen by the orchestrator on the command line; the editor's sentence by the node test (`shipped-files-layered-plateau.test.js`, 6 tests). (5) the flat-folder limit in section 13 of the spec and the README of the fixture (W-1, read in its report; grep not re-run). (6) the five commands re-run by the orchestrator, all green. Canonical discharge: runs 0064 and 0065 answer "None to the architecture model" in their own `Canonical impact` section, with a reason (read).

## Findings
- **The cost of `BrightcartStableOutputTest` after the cut** (W-1): alternated before/after pairs on a loaded machine give the second-run test about 15 s less (about 40 percent) and the class 7 to 18 s less; the class is still 126 s in the quietest pair (the unchanged class took 133 to 265 s across runs, 84.7 s in wave 012). What remains: the shared four-plateau first run and the in-folder test that runs `views generate` three times on `baseline` and `saas`. The plan said the author decides on a tag if it stays above a minute: it does. Options: tag the class, or cut the in-folder test to one plateau.
- The generator has three guards no one asked for (a non-empty folder, a folder inside the fixture folder, an unknown argument: one line, exit 2), because it empties its output root.
- Earlier wave documents (wav-008 to wav-012) still say `layered/` is committed; left as history.
- **The editor accepts an unknown key in a manifest header (and in the content) that the command line refuses** (W-2): nothing says so to the user. In W-7's scope.
- The two copies of the refusal sentence (Java and the page) are separate literals; each side's test pins its own and nothing checks that they match.

## Lessons Learnt
