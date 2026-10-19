---
type: run
run: 0092
status: completed
wave: 015
---

# Run 0092: Editor reads like the command line

Wave 015 (`editor-reshape-and-loose-ends`), item W-4 (phase P0). Focus: the same input gives the same model or the same sentence in both tools, and the command line never crashes on a null (#80, #85).

Document profile: `single-document`, as runs 0089 to 0091: the scope is settled by the plan (the W-4 row, the fourth criterion of P0) and by the two issues, which list the cases; there is no PRD, TDD or pln. The review passes (a KDMLLC read of this document, the open-question resolution, the C scan against the code) are answered below.

## Scope

In (from #80 and #85, each checked on the jar of the tree before the change; the differential used, `diff.js` and `matrix.js` in the scratchpad, ran about 700 inputs through the jar and through the page, one by one):

- `null` where a list or an object is expected: `elements:` empty, an empty `settings:`, `settings.manifests:`, `paths:`, `paths: [null]`, `elements: [null]`, `relationships: [null]`, empty `qualifiers:` and `tags:` on a relationship, an empty `steps:` (all of them a null pointer or `qualifiers cannot be null` on the command line before).
- An empty `workspace.yaml`.
- `header.kind` written as a whole number (and a number for any enum: `layer: 1`, `operator: 0`).
- Items of a polymorphic list that are lists.
- The coercions of scalars: an int beyond the 32 bits, an enum value with blanks around it.
- The Java names in the `known: ...` sentences (`customs, directoryNameTemplate, globalEnabled`; `actions, hideUnlinked, name`; `jsonPath, operator`) and in `Missing ...jsonPath`.
- #85: the YAML 1.1 words (`yes`, `On`, `TRUE`...) in `header.parent`, `header.plateau` and `content.id`.
- The line and the column.

Out: the manual (W-18; what it must say is in Findings); the `known` sentences of the other readers of the layers (W-5); the shapes of kernel patches (the kernel says them).

## Decisions

- **D1. A key with nothing after it is a key that is not there; an item with no value in a list is no item.** The editor already read both so; the command line crashed. `MapperFactory.reading` sets `Nulls.SKIP` for the value of every property and for the content of `Set`, `List` and `Collection` (not for a `Map`: `tags: {a: }` keeps its null, as before). Three fields hold a `JsonNode` where a null is a value (a patch `value`, the `properties` of a view and of a step): `@JsonSetter(nulls = Nulls.SET)` keeps their null as it was. Why absent and not an error: it is what the page does, it is what an author who has just typed the key means, and no workspace that worked changes but one corner: a primitive with nothing after its key (`global-enabled:`) used to be `false` (Jackson's default for a null primitive) and is now the default `true`, like the page, which now reads every scalar of `settings` that has nothing after its key as absent (`readAliased`). The page learns: `paths: [null]` is an empty list and not the path `null`; an item with no value is left out of `qualifiers`, `applications` and `uses` (it went to the kernel as a null). It keeps one in `relationships` (the form addresses the file by position; issue #105).
- **D2. A `workspace.yaml` with nothing in it (empty, only comments, or `null`) is the default workspace, in both tools.** The page opened it; the command line said `No content to map due to end-of-input`. Same reason as D1. A manifest with nothing in it keeps `Missing header.kind`, and so does one that holds only `null` or `~` (the command line failed with a null pointer there too: N78).
- **D3. A number is no value of an enum.** `FAIL_ON_NUMBERS_FOR_ENUMS` on every mapper: `header.kind: 5` was the fifth kind (and after W-3 removed three kinds, a different one); it is now `unrecognized header.kind "5" (known: ...)` as the page said. `layer: 1` and `operator: 0` follow.
- **D4. An item of a list of elements that is a list is the wrong shape** (`the value has the wrong shape (found an array) at elements[0]`), not a kind read from its first item. The editor says `missing kind` for a scalar item and keeps saying it (the command line says the same); only the array form is new in the page. Done with a deserializer for each of the seven element interfaces (the type-id handler of Jackson cannot be used: the content is buffered, and the parser it sees is not the one that read the list).
- **D5. The keys of `settings.facets` are told in kebab-case.** The Java properties are named `global-enabled`, `directory-name-template`, `hide-unlinked`, `json-path` (`@JsonProperty`) and the camel-case spelling is the alias (`@JsonAlias`), the reverse of before; both are read, only the first is told. `Missing ...json-path` goes through `ManifestParser.documented`. `READ_SCHEMA` and `EditorReadSchemaTest` follow. Serialising a `Workspace` writes the kebab-case name now: the two generated examples `domain_configuration/default_settings.yaml` and `domain_workspace/default.yaml` (a test writes them from the defaults) say `global-enabled` and `directory-name-template`, and `query schemas` describes the kebab-case keys (a validator of the older spelling would flag it; the tool still reads it). The facet request to the kernel is built by hand and does not carry these names.
- **D6 (#85). A field of a header that the command line types as text is the text as written; the rest keeps its rule.** `parent`, `plateau` and `version` are `String` for Jackson, which gives the raw scalar (`yes`, `010`, `0x1F`): this is what the command line has always done, so the only change is in the page (`parseYamlAsModel`: the header is read a second time, only when one of the three fields came out as a boolean, with the words kept). The alternative, refusing a boolean there with the sentence of the wrong shape, would turn a workspace that works today on the command line (`parent: yes` is the reference `yes`) into an error, and the issue's reproduction is exactly that file. `header.kind` is an enum, which Jackson reads by the kind of the value: a boolean stays `the value has the wrong shape (found a boolean)` in both. `content.id` (and `name`, a qualifier, a tag) is not a field of the header: it goes through a tree, in both tools, and the two say `true` for `yes` (case M80). The save compares the file with the model on the same terms (`patchYamlLines` and the move reads), so a save leaves the `parent: yes` line as it was written (a test).
- **D7. `settings.current: ""` names no plateau** (the page read it so; the command line said ``names the plateau ` ` ``).
- **D8. The page learns two small sentences of the command line**: a value of an enum is told without the blanks around it (`operator: " drop "` is `"drop"`), and a whole number beyond an `int` is `Numeric value (N) out of range of int (-2147483648 - 2147483647)` at its key (a text of digits beyond it is the wrong shape, a string). Digits of any script are digits for an `int`, as Java reads them.
- **D9. The line and the column stay the command line's alone.** The page parses to a tree that has no positions, and the column Jackson gives is the one after the token it stopped on: a copy of it would be a guess that breaks the day the YAML reader changes. The case file says so (its heading, and the normalisation of `brightcart-negative.test.js`), and `editor-reads-like-cli.test.js` pins that the page's sentence never carries one.
- **D10. YAML 1.1 numbers written in a form JavaScript would not print back are a known difference, filed as #103.** The command line reads `0x1F`, `010`, `0b11`, `1_0`, `5.0`, `1e2`, `+5`, `.5` as the numbers they are (and the text of an `id` is then `31`, `8`, `3`, `10`, `5.0`, `1000.0`, `5`, `0.5`); the page keeps such a plain scalar as the text it was, so that a save writes it back unchanged, and cannot tell it from a quoted one. Making them equal needs the parser to mark a plain scalar (a model change under the whole save path), which is not a loose end. Pinned on both sides: `YamlOneDotOneNumbersTest` (what the command line does), `editor-reads-like-cli.test.js` (what the page does), N77 of `negative-cases.json` (`editor: null`, with the reason). Same issue: a `header.parent` of `0` is no parent for the page (a falsy number), `.inf` and `.nan` are an `error:` line on the command line (run 0091) and a text in the page, and a plain integer beyond 2^53 is a string for the page (the wrong shape) and `out of range` for the command line.

## Tasks

- [x] T1. Read the plan, the two issues, `ManifestParser`, `WorkspaceFactory`, `MapperFactory`, `ArchiCodeException`, `READ_SCHEMA` and the readers of the page.
- [x] T2. The differential: about 700 inputs through the jar and the page; the table of differences above.
- [x] T3. Command line: `MapperFactory.reading`, `Settings.Facets` names, `ManifestParser.documented` and `isEmptyDocument`, `WorkspaceFactory` (empty workspace, `current: ""`), `@JsonSetter` on three `JsonNode` fields.
- [x] T4. Page: `READ_SCHEMA` (facets), `readTyped` (array), `parseSettings` (null path), `parseYamlAsModel`/`keepHeaderAsWritten`, the enum and the int sentences.
- [x] T5. Cases: N59 to N78 in `negative-cases.json`, M65 to M80 in `plateau-model-cases.json`; the tests of each side (`ReadingNullsTest`, `YamlOneDotOneNumbersTest`, `editor-reads-like-cli.test.js`, `brightcart-negative.test.js`).
- [x] T6. CLAUDE.md, issues #103, #104 and #105, the review pass (a sub-agent; answered below), the gate commands, byte-identity, one commit.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` is corrected where it describes how the two tools read a null, a header and the facets.

## Shipped files

The run ships no example or fixture for the users. The forms it adds, and where each is loaded by both tools:

| form | command line | editor |
|---|---|---|
| a null where a list or an object is expected, an item with no value in a list, a manifest of only `null` (N59 to N63, N78; M65 to M73) | `BrightcartNegativeCasesTest`, `PlateauModelTest`: exit 0 with no line, or the one `error:` line | `brightcart-negative.test.js`, `plateau-model.test.js`: nothing reported, or the same sentence |
| an empty and a comment-only `workspace.yaml` (M74, M75) | `PlateauModelTest` | `plateau-model.test.js` (the harness no longer reads `""` as "absent") |
| `header.kind: 5`, `layer: 1`, `operator: 0`, an item of `elements` that is a list, a boolean kind, an `int` beyond 32 bits, an enum with blanks (N64 to N70) | `BrightcartNegativeCasesTest` | `brightcart-negative.test.js` |
| the keys of the facets, both spellings (N72 to N76) | `BrightcartNegativeCasesTest` | `brightcart-negative.test.js` |
| `parent`/`plateau` written `yes`, `On`, `TRUE`, `off`; `content.id: yes` (M76 to M80) | `PlateauModelTest` | `plateau-model.test.js` |
| `line-gap: 0x1F` (N77, `editor: null` with the reason, issue #103) | `BrightcartNegativeCasesTest` | `editor-reads-like-cli.test.js` (`KNOWN DIFFERENCE`) |

The two generated examples of the manual that changed (`default_settings.yaml`, `domain_workspace/default.yaml`: the kebab-case keys) are loaded by `ManualExamplesTest`, `ShippedFilesTest` and, in the editor, `shipped-files.test.js`.

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 730 tests, 0 failures, 0 errors, 0 skipped (run 0091 left 667; this run adds `ReadingNullsTest` 6, `YamlOneDotOneNumbersTest` 21 and the 20 cases N59 to N78 and M65 to M80 in the two parameterised tests; integration tests are skipped by default, `skipITs=true`) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 190 passed (no Rust change) |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 715537 bytes |
| `node --test "src/test/javascript/**/*.test.js"` | 1516 tests, 1516 pass (1467 before) |
| `npx prettier --check "src/**/*.java"` | clean |

*Fail before, pass after.* The page of `HEAD` put back, the new test files kept: 20 tests fail (N62, N65, N68, N69, N72 to N75, M68, M69, M76 to M79 and six tests of `editor-reads-like-cli.test.js`), none with the new page. The jar of `HEAD` (built from `git archive HEAD` outside the repository) run on the new cases: N59 to N67, N72 to N75 and M65 to M75 fail on it (a null pointer, `steps cannot be null`, `qualifiers cannot be null`, `unknown kind 1`, `kind: 5` read as a kind, `layer: 1` and `operator: 0` accepted, `No content to map due to end-of-input`, the Java names); N68 to N71, N76, N77 and M76 to M80 are what the command line already did (those cases pin the page, or pin the command line, so that the two are held together).

*Byte-identity against `25471b3`* (a workspace without plateaus must give the same views). `identity85.py` (scratchpad, the jar built from `git archive 25471b3` outside the repository, compared with the jar of the tree), on the 11 tracked `workspace.yaml` without plateau (`src/doc/examples/domain_application`, `domain_manifest_folders`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `_4`, `src/test/resources/hyphen-ids`, `src/test/resources/viewpoint-kernel/workspace`), three commands each on a fresh copy for each jar (`views generate`, `query graph`, `diff`): 33 commands, 19 identical (821 files compared), 14 differ, the same 14 as at the end of run 0091 and all known (the 11 `diff` rewordings, `domain_manifest_folders views generate` and `query graph`, which the old jar cannot read, the order of the deprecated-facet warnings of `viewpoint-kernel/workspace views generate`). `domain_workspace` (facets, the keys that were renamed) is among the identical ones.

The differential that found the cases (`diff.js`, `matrix.js`, `scal.js` in the scratchpad: about 700 inputs, the jar and the page one by one) is not committed; its table is the list of cases.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier, read-only, on the working tree. No S0.

- S1 a save rewrote the whole file when the header said `parent: yes` (three acceptance checks of the patch used the raw parse): fixed (`parseYamlAsModel` in `closeYamlDecorations`, `patchYamlTextPlain`, `patchYamlTextAt`), and pinned by a test with a comment, a flow list, a key-column list and `parent: On`.
- S1 the page read `views: {path: }`, `global-enabled:` and the other scalars of `settings` as `null`: fixed (`readAliased`), pinned by a test, and N63 and M70 now have those keys.
- S1 the page kept a null item in lists other than `elements` and `paths`: fixed for `qualifiers` (element and relationship), `applications` and `uses`; not for `relationships` (the form addresses the file by position): issue #105, pinned.
- S2 a manifest that holds only `null` crashed the command line: fixed (N78).
- S2 `global-enabled:` changes from `false` to `true`: said in D1 and in CLAUDE.md.
- S3 `query schemas` describes the kebab-case keys: said in D5. S3 the `null` guard in the position test: fixed. S3 `plateau: yes` / `version: yes` in `YamlOneDotOneNumbersTest`: left (M78 and M79 pin the plateau side; `version` has no effect on the model).

## Findings

- F1 (wave, for W-18: what the manual must now say). A key with nothing after it, and an item with no value in a list, are absent in both tools. An empty `workspace.yaml` is the default workspace. The keys of the facets are `global-enabled`, `directory-name-template`, `hide-unlinked`, `json-path` (camel-case is read, not told): the generated `default_settings.yaml` and `default.yaml` examples already say so, and every sentence of the manual that quotes `globalEnabled`, `directoryNameTemplate`, `hideUnlinked` or `jsonPath` as the key is to be rewritten. `parent: yes` in a header is the reference `yes` (a header field `parent`, `plateau`, `version` is the text as written); `id: yes` or `name: No` in a content is the text `true`/`false` in both tools, which the manual may want to tell authors to quote. A number is no kind (`header.kind: 5`), no layer, no operator. The page does not tell the line and the column of a file, and reads a plain `0x1F`, `010`, `1_0`, `5.0`, `1e2` as text where the command line reads a number (#103): a sentence for the limits.
- F2 (wave). New open issues: #103 (the YAML 1.1 numbers, with a `header.parent` of `0`, `.inf`, `.nan` and a plain integer beyond 2^53), #104 (the command line crashes with a null pointer when `header.parent` names an element whose id has a dot; found by a test of this run, not part of it), #105 (the editor keeps a relationship for an item with no value). #80 and #85 are closed by this run except for #103, which the commit message names.
- F3 (wave, for W-5). The layer checks `known:` lists are not touched; the sentences of `LayerLoader` are still the ones W-5 turns into cases. `Settings.Facets` is the only class whose Java names changed.
- F4. Files outside the `likely_paths`: `src/main/java/io/morin/archicode/MapperFactory.java` (`reading`: the null rules, the numbers for enums, the elements that are not lists), `resource/workspace/Settings.java`, `resource/plateau/Patch.java`, `resource/view/View.java`, `resource/story/Story.java` (the kebab-case names; `@JsonSetter(nulls = SET)` on three `JsonNode`), `src/main/resources/META-INF/native-image/.../reflect-config.json` (`MapperFactory$ElementIsNoArray`, which `NativeReflectionConfigTest` requires), `src/test/javascript/viewpoint-kernel/plateau-model-cases.json` and `plateau-model.test.js` (under `src/test/javascript/viewpoint-kernel/**`, so inside), the two generated examples `src/doc/examples/domain_configuration/default_settings.yaml` and `domain_workspace/default.yaml` (written by a test from the defaults), `CLAUDE.md` and this document. The two wave files were not written. No file of another run was touched.

## Not verified

- The editor on a real screen: the pages are not changed in what they show; the page was run in the Node sandbox of the repository, not in a browser, and the native image was not built (CI's; `MapperFactory$ElementIsNoArray` is registered, and `reflect-config.json` is checked by `NativeReflectionConfigTest`).
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep of `complete-run`: neither exists in this repository.
