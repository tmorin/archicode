---
type: run
run: 0171
status: completed
wave: 023
profile: single-document
---

# Run 0171: java-coverage-above-90

Single-document profile (as runs 0164 to 0170: the wave plan holds the requirements and the design). Wave 023, W-8, Q5, T8 to T10, V-G, V-H, V-E. Java line and instruction coverage of `src/main/java`, measured from every test of `verify`, above 90 % and enforced by the build; branch coverage reported with a guard-rail.

## Result

| | before (the report that existed) | before (true, all tests, nothing new) | after |
|---|---:|---:|---:|
| instructions | 47.8 % | 96.0 % | **98.6 %** |
| lines | 86.9 % | 96.5 % | **98.5 %** |
| branches | 32.4 % | 90.0 % | **92.9 %** |

The floors the build enforces (`jacoco:check`, execution `check` of `pom.xml`): lines 0.90, instructions 0.90 (the author's), branches 0.88 (a guard-rail below the figure, to be raised to 0.90 by the author when asked). `./mvnw verify -DskipITs=false` passes: 1492 unit tests (2 skipped, as before), 39 integration tests; the unit tests were 1380 at the start (112 added, 22 new classes, 3 s of test time in all).

## The measure was wrong in a way the brief did not expect

The 47 % of the old report is **not** the lack of the plain tests. The old report (the `quarkus-jacoco` extension alone, `target/jacoco-report`) counted the classes the chicory compiler writes from the WebAssembly of the viewpoint kernel (`ViewpointKernelModule`, `ViewpointKernelModuleMachine`, `ViewpointKernelModuleMachineDispatch_0`: bytecode with no source). They are 308,563 of the 309,882 missed instructions, all in the package `viewpoint.kernel` (45.9 % there). Left out, the `@QuarkusTest` classes alone were at 95.1 % of the instructions, 95.6 % of the lines and 89.0 % of the branches. The plain tests add the rest (96.0 / 96.5 / 90.0): missed instructions of `rendering.plantuml` 85 -> 41, `viewpoint` 101 -> 35, `resource.workspace` 137 -> 24, `viewpoint.kernel` 146 -> 135, `workspace` 246 -> 243.

Re-measured to the letter of the brief (the old setup, `-Djacoco.skip=true -Dquarkus.jacoco.report=true`, run before any new test): 47.8 % of the instructions, 32.4 % of the branches, 86.9 % of the lines. With the new setup and no new test: 96.0 / 90.0 / 96.5 (table by package below).

## Setup (V-G: the figure comes from the real run)

- `jacoco-maven-plugin` 0.8.15 (the version `quarkus-jacoco` of Quarkus 3.40.1 brings), three executions: `agent` (`prepare-agent` into `target/jacoco-quarkus.exec`, `append`, `exclClassLoaders=*QuarkusClassLoader`: the plain JUnit tests are counted by the agent, the `@QuarkusTest` ones by the extension, which instruments what Quarkus' own class loader loads), `report` and `check` in `verify`.
- `src/test/resources/application.properties`: `quarkus.jacoco.reuse-data-file=true`, `quarkus.jacoco.data-file=jacoco-quarkus.exec`, `quarkus.jacoco.report=false` (the report is the plugin's, one for all the tests, `target/jacoco-report`: `index.html`, `jacoco.csv`, `jacoco.xml`).
- `maven-clean-plugin` 3.4.0, execution `forget-the-previous-coverage` at `initialize`: deletes `target/jacoco-quarkus.exec` (jacoco-maven-plugin has no `reset` goal) so a previous build never adds its lines to the figure.
- One exclusion (T9), written in the plugin config with its reason: `io/morin/archicode/viewpoint/kernel/ViewpointKernelModule*`. Lombok: `lombok.config` already had `lombok.addLombokGeneratedAnnotation=true` (commit `ddd7ad7`), so JaCoCo ignores what Lombok writes; nothing to add. No other exclusion.
- The integration tests (`*IT`) are not in the figure (they run the packaged application in a process).
- CI: the `Build` job runs `./mvnw verify`, so it measures and enforces with no change; nothing needs a server, a token or a secret (the plugins come from Maven Central). One step added after "Build artifacts": "Keep the Java coverage report" (`actions/upload-artifact@v7.0.2`, `target/jacoco-report`, 7 days, also when a floor fails), so the report is read from the run. The report is the same locally and on the runner because it is the same build (not run on a runner here: the proof is the pull request).
- Quirk found: with `-Djacoco.skip=true` (as the quick loop of this run used) the Quarkus extension writes `jacoco-quarkus.exec` and `report-*.txt` in the project root instead of `target/`; a normal build never does. The files were deleted.

## The figure by package (before: true figure with all tests and nothing new; after: end of the run)

| package | lines before | lines after | instr. before | instr. after | branches before | branches after |
|---|---:|---:|---:|---:|---:|---:|
| (root) | 89.5 | 95.1 | 89.0 | 94.3 | 80.8 | 95.2 |
| cli | 94.7 | 97.0 | 94.1 | 97.4 | 89.6 | 92.1 |
| manifest | 97.4 | 98.3 | 97.5 | 98.5 | 89.6 | 89.6 |
| rendering | 93.8 | 93.8 | 92.4 | 92.4 | 75.0 | 75.0 |
| rendering.gap | 98.9 | 99.1 | 99.1 | 99.6 | 93.0 | 93.7 |
| rendering.plantuml | 99.2 | 99.8 | 98.4 | 99.4 | 92.0 | 92.7 |
| resource | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 |
| resource.element | 93.3 | 100.0 | 89.1 | 100.0 | 100.0 | 100.0 |
| resource.element.application | 85.0 | 95.0 | 89.7 | 97.9 | 80.0 | 90.0 |
| resource.element.technology | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 |
| resource.plateau | 98.7 | 99.7 | 98.3 | 99.1 | 94.6 | 97.6 |
| resource.view | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 |
| resource.workspace | 89.3 | 100.0 | 89.9 | 99.5 | 80.8 | 95.5 |
| viewpoint | 93.7 | 97.9 | 92.0 | 97.7 | 85.3 | 91.2 |
| viewpoint.deep, detailed, map, overview | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 |
| viewpoint.kernel | 96.6 | 98.7 | 95.7 | 99.0 | 90.8 | 92.6 |
| workspace | 96.5 | 99.4 | 95.5 | 99.4 | 89.6 | 93.9 |
| **all of src/main/java** | **96.5** (182 lines missed) | **98.5** (77) | **96.0** (1079 instr.) | **98.6** (375) | **90.0** (246) | **92.9** (175) |

The `(root)` package is `io.morin.archicode`; the first column "before" of lines for `viewpoint.kernel` of the old report was 51.6 % (the module counted).

## Tests added (T10: each one asserts what the code returns, writes or throws)

All asserted on the sentence, the file or the value, never only called. Where a case needs the kernel to break its contract, `Mockito.mockStatic(ViewpointKernel.class)` makes `getInstance()` give a double (the real kernel cannot be made to say these things).

| class | what it pins |
|---|---|
| `ArchiCodeExceptionTest` (15) | the sentence for each shape of Jackson failure: place of a line (0 and -1 are none), unknown key with its kebab-case advice, kind (listed, from the type, none, `group`), wrong shape by kind of value, unrecognized enum value spelled as the author writes it |
| `MapperFactoryTest` (9) | the mapper of each format, strict and lazy; the extension decides; an element is not read from an array nor from a text; empty keys are absent; a number is no enum value |
| `AliasExpandingYamlFactoryTest` (3) | an alias is expanded from string, reader, stream, bytes; a copy and a serialized factory keep doing it |
| `EditorHttpServerTest` (+4) | 405 for a method a route does not take, 404 for an unknown route, an empty file answered with an empty body, a file that cannot be read is a 500 that says nothing of the path |
| `ServeEditorCommandTest` | what `editor serve` asks of the server (host, port, folder, allowed hosts) and the line it prints (the server is a double; the real one is `EditorHttpServerTest` and `EditorServeIT`) |
| `GenerateViewsPropertiesTest` (8) | `--properties-content`, `--properties-format` (json, yaml, toml), `--properties-path` (relative to the workspace, absolute), the file wins over the content, empty content, invalid content is one `error:` line. These options had no test at all. |
| `GenerateStoriesEdgesTest` (5) | the warnings for no story, a view nobody declares, no viewpoint, a viewpoint the command line does not draw; an unknown `--story` when there is none |
| `DiffDetailsTest` (4) | what changed inside an element, in markdown, text and json: a tag changed, added, removed, qualifiers, a description; no difference; nothing to list under `--no-wording` |
| `FacetOnAComparisonTest` (4) | a facet is applied to the union of a comparison: the removed relationship stays (with qualifiers), a facet selects on `change` of an element and of a relationship |
| `KernelContractViolationsTest` (9) | the kernel's error, in a map and not; another version; two items with one id; a link between items not drawn; a relationship with no owner, or that nobody declares; the removed relationship the comparison knows |
| `LayerLoaderKernelTest` (3), `FacetKernelContractTest` (3) | the same for the patches and the facets: error, version, warnings with the name of the facet, elements the model cannot read after the patches |
| `RemovalTest` (5), `ElementIndexTest` (3), `WorkspaceFileExceptionTest` (9) | the cascade of a `REMOVE` kept to what the compared plateau holds; the index; each reason a workspace file cannot be had |
| `PlateauTreeDetailsTest` (7), `PlateauShapeTest` (2) | horizons as periods, ids one letter apart, a plateau declared more than once, two `SET` of one field (with the relationship found by destination and label), null items among the patches |
| `ItemKindTest`, `ChangeTest`, `ReplacesNullTest`, `SolutionAndNestingTest`, `ViewpointServiceDefaultsTest`, `StyleRenderersTest` | the small things: the kind of each element, the words of a change, `replaces: null`, `withElements`, what a parent holds, the defaults of a viewpoint service, the styles and shadows of the diagram |

## Dead code deleted (each shown unused; V-C run)

Unused by `src/main`, `src/test`, the reflection config and the editor (grep over the repository): `ElementIndex.searchFromElements` and `streamDescendants` (the index `sourceElementsByDestinationIndex` they read is still written, and logged by its size: a write-only index, left, not deleted here), `ViewIndex.getView` (the code uses `searchView`), `Workspace.Utilities.walkDown(Element, Consumer<Element>)` (the `BiConsumer` overloads are the ones called), `GenerateViewsCommand.renderWorkspace(Workspace)` and `renderWorkspace(Workspace, Comparison)` (the private three-argument one is the one called). `scripts/byte-identity.sh --no-build` after `./mvnw verify -DskipITs=false`: 20 workspaces, 332 commands compared, 330 identical, 1 accepted by the exceptions file (the self-check), **0 unexpected**.

What stays uncovered and was neither excluded nor deleted (375 instructions, the long tail): the `catch` blocks Lombok's `@SneakyThrows` writes inside a method (13 in `EditorHttpServer`, `GetViewsQuery`, `GetSchemasQuery`, `Guide`, `KernelStates`, ...), defensive branches that no input reaches (the editor's resource missing from the classpath, `EditorHttpServer.query` catching an `IllegalArgumentException` the JDK server already refuses as a 400, `MapperFactory$ElementIsNoArray.deserialize`, which Jackson never calls, `AliasExpandingYamlFactory._createParser(char[]...)`, which `YAMLFactory` does not route to), the shutdown hook of `editor serve` (runs when the JVM ends), `PlateauTree.standsOn` with no common plateau (the root is always common). Each is small; none is worth a test that would only call it.

## V-H: mutation score (PIT on a scratch copy, nothing committed)

`pitest-maven` 1.30.1 with `pitest-junit5-plugin` 1.2.3, on a copy of the working tree in `/tmp` with the plugin added to its `pom.xml` (`-Djacoco.skip=true`, `-DtargetClasses`, `-DtargetTests`). It runs `@QuarkusTest` classes too (here slowly: 30 minutes for the largest selection). Mutation score = killed / generated, over the classes that the tests of this run are the main tests of, with only the tests named:

| classes | tests run | mutants | killed |
|---|---|---:|---:|
| `ArchiCodeException`, `MapperFactory` | `ArchiCodeExceptionTest`, `MapperFactoryTest` | 74 (the first run) | 71 (96 %); after the two tests the survivors asked for (the line-0 location, an element from a text): ArchiCodeException 61/61, MapperFactory 9/9 |
| `WorkspaceFileException`, `Item.Kind`, `Plateau`, `Replaces$Deserializer`, `Solution`, `StyleRenderer`, `StyleShapeRenderer` | their new tests | 54 | 54 (100 %) |
| `Removal` (+ records), `ElementIndex`, `LayerLoader` | `RemovalTest`, `ElementIndexTest`, `LayerLoaderKernelTest`, `LayerLoaderTest` | 125 | 124 (99 %) |
| `PlateauTree` | `PlateauTreeDetailsTest`, `PlateauShapeTest`, `PlateauTreeTest`, `PlateauModelTest` | 177 | 159 (90 %) |
| `ComparisonDocument` | `FacetOnAComparisonTest` | 27 | 23 (85 %, after the facets that select on `change` were added; it was 14/27) |
| `KernelViewpointFactory` | `KernelContractViolationsTest`, `KernelViewpointFactoryTest` | 114 | 74 (65 %: the selection leaves out the tests that draw maps and comparisons, 38 of the 40 are `NO_COVERAGE`, not survivors) |

Weak spots, named: `PlateauTree.standsOn`, `onOneChain` and `listUpToThree` (conditionals that the shared cases of `PlateauModelTest` do not tell apart), `PlateauTree.day` and `period` (boundary of a year), `ComparisonDocument` (the recursion into nested elements, the qualifiers and tags of a relationship in its key, and `strip`: the reader of the facet's answer tolerates a `change` key left in it, so no output shows it), `Nesting.holdsAtTheTop` and `Change.isChange` (`true` survives: no test where it is false). No package has high line coverage and a low score from tests written here; `KernelViewpointFactory` is the one number that says little because of the test selection, not because of the tests. The `Quarkus` classes of the whole project were not mutated (hours): the score above is of the classes that gained the tests.

## V-E: the floor has teeth

- `./mvnw verify -Dtest=ChangeTest` (one test class, a seeded drop of the whole suite): `jacoco:check` reports `lines covered ratio is 0.00, but expected minimum is 0.90`, the same for instructions (0.90) and branches (0.88), `BUILD FAILURE`, exit 1; the report is written before.
- The floor raised: the line limit set to 0.99 in the pom, `./mvnw jacoco:check@check` on the report of the full run: `Coverage checks have not been met`, exit 1; restored to 0.90, exit 0 (the pom diff has the three limits at 0.90, 0.90, 0.88).
- The unit suite as it is passes (`BUILD SUCCESS`).

## Cost

- `./mvnw verify` of HEAD (scratch copy from `git archive HEAD`, 1380 tests): 7 min 07 s. With the agent, the check and 112 more tests: 7 min 22 s, 6 min 01 s and 6 min 16 s in three runs (without the integration tests), 6 min 01 s and 8 min 41 s with `-DskipITs=false`. The spread (6:00 to 7:20 for the same tree) is the machine; the agent and the new tests are inside it. The new tests take 3 s together.
- `MistakeSweepTest`: 113 s of the 390 s of test time of a run with the agent (183 s was the figure of W-1 on a busier machine). Decision: **kept as it is**, in `verify`. Moving it to an integration test would take it out of the figure of the coverage it earns (it runs the loaders on 1,190 mutated workspaces) and make `verify` skip it by default (`skipITs=true`); sampling less would lose the property that every kind of each workspace is swept. The test profile still logs at DEBUG for `io.morin.archicode`; the sweep silences it.
- The Java tests that fail under load: **none seen** in nine full runs of the Java suite (1380 to 1492 tests), the sweep included. The only wall-clock in `src/test/java` is the polling deadline of `EditorServeIT` (90 s to start, 20 s to stop, a poll every 200 ms) and the sweep's own timing line; no assertion depends on a duration. The two load-sensitive tests of the log are node tests (W-10). The new `EditorHttpServerTest` case that reads a file with its mode removed logs an `ERROR` with a stack trace in the build output (the server logs a failure it answers with a 500): expected noise.

## Gates run before the end

`./mvnw verify -DskipITs=false` (JDK 25): exit 0, 1492 unit tests (2 skipped), 39 integration tests, the floors hold. `cargo test` (kernel): 240 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: exit 0. `npm run format:check`: clean (the new Java is formatted by `npm run format`; only the files of this run changed). `npm run lint`: clean. `npm run test:unit`: 2576 of 2576. `scripts/byte-identity.sh --no-build`: 0 unexpected.

## Findings of the run (for the wave, not written into its files)

1. **`archicode init` leaves a half-written workspace when a file cannot be written** (`InitCommand`): the rollback is `catch (RuntimeException e)` and `write` throws `IOException` through `@SneakyThrows`, so it is never taken. `mkdir -p ws/manifests; chmod 555 ws/manifests; archicode init ws` prints one `error:` line and leaves `ws/.archicode.yaml`; the next `init` is refused. The behaviour the guide promises ("nothing is left half written") holds only for the checks made before the first write. The 9 uncovered lines of `InitCommand` are that rollback. Reported as a task chip, not fixed (no behaviour change in this run).
2. **Two author mistakes on `views generate` end in a stack trace**: `-e nope` (`IllegalStateException: Unexpected value: nope`, `ViewRendererServiceRepository.get`; the same message in `ViewpointServiceRepository.get`) and `-p missing.json` (`java.io.FileNotFoundException`, which `ErrorOutput.rank` does not know; it knows `java.nio.file.FileSystemException`). The sweep of W-1 looks at manifests only. Reported as a task chip.
3. The old Java coverage number (47 %) was the generated bytecode, not a lack of tests; anyone who reads a coverage report of this project must know `ViewpointKernelModule*` is not code.
4. Nothing in `src/main` was kept only to be covered: the dead code found was five unused methods and a write-only index (`sourceElementsByDestinationIndex`, kept: its removal touches `ElementIndexUtilities` and the logging, a change for a run of its own).
5. Cost of the Rust side is W-9's; the node floor is W-10's. The branch guard-rail (0.88) is mine and the only enforced figure the author did not ask for; to be raised to 0.90 or removed.

## Not verified

- The CI run on a real runner (the report artifact step, `actions/upload-artifact@v7.0.2` with `if: !cancelled()`, `maven-clean-plugin` and `jacoco-maven-plugin` downloaded from Central): the pull request is the proof.
- The mutation score of the whole project (hours); only the classes above.
- The native image: the coverage is of the JVM tests; the Native job is untouched.

## Canonical impact

Canonical text changed: CLAUDE.md "Build & Test" (one paragraph: how the Java figure is measured and enforced, the three floors, where the report is, what is outside the measure, the `mockStatic` pattern for a kernel that breaks its contract), `pom.xml` (jacoco plugin, check, clean), `src/test/resources/application.properties`, `.github/workflows/ci-build.yaml` (one step that keeps the report). No architecture-level impact: no component, contract or flow changed; `src/main` only lost five unused methods (V-C: 0 unexpected differences over 332 commands).
