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

## Findings
- **The cost of `BrightcartStableOutputTest` after the cut** (W-1): alternated before/after pairs on a loaded machine give the second-run test about 15 s less (about 40 percent) and the class 7 to 18 s less; the class is still 126 s in the quietest pair (the unchanged class took 133 to 265 s across runs, 84.7 s in wave 012). What remains: the shared four-plateau first run and the in-folder test that runs `views generate` three times on `baseline` and `saas`. The plan said the author decides on a tag if it stays above a minute: it does. Options: tag the class, or cut the in-folder test to one plateau.
- The generator has three guards no one asked for (a non-empty folder, a folder inside the fixture folder, an unknown argument: one line, exit 2), because it empties its output root.
- Earlier wave documents (wav-008 to wav-012) still say `layered/` is committed; left as history.

## Lessons Learnt
