---
type: run
run: 0068
status: completed
wave: 013
---

# Run 0068: Query output fixes

Wave 013 (`reported-defects-and-shipped-files`), item W-5 (phase P3). Focus: store or diff the output of query graph, and read query views as TOML.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issues tmorin/archicode#58 and #59, and the open question of the plan is answered by it: "the run takes
the table and says so"); this file carries scope, decisions, canonical impact, review passes, tasks, verification and findings, as run 0056 did for its two sister defects.

## Scope

1. **#58.** `query graph` walks the references in the hash order of a `HashSet<String>` (`ElementIndex.listAllElementReferences`). It walks them in sorted order: layer (application, then technology), then reference; the
   relationships follow their source, then, for one source, as written.
2. **#59.** `query views -f toml` writes a list at the root, which TOML cannot hold (` = [...]`); it writes a table.
3. The manual says both, one sentence each; the note below is for the release notes.
4. Check the other formats of `query views` and the other `query` commands for the same defects.

## Decisions

- **D1. #58, where the sort is.** In `GetGraphQuery.collect`, over a `TreeSet` of the references of the index (the natural order of the text, the order of the references in every other sorted output of the CLI). Not in
  `ElementIndex.listAllElementReferences`: the brief and the wave keep the change in `cli/`, and its other callers (`GenerateViewsCommand`, `GetViewsQuery`, `StateTags`) either sort afterwards or do not print the
  order. The layers stay one after the other, the application first, as `buildGraph` already did. Relationships need no sort of their own: they are emitted while walking their source, so they come by source, and
  `AbstractElement.relationships` is a `LinkedHashSet`, so for one source they stay as the author wrote them (a test pins it with three destinations not in alphabetical order).
- **D2. #59, a table that holds the list under `views`.** `GetViewsQuery.asTomlDocument` wraps the result in `{ "views": ... }` before the TOML mapper sees it, for the TOML format only.
  - *Why the table and not an array of tables.* Jackson's `TomlMapper` only writes inline values, so the table gives `views = [{id = '...', ...}, ...]`, which any parser reads back to the same data, and it is the one the
    wave plan and the issue name first. `[[views]]` reads better by eye, but a view holds nested maps (`properties`, and lists in some), which would need `[views.properties]` headers: a TOML writer of our own, in
    `cli/`, to be kept right for every shape of view, for a format nobody could read until now. Said as a decision, not as a limit of the format.
  - *What is wrapped.* A result that is not an object (the whole list; a JSON Path query that selects several views, or a list of identifiers such as `$.[*].id`) is written under `views`. A result that is an object (`-q '$.[0]'`,
    one view) is a table already and is **left as it was written**, byte for byte (30 outputs compared); wrapping it too would have changed an output that worked, for a rule that is only simpler to say. The key is `views` also
    for a list of identifiers, because the command is `query views` and the query selects from the views.
  - *Not wrapped, because not needed:* `custom` (a template over the JSON), YAML and JSON (a root list is valid in both; byte-identical to the jar before the wave).
- **D3. `query graph` and `query schemas` have no TOML.** Checked on the jar: neither takes `-f` (`Unknown options: '-f', 'toml'`, exit 2, as before); `query graph` writes a JSON object (`elements`, `relationships`) and
  `query schemas` a JSON object, never a root list. The defect of #59 exists in `query views` only. A test of the error is not added: the usage error is picocli's, unchanged.
- **D4. Byte-identity as the contract.** Only two things change: the order of `query graph`, and the TOML of `query views` when the result is not an object. Everything else was compared with a jar built from `6575892`.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet). `CLAUDE.md` does not describe the order or the formats of any `query` output, so it stays as written. The manual
(`src/doc/README.adoc`): a TOML bullet in "Query views" and a new "Query graph" section (the manual had none) with its sorted-output bullet.

## Note for the release notes

> `archicode query graph` now lists the elements by layer (application, then technology) and by reference, and the relationships by the reference of their source and, for one source, in the order the author wrote
> them; and `archicode query views -f toml` now writes a valid TOML document, the list of views under the key `views` (`views = [{ id = '...', ... }, ...]`), where it used to write an assignment without a key that no TOML parser
> reads. Each output changes once, when you upgrade: the elements, the relationships and the views are the same, only the order of the graph and the wrapping of the TOML list change; the YAML, JSON and custom outputs of
> `query views`, and `query schemas`, did not change. A script that reads the TOML of `query views` has not been able to parse it before; one that reads a view by its position in `query graph` should select it by
> `reference` instead.

## Review passes

- **KDMLLC (inline).** K: one `TreeSet`, one three-line static method; no option, no new class, no writer of our own for TOML. D: the wrapping sits in the one place where the result meets the TOML mapper. M: #58 and #59 each have
  tests, the other commands and formats are compared (D3, Verification). L: no sort in `ElementIndex` (other callers, outside `cli/`), no array of tables (D2). U: the method and the sort carry the reason in their comments;
  the manual says what changed and when. C: below.
- **C scan.** Wave plan W-5: "walks the references in sorted order (layer, then reference), relationships by source then as written": D1, the test fixes it on an input whose hash order is not the sorted one
  (asserted in the test, so that it cannot pass by chance). "`query views -f toml` writes a valid document, by wrapping the list in a table": D2. "The manual and the commit body say each output changed once": the
  manual and the note above. Exit evidence "20 runs and two builds give one output of `query graph`; a test reads the TOML back; the set of elements and views of every workspace of the repository unchanged": Verification.
  Gate P3, first criterion: Verification, "Gate P3, first criterion".

## Tasks

- [x] T1. Fail-first: the new tests on the tree without the change (`GetGraphQuery`, `GetViewsQuery` from `HEAD`): 4 fail.
- [x] T2. #58: `GetGraphQuery.collect` walks a `TreeSet` of the references.
- [x] T3. #59: `GetViewsQuery.asTomlDocument`, used for the TOML format only.
- [x] T4. Tests in `SortedQueryOutputTest` (the TOML read back by a parser, a single view, a list of identifiers, the graph order).
- [x] T5. The manual: TOML bullet, "Query graph" section.
- [x] T6. Gate evidence: 20 runs, two builds, the 33 workspace files and every command compared with `6575892`.
- [x] T7. Full verification (below).

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`), offline. Jars: `base` is built from `git archive 6575892` extracted in the scratchpad (the commit before
the wave; no worktree); `newA` and `newB` are two `clean package` builds of the final tree. Every run is in a copy of the tracked tree in the scratchpad (nothing generated next to the repository's files).

**Tests, before and after (`SortedQueryOutputTest`, 7 tests, 3 of them new, 1 rewritten).**

| Test | `GetGraphQuery`/`GetViewsQuery` from `HEAD` | with the change |
| --- | --- | --- |
| `queryGraphListsTheElementsByLayerThenReferenceAndTheRelationshipsBySourceThenAsWritten` | fails: `[warehouse.scanner, shop.catalog, shop, shop.mailer, shop.web, audit, ...]` against the sorted list | passes |
| `queryViewsListsTheViewsByIdentifierThenLayerInEveryFormat` (the TOML half now parses with `TomlMapper`, no regex) | errors: `TomlStreamRead Unexpected token: Got KEY_VAL_SEP, expected key or table` | passes |
| `theTomlOfQueryViewsHoldsTheSameViewsAsTheJsonOnceParsed` (parsed TOML equals the JSON, `views` is the only key) | same error | passes |
| `aQueryThatSelectsOneViewIsATableInTomlAndAListIsHeldUnderViews` (`$.[0]`, a filter on the layer, `$.[*].id`) | same error | passes |

The graph test writes its workspace in a temporary folder and asserts first that the hash order of both layers is not the sorted one (it holds, so the test cannot pass by chance), then the elements by layer
and reference, the relationships by source with three destinations of one source in the order written (not alphabetical), and five more runs giving one text.

**Gate P3, first criterion.**
- `query graph` over 20 runs: `viewpoint-kernel/workspace` and `brightcart/folders`, 20 runs of `newA` and 20 of `newB` each, `md5sum` of the output: one value per workspace, the same for the two builds
  (`aa3f1248...` and `64e73841...`). `query views -f toml` on `viewpoint-kernel/workspace`: 20 and 20 runs, one value (`b7d84cc3...`).
- The 33 files of the repository (git-tracked YAML with a top-level `application`, `technology`, `settings` or `manifests` key: the 30 workspace files that run 0056 counted, plus three that came since or that run left out; of the 33, three fail the same way before and after: `empty.yaml`, `default_settings.yaml`, which is not a workspace, and
  `case_graph_dangling.yaml`, the dangling destination on purpose) were run on `base`, `newA` and `newB`: `views generate` (and, for the seven workspaces with plateaus, per plateau, with `diff` in text, json and markdown),
  `query views` in json, yaml and toml (and per plateau), `query views -q '$.[0]' -f toml`, `query graph` (and per plateau), then `query schemas workspace|manifest` three times, the error outputs of a missing workspace,
  an unknown format, `-f` on `query graph` and on `query schemas`, and the two `--help`. 1062 files per jar (stdout, stderr, exit code of each command), compared by a script of the scratchpad:
  - `newA` and `newB`: **byte-identical on all 1062** (two builds of one commit), and the trees they generated are identical.
  - `base` against `newA`: the trees written by `views generate` (every plateau, `gap.md`, `gap.json`, `views-<plateau>-vs-<base>`) are **identical, 0 differing lines**; **216 standard outputs (the other commands) and 708
    standard errors and exit codes are byte-identical**, error outputs and `--help` included; `query schemas`: 6 of 6 byte-identical.
  - `query graph`: 48 outputs, 3068 elements and 3145 relationships; as multisets (JSON objects with sorted keys) **the elements and the relationships of every one are equal to those of `base`**, the elements are in the
    order (layer, reference), the relationships in the order of their source and, for one source, in the order of `base`; 2 of the 48 are byte-identical to `base` (already in order).
  - `query views -f toml`: 51 outputs of workspaces that load; **none could be parsed on `base`** (Python `tomllib`), **all 51 are read by `tomllib` on `newA` and their `views` equal the list of `query views -f json`**,
    and the text of each is exactly `views` followed by the text of `base`. The 30 single-view TOML outputs (`-q '$.[0]'`) are byte-identical to `base`. Three failing workspaces give the same error before and after.
  - The JSON and YAML of `query views` are included in the byte-identical standard outputs.
- Workspaces: `src/doc/examples/**` (design_example_step_1..3, domain_*, facet_example_step_1..4), `src/test/resources/{brightcart/folders, hyphen-ids, plateau-comparison, plateau-comparison/replaces,
  plateau-state-hints, plateau-state-tags, replaces-large-pair, viewpoint-kernel/workspace}/workspace.yaml`, `src/test/workspaces/case_{a,b,c,graph_dangling,graph_ok}.yaml`.

**The five commands, on the final tree.**
- `./mvnw -o verify`: BUILD SUCCESS, 425 tests, 0 failures, 0 errors, 2 skipped (`HyphenIdViewsTest` and `DistinctDashesRenderingTest`, skipped before this run).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 173 passed, 0 failed.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build".
- `node --test "src/test/javascript/**/*.test.js"`: 1038 pass, 0 fail.
- `npx prettier --check "src/**/*.java"`: clean.

Not verified: the native image (no GraalVM for Java 25 here; wave item W-5 of wave 011 added the CI job); a JDK other than 25 (the point of #58 is that another hash table would move the old order; the sort does not depend on it, the
test fixes it by asserting that the hash order of its input is not the sorted one).

## Findings

- **F1. `query graph -f` and `query schemas -f` do not exist**, so the defect of #59 cannot happen there; they write JSON only.
- **F2. The graph has no `relationships` key when there are none** (the JSON mapper omits empty collections, `NON_EMPTY`), also before this run; a script that reads `.relationships` of a workspace without any must
  allow for a missing key. Not changed (it would change the output of a format that is not the subject of this run); for the release notes, if the author wants it said.
- **F3. `views generate --plateau after` on `src/test/resources/replaces-large-pair` takes several minutes** of CPU on `newA` and on `newB` (the candidates of the large pair, #60/W-6), which is most of the hour the comparison took; not measured on `base`, and
  nothing to do with this run (the generated trees are identical).
- **F4. Files outside `likely_paths`:** none.
