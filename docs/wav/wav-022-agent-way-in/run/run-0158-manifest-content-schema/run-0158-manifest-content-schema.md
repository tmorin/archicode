---
type: run
run: 0158
status: completed
wave: 022
profile: single-document
---

# Run 0158: manifest-content-schema

Wave 022, W-1 (decisions T1 to T3, T6; validation oracles V1 to V3 and the corpus; P0 gate; GitHub issue tmorin/archicode#144, first item of the author's order). Focus: an agent can write any manifest from `archicode query schemas manifest`: the content of each kind, the nesting, the id rules, derived from the classes and checked against the editor and the corpus.

Profile: `single-document` (as in wave 021): one design page carries scope, decisions, canonical impact, tasks, verification and findings. The review passes were kept as inline passes, not as dispatched agents (see Findings).

## Scope

In: `query schemas manifest` describes the content of the ten kinds of `ManifestKind` (keys, required keys, enums, shapes), the nesting (which kind goes under which, which kinds sit at the top of a layer), the id rule, the reference form, `plateau`, `replaces`; golden file; `ManifestCorpus`; V1, V2, V3; the IT of the command (V5). Out: `guide`, `init`, `validate`, any change to `query schemas workspace`, to the editor, or to what any other command writes.

## Decisions

- **D1 (T3, shape).** The envelope stays (`header`, `content`), with `content` typed `object` (no longer `any`) and pointing at `kinds[header.kind].content`; `kinds` is an object keyed by the ten `header.kind` ids; no option on the command (with no option it describes every kind, as T3 asks; `QueryGroup` is unchanged). Each element kind also carries `layer`, `holds`, `heldAtTheTop`; the kind carries its short name in `kind`.
- **D2 (T2, polymorphic `elements`).** The generator describes an interface (`ContainerElement`) by its getters: no `kind`, no `elements`, so the nested form would be useless. The run keeps the generator for every class and builds the nesting from `Parent#elementType()` and `Nesting.kindsHeldBy`: `elements.items` is replaced by a union `{"type": [{"$ref": "#/nested/<kind>"}, ...]}` (draft 3 allows a union in `type`) for the kinds the parent holds, and `nested` holds each element kind as written under a parent (the generated content of its class plus a required `kind` enum of one value). A node in a node is a pointer, not an unbounded tree. Nothing is typed by hand; no stop was needed.
- **D3 (derived rules).** The id rule and the reference form are read from the classes by two marker annotations, `@Identifier` and `@Reference` (`resource/`), whose enums hold the pattern and the sentence; `PlateauTree` takes its id pattern from the same enum. `@Required` marks the `@NonNull` keys that Jackson does not see (`View.id`, `View.viewpoint`, `Story.id`, `Plateau.id`): adding `@JsonProperty(required = true)` there would have moved `query schemas workspace` (T1), so a separate marker is read by this schema only.
- **D4 (dialect, Q1).** Kept: Jackson's, `"required": true` on the property, no `oneOf`. `additionalProperties: false` is added where the class refuses unknown keys (not for a view, a story and a step, which ignore them); `aliases` lists the other spelling of a key (`json_path`); an enum is sorted and said to be read in any case.
- **D5 (the corpus is the oracle).** `ManifestCorpus` (C1: 421 manifests of the shipped workspaces; C2: the 93 cases of `negative-cases.json` altered in a temp folder) classifies each case by what its first command does: loads (its manifests must conform), structural (the file the `error:` line names must be refused: `unknown key`, `wrong shape`, `unrecognized`, `Missing`, `unknown kind`, ``missing `kind` ``), other (must be in `not-expressible.json`, and only those).

## What the dialect cannot express (Q1) and what the schema leaves out

- A content that depends on `header.kind`: the ten schemas sit side by side under `kinds`; the reader picks one. A tool that wants IDE validation would need a modern dialect (`oneOf`/`if`), which would move `query schemas workspace`: a later, separate decision (to be filed).
- Exactly one of `target` / `json-path` in a patch (no `oneOf`).
- Everything of `not-expressible.json`: a reference that resolves, a name declared twice, the tree of plateaus, a patch that selects something, what a view or a story step names, `.archicode.yaml`, the name of a facet.
- `relationships[].qualifier` (the singular spelling Lombok's `@Singular` adds to the builder, a single text) is not in the schema: it has no getter. `EditorReadSchemaTest` and `ManifestSchemaTest` pin this one difference by name.
- The top-level `kind` key of a content (the loader overwrites it) is not described.

## Tasks (all done)

1. Marker annotations `Identifier`, `Reference`, `Required`; put on the keys of the classes (`AbstractElement`, `Relationship`, `Environment`, `Node`, `Plateau`, `Patch`, `Story`, `View`, `Manifest.Header`); `PlateauTree` uses the enum. Tier: standard, inline in this session (the run is one session; no task is `hard_judgment`).
2. `manifest/ManifestSchema` (generation + completion + sort); `GetSchemasQuery` calls it for `MANIFEST` (`generateSchema` returns `Object`, `sortedWriter` and `SchemaType` public for the tests).
3. Registration for the native image: `ManifestSchema`, `Identifier`, `Identifier$Of`, `Reference`, `Reference$To`, `Required` in `reflect-config.json` (`NativeReflectionConfigTest`).
4. Tests: `ManifestSchemaTest` (V1), `EditorReadSchemaTest#shouldSayWhatTheEditorTableSays` (V2), `ManifestCorpus` + `SchemaChecker` + `ManifestSchemaCorpusTest` (V3), `SchemasIT` (V5), `GetSchemasQueryTest` (workspace golden); goldens `manifest.schema.json`, `workspace.schema.json` (the output of the jar of `archicode-0.19.0`), `not-expressible.json` in `src/test/resources/schemas/`. `Brightcart` and `BrightcartNegativeCasesTest.alter` made public for the corpus.
5. `CLAUDE.md`: a paragraph on the schema.

## Canonical impact

`CLAUDE.md` (the paragraph "The schema of the manifests"); no `arc` or `dom` packet (no TDD in this profile). The manual is W-6's.

## Verification

Run on the final tree, one command at a time:

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: BUILD SUCCESS, 1370 unit tests (2 skipped, as before) and 33 integration tests (including `SchemasIT`, 3) pass.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 240 passed. `embed.sh --check`: exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: 2562 of 2562 pass with `--test-concurrency=2`; with the default concurrency (8 CPUs here) 2561 pass and `save-keeps-quotes-and-comments.test.js` "generated: 2000 files" fails its own 60 s budget (`it takes seconds`, 68 s under the parallel load; 7.9 s alone, and on a quiet run of the whole suite). No JavaScript or editor file is touched by this run; the failure is the timing test of wave 021 under load, reproduced twice.
- `npx prettier --check "src/**/*.java"`: clean.
- V7 (byte identity): `sweep.py` (scratch) ran 308 commands (`plateau list`, `query schemas workspace`, `query schemas` with no argument, `query views`, and for each plateau `views generate`, `stories generate`, `query graph`, `diff` in text, json and markdown) over the 20 shipped workspaces with the jar of `archicode-0.19.0` and the new jar, each on its own copy: same exit code, standard output and error output for all 308, same sha256 for every file of the 20 trees afterwards (15252 files), and the `--help` of the 14 commands is identical. `query schemas workspace` equals `workspace.schema.json`, itself the output of the base jar (`GetSchemasQueryTest`, `SchemasIT`).
- P0 criteria: (1) no `"type": "any"` for `content`, ten kinds, nesting, id rule, reference form: `ManifestSchemaTest`; two runs, five runs in the unit test, give the same bytes equal to the golden file; the jar prints the golden file (`SchemasIT`); the native runner is not verified here. (2) `EditorReadSchemaTest#shouldSayWhatTheEditorTableSays`. (3) `ManifestSchemaCorpusTest`. (4) the sweep above. (5) the commands above.

Not verified: the native runner (`SchemasIT` under `-Dnative` is for the `Native` job of the pull request); a real IDE using the schema.

## Findings

- The generator, run once per class, points a class it has met before with a `$ref` to its urn; for a `Node` the `Relationship` was met inside the (replaced) nested interface, so the inline description was lost. `ManifestSchema` puts every urn pointer back in place before it replaces the nested items.
- V2 found, the first time it ran, that `json_path` was missing from the schema (the alias); V3 found nothing to fix in the checker on 421 positives and the 93 cases (at least 25 structural, at least 10 that load, the rest in the table), which is why the checker itself is pinned by `theCheckerRefusesWhatTheSchemaForbids`.
- `Plateau.id`, `View.id`, `View.viewpoint` and `Story.id` were not marked required in the generated schema (Lombok `@NonNull` is not runtime): found by V2.
- Inline review passes instead of dispatched agents: the KDMLLC review of this page and the consistency scan (page against code) were done by reading the final tree, because the run's claims are all checked by tests that read the classes, the editor and the corpus (the claim "421 manifests" is the corpus size asserted at least 400 by the test, and the sentence about `qualifier` is pinned by two tests); no agent was dispatched.
- Not verified here: the native runner (no Mandrel for JDK 25 in the shell). `SchemasIT` must pass under `-Dnative` in the `Native` job; the risk is reading the annotations of the classes by introspection in the native image (the classes are registered with all members).
