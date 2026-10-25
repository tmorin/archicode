---
type: run
run: 0177
status: completed
wave: 023
profile: single-document
---

# Run 0177: java-analysis-adopted-and-findings-fixed

Single-document profile (as runs 0164 to 0176). Wave 023, W-11, #160 steps 5 and 6, D1 (PMD), T8, T9, V-C, V-E, V-G. PMD runs in `verify`, its findings on `src/main/java` and `src/test/java` are fixed, and the branch floor is 0.90.


## Scope and decisions

The review passes of the trio were done against this document: the scope is the plan row of W-11 and the author's answers (D1: adopt PMD; the branch floor at 0.90), no open question was left (Q4 and the tool choice are closed by run 0170 and D1), and the consistency check is the table below against the logs in the scratch folder and the tree.

- **Tool**: PMD 7.28.0 through `maven-pmd-plugin` 3.28.0, both pinned in `pom.xml` (`pmd.version` property for `pmd-core` and `pmd-java`), Maven Central only, no server, no secret. The `check` goal is bound to `verify` (execution `check`), so the job `Java` of CI runs it with `./mvnw verify` and no workflow change was needed. The one-command form is `./mvnw test-compile pmd:check` (PMD resolves types from the compiled classes; without `test-compile` the counts differ).
- **Ruleset**: `src/main/pmd/ruleset.xml`. Place chosen beside the other non-resource files of `src/main` (`rust`, `wasm`), referenced by `${project.basedir}`; a `config/` folder would be the only one of its kind. It is PMD's `quickstart` set, and every difference from it is in the file with its count and reason (T9).
- **Reach**: `includeTests` is true (`src/test/java` too). PMD reads sources; the one generated source it met was `target/generated-sources/chicory-compiler/.../ViewpointKernelModule.java` (7 findings in the first run), which is excluded (`**/ViewpointKernelModule*.java`, the same code JaCoCo leaves out). Lombok generates nothing PMD sees, and no finding came from Lombok code; no parse error on Java 25 or Lombok (`val`, `@Builder`, `@SneakyThrows`).
- **Strictness**: `failOnViolation` true at every priority (`failurePriority` 5), and `skipPmdError` false: the default skips a file PMD cannot analyse and counts no violation, which is a check with no teeth (this showed up when a wrong rule property made PMD fail to analyse 17 files: the check counted 76 violations and said nothing of the 17 files).
- **Native profile**: `pmd.skip` is true there, like `jacoco.skip`: the Native job runs the integration tests on sources the job `Java` has checked, and PMD needs no test, so it would only repeat it.
- **Branch floor**: the `jacoco:check` branch limit of `pom.xml` goes from 0.88 to 0.90 (the figure is 0.9286); the three floors are 0.90.
- **Behaviour**: no fix changes what the program prints or writes (V-C below). Three kinds of fix change an internal detail and are listed: `Locale.ROOT` on case conversions (the same under every locale but Turkish, Azeri and Lithuanian), `"literal".equals(x)` (the same except for a null `x`, which gave a `NullPointerException` and now gives false: no shipped path reaches it, `MistakeSweepTest` and the sweep are unchanged), and a cause given to four exceptions that wrapped one (`ErrorOutput` ranks an `ArchiCodeException` first, so the sentence is the same).

## Findings by rule, before and after

First run (tree at `39e2870`, the ruleset with the three rules of run 0170 turned off): **358 findings: 142 in `src/main/java`, 209 in `src/test/java`, 7 in the generated `ViewpointKernelModule.java`**, 26 rules, 0 parse errors. After: **0 findings, 0 processing errors** (`./mvnw test-compile pmd:check`, and in `verify`).

| Rule | Main | Tests | What was done |
| --- | ---: | ---: | --- |
| `LiteralsFirstInComparisons` | 27 | 101 | fixed: `"lit".equals(x)` (also `CONSTANT.equals(x)`), by a script that read the position PMD gives |
| `UselessParentheses` | 17 | 17 | **rule turned off** (below) |
| `LooseCoupling` | 14 | 9 | 19 fixed (`Set`/`Map` as declared types); 4 on `Replaces` (3 main, 1 test): **type allowed in the rule's property** |
| `UseLocaleWithCaseConversions` | 11 | 12 | fixed: `Locale.ROOT` |
| `UnnecessaryFullyQualifiedName` | 11 | 8 | fixed (+ 2 in the generated source, excluded) |
| `GuardLogStatement` | 20 | 0 | 13 fixed (guard with `isXEnabled`); 7 are `warnings.warn(...)`, not a logger: **`warn` taken out of the rule's levels** |
| `UnnecessaryImport` | 8 | 7 | fixed: the 15 unused imports run 0170 found |
| `CloseResource` | 2 | 12 | 2 `HttpClient` fixed (try-with-resources), 1 `ExecutorService` fixed in the code; 11 `PrintStream`/`PrintWriter`: **types allowed in the rule's property** |
| `MissingOverride` | 0 | 10 | fixed (`@Override`) |
| `CompareObjectsWithEquals` | 5 | 3 | fixed: `equals` (1), `assertNotSame` (3); 4 are identity on purpose: **types in the rule's property** |
| `AssignmentInOperand` | 3 | 5 | fixed: the `++` moved to its own statement |
| `MethodNamingConventions` | 0 | 7 | fixed: 7 test methods renamed from `snake_case` (no other file names them) |
| `SimplifiableTestAssertion` | 0 | 7 | fixed (`assertTrue`, `assertFalse`, `assertNotSame`) |
| `SimplifyBooleanReturns` | 6 | 0 | fixed: `return a && b` |
| `ReturnEmptyCollectionRatherThanNull` | 6 | 0 | fixed: `PlateauTree.horizonPeriod` returns an empty array for "reads as none" (it returned null); 2 callers and the 7 assertions of `PlateauTreeDetailsTest` follow |
| `LambdaCanBeMethodReference` | 0 | 6 | fixed |
| `PreserveStackTrace` | 5 | 0 | fixed: the cause is passed (`Refusal` got a constructor with a cause, `initCause` on the two exceptions that have no such constructor) |
| `EmptyCatchBlock` | 2 | 1 | fixed: the exception is named `ignored`, which the rule allows, the comment stays |
| `AvoidBranchingStatementAsLastInLoop` | 1 | 1 | fixed (`AliasExpandingYamlParser.getEvent` is a loop on the alias; `MistakeSweepTest.Verdict.clean`) |
| `UncommentedEmptyMethodBody` | 2 | 0 | fixed: a comment in the two default `setMapperFactory` |
| `DanglingJavadoc` | 0 | 2 | fixed (a record component comment, a duplicated comment) |
| `EmptyControlStatement` | 1 | 0 | fixed: the empty `if` of `ManifestParser` is a named condition |
| `ClassWithOnlyPrivateConstructorsShouldBeFinal` | 1 | 0 | fixed: `WorkspaceFileException` is final (+ 1 in the generated source) |
| `UnusedPrivateMethod` | 0 | 1 | fixed: deleted (`BrightcartLayeredViewsTest.readTree`, dead) |

Edited: 46 files in `src/main/java`, 58 in `src/test/java`, plus `pom.xml`, `CLAUDE.md`, `src/main/pmd/ruleset.xml` (new).

## Rules turned off and properties set (T9), in the ruleset with count and reason

| Rule | Count (main / tests) | Reason |
| --- | ---: | --- |
| `ControlStatementBraces` | 18 / 8 | the code writes `if (x) return;` on purpose; layout is the formatter's |
| `AvoidUsingHardCodedIP` | 2 / 20 | `127.0.0.1` and `0.0.0.0` of the local editor server are the point (19 in run 0170, 22 now: the tests added since) |
| `LocalVariableNamingConventions` | 0 / 72 | fixtures named after manifest ids (`rel_to_con_aba`) |
| `UselessParentheses` (new, not in run 0170) | 17 / 17 | Prettier (prettier-plugin-java) writes them around every wrapped `return` expression and around `i * 7` in `(i * 7) % 40`; proved by fixing `FacetOrderTest` and running `npx prettier --write`, which wrote them back |
| `LooseCoupling` (property `allowedTypes`) | 3 / 1 | `Replaces` is the model's own set (a `LinkedHashSet` that keeps `getWritten()`), named on purpose |
| `GuardLogStatement` (properties `logLevels`, `guardsMethods`) | 7 / 0 | all `Warnings.warn`: the rule matches the method name; no code calls `log.warn` (the level is ERROR); the guards are paired with the levels by position, so `isWarnEnabled` leaves with `warn` (found when removing only the level made `log.error` unguarded findings) |
| `CloseResource` (property `allowedResourceTypes`) | 1 / 10 | `PrintStream`/`PrintWriter` are `System.out` put back after a capture, the error writer of a command line, or wrappers of a `ByteArrayOutputStream`; none owns a file |
| `CompareObjectsWithEquals` (property `typesThatCompareByReference`) | 4 / 0 | identity on purpose: `ElementIndex` (the index of a layer), `Comparison` (a cache key), `Comparison.Row` (a record: equal rows are two rows) |

Suppressions: **no `// NOPMD` and no `@SuppressWarnings("PMD...")`** was added. The one `@SuppressWarnings` left in the code that this run touched is `"unchecked"` (javac's).

## The `@SuppressWarnings("java:S...")` (step 6 of #160)

Eleven were found by `grep` (the run 0170 note said ten; the tests carry four): the tool they name is not run, so all are gone; what documents something is kept as a plain comment.

| Where | Rule | Decision |
| --- | --- | --- |
| `ArchiCode`, `GetViewsQuery`, `GenerateViewsCommand`, `GenerateStoriesCommand` (class) | `S6813` field injection | annotation deleted; one comment line in each: Picocli sets the options on fields, so the services are injected into fields too (the command has no constructor) |
| `QueryOutputWriter.write(String)` | `S106` | deleted; comment: the standard output is where a query prints its result |
| `GenerateViewsCommand.run` | `S3252` (static through a subclass) | deleted, not justified (PMD does not report it; code unchanged) |
| `ElementIndexFactory.create` | `S6880` (with `unchecked`) | `S6880` deleted, `"unchecked"` kept (javac) |
| `ResourceFixtures`, `QueryOutputWriterTest`, `DeepViewpointFactoryTest` | `S117` | deleted: `LocalVariableNamingConventions` is off in the ruleset with the same reason |
| `CustomRenderingTest` | `S125` (commented-out code) | annotation and the five commented-out lines deleted (the author's scratch test keeps its working lines) |

## Verification

- Wiring: `./mvnw test-compile pmd:check` at the first run failed with "PMD 7.28.0 has found 358 violations"; the PMD report is `target/pmd.xml`; the build-time cost of PMD is about 7 s (`./mvnw -o -q pmd:check` alone, Maven start included) on a machine whose load average was 5 to 7 (the whole `test-compile pmd:check` took 22 s with the compile), against a `verify -DskipITs=false` of 7 min 40 s to 9 min 30 s.
- **V-C** (every fix to `src/main`): `./mvnw verify -DskipITs=false` gives `BUILD SUCCESS`, 1492 unit tests (2 skipped as before), 39 integration tests, "All coverage checks have been met"; then `scripts/byte-identity.sh --no-build` over the packaged application of that build: **20 workspaces, 332 commands compared, 330 identical, 1 accepted (the self-check), 0 unexpected**.
- **V-E, the Java tool**: a seeded unused import and an empty catch in `Width.java`, `./mvnw -o verify -DskipTests`: `PMD Failure: ...Width:3 Rule:UnnecessaryImport` and `...Width:31 Rule:EmptyCatchBlock`, `PMD 7.28.0 has found 2 violations`, exit 1; the file was put back from a copy (`cmp` identical, and `git diff` shows only the intended change), PMD is at 0 again.
- **V-E, the branch floor**: (1) with the limit raised to 0.95 in the pom, `./mvnw -o jacoco:check@check` fails with "branches covered ratio is 0.92, but expected minimum is 0.95" and nothing else; the pom was put back (`git diff` has no 0.95). (2) A real drop: `./mvnw -o verify -Dtest=PlateauTreeDetailsTest` fails with "lines covered ratio is 0.03", "instructions ... 0.04", "branches covered ratio is 0.03, but expected minimum is 0.90".
- **V-G**: lines 98.51 % (77 missed), instructions 98.59 % (375), branches 92.86 % (178 missed; 175 before: the three log guards add branches the ERROR level never takes). The floors held and none was lowered; no test was deleted (one dead private method of a test was).
- The final `./mvnw verify -DskipITs=false` on the finished tree (CLAUDE.md, the final ruleset): exit 0, same counts, 7 min 40 s.
- Other gates of the plan: `cargo test` 268 passed (the kernel has more tests than the 240 the notes say, from run 0172), `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `embed.sh --check`, `npm run format:check`, `npm run lint` all pass; `npm run test:e2e`: 34 passed (Chromium and Firefox, 1.1 min); `npm run test:coverage`: 2581 tests, 2580 pass, 1 skipped (the timing test), the editor figure is unchanged at 92.67 % of the lines and 96.18 % of the functions, "holds the floor".

## Not verified

- A CI run: the `Java` job was not run (the workflow is unchanged; PMD runs inside `./mvnw verify`, and the `native` profile skips it, which was only tried as a property, not in a native build).
- The seeded PMD finding was run with `-DskipTests` (faster) rather than in a full `./mvnw verify`; PMD is the same execution, bound to the same phase.
- PMD's `UseLocaleWithCaseConversions` fix is not exercised under a Turkish default locale.

## Canonical impact

`CLAUDE.md` changed: "Build & Test" has the command `./mvnw test-compile pmd:check` and a paragraph on the Java static analysis (PMD 7.28.0, where the ruleset is, what it turns off, no baseline, `pmd.skip` in the native profile, no Sonar server in CI); the Java coverage paragraph says the three floors are 0.90 (the 0.88 guard-rail sentence is gone); the Conventions bullet on SonarCloud says that the `java:S...` annotations are gone and that rules are turned off in the ruleset, never with an annotation. No architecture, contract or output changed (V-C).
