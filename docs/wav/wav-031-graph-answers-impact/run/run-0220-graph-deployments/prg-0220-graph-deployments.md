---
type: prg
status: completed
run: 0220
wave: 031
---

# Progress Log: Run 0220

## Log

- 2026-11-04: Stage 4 — drafted tdd-0220 (TDD+pln, no PRD, so REQ-1..8 come from the wave manifest and #189): `deployments` as the last top-level key of `query graph`, built in `collect` from `Node.applications`, absent when empty, hosted applications copied not resolved (no new failure); harness rule for `query graph` on top of run 0219's file; oracle gets an optional `through: [deployments]` and Q08/Q09 with expected lists computed from the model; manual, guide and upgrade note. Q-1 and Q-2 resolved inside the TDD, no blocker. One mismatch noted: the wave says Brightcart goldens move, none holds a graph (ASM-3). run status set to designing.
- 2026-11-04: Stage 5 — KDML review of tdd-0220 done inline by this leaf agent (a different agent from the drafter), referent read in the repository: overall acceptable, no S3; 9 findings recorded in the TDD's Review section for the main agent to apply (F1 to F3 at S2: dangling hosted application is a load error with plateaus, REQ-6 wording against ASM-3, one owner for the `deployments` check of the oracle; F4 to F8 at S1; F9 at S0). Q08 and Q09 expected lists verified by hand against the model. No blocker.
- 2026-11-04: Stage 6 — open questions of tdd-0220 checked: Q-1 and Q-2 were already resolved and none is open, so nothing was dispatched; Q-1's resolution reworded to the review's F1 (the no-failure claim holds only without plateaus; with plateaus `LayerLoader` already fails on a dangling hosted application). F2 to F9 left for the main agent. No blocker.
- 2026-11-04: Stage 8 — drafted pln-0220 (TDD+pln, no PRD, REQ-1..8 from the TDD): 7 tasks in block-style YAML. task-001 amends the TDD with review findings F1 to F9 (they were not yet applied); task-002 (GetGraphQueryTest red), task-003 (oracle `through`, Q08, Q09, red) and task-005 (harness rule and `query graph` self-check sample) run in parallel on disjoint files; task-004 writes `deployments` in `GetGraphQuery` and reflect-config (review_after, gate-001); task-006 manual, upgrade note, guide and golden; task-007 gates and full byte-identity run. No human_required or critical task; autonomy override noted in the pln. `complete_wave.py run --stage implement` exits 0, wbs written, run status set to planned. No blocker.
- 2026-11-04: Stage 9 — C scan of pln-0220 against the TDD and the repository, done inline: every source_requirements ID exists in the TDD, no invented scope, every path exists or is created by its task, the harness functions, options, labels, the example, ff3bacd and Q01 to Q07 were read. Two edits to the pln: gap-009 (the last self-check assertion of byte-identity.sh uses the label "shop: query graph" as one no rule matches; the new rule matches it, so task-005 changes that label to "shop: query stories", in the catalog and in the assignment plan) and task-004 likely_files no longer names SortedQueryOutputTest and BrightcartStableOutputTest (finding F6 drops the additions there). blocking_gaps is empty, nothing carried forward as a Stage 10 blocker. `complete_wave.py run --stage implement` exits 0 after the edit. No blocker.
- 2026-11-05: Stage 11 — verification re-run by a leaf agent: `./mvnw -o test` 1734 tests 0 failures, `test-compile pmd:check`, `format:check`, `lint` and `test:unit` (3509 pass) exit 0; `query graph` on docs/architecture ends with `deployments` holding the two github.actions entries; pln execution_manifest.status set to done, run and prg completed; docs/bkg and tooling/docs/check-backlog.py do not exist in this repository, so no backlog sweep was possible; native image and end-to-end browser suite not verified.

## Findings

- Gates of task-007, all exit 0: `./mvnw -o test` (1734 tests, 0 failures, 2 skipped); `./mvnw -o test-compile pmd:check`; `./mvnw -o verify -DskipITs=false` (42 integration tests, 0 failures); `npm run test:unit` (3509 pass, 1 skipped); `npm run format:check`; `npm run lint`.
- Full `scripts/byte-identity.sh` against archicode-0.19.0: workspaces 20, commands 332, identical 263, accepted 68 (63 declared stdout changes), unexpected 0, 0 DIFFERENT, self-check ok. `query graph` and `query views` outputs on shipped workspaces are accepted as declared changes of standard output.
- `npm run sample:build` changed nothing (git status before and after the same). impact-questions.json against ff3bacd: only Q08 and Q09 added, Q01 to Q07 untouched, 9 questions.
- Not verified: the native image build and the end-to-end browser suite were not run.

## Lessons Learnt

- Nothing yet.
