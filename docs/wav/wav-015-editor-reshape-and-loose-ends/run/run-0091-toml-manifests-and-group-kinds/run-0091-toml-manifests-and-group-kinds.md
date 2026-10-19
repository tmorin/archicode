---
type: run
run: 0091
status: completed
wave: 015
---

# Run 0091: Toml manifests and group kinds

Wave 015 (`editor-reshape-and-loose-ends`), item W-3 (phase P0). Focus: a TOML manifest loads, and the three root kinds that do not exist are gone, in both tools (#84, #79).

Document profile: `single-document`, as runs 0089 and 0090: the scope is settled by the plan (the W-3 row, the third criterion of P0, decision D6) and by the author's decisions of 2026-10-18 on both issues; there is no PRD, TDD or pln.

## Scope

In:

- #84 A: a manifest written in TOML loads on the command line. `ManifestParser` reads the file with the mapper of its extension, then the `content` again, which `ManifestConverter` turns into JSON text, with the JSON mapper whatever the format of the file was.
- #79 A: `container-group`, `solution-group` and `system-group` are not kinds. They go from `ManifestKind`, `ARCHICODE_KIND_MAP`, `READ_SCHEMA.manifestKinds` and the code of the editor that handled them; each gives the one sentence `unrecognized header.kind ... (known: ...)` in both tools. The nested kind `group` (inside a container, a solution or a system) is untouched.

Out: the manual (W-18; what it must say is in Findings), `plateau` kinds and the readers' other differences (W-4, W-5), the Move dialog (W-16).

## Decisions

- **D1. The JSON mapper is used for every format, not for TOML only.** The content is JSON text whatever the file was; one rule, no branch on the extension. The mapper comes from `MapperFactory` (same features as the YAML one: case-insensitive enums, `NON_EMPTY`), so the second read has the same settings it had; the sentences of the negative cases (which pin line and column of the first read, and the "not those of the file" of the second) pass unchanged.
- **D2. No TOML manifest is shipped to the users.** The editor does not read TOML (it lists the `.toml` files among those it does not read, as the manual says), so a shipped TOML manifest would be a file one tool loads and the other does not. The twins are made in the temporary folder of the tests from the manifests the repository ships; the editor's answer for a TOML file is pinned by case D36 of `discovery-cases.json` (run by the command line, which loads the element, and by the editor, which counts the file as unread) and by `ui-fixes.test.js`.
- **D3. A group cannot be added under an element another plateau declares, as a manifest of its own.** `commitCreateChildElement` wrote `kind: <level>-group` for that case (a manifest the command line refused). With the kinds gone the editor says the sentence it already had for a kind with no manifest (`A group under ... cannot be written in a manifest of its own: draw <plateau> to add it`). A patch could add it (W-16 and later may offer it); not built here.
- **D4. `kindAbbreviation` and `navKindRank` no longer strip a prefix.** A kind in the model is a bare word (`group`), never `container-group`.

## Tasks

- [x] T1. Read the plan, #84, #79, `ManifestParser`, `ManifestConverter`, `ManifestKind`, the editor's tables.
- [x] T2. `ManifestParser` (JSON mapper for the content), `ManifestConverter` (doc), `ManifestKind` (three constants out; `getSubTypeName` is the lower-cased name, there is no underscore any more).
- [x] T3. `standalone.html`: `ARCHICODE_KIND_MAP`, `READ_SCHEMA`, `reducedLevelForKind`, the `-group` computations of the level, the inherited-parent path, `kindAbbreviation`, `navKindRank`, the comments.
- [x] T4. Tests: `TomlManifestTest` (new); D36 in `discovery-cases.json` (+ TOML branch of `manifestOf` in `discovery.test.js`); N56 to N58 in `negative-cases.json`; the lists of known kinds in five tests; the node tests that read a group at the root.
- [x] T5. `CLAUDE.md` (one sentence on the formats of a manifest and one on the kinds).
- [x] T6. A review pass (a sub-agent), its findings answered; the gate commands on the final tree; byte-identity of the views of the workspaces without plateau; one commit.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` is corrected where it describes the formats and the kinds of a manifest.

## Shipped files

The run ships no example or fixture for the users of the repository. The forms it adds, and where each is loaded:

| form | command line | editor |
|---|---|---|
| a TOML manifest (every kind that a shipped manifest has, a view and a story from the manual's snippets) | `TomlManifestTest` (the TOML twin of each shipped workspace, plateau by plateau, same elements, views and stories; one test per kind; nested elements; a broken file is one `error:` line) and case D36 of `discovery-cases.json` (`ManifestDiscoveryTest`) | D36 in `discovery.test.js`: the file is counted among those the editor does not read, its element is not drawn; `ui-fixes.test.js` pins the sentence of Files |
| a manifest of kind `container-group`, `solution-group` or `system-group` | N56 to N58 (`BrightcartNegativeCasesTest`): `error:` line, exit 1; `TomlManifestTest` for a TOML one | N56 to N58 (`brightcart-negative.test.js`), `editor-reads-like-cli.test.js`, `model-ops.test.js`: the same sentence in the file's error |

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 667 tests, 0 failures, 0 errors, 0 skipped (the run adds `TomlManifestTest` 17, case D36 and N56 to N58 in the existing parameterised tests; integration tests are skipped by default, `skipITs=true`) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 190 passed (no Rust change) |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 715537 bytes |
| `node --test "src/test/javascript/**/*.test.js"` | 1467 tests, 1467 pass |
| `npx prettier --check "src/**/*.java"` | clean |

*Fail before, pass after.* `ManifestParser` put back to the file's own mapper, the tests kept: `TomlManifestTest` fails 3 of its tests (`error: manifests/shop.toml is not valid: Unknown token` for the nested elements and for the view and story; the twin of the shipped `domain_application` and the other workspaces), and case D36 fails in `ManifestDiscoveryTest` (1 error). The per-kind parameterised test reads the content with the JSON mapper by construction, so it passes on both: the workspace-level tests are the ones that pin the parser.

*Byte-identity against `25471b3`* (a workspace without plateaus must give the same views). `identity85.py` (scratchpad, the jar built from `git archive 25471b3` outside the repository, compared with the jar of the tree), on the 11 tracked `workspace.yaml` without plateau (`src/doc/examples/domain_application`, `domain_manifest_folders`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `_4`, `src/test/resources/hyphen-ids`, `src/test/resources/viewpoint-kernel/workspace`), three commands each on a fresh copy for each jar (`views generate`, `query graph`, `diff`): 33 commands, 19 identical (821 files compared), 14 differ, the same 14 as at the end of run 0090 and all known (the 11 `diff` rewordings, `domain_manifest_folders views generate` and `query graph` which the old jar cannot read, the order of the deprecated-facet warnings of `viewpoint-kernel/workspace views generate`).

*The remains of `git grep -n -E "container-group|solution-group|system-group" -- src`*: two comments that say the kinds do not exist (`ManifestKind.java`, `standalone.html`); the refusal tests (`negative-cases.json` N56 to N58, `editor-reads-like-cli.test.js`, `model-ops.test.js`); `TomlManifestTest` (untracked until the commit, so git grep does not list it) for the TOML refusal. No code reads, writes or offers them. The old documents of wave 003 and the runs of wave 014 (`docs/`) still mention them; they are history.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier, read-only. No S0, no S1.

- S2 a group under an element another plateau declares is now refused (it wrote a `<level>-group` manifest the command line could not read): kept (D3), and now pinned: `editor-writes-layers.test.js` asserts the sentence, that nothing is written, and that a group under a parent the plateau declares is written in its file and read back as kind `group`. Adding it through an `ADD` patch is not built (no design for it in the plan; recorded in Findings F3).
- S2 no test of nested group creation: the same test.
- S3 `.inf` and `.nan` in a YAML manifest: the YAML mapper read them as text, the JSON one refuses the token. Left: a manifest with such a value is not realistic, and the failure is an `error:` line (`unreadable`), not a crash.
- S3 `withoutNulls` in the twin: TOML has no null, so a key without value is absent in the twin; stated in the test. S3 skipped workspaces: now asserted to be exactly those of `shipped-files/exceptions.json`. S3 content-phase error: `shouldTellAFaultOfTheContentOfATomlManifestAsOfTheYamlOne` compares the full sentence of a YAML and a TOML manifest with an unknown key.

## Findings

- F1 (wave, for W-18: what the manual must now say). TOML manifests load (`.toml`, next to `.yaml`, `.yml`, `.json`): the sentences of the manual about TOML manifests that do not load, and the limit `[[plateau-limits]]` for #84, are false and go. The editor still reads YAML only and lists `.toml` and `.json` files among the files it does not read (the manual already says so). A TOML manifest has no null (a key without value is absent) and writes nested elements as `[[content.elements]]` tables. The kinds of a manifest are `component`, `container`, `person`, `solution`, `system`, `environment`, `node`, `view`, `story`, `plateau`; `container-group`, `solution-group` and `system-group` are not kinds (a group is an element of kind `group` nested in a container, a solution or a system) and give `unrecognized header.kind` with the list of the kinds. The list in that sentence has lost three words.
- F2 (wave, for W-4/W-5/W-16). The list of kinds in the sentence `unrecognized header.kind ... (known: ...)` is now ten kinds, in the cases N27 and N56 to N58, in the five tests that quote it and in `EditorReadSchemaTest`, which compares the page's list with `ManifestKind`. W-16 ("the kinds that may be roots") starts from `TOP_LEVEL_KIND_OPTIONS` (`person`, `system`, `solution`, `container`, `component`, `environment`, `node`), no group in it.
- F3 (wave, for W-16 or later). In a layered workspace a group cannot be added under an element the plateau drawn inherits: the editor refuses with the sentence of any kind that has no manifest of its own. A patch (`ADD` to the `elements` of the parent) could carry it, as other fields of an inherited element do; nobody asked for it, no issue was filed.
- F4. Files outside the `likely_paths`: `CLAUDE.md` (two sentences) and this document. The two wave files were not written. No issue was filed.

## Not verified

- The native image: a new class was not added to `io.morin.archicode.manifest` or `cli` (only a test class), so `reflect-config.json` is unchanged; that the native runner reads a TOML manifest (the `TomlMapper` is already reflected for `query -f toml`) is CI's, and W-17 plans a `@QuarkusIntegrationTest` with a TOML manifest.
- The editor on a real screen: the pages are not changed in what they show; the creation form already did not offer the group kinds.
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep of `complete-run`: neither exists in this repository.
