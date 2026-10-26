---
type: run
run: 0180
status: completed
profile: TDD+pln
wave: 024
---

# Run 0180: view-problem-sentences

Run of wave 024, manifest id W-3.

## Canonical impact

None: the repository declares no canonical registers (no `docs/CLAUDE.md`, no `arc` or `dom` register), as the TDD's Canonical Impact section says; the CLAUDE.md paragraph that recorded the misalignment was rewritten by task-005.

## Verification

Stage 11, 2026-10-26, read back from the files and run in the main worktree (JDK 25):

- `./mvnw test-compile pmd:check` exit 0; `./mvnw verify -DskipITs=false` BUILD SUCCESS (unit tests, 39 integration tests, JaCoCo floors met, PMD clean).
- `npm run test:coverage` exit 0 (92.67 % of the lines of the editor script, floor held); `npm run format:check` and `npm run lint` exit 0.
- `./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true`, then `npm run test:e2e`: 38 passed, exit 0.
- `scripts/byte-identity.sh --no-build`: 20 workspaces, 332 commands, 330 identical, 1 accepted (the self-check rule of the exceptions file, not a new exception), 0 unexpected.
- Acceptance criteria re-read in `KernelViewpointFactory.java` and `standalone.html` (`viewProblem`): both say the view `v` has no element and the view `v` names `x`, which does not exist; the case file and its two readers exist and ran green in the builds above; "Not aligned, recorded" is gone from CLAUDE.md.
- Not re-run at Stage 11: the two negative checks (old text put back in one tool); they were done by task-006.

Review pass: inline (not independent): the Stage 5 and Stage 9 reviews were done by fresh leaf agents with no Agent tool, so no separate dispatched reviewer exists.

Files outside likely_paths: CLAUDE.md, src/test/resources/brightcart/negative-cases.json
