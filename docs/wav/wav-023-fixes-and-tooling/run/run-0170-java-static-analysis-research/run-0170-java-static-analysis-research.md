---
type: run
run: 0170
status: completed
wave: 023
profile: single-document
---

# Run 0170: java-static-analysis-research

Single-document profile (as runs 0164 to 0169). Wave 023, W-7, issue #160 step 5, Q4, D1, T5, T8, T9. Research only: nothing in `src/main/java`, `pom.xml`, CI, `package.json` or `CLAUDE.md` changed; every tool ran on a copy in a scratch folder outside the repository, and its results stay there. The review passes of the trio were done against this document: the scope is the plan row of W-7 and Q4 (nothing to resolve: Q4 gives the default order), and the consistency check is the table of numbers below against the logs in the scratch folder.

The measure date is 2026-10-24. Machine: Linux, a load average of 4 to 8 from other work while the runs went (timings below are noisy; both the quiet minimum and the loaded maximum are given). JDK 25.0.4 (Temurin, `~/.sdkman/candidates/java/25.0.4-tem`) for every run; the shell default is 21.

## Answer in five lines

1. SonarLint's Java rules **can** run with no IDE and no server: I ran them (SonarLint backend 12.1.1 plus the `sonar-java` plugin 8.44.0, both from Maven Central): 135 findings on `src/main/java`, 42 on `src/test/java`, 28 s. But there is no supported entry point (SonarSource says so), the only way is a client of an IDE-internal protocol that I had to write, and the analyzer licence (SSAL v1.0) excludes "artificial intelligence technology that is not part of the Program" interpreting what the Program outputs: the use case of D1 (an agent runs it before a pull request and reads the result) falls outside the grant as I read it. **Not recommended for the build or for an agent.**
2. Recommendation: **PMD 7.28.0 through `maven-pmd-plugin` 3.28.0, the `check` goal in `verify`, ruleset = PMD's `quickstart` minus three rules**; first count **331 findings (142 in `src/main/java`, 189 in `src/test/java`)**, 8 s on a quiet machine, 30 s loaded, BSD-style licence, no parse error on Java 25 or Lombok.
3. An agent runs it with one command, no server and no secret: `./mvnw test-compile pmd:check` (offline once the plugin is resolved).
4. Error Prone (95 + 38 findings) is the better second tool if the author wants bug patterns later; SpotBugs (118 own findings, 49 to 82 s, 56 of them Lombok-getter noise) and Checkstyle (4,862 with `sun_checks`, style only) are not worth their cost here. SonarLint in the IDE stays the author's own choice (c), with nothing in the repository.
5. **The author must read clause (c) of the SSAL before D1** (see below); it also bears on the IDE route whenever an agent reads what the IDE reports.

## (a) SonarLint without an IDE and without a server

### Official position (documentation first)

- SonarSource staff on the community forum: "it is not possible to run SonarLint checks from command line" (2020-12-15); the analyzers "were never meant to be run as standalone products" (2021-03-25); about `sonarlint-core` outside an IDE: "sonarlint-* repositories are more designed for IDE experience", look at how the language server initialises the backend, or use `sonar-scanner` (2025-01-02, a thread about a local analyser program). The `sonarlint-cli` product is deprecated.
- `SonarSource/sonarlint-core` README: "shared library" of the IDE plugins, "intended for developers maintaining the IDE analysis engine and integrations"; LGPL-3.0; no usage documentation, no releases on the page; code contributions limited to minor fixes.
- **The official `sonar` CLI (SonarQube CLI, docs.sonarsource.com/sonarqube-cli) exists now but does not fit T5**: `sonar analyze` secrets scanning is local, but Java code-quality analysis is "Agentic Analysis", "server-side", "requires a Vortex subscription (SonarQube Cloud Team (annual) or Enterprise, or SonarQube Server 2026.5 or newer Enterprise and Data Center)", needs `sonar auth login` or `SONARQUBE_CLI_TOKEN`, and sends the change set to the server. Full-project analysis "runs in CI with the SonarQube Scanner".
- The SonarQube for IDE documentation describes standalone mode as the rules running in the IDE without a connection; nothing describes it outside one.

### Unofficial wrappers

| Tool | Maintainer, licence, date | Verdict |
| --- | --- | --- |
| `sonar-predictor` (named in the issue) | no artifact of that name on Maven Central (`search.maven.org` finds 0 for that name) and no repository found | does not exist as described |
| `pavel-zeman/sonarlint-cli` 1.0.0 | LGPL-3.0, 0 stars, 2025-12-28, one person | "fetches analysis configuration from SonarQube/SonarCloud server", host url and token are required: fails T5 |
| Gradle plugin `se.solrike.sonarlint` 2.2.0 | MIT, 20 stars, last release 2025-02-17, one person | Gradle only (the project is Maven), 20 months without a release: not tried |
| `vincentfenet/sonarlint-ls-cli` | no licence file, 6 stars, 2025-04-10 | a Python script around the SonarLint language server; its README is about Python files and installs through `curl ... | bash`: not tried |
| `nielspeter/sonarlint-mcp-server` 0.5.5 | MIT, 2026-05-12 | an MCP server over the SonarLint backend, documented for JS, TS and Python; its `docs/SLOOP_RPC_PROTOCOL.md` was the map for the client I wrote; Java is not claimed |
| `cfreak/sonarlint-cli` (Docker), `sonar-local-cli` (npm) | stale for years / a wrapper of the above | not tried |

### What I ran: the SonarLint backend ("SLOOP") and the Java analyzer, from Maven Central

Official artifacts, checked against the `.sha1` of Central: `org.sonarsource.sonarlint.core:sonarlint-backend-cli:12.1.1.87771:no-arch:zip` (43 MB, 2026-10-13, LGPL-3.0, Java 21+) and `org.sonarsource.java:sonar-java-plugin:8.44.0.48651` (21 MB, 2026-09-24, SSAL v1.0). The backend is a JSON-RPC server on standard input and output (`org.sonarsource.sonarlint.core.backend.cli.SonarLintServerCli`); the client has to answer its requests (`listFiles`, `getBaseDir`, `getFileExclusions`, `getInferredAnalysisProperties`, where the Java classpath goes: `sonar.java.libraries`, `sonar.java.binaries`, `sonar.java.test.*`), send the files, then ask `analysis/analyzeFilesAndTrack` and read `rawIssues`. I wrote that client in Node (about 150 lines, in the scratch folder, not kept). It worked at the second try: the protocol changed since the public documentation (`InitializeParams.logLevel` is now required and the first call died with a `NullPointerException` on it), which is the maintenance risk in one example.

| Run | Files | Findings | Rules | Time |
| --- | ---: | ---: | ---: | --- |
| `src/main/java`, classpath and `target/classes` given | 134 | **135** (133 code smells, 2 bugs) | 24 | start 6 s, analysis 28 s |
| `src/test/java`, test classpath | 126 | **42** | 15 | 9 s |
| `src/main/java`, no classpath, no classes | 134 | 108 | 18 | 8 s |

The rules are the standalone default (597 of the 764 Java rules are active by default). Main, by rule: `S1192` 34 (duplicated string literal), `S3776` 20 (cognitive complexity; values 16 to 35), `S9397` 17 (`String.format` for a concatenation), `S6813` 13 (field injection), `S7467` 10 (unnamed pattern), `S106` 7, `S1168` 6, `S3358` 6, `S135` 4, then 14 rules with 1 or 2. Tests: `S2093` 11, `S7467` 10, `S3457` 5, `S117` 4, then 11 rules with 1 or 2. Without a built project the run is faster but wrong both ways (29 findings missed, 2 spurious), so it needs `target/classes` and the dependency classpath (`dependency:build-classpath`). The two "bugs" are false positives: `S2119` on `new SecureRandom().nextBytes(bytes)` in `EditorHttpServer.newToken` (SpotBugs flags the same line), and `S5850` on the regex `"^<|>$"` of `Guide.java`, whose precedence is the intent. `S1128` (unused imports) is active and reported 0, while PMD finds 14 imports that really are unused (8 in main, for example `java.nio.file.Files` in `GenerateStoriesCommand`); I did not find why (SonarJava filters some rules on files that use Lombok; not verified).

### What a third-party route costs, and the licence

- Cost: two downloads of 64 MB, a client of an internal protocol that is not documented by SonarSource and that changed under me, a JVM per run, and the pin of two artifacts that must be moved together at each release; nothing in Maven or Gradle wraps it for a Maven project.
- **Licence of the analyzer.** The `sonar-java` plugin is under the Sonar Source-Available License v1.0 (`LICENSE.txt` of the repository; the pom of the jar carries no licence entry), not LGPL. It grants use "for any Non-competitive Purpose", and defines that as any purpose except "(a) providing to others any product or service that includes or offers the same or substantially similar functionality as SonarQube, (b) Competing with SonarQube, and/or (c) employing, using, or engaging artificial intelligence technology that is not part of the Program to ingest, interpret, analyze, train on, or interact with the data provided by the Program, or to engage with the Program in any manner." Running it in CI is not in (a) or (b). **Clause (c) is the point for D1**: a coding agent that runs the analyzer and reads its issues to fix them is "AI technology that is not part of the Program" interpreting "the data provided by the Program". This is my reading of the text, not legal advice, and it is the author's to settle; it is the reason this research does not recommend the route even though it works. The same clause applies to the IDE plugin's analyzers whenever an agent reads what the IDE reports.

Conclusion for (a): feasible, not supported, not maintained by anyone for this use, and probably not allowed for the agent use that D1 is about. The default of Q4 ("SonarLint without a server if a documented way exists") does not apply: no documented way exists.

## (b) What covers the same ground, measured on this code

Setup: `rsync` of the repository without `target`, `docs`, `node_modules`, `.git`, the JavaScript tests and the Rust into `$SCRATCH/work`; the repository was not edited. `./mvnw test-compile` under JDK 25 builds it (the build needs no Rust). Each tool was added to the scratch `pom.xml` only. Lombok 1.18.48 (`@Value`, `@Builder`, `val`, `@SneakyThrows`, `@NonNull`) is in the code base throughout.

| Tool (version, date) | Command | `src/main/java` | `src/test/java` | Time | Lombok, Java 25 |
| --- | --- | ---: | ---: | --- | --- |
| **PMD 7.28.0** (2026-09-25), plugin 3.28.0; ruleset `quickstart` | `./mvnw test-compile pmd:check -Dpmd.ruleset=...` | 162 | 286 | 8 s quiet, 30 s loaded (+ compile) | 0 parse errors; Lombok-generated members are invisible, no false positive seen from it |
| PMD, the recommended ruleset (quickstart minus 3 rules) | same | **142** | **189** | same | same |
| PMD, whole categories (8 runs) | `category/java/<name>.xml` | best practices 104, code style 1,712, design 377, documentation 1,556, error prone 93, multithreading 32, performance 143, security 0 | | 10 s each | style-heavy, not usable as is |
| **Error Prone 2.50.0** (2026-06-10), default checks | javac plugin in `maven-compiler-plugin`, `.mvn/jvm.config` with the `--add-exports` of javac | 95 | 38 | compile +5 s quiet (11.5 s against 7.2 s), +25 s loaded | works on 25; **crashes** on `StringConcatToTextBlock` (a `NoSuchElementException` at `Warnings.java:32`, a method with a Lombok `@NonNull` parameter, so probably on the literal Lombok writes): that check must be off; `-XepAllDisabledChecksAsWarnings` crashes on `ParameterMissingNullable` too (303 findings before the crash, not usable) |
| NullAway 0.14.2 on Error Prone | `-Xep:NullAway:WARN` | 156 | | +0 | the code has no `@Nullable` anywhere, so every finding says "@NonNull ... null" on code that is not annotated: not cheap, not counted further |
| **SpotBugs 4.10.4** (2026-08-20), plugin 4.10.4.0, effort max, threshold low | `spotbugs:spotbugs` after `test-compile` | 170 raw, **118 own** | 109 | 49 s main only, 61 s with tests (loaded) | reads bytecode: **52 of the 170 are in the classes the chicory plugin generates** (`ViewpointKernelModule*`, no source; one is "class too big, skipped"), 56 more are `EI_EXPOSE_REP`/`EI_EXPOSE_REP2` on Lombok getters and constructors; Java 25 class files read, 0 errors |
| **Checkstyle 14.3.0** (2026-09-27), plugin 3.6.0 | `checkstyle:checkstyle` | `sun_checks` 4,862; `google_checks` 7,711; a bug-oriented set of 28 checks I wrote: 96 | not run | 6 to 10 s | style rules: the Google set reports 5,917 indentation findings against Prettier's layout; the 96 are 41 `HiddenField`, 32 `DeclarationOrder`, 10 `ReturnCount`, 8 `UnusedImports`, 4 `CyclomaticComplexity`, 1 `EmptyBlock` |
| SonarLint rules (see (a)) | custom client | 135 | 42 | 28 s / 9 s | works with Lombok (reads source and bytecode), Java 25 source level given as 25 |

Counts by family, main (tests in the logs): Error Prone 42 `UnrecognisedJavadocTag`, 13 `MissingSummary`, 11 `StringCaseLocaleUsage`, 6 `NonApiType`, 5 `ReferenceEquality`, 4 `StringSplitter`, then 11 families of 1 to 3; SpotBugs `THROWS_METHOD_THROWS_RUNTIMEEXCEPTION` 51 (50 generated), `EI_EXPOSE_REP` 30, `EI_EXPOSE_REP2` 25, `UWF_FIELD_NOT_INITIALIZED_IN_CONSTRUCTOR` 18 (6 on Lombok builders), `NP_NULL_ON_SOME_PATH_FROM_RETURN_VALUE` 16 (`Files`/`getParent` paths), `DM_CONVERT_CASE` 9; PMD recommended set, both trees: `LiteralsFirstInComparisons` 128, `UselessParentheses` 31, `LooseCoupling` 23, `UseLocaleWithCaseConversions` 23, `GuardLogStatement` 20, `UnnecessaryFullyQualifiedName` 18, `UnnecessaryImport` 14, `CloseResource` 13, `CompareObjectsWithEquals` 8, `AssignmentInOperand` 8, then 13 families of 1 to 6.

**What the tools agree on** (the strongest evidence that a finding is real): the `toLowerCase()`/`toUpperCase()` calls without a `Locale` (PMD `UseLocaleWithCaseConversions` 23 in both trees, Error Prone `StringCaseLocaleUsage` 11 + 12, SpotBugs `DM_CONVERT_CASE` 9: a Turkish-locale bug on any identifier or state word), `return null` for an array or collection (PMD 6 = Sonar `S1168` 6), the `SecureRandom` that is built per call (SpotBugs, Sonar), `System.out` (PMD `SystemPrintln` 5, Sonar `S106` 7: the printing is the CLI's job). **No tool found a defect that changes what the program does**: the two Sonar "bugs" and the SpotBugs "Random used once" are false positives, the NP paths are theoretical. What they find is hygiene: unused imports that `javac` does not flag, locale, comparisons, logging guards.

Which of Sonar's families PMD does and does not cover (from the category runs above, so the counts differ): covered, with the right rule on: `S1168` (6 = 6), `S106` (`SystemPrintln` 5 against 7), `S1192` (`AvoidDuplicateLiterals` 22 against 34), `S3776` (`CognitiveComplexity` 25 against 20), `S1128` (14, Sonar 0). Not covered by any rule I know in PMD: `S9397` (17), `S7467` (10 unnamed patterns), `S6813` (13, Picocli needs field injection), `S3358` nested ternary (6), `S135` (4). So PMD covers the same ground roughly by half of Sonar's families and adds others Sonar does not report here; it is not "SonarLint's rules".

## (c) SonarLint in the IDE, the baseline

IntelliJ "SonarQube for IDE", standalone mode: the same rules and engine as the headless run above (it is the same backend), on the file being edited, as the author types; configured under Settings, Tools, SonarQube for IDE, Rules (per user; sharing is a connected-mode feature, which needs the server T5 excludes). Cost to the repository: nothing, apart from a `CLAUDE.md` paragraph; the ten `@SuppressWarnings("java:S...")` stay live. What it does not do: it does not run on a pull request, it never fails a build, an agent cannot run it, and the rules turned off live in the author's IDE, not in the repository. It remains the best way for the author to see Sonar's rules while writing; it is not a gate.

## (d) Can an agent run the tool before a pull request?

| Tool | One command, no server, no secret | Note |
| --- | --- | --- |
| PMD | yes: `./mvnw test-compile pmd:check` | needs the classes (type resolution): without `test-compile` the counts differ (308 against 331, tried), so the command names it; also bound to `verify`, so `./mvnw verify` runs it |
| Error Prone | yes, it is the compiler | `.mvn/jvm.config` flags, one check off |
| SpotBugs | yes, `./mvnw test-compile spotbugs:check` | 1 minute |
| SonarLint rules | not as one command: a Node client plus 64 MB of artifacts | and the SSAL clause (c) |
| SonarLint in the IDE | no | |

## Recommendation (D1 asks for the decision)

**Adopt PMD 7.28.0 (BSD-style licence) through `maven-pmd-plugin` 3.28.0, bound to `verify` in the default profile, with `src/main/pmd/ruleset.xml` (the path is W-11's to settle) = `rulesets/java/quickstart.xml` minus three rules; run by an agent as `./mvnw test-compile pmd:check`.** CLAUDE.md names that command in "Build & Test"; the `Build` job already runs `./mvnw verify`, so it needs no new CI step (skip it in the `native` profile, where the Native job runs integration tests on sources the Build job has checked: `-Dpmd.skip`).

First count with the ruleset, measured: **331 findings, 142 in `src/main/java` and 189 in `src/test/java`**, in 25 rules (before W-8 writes more tests: W-11 runs last, so the count will have moved; it is the number to compare with). No baseline file: W-11 fixes them (T8). The fixes are mostly mechanical and safe for byte identity (V-C): literals first in comparisons (128), parentheses (31), types to interfaces (23), `Locale.ROOT` on case conversions (23), a guard or a placeholder on log calls (20), qualifiers and imports (32), resources to close (13). Three families need a look, because they touch behaviour or intent: `UseLocaleWithCaseConversions` (a fix is right but changes results under a Turkish or Azeri locale; it cannot change the shipped outputs under any other), `CompareObjectsWithEquals` (8: some compare enums or singletons on purpose, those take the rule's own `// NOPMD` with the reason), `CloseResource` (13: confirm each resource is closed elsewhere before touching it).

Rules turned off, with count and reason (T9; in the ruleset file, one line each):

| Rule | Count (main / tests) | Reason |
| --- | ---: | --- |
| `ControlStatementBraces` | 18 / 8 | the code writes `if (x) return;` on purpose; layout belongs to the formatter, braces are not a bug |
| `AvoidUsingHardCodedIP` | 2 / 17 | the loopback and wildcard addresses of the local editor server (`127.0.0.1`, `0.0.0.0`) are the point; the tests use the same literals |
| `LocalVariableNamingConventions` | 0 / 72 | the fixtures name locals after manifest ids (`rel_to_con_aba`); the four test classes that carry `@SuppressWarnings("java:S117")` today say the same |

Not turned on, so not counted: `CognitiveComplexity` (25 in main at PMD's threshold of 15; Sonar's 20 run from 16 to 35, only 4 above 29), because the fix is a refactor of the largest methods of the loaders, which T8 forbids doing at the price of a behaviour change; the author can turn it on with a threshold later. `AvoidDuplicateLiterals` (22) is the same family as Sonar's `S1192` and is not in `quickstart`.

The ten `@SuppressWarnings("java:S...")` stay inert, as CLAUDE.md says; step 6 of #160 applies only if SonarLint is chosen. With PMD, W-11 deletes them (they name a tool the project does not run) and changes the Conventions paragraph; the author can say no (four of them document that Picocli needs field injection).

Cost: build time +8 s on a quiet machine, up to +30 s under load, on top of a `verify` that already takes minutes; two pinned plugin dependencies (`maven-pmd-plugin` 3.28.0, `pmd-core` and `pmd-java` 7.28.0, all from Maven Central, versions older than two weeks), nothing at run time, nothing in the jar or the native image, no network at test time after the first resolution (T5). Risk to the build: (1) a new PMD release adds rules to `quickstart` and breaks `main`: the version is pinned and moves only in a change that fixes what it reports; (2) PMD must follow the Java language version (7.28 reads Java 25; a release that supports 26 will be needed when the project moves); (3) the count depends on compiled classes being present, which `verify` guarantees and the one-line agent command names; (4) a rule that is a matter of taste gets turned off one line at a time, in the open, as above; (5) PMD does not see what Lombok generates and has no semantic dataflow: it will not find the null-flow bugs SpotBugs and Sonar look for (none were real here).

If the author wants more than hygiene later: add Error Prone as a second step (compile-time, 95 + 38 findings, one check off for the Lombok crash, JDK flags in `.mvn/jvm.config`); not SpotBugs (an exclude filter for the generated classes and for `EI_EXPOSE_REP*` first, and a minute per run).

If the author still wants Sonar's rules: the IDE route (c) for the author, with the licence clause read first.

## What I could not run, and why

- **The official `sonar` CLI**: needs an account, a token and a paid plan for Java analysis (server-side); T5 and my instructions rule that out. Read from the documentation only.
- **`sonarlint-ls-cli`, the Gradle plugin, `sonar-local-cli`, the Docker image**: not run (Python/Gradle/unmaintained; the first installs through `curl | bash`); judged from their READMEs and release dates.
- **`sonar-predictor`**: does not exist on Maven Central or GitHub as far as I could find.
- **SonarLint in IntelliJ**: no IDE in this environment; (c) is described from the documentation and from the headless run, which uses the same backend and analyzer (the IDE adds the settings and the live view).
- **Why Sonar reports no `S1128`** on files PMD finds unused imports in: not investigated.
- **Timings**: the machine was loaded (load average 4 to 8); minima are given where I had a quiet run, and Error Prone's overhead is a range, not a figure.
- **`src/test/java` for Error Prone and SpotBugs** came from the same compile and the all-classes SpotBugs run (tests = all minus main); Checkstyle was not run on tests.
- **A CI run**: nothing was added to the workflow.
- **A licence opinion**: clause (c) of the SSAL is quoted, not interpreted by a lawyer.

## Verification

- No file of the repository was changed by this run (`git status` shows the same two modified wave files as at the start, and this directory). Gates of the plan row: "the commands and the counts in the run document" (above and in the logs of the scratch folder `$SCRATCH` = `/tmp/claude-1000/-home-tibo-git-perso-archicode/08e4ddfa-07db-45ec-8bc4-87cb73ea33fb/scratchpad`: `ep-default.log`, `sb-main.xml`, `pmd-quick*.xml`, `cs-*.xml`, `sl-main.json`, `sl-test.json`, `sl-main-nocp.json`, `sl-rules.json`); "what could not be run, said" (above); "the comment on #160" (posted: https://github.com/tmorin/archicode/issues/160#issuecomment-6385156388); "V-C trivially" (no source change).
- The recommended ruleset was run for real: `pmd:check` fails with "PMD 7.28.0 has found 331 violations" (exit 1), which shows that a finding makes it fail.
- Not verified: the plugin bound to `verify` in the repository's own `pom.xml` (the scratch pom had it as a command-line goal); that is W-11's V-E.

## Canonical impact

None: this run changes no canonical text, no architecture and no contract. `CLAUDE.md` and `ci-build.yaml` change in W-11, if D1 says "adopt PMD" (the "Build & Test" command, the Conventions paragraph about the inert `@SuppressWarnings("java:S...")`, a note of the SSAL clause if the author wants it recorded).
