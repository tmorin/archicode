---
type: run
run: 0056
status: completed
wave: 011
---

# Run 0056: Sorted query output

Wave 011 (`faithful-saves-and-stable-output`), item W-2 (phase P1). Focus: diff or store the output of query views and query schemas without noise from one build to the next.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issues tmorin/archicode#48 and #49, ruled "one dedicated run that sorts the output, announced in the release
notes"); this file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

1. **#48.** `query views` collects the views in a `HashSet<View>`; the hash code of a `View` holds the identity hash of its `layer` (an enum), which depends on what the JVM did before, so
   two builds of the same commit list the same views in another order. The views are collected in a list sorted by identifier, then layer, and every format prints that list.
2. **#49.** The properties of some objects of `query schemas` change order on a fraction of the runs. Find the cause (generator or serialisation, and the native image), then fix the order.
3. The manual says the output is sorted and by what; the commit-style note below tells whoever writes the release notes that the order changes once.
4. Compare every other `query` command that prints a collection built from a hash-based set or map; fix only #48 and #49, file the rest.

## Decisions

- **D1. Cause of #49 (read and measured, not guessed).** On the jar built from `HEAD` (before the fix), 60 runs of `query schemas` gave 39 times one output and 21 times another (35%, more
  often than the one in twenty of the issue). The two differ only in the place of `description` among the properties of the three element schemas (`ApplicationElement`,
  `TechnologyElement` and the one below `technology`): `[name, id, qualifiers, relationships, description, tags, replaces]` against `[name, id, description, qualifiers, ...]`; as JSON
  documents they are equal. The generator (`JsonSchemaGenerator`) only visits the serializer that Jackson built, in the order of the properties of that serializer, so the order comes from
  Jackson's introspection of the type, not from the generator and not from the serialisation of the result. For a concrete class the properties come from the fields, whose order is the
  declaration order; for an **interface** (`Element`, `TechnologyElement`: they declare getters and no field) they come from `getDeclaredMethods`, and the JVM does not fix that order (it
  follows the address of the method names in the symbol table, which moves with what was loaded before). Elements printed by `query graph` are concrete classes and do not move (see F1).
- **D2. Fix of #49: sort the properties by name, in Jackson.** `GetSchemasQuery.sortedWriter` copies the JSON mapper of the application, enables
  `MapperFeature.SORT_PROPERTIES_ALPHABETICALLY` and builds the writer the schema is generated and written with. The sort is done where the order is decided (by Jackson, before the generator
  visits the properties), so it does not depend on the order the JVM, or the reflection metadata of a native image, hands out; the shared mapper of the application is not changed (a copy), and
  no other output changes. Alternative rejected: sorting the generated tree after the fact, which would add a second walk of the schema and would leave the generator's own order in any other
  place it is used. The order is alphabetical, not the declaration order: the declaration order is exactly what an interface does not have.
- **D3. Native image.** Not measured: the repository's native build needs GraalVM/Mandrel for Java 25, and the only GraalVM on the machine is 17 CE, which cannot read Java 25 classes
  (W-5 adds the native job to CI). By reasoning: a native image answers `getDeclaredMethods` from metadata fixed when it is built, so one image would give one order, but two builds of the
  same commit are not promised the same order, which is the same defect between builds. The fix sorts before any such order is used, so it holds there as well. Said as not verified in the report.
- **D4. Fix of #48.** `GetViewsQuery` still deduplicates in a `LinkedHashSet` (a built-in view equal to a declared one is listed once, as before), then sorts into a list with a total order
  (`VIEW_ORDER`): identifier, layer (application before technology, the order of `View.Layer`), viewpoint, name, description, the properties as text (`null` first). Identifier and layer are what
  the wave asked for; the remaining keys only break a tie that cannot happen with built-in identifiers (the identifier holds the viewpoint), but a user view of the workspace may repeat an
  identifier, and a stable order that depends on the order of the input would put the defect back. The sort is before the JSON Path query (`-q`), so `$.[0]` is the same view every time and
  YAML, TOML, JSON and `custom` all see one list. `filterViews` takes a `List<View>` instead of a `Set<View>`; the JSON written is an array in both cases.
- **D5. The note of the changed output** is in the manual (the "Query views" and "Generate JSON Schemas" sections, which say what is sorted by and that the order changes once, in 0.14.0 as
  the pom says the next release is) and below, for the release notes. The repository has no changelog.
- **D6. Nothing else is changed:** not the Rust, not the editor, not `views generate` (already deterministic since wave 010), not `query graph` (F1).

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: this run has no TDD). `CLAUDE.md` does not describe the order of any `query` output, so it stays as written. The manual
(`src/doc/README.adoc`): two bullets, see D5.

## Note for the release notes

> `archicode query views` and `archicode query schemas` now print a fixed order. The views are sorted by identifier and then by layer (application before technology), in every output
> format and before the JSON Path query is applied, and the properties of every object of the JSON schemas are in alphabetical order. Until now the order of the views changed from one
> build of the jar to another (it depended on the identity hash of an enum) and the properties of the elements in the schemas changed on a fraction of the runs; the set of views and the
> content of the schemas did not change, only their order. The order therefore changes once, when you upgrade, and then no longer changes between runs or builds, so that the output can be diffed
> or committed. A script that reads a view by its position (`$.[0]`) must select it by `id` instead.

## Review passes

- **KDMLLC (inline).** K: one comparator, one `LinkedHashSet`, one writer factory; no option, no new class. D: one sort for four formats and the query (the single list built before
  `filterViews`); one writer for the command and for the tests. M: the views (#48) and the schemas (#49) each have a test; the other commands are compared and reported (F1, F2). L: no
  sort of `query graph` (filed, F1), no TOML repair (filed, F2). U: the comparator and the writer carry the reason in their comments. C: below.
- **C scan.** The wave plan says "a list sorted by id then layer (#48)": done, with the remaining keys as tie-breakers (D4). "The properties of `query schemas` in a fixed order, after
  finding whether the generator or the serialisation moves them, and whether the native image does the same (#49)": found (D1), native not measurable here (D3). "The manual says the
  output is sorted, and the commit says the order changes once": D5 and the note above. "The sets of views of the 13 workspaces are unchanged": the issue counts 13; the run covered the 30
  workspace files that hold a workspace in the repository (29 load; `empty.yaml` is a deliberate failure, same exit code and message before and after), a superset of the 13, see Verification.

## Tasks

- [x] T1. Reproduce #49 on a jar of `HEAD` (60 runs: two outputs) and find its cause (D1); keep that jar as the reference.
- [x] T2. #48: `GetViewsQuery` collects, deduplicates and sorts (`VIEW_ORDER`, `sortViews`).
- [x] T3. #49: `GetSchemasQuery.sortedWriter` and its use by the command.
- [x] T4. `SortedQueryOutputTest` (4 tests); the manual's two bullets; this document.
- [x] T5. Compare the other `query` commands (F1, F2); file what is not in scope (#58, #59).
- [x] T6. Gate evidence: 20 runs and two builds, the 30 workspace files, set equality, schemas equal as documents.
- [x] T7. Full verification (below).

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`), offline. Jars: `base` is the jar built from `HEAD` before the change; `newA`
and `newB` are two `clean package` builds of the working tree. Workspaces are copies in the scratchpad (nothing generated next to the repository's files).

- `archicode query schemas workspace` and `... manifest`, 20 runs each of `newA` and of `newB`: **one output per command and per jar, the same for the two jars**
  (md5 `1b7f53a4...` and `207a830a...`). On `base`, 60 runs of `query schemas`: 39 and 21 (two outputs).
- `archicode -w src/test/resources/viewpoint-kernel/workspace/workspace.yaml query views -f json`, 20 runs of each of `newA` and `newB`: **one output, the same for both jars**
  (`b1ed6c14...`).
- The 30 workspace files of the repository that hold a workspace (`git ls-files`: `src/doc/examples/**/workspace*.yaml`, `default.yaml`, `empty.yaml`, `src/test/resources/**/workspace.yaml`,
  `src/test/workspaces/case_*.yaml`; the 7 manifests under `viewpoint-kernel/workspace/manifests` are not workspaces): `query views` in `json`, `yaml` and `toml`, and `query graph`, for
  `base`, `newA` and `newB` (240 files per jar, with the exit code and the error output of each): **`newA` and `newB` are byte-identical on all of them**; `query graph` and
  every error output and exit code are byte-identical between `base` and `newA`.
- **Sets of views, `base` against `newA`**: 29 workspaces load, **0 differences** as sets (JSON compared as multisets of sorted-key objects, YAML line by line, TOML object by object); the
  order of the new output is by identifier then layer in every one of the 29; the old order was already that one in only 1. `empty.yaml` fails the same way before and after.
- **Schemas, `base` against `newA`**: equal as JSON documents for `workspace` and for `manifest` (only the order of properties differs), and the other output of `base` seen in the 60 runs
  is equal to the new one as a document too.
- `./mvnw -o verify` on the final tree: BUILD SUCCESS, 329 tests, 0 failures, 0 errors, 1 skipped (`HyphenIdViewsTest`, skipped before this run too; the Failsafe integration tests are off by default).
- `npx prettier --check "src/**/*.java"`: clean. `node --test "src/test/javascript/**/*.test.js"`: 909 passed, 0 failed (three runs).
- New tests (`SortedQueryOutputTest`, 4): the sort of the views under 50 shuffles of a list with a tie on identifier and on layer; `query views` on the invented `viewpoint-kernel`
  workspace is sorted in json, yaml and toml, lists both layers and each view once; the properties of every object of both schemas are alphabetical (walked recursively, a property
  called `properties` included); `query schemas workspace` twice gives one text. The first two fail on `HEAD` (no `sortViews`/`sortedWriter`; the view listing is in hash order).
- Not run: a native image (D3); `cargo test` and `embed.sh --check` (the Rust is untouched).

## Findings

- **F1. `query graph` has no identity-hash defect, but it is not sorted.** It builds its references from a `HashSet<String>` (`ElementIndex.listAllElementReferences`); `String.hashCode` is
  specified, so the order is a function of the references: 40 runs on one workspace, one output; `base`, `newA` and `newB` byte-identical on the 30 workspace files. The elements it prints are concrete
  classes, whose properties come from fields in declaration order (no #49 here). Risk left: order inside a collision bucket follows the order the manifests were read; a JDK that changes the hash
  table reorders everything once. Filed as **#58** (sort the references).
- **F2. `query views -f toml` is not valid TOML** (a root list is written as ` = [...]`), on the jar before the run too. Filed as **#59**.
- **F3. Other hash-based collections in `cli/`** (`GenerateViewsCommand.viewIds`/`viewpointNames`, `EditorHttpServer`, `ServeEditorCommand`) are sets of strings used for membership or
  hold strings (a deterministic hash); they are not `query` commands, and none is printed in its own order by one (`-i a b` renders in the hash order of the two identifiers, and
  the files generated do not depend on it). `getBuiltinViews` still returns a `Collectors.toSet()`, which is why the list is sorted after it.
- **F4. For the wave.** The README paragraph of "The same workspace gives the same files" is about `views generate`; this run did not touch it. W-3 edits another part of the same file.
  The 13 workspaces of the issue were not enumerated anywhere in the repository; this run used all 30 workspace files (a superset), listed above.
