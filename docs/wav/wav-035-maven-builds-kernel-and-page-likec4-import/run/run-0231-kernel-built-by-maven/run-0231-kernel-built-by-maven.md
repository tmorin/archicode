---
type: run
run: 0231
status: completed
profile: TDD+pln
wave: 035
---

# Run 0231: kernel-built-by-maven

Run of wave 035, manifest id W-1.

Review pass: dispatched (the KDMLLC review of the TDD, Stage 5, was made by a leaf agent in a fresh context, not by the agent that drafted it, and the Stage 9 consistency check of the pln was made inline by a leaf agent; each task of the implement workflow was independently verified by a separate agent).

## Canonical impact

None to a canonical register: `docs/` declares no `arc` or `dom` register, so CI-arc and CI-dom do not apply; the model of ArchiCode is updated (the element `kernel_wasm` is retagged to `embed.sh`, IMP-13) and ArchitectureDriftTest, ArchitectureImpactTest and the sample check pass.

## Verification

Stage 11 ran the full suite once (`verify -DskipITs=false`, PMD, node unit suite and coverage, `editor:check`, `format:check`, `lint`, `byte-identity.sh` with its exceptions file unchanged, `editor:build`), all exit 0, and re-read REQ-1 to REQ-5 against the files; the line is in the prg. Not provable here and listed in the prg: the arm and macOS native targets, the website step and the Rust cache on a cold runner, which only a tag run shows.
