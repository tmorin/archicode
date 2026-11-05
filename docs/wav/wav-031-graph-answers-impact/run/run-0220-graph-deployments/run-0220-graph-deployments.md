---
type: run
run: 0220
status: completed
profile: TDD+pln
wave: 031
---

# Run 0220 graph-deployments

Run of wave 031 (graph-answers-impact), manifest id W-2.

## Verification

Run on the working tree (not committed), JDK 25.0.4-tem via JAVA_HOME, offline Maven.

| Gate | Result |
|---|---|
| `./mvnw -o test` | exit 0, 1734 tests, 0 failures, 0 errors, 2 skipped |
| `./mvnw -o test-compile pmd:check` | exit 0, BUILD SUCCESS |
| `./mvnw -o verify -DskipITs=false` | exit 0, integration tests against the packaged jar: 42 run, 0 failures, 0 errors, 0 skipped |
| `npm run test:unit` | exit 0, 3510 tests, 3509 pass, 0 fail, 1 skipped |
| `npm run format:check` | exit 0, all matched files use Prettier code style |
| `npm run lint` | exit 0, 3 editor scripts extracted, ESLint with `--max-warnings 0` clean |
| `scripts/byte-identity.sh` (full, base archicode-0.19.0, rebuilt new jar) | 20 workspaces; 332 commands compared; 263 identical; 68 accepted (63 of them declared changes of standard output, the rest by the exceptions; the script prints 332 compared and 263 + 68 = 331, the difference is not explained by the output); unexpected: 0; 0 DIFFERENT; self-check: ok |
| `npm run sample:build` then `git status --short` | exit 0; status identical before and after; no change under `samples/` or `docs/architecture` |
| `git diff ff3bacd -- src/test/javascript/architecture/impact-questions.json` | only additions (Q08, Q09); no changed line inside Q01 to Q07; the file holds 9 questions |

Native image (`./mvnw verify -Dnative`) and the end-to-end browser suite were not run: not verified.

Review pass: inline (not independent): the TDD review of Stage 5 and the per-task verifications were done by leaf agents with no Agent tool, so no separate reviewer was dispatched.

Files outside likely_paths: src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json, src/main/resources/guide/guide.md, src/test/CLAUDE.md, src/test/workspaces/case_graph_deployments.yaml, src/test/workspaces/case_graph_deployments_dangling.yaml
