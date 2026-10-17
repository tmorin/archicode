---
type: run
run: 0061
status: completed
wave: 012
---

# Run 0061: Brightcart tests

Wave 012 (`brightcart-fixture`), item W-2 (phase P2). Focus: break a build when a tool stops giving the answers the Brightcart document records.
Document profile: `single-document` (the scope arrives settled by the wave plan and by section 11 of `docs/fixtures/brightcart-spec.md`; the design has no live alternative: tests that read the generator's committed
output; the work is one sequence). This file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

Java tests (`src/test/java/io/morin/archicode/brightcart/`) that read the committed output of the generator (`src/test/resources/brightcart/`), never run node: `diff` for P1, P2, P3, P5, P6 against `expected/`,
`views generate` for the four plateaus and the three facets, two runs giving identical bytes, `query views` stable. Node tests (`src/test/javascript/viewpoint-kernel/brightcart-*.test.js`) on the kernel (`compare` and the
notable cases of section 10) and on the editor (open each plateau, the Changes panel, the line-preserving save of every manifest of both renditions). The `Native` smoke step of `.github/workflows/ci-build.yaml`
extended with a copy of `folders/`. Nothing in the tools changes. What needs E1 fixed (the comparison views of `inhouse` and `marketplace`) is W-3's.

## Decisions

- **D1. One test class per row of the table of section 11 that today's tools can run.** Java: `BrightcartDiffTest` (command line, `diff`), `BrightcartViewsTest` (`views generate`: four plateaus, three facets), `BrightcartStableOutputTest`
  (two runs, `diff` formats, `query views`, `query graph`), `BrightcartSizesTest` (the loader reads the sizes of the document, through `query graph`). Node: `brightcart-kernel.test.js` (kernel row), `brightcart-editor.test.js` (editor row).
  The rows that need the engine (layered, migration, merge, variants) are not run: nothing runs them.
- **D2. The numbers are read, never typed.** Counts, tables of changes and notable cases come from `expected/*.json`; the arguments of `diff` come from the `command` of each comparison in `comparisons.json`. A test asserts the
  tool against the file, so a change to the fixture, to the tool, or to the generator's output fails the test that reads it. Only P1, P2, P3, P5, P6 (`verified: "archicode diff"`) are asserted; P4 is the model's.
- **D3. The Java tests run the real picocli command line in the process, on a copy of `folders/` in a temporary folder** (`Brightcart.Cli`, a copy of the idea of `CliHarness`, which is package-private to `cli`). The repository is
  never written. The first full `views generate` (four plateaus) is made once per JVM (`Brightcart.firstRun`), read by `BrightcartViewsTest`, compared with a second one by `BrightcartStableOutputTest`.
- **D4. What E1 breaks is tolerated, not asserted.** `inhouse` and `marketplace` write their own views and the views of their facets, then stop on the dangling reference. The tests assert those files and accept an exit 0 or the
  exit 1 whose message matches `Brightcart.E1`; they say nothing of the comparison views. When W-3 fixes E1 the two plateaus exit 0 and nothing needs to change; W-3 removes `E1` and the alternative. The half-written folder
  `views-<plateau>-vs-<baseline>` of a plateau that stopped is left out of the comparison of two runs (finding F3); once the plateau exits 0 it is compared.
- **D5. The kernel's `contains-changes` (N13) is read from where the tool draws it.** Node: `compute` over the union (`map` for `shop`, `detailed` of `prod` for `prod.dc`); the `deep` view of `inhouse` and `marketplace` is E1 and is not
  drawn. Java: the comparison views `views-saas-vs-baseline` hold `<<contains-changes>>` on `shop` and `prod.dc` (P1). N13 in P2 and P3 in the CLI waits for the fix.
- **D6. The save tests cover both renditions in two ways.** Text (`patchYamlText`) for the 73 files of `folders/` and the 49 of `layered/`: no edit gives the file byte for byte; a rename changes the line of the name and no
  other, and putting it back gives the file back; a tag added to the root only adds lines. And the editor itself (`loadWorkspace`, `commitElementEdit`, `saveAllChanges`, an in-memory folder) on the whole of `folders/`, plateau
  by plateau: one rename per manifest, saved, one line differs per file, nothing else written; renamed back and saved, every file is the bytes of the disk. `layered/` goes through the text save alone (no engine reads it).
  `renditions.json` (files, lines, bytes) is asserted against the files read.
- **D7. The `Native` smoke step gets a copy of `folders/`** (`$work/brightcart`) and six checks: `diff --plateau inhouse` (the `replacing` line), `diff --plateau inhouse --baseline saas`, `views generate --plateau saas`, and three `test -s`
  (the plateau's view, the comparison's `gap.json`, a facet's view). `inhouse` and `marketplace` are left out of the step while E1 stands. The diff of the workflow is added lines only (12, one of them blank); nothing is changed or removed.
  The counts are not repeated in shell: the unit tests own them.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet): tests and a CI step only.

## Review passes

- **KDMLLC (inline).** K: one helper (`Brightcart`), four classes, two files; no new dependency (the `@ParameterizedTest` already used by the project). D: numbers written once, in `expected/`; the table-of-changes comparison appears in
  Java and in node because the two stacks are two tools. M: diff / views / stable / sizes / kernel / editor each hold one thing. L: no option or mode; the E1 tolerance is one constant. U: each file says what it reads, what it
  does not assert and why. C: the wave plan's list for W-2 is covered one for one (see the C scan).
- **C scan.** Wave plan W-2 scope against what exists: `diff` counts P1/P2/P3/P5 (and P6) against `expected/` (BrightcartDiffTest); `views generate` for the four plateaus and the three facets (BrightcartViewsTest, with the saas
  `without-cart` selecting nothing and still generating); two runs identical, `query views` stable (BrightcartStableOutputTest); kernel `compare` and notable cases (brightcart-kernel); editor open/Changes panel/saves
  (brightcart-editor); Native step (D7). Two statements of the plan are narrowed by what the tools do: (1) "the third facet selects nothing in `saas` and still generates": true for the application views (byte-identical to the plain
  ones) but not for the technology views, which any facet draws with the links between applications (F4); (2) the Changes panel is read for the counts and the lists; *Write replaces* and *Move* are W-4's (the wave plan puts them
  in the look).

## Tasks

- [x] T1. Read the wave plan, the document, the fixture, runs 0060, 0055, 0059 and the existing patterns.
- [x] T2. Java tests: diff, views, stable output, sizes.
- [x] T3. Node tests: kernel, editor (Changes panel, saves).
- [x] T4. `Native` smoke step; its text run with `bash -e` against the JVM build.
- [x] T5. Show that each class fails when a fixture file it reads is altered.
- [x] T6. Full verification and timings.

## Verification

All with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`, `PLANTUML_JAR=/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`.

- `./mvnw -o verify`: BUILD SUCCESS, **404 tests**, 0 failures, 0 skipped (337 before this run, 67 added: 24 + 4 + 15 + 24). Wall time **5m51s** against **4m47s** for the tree before (measured the same way, same machine): **+64 s**.
  The four classes take 11.7 s (diff), 0.9 s (sizes), 84.7 s (stable output, which holds the two full `views generate` runs: about 40 s each) and 0.3 s (views, which reads the first run) when run alone; surefire overlaps classes.
- `node --test "src/test/javascript/**/*.test.js"`: 966 pass, 1 fail in the first full run, then 0 fail in the next five. The failing test is `folders.test.js` "Open on a folder of the list asks the permission..." (a fixed 50 ms
  wait, pre-existing: it fails the same way with the two new files left out of a loaded run); filed as **tmorin/archicode#66**. The two new files: 53 tests (31 + 22), 3.7 s alone; the full run takes 33 s.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 169 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (655544 bytes)", exit 0.
  (No Rust touched; run because the gate lists them.)
- `npx prettier --check "src/**/*.java"`: clean. `npx prettier --check .github/workflows/ci-build.yaml`: clean.
- Workflow: `yaml.safe_load` parses (jobs `Build`, `Native`); `git diff .github`: 12 added lines (one blank), 0 deleted or changed; the publish steps are not touched. The text of the `Run the native image on the examples of the manual` step,
  extracted from the parsed YAML, run with `bash -e` from a scratch folder with a stand-in runner that execs `java -jar target/quarkus-app/quarkus-run.jar`: **exit 0**, 16 `ok:` lines (the six new ones among them), no `failed:`.
- Each class fails when a fixture file it reads is altered (fixture restored with `git checkout -- src/test/resources/brightcart` after each; `git status` clean):
  - `BrightcartDiffTest`: the `replaces: shop.cache` of `commerce.cart-store` removed from `folders/plateaus/inhouse/app.commerce.yaml` (and `saas/app.mailer.yaml` moved away): 12 of 24 fail (P2 +18 instead of +17, the table, the text).
  - `BrightcartSizesTest`: `folders/plateaus/saas/app.mailer.yaml` moved away: fails (`unable to find the element mailer`).
  - `BrightcartViewsTest` and `BrightcartStableOutputTest`: the `without-cart` facet removed from `folders/workspace.yaml`: 4 + 1 and 1 fail (`views-<plateau>-without-cart` absent; 15 folders compared instead of 20).
  - `brightcart-kernel.test.js`: the same `replaces` removed: 4 fail (P2 and P5 counts, the P2 table, N5). `brightcart-editor.test.js`: the same: 3 fail (Changes panel of P2 and P5, `renditions.json`);
    `layered/inhouse/application/commerce.yaml` and `folders/plateaus/inhouse/app.commerce.yaml` re-indented to 4 spaces: 12 fail, among them the three save tests of each rendition and the editor save of `inhouse`.
- The CLI and the in-process generation were run on copies outside the repository tree only (`git status --short src/test/resources` is empty after every alteration).

NOT verified: **no native image was built** (the only GraalVM here is 17; the `Native` job has never run; the smoke text was run against the JVM build, as in run 0059); the first native run is the pull request's. The six new checks are
therefore valid shell against the JVM build, not against the image.

## Findings

- **F1. The kernel keeps a replaced box in the union.** In P3 and P6 `shop` (replaced by `storefront`, with children that were removed) is an element of `compare`'s output with `change: "removed"` and `replaced_by: ["storefront"]`;
  it is neither counted in `removed` nor a row of the table (`expected/changes.json` and `diff` do not list it). The kernel test leaves such elements out of the table and says why.
- **F2. E1 shows in the editor too, in one place.** Comparing `inhouse` with `baseline` (or `marketplace` with `inhouse`), the Changes panel, the map and the `detailed` view of an environment work; the `deep` view of an
  environment fails in the kernel's `compute` with `dangling application reference: shop.cache` (and `dangling reference: shop.web`). For W-3 and W-4.
- **F3. The half-written comparison folder after E1 is not stable.** In the same JVM, two runs of `views generate --plateau inhouse` wrote `views-inhouse-vs-baseline` with a different set of files (one had
  `plantuml/technology/prod-overview.puml`, the other not; as separate processes they were identical). `BrightcartStableOutputTest` leaves these folders out while the plateau stops; W-3's fix makes it moot.
- **F4. A facet changes the technology views even when it selects nothing.** `views-saas-without-cart` has the same files and the same application views as `views-saas`, but 20 technology views differ (e.g. `prod-deep.puml`
  gains `batch_vm_fulfilment_sync --> db_vm_shop_db` and `web_vm_shop_web --> app_vm_shop_app`): a faceted workspace tells the kernel `application_links: true` on purpose (`KernelViewpointFactory`). It is by design, not a
  defect; the document's sentence on `without-cart` ("selects nothing in saas") is true of the elements, not of the bytes of the technology views.
- **F5. `expected/changes.json` keeps the old label of a label change, the tools the new one.** N3: the file's `label-changed` rows carry `reads orders, writes stock levels`; `diff` and the kernel say `changed`, label
  `writes stock levels`, `before.label` the old one. The tests map them (run 0060's F5 says the same).
- **F6. A pre-existing flaky node test** (`folders.test.js`, fixed 50 ms wait) fails under load: tmorin/archicode#66.
- **F7. For the wave.** Files outside `likely_paths`: none. Issues: #66 (flaky test). `Brightcart.java` (helper) sits in the package folder of the tests. W-3 should remove `Brightcart.E1`, the `exit() != 0` branch of
  `BrightcartViewsTest.theTwoPlateausThatReplaceElementsExitZeroOrOnTheKnownComparisonError`, and the `stopped` filter of `BrightcartStableOutputTest`, and may add N13 in P2 and P3 to the CLI tests
  (`<<contains-changes>>` in `views-inhouse-vs-baseline` and `views-marketplace-vs-inhouse`).
