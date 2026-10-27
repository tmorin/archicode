---
type: prg
status: active
run: 0191
wave: 025
---

# Progress Log: Run 0191

## Log

- 2026-10-27: Stage 4 (draft the TDD, TDD+pln profile, no PRD). Wrote tdd-0191-bundle-codec.md (status draft, wave 025) from #162 proposal 1, the wave plan and the persistence layer: two pure functions in a new part `persistence/bundle.js`, bundle format with a marker for a missing final newline (DEC-2), path rules shared by both directions (DEC-3), bytes in and out with the BOM as content (DEC-4), size limit first (DEC-5), `bundle-cases.json` contract, round trip over shipped workspaces. Requirements are labelled REQ-1 to REQ-6 in the TDD itself (traceability incomplete, stated). No open question remains; no blocker. No docs/CLAUDE.md exists, so Canonical Impact is not applicable.
- 2026-10-27: Stage 5 KDML review of the TDD done by a leaf agent in a fresh context (independent of the drafter, "Review pass: dispatched" to a different agent; referent: src/main/editor/persistence and layers.json, workspace-loading.js, the node harness, the shipped workspaces under src, CLAUDE.md, the wave plan). Overall Acceptable: 1 S3 (C-DOC: ASM-1 says the YAML test is lowercase and the same as readManifestFolder, which is case-sensitive `/\.(ya?ml)$/`, `.YAML` is not a manifest), 7 S2, 8 S1 (list in Findings below). Findings returned to the main agent to apply; the TDD is not edited by this stage. No question stays open as a blocker.
- 2026-10-27: Stage 6 (resolve the TDD's open questions): the TDD's Open Questions section says "None" (checked in tdd-0191-bundle-codec.md); nothing to resolve, no research needed, no blocker. The Stage 5 findings stay for the main agent to apply.
- 2026-10-27: Stage 8 (draft the pln, TDD+pln profile). Wrote pln-0191-bundle-codec.md (status draft, wave 025, block-style YAML; drafted by the leaf agent itself, no subagent, so no separate review pass at this stage): 5 tasks (apply Stage 5 decisions to the TDD, cases file and test red, round-trip test red, bundle.js and registration, gates and mutation check), one parallel group, no human gate, no blocker. The plan binds 14 decisions on the Stage 5 findings (gap-001) because the TDD text was not revised; task-001 writes them into the TDD. complete_wave.py run --stage implement exits 0; run status set to planned.
- 2026-10-27: Stage 9 (PRD/TDD/pln consistency check, no PRD so TDD and repository only; done by a leaf agent inline). Every source_requirements entry of the pln traces to real TDD IDs (REQ-1 to REQ-6, TG, DEC, CTR, IF, FLOW, IMP, CON, ASM, RISK, section names) and no scope is invented. Repository spot-check holds: persistence/ parts and layers.json (save.js line 136, ratchet.max 99), no `bundle` name in names.json, harness.js createApp and yaml.test.js as the model for a cases test, workspace-loading.js line 68 holds the case-sensitive YAML test, 20 folders with a .archicode.yaml under src (the 'at least 20' floor is exact today), no shipped file with a line `--- # file: `, no two paths of one folder equal when lowercased, no uppercase .YAML name, no hidden file besides .archicode.yaml in those folders; src/test/resources/editor-bundle does not exist yet (task-002 creates it). One edit to the pln: the red state of tasks 002 and 003 is `app.bundleWorkspaceFiles is not a function` (the harness exposes page names as properties), not 'is not defined'. blocking_gaps is empty (gap-001 and gap-002 are carried by task-001, 003 and 004, not blockers). complete_wave.py run --stage implement exits 0 after the edit. No blocker.
- 2026-10-27: implement workflow stopped, state blocked: task not verified ["task-002: failed twice (reported not done: The user asked to stop and regenerate the workflow with --commit-tasks. That has to be done by the operator, not by this leaf agent.)","task-003: failed twice (reported not done: The user asked to stop and regenerate the workflow with --commit-tasks, so this task was not run. A leaf agent cannot regenerate the workflow.)"]

## Findings

- Stage 5 review of tdd-0191 (KDMLLC, referent as in the Log line), for the main agent to apply:
  - S3 C-DOC ASM-1: the editor's test is case-sensitive `/\.(ya?ml)$/` (workspace-loading.js:67, comment "`.YAML` is not a manifest"), not lowercase. Fix: say case-sensitive, same expression; drop "compared in lowercase" and the "Task 1 aligns" hedge.
  - S2 DEC-3 lists "content that is not UTF-8 text" among the import problems and then says it does not apply. Delete it from the import list (it is a bundle-side skip reason only).
  - S2 the 50-problem cap lives only in Reliability, while TG-4 and DEC-3 say all problems are reported. Preferred: drop the cap (a 10 MiB text bounds the list; less code, no "and N more" sentence, one case less); else move it into DEC-3 and TG-4.
  - S2 CTR-2 has no slot for `bundleSkippedSentence` (IF-2 says exact words are in the cases file). Add a `sentence` field to the `bundle` cases, or a `skippedSentence` list.
  - S2 `bundlePathProblem(path)` has no stated return shape; say it returns a reason phrase or null, used as `skipped.reason` on export and inside the sentence on import (DRY), and list the reason words once (not YAML, not UTF-8, path twice, separator-like line, the path rules).
  - S2 FLOW-1 and DEC-3 check "path twice" and the file-and-folder clash on import only (FLOW-1 has "path twice" on export, DEC-3 does not list it); an input of `a.yaml` and `a.yaml/b.yaml` gives a bundle that import refuses, against the claim under TG-1 and DEC-3 rationale that a written bundle is a read bundle. Either check the clash on export too or narrow the claim to bundles of a real folder.
  - S2 IMP-5 "the files of the folder" has no walk rule. Shipped workspaces include a nested one (`src/test/resources/plateau-comparison/replaces` inside `plateau-comparison`, 20 `.archicode.yaml` in all), whose root-less `.archicode.yaml` is then a hidden non-root path and is skipped. State: recursive, relative paths with `/`, files only, and that the nested workspace file shows up in `skipped` as hidden.
  - S2 test harness: createApp runs the page in a vm context and passes the outer realm's TextEncoder/TextDecoder, so a `Uint8Array` the page builds is of the inner realm; `deepStrictEqual`/`instanceof` on bytes can fail across realms. Say the tests compare bytes with `Buffer.compare` or `Array.from`, and that the codec never uses `instanceof Uint8Array` on its input.
  - S1 DEC-5: "or the length in UTF-8 computed without allocating, if the plan prefers" leaves a choice open; decide (encode once, simplest).
  - S1 DEC-4: say code point order explicitly (JS `<` is UTF-16 order, `ManifestDiscovery` is code point; differs for astral characters), and that the reader accepts any order of separators and returns sorted files (CTR-1 and FLOW-2 are silent).
  - S1 DEC-3: names that Windows refuses (`<>:"|?*`, a segment ending in a dot or a space) are refused for facet names (CLAUDE.md, run 0146) but not for paths; state why not, or refuse them (a workspace is shared across systems).
  - S1 Non-Goals: say that an empty list gives an empty text that import refuses ("no file"), and that a bundle without a root `.archicode.yaml` is accepted (W-4/W-5 decide).
  - S1 IMP-4 contains a literal invisible BOM character; write `\ufeff`.
  - S1 the TDD points at "Task 1 of the plan" and "a check in the plan" (ASM-1, ASM-3, IMP-1) before the pln exists: Stage 8 must carry them (shipped paths lowercased check; grep of `names.json`).
  - S1 PRD Traceability: REQ labels are the TDD's own and the sentence "All six are addressed. They are assumed rather than sourced" says it; keep, but state once in the Summary only (it is restated in Scope).
  - S1 RISK-5 and the round-trip "skipped is exactly non-YAML and hidden": a shipped YAML with a separator-like line would be skipped for a third reason; the assertion is then a failing test by design, say that a hit is fixed in the file, not the assertion.
  - C checked and holds: persistence parts and 774 lines of save.js, `layers.json` placement after `persistence/save.js`, `ratchet.max` 99, no `bundle` name in `names.json`, `readTextAndMark`/`withByteOrderMark` roles, `emitter-cases.json` read by `yaml.test.js`, `harness.js` `createApp`, wave plan W-3 row (separator, limit, refusals, cases file, round trip).

## Lessons Learnt

- Nothing yet.
