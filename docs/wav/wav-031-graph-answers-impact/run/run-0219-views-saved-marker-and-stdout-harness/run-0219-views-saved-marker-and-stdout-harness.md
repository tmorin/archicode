---
type: run
run: 0219
status: completed
profile: TDD+pln
wave: 031
---

# Run 0219 — views-saved-marker-and-stdout-harness

Run W-1 of wave 031 (graph-answers-impact).

## Verification

| Gate | Result |
|---|---|
| `./mvnw -o test` (JDK 25) | exit 0; Tests run: 1726, Failures: 0, Errors: 0, Skipped: 2; BUILD SUCCESS |
| `./mvnw -o test-compile pmd:check` | exit 0 |
| `npm run format:check` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run test:unit` | exit 0 (skipped 1, todo 0) |
| `npm run sample:build` then `git status --short` | exit 0; status identical before and after, no change under `samples/` or `docs/architecture` |
| `grep -c 'has("name")' src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java` | 0 |
| `scripts/byte-identity.sh` (base archicode-0.19.0) | exit 0; workspaces: 20; commands compared: 332; identical: 283; accepted by the exceptions: 48; unexpected: 0; self-check: ok. No DEVIATION. Accepted: the `query views` outputs (declared change of standard output) and the four `stories generate` runs of `brightcart/layered` (files of the feature). |

Not run: the integration tests (`-DskipITs=false`) and the native build; not verified.

Stage 11 re-ran, on the files as they are: `./mvnw -o test` (exit 0), `test-compile pmd:check`, `format:check`, `lint`, `test:unit`, `sample:build` (git status unchanged), `has("name")` count 0, and `scripts/byte-identity.sh --no-build` (exit 0; 332 compared, 283 identical, 48 accepted, 0 unexpected, self-check ok). `query views` on `docs/architecture` prints `saved` on all 67 entries, 5 `true`, and `-q '$.[?(@.saved==true)]'` keeps those 5; on `domain_workspace` 10 entries, all `false`. Not verified: the integration tests and the native build.

Review pass: inline (not independent): the tasks were verified one by one by separate agents; Stage 11 is a leaf agent reading the files and rerunning the gates.

Files outside likely_paths: src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json (the record `GetViewsQuery$Entry` needs its reflection entry; `NativeReflectionConfigTest` fails without it)
