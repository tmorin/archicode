---
title: Map links in the kernel and the command line
type: tdd
status: draft
run: 0197
wave: 026
owner: tmorin
date: 2026-10-28
related:
  - 'gh:tmorin/archicode#143'
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
  - docs/wav/wav-025-hosted-editor/run/run-0190-plateau-fold-analysis/run-0190-plateau-fold-analysis.md
---

# Map links in the kernel and the command line

# Summary

A Map view of the application layer gets a `links` property: a list of relationships, each named by its source, its destination and its label. The map then draws the ends of those relationships and what encloses them, and the links between them, and nothing else. The selection is made once, in the viewpoint kernel's `map` (an additive input key, contract number 5 unchanged), so the command line and, in a later run, the editor draw the same boxes. This run builds the kernel side, the Java adapter, the command line (`views generate`, `stories generate`, which share the adapter), the guide and the manual. It builds no editor behaviour (W-5) and no highlight (W-4). Every Map and view saved before the wave is drawn byte for byte as before. There is no PRD (profile TDD+pln); the sources are #143 (decision D11, comment of 2026-10-23), the wave plan (W-3 and its open questions) and the code read for this design, so traceability is incomplete (see PRD Traceability).

# Scope

In scope:

- The kernel (`src/main/rust/viewpoint-kernel/src/lib.rs`, its tests, the header documentation, `README.md`), the committed `src/main/wasm/viewpoint_kernel.wasm` and the base64 block of `src/main/resources/editor-webapp/standalone.html` (both written by `embed.sh`; nothing else of the page changes).
- The adapter `KernelViewpointFactory` (reads `links` from the properties of a view or of a step, checks the shape, passes it on), and `ViewInPlateau` (what a plateau lacks).
- Tests in Rust and Java, including the byte-identity of the views written before the wave.
- `src/main/resources/guide/guide.md` and its golden file, `src/doc/README.adoc` (`[[map-viewpoint]]`), `CLAUDE.md` (one paragraph).

Out of scope: the highlight (W-4); any file under `src/main/editor` (W-5); a shipped example or fixture with `links` (see DEC-9); the technology layer; derived dependencies; `plateau fold`; the written form in the editor's list and the diagram.

# PRD Traceability

No PRD. Requirements are taken from #143 D11, the wave plan (purpose, W-3 focus, Open questions, P2 gate) and labelled here so that the plan can cite them:

- `REQ-1` (D11, W-3 focus): `links` in the properties of an application-layer Map; the boxes drawn are the ends of the listed relationships with their ancestors, the links are those relationships, nothing else.
- `REQ-2` (wave, open question 1): the written form of an entry and what a relationship with no label is; said in the guide and in the table of view properties.
- `REQ-3` (wave, open question 2): two relationships of one source with the same destination and label: what the model allows, and what the map does.
- `REQ-4` (wave, open question 3, command-line half): what an entry that names nothing is, an `error:` line or a warning, with the exit code; the same for `pinned`.
- `REQ-5` (P2 gate, wave Non-Goals): every Map and view written before the wave is byte for byte as the tag `archicode-0.19.0` writes it; the contract number stays 5, additive keys only.
- `REQ-6` (P2 gate): a Java test and a Rust test assert the boxes and links; the guide's table and its golden file carry `links`; `GuideViewPropertiesTest` passes; the manual and `CLAUDE.md` describe it.
- `REQ-7` (wave Non-Goals): application layer only, no derived dependency, no new viewpoint.

All seven are addressed. The rename and move rewrite of `links` (open question 3, editor half) is W-5's and is not addressed here; this run says what the command line does when an entry no longer matches (DEC-5).

# Technical Goals

- TG-1: the kernel's `map` takes an optional `links` and draws only the selected relationships and the boxes of their ends (REQ-1).
- TG-2: one written form and one matching rule, defined in the kernel and said in the guide (REQ-2, REQ-3).
- TG-3: a stated, tested behaviour for an entry that matches nothing, for an entry whose element a facet or a plateau lacks, and for the interactions with `pinned`, `hidden` and `opened` (REQ-4).
- TG-4: no existing output moves; the key is absent from every input that existed (REQ-5).
- TG-5: the guide, its golden file and the manual say `links`, and `GuideViewPropertiesTest` holds the guide to the code (REQ-6).

# Non-Goals

- Highlight of a relationship (W-4) and the editor's list, clicks, saved-view writer, address and rename follow-up (W-5, W-6).
- A way to select every relationship of a pair whatever its label (a wildcard), or by qualifier or tag. Deferred (DEF-2).
- A check of `links` in the load of a layered workspace (the plateau-free `entryProblems`), which needs the same sentence and cases in the editor. Deferred (DEF-1).
- `links` in the Map of the technology layer.
- Changing `dangling` beyond what DEC-6 says, or the contract number.

# Assumptions

- ASM-1: the model allows two relationships of one source with the same destination and label when their qualifiers or tags differ: `Relationship` is a `@Value` with `qualifiers` and `tags` in its equality, `Rel` in the kernel orders by destination, label, qualifiers and tags. Validated in Stage 6 on the packaged jar with a workspace of two such relationships (Q-1): both load and both are drawn.
- ASM-2: `RelationshipLabel.normalize` (trimmed; empty is none) mirrors what the kernel does with a label in `compare` (`R::of`); the same rule is used here for matching so that Java and Rust agree. Validated by calling both on the cases of `RelationshipLabelTest`.
- ASM-3: the editor, which does not send `links` until W-5, draws a saved view that has `links` as the whole map for the time between this run and W-5, and its save drops the key (`canonicalViewProperties` in `src/main/editor/application/view-recipe.js` keeps a list of known keys). No shipped file has `links` meanwhile (DEC-9), so no shipped view is affected. Validated by reading that function (done) and by the node suite staying green.
- ASM-4: `ViewpointKernelModule*` classes written by the chicory compiler regenerate from the committed `.wasm` at build; no hand change. Validated by `./mvnw verify`.

# Constraints

- CON-1: the kernel contract number stays 5; keys are additive and optional (wave Non-Goals; wave 016 did the same for `applications` and `relationships`).
- CON-2: an input without `links` must give exactly the output it gave: the Java adapter adds the key only when the list is non-empty, and the kernel's code path for `None` is untouched (REQ-5).
- CON-3: `embed.sh` writes the `.wasm` and the page's block; its `--check` mode must agree (P2 gate). Maven needs no Rust.
- CON-4: coverage floors stay (Java 0.90 line, instruction and branch; kernel line coverage 90 %); PMD (`./mvnw test-compile pmd:check`) has no baseline; Prettier covers `src/**/*.java`.
- CON-5: a shipped file is loaded by the command line and the editor in a test (`CLAUDE.md`). A view with `links` is read by the editor as a view without them until W-5, so this run ships none (DEC-9).
- CON-6: `quarkus.log.level=ERROR`: a user-facing warning goes through `Warnings`.
- CON-7: `negative-cases.json` and `layer-checks-cases.json` are run by both tools; a case added there that the editor does not yet refuse fails the editor's suite. This run adds none.
- CON-8: the PlantUML output of a Map is produced from the kernel's items and links by the existing renderer; no change to `rendering/`.

# Current State

`map` in `src/main/rust/viewpoint-kernel/src/lib.rs` (`fn map`, line 1072) checks `pinned`, `opened` and `hidden` against the layer (`require`: `dangling reference: x`), projects every end of a relationship onto the first closed box, groups the relationships by `from -> to`, then lists as boxes every visible element of the layer (or the pinned ones and what is open inside them) plus the ends of the links, with their ancestors (`with_ancestors`). `pinned` keeps the relationships that touch a pinned element; `hidden` drops the relationships of a hidden element. `applications` and `relationships` (booleans) exist in the technology layer only. `dangling_in_lists` lists all unfindable entries of the three lists in the error's `dangling` key.

`KernelViewpointFactory.mapLists` copies `opened`, `pinned` and `hidden` from `view.getProperties()`, refuses an entry that is not text ("the view v: `pinned` is a list of references, and X is not one"), and for a faceted workspace or a plateau drops an entry the main index lacks. `mapParts` copies the two booleans, only when `false`. `create` turns a kernel `error` into `ArchiCodeException` and prefixes "the view <id>: " for a map. `ViewInPlateau.canBeDrawn` warns that a map "is drawn without `x`, which the plateau `p` does not have" and skips a map none of whose pinned entries is there. `GenerateViewsCommand` and `GenerateStoriesCommand` both go through these two.

The guide (`src/main/resources/guide/guide.md`, line 56 on) has a table of the properties the command line reads. `GuideViewPropertiesTest` draws a map with each listed key and requires a different output from the bare map, and requires every key of the editor's `VIEW_PROPERTY_ORDER`, `MAP_PARTS` and `DIAGRAM_SHOW_NAMES` to be in the guide. The manual's `[[map-viewpoint]]` (line 853 of `src/doc/README.adoc`) describes `pinned`, `hidden`, `opened` and the technology booleans.

# Proposed Design

One new optional input key, `links`, on the kernel's `compute` for `viewpoint: map`, selected where the relationships are already walked. No diagram: one component (`map`) changes behind a single key, and the Java side only forwards it.

Mapping to the repository:

- `src/main/rust/viewpoint-kernel/src/lib.rs`: `Input.links: Option<Vec<LinkRef>>` with `LinkRef { source: String, destination: String, label: Option<String> }`, `deny_unknown_fields`, `null_as_default`-style tolerance as the other lists. `fn map` reads it as described by DEC-1 to DEC-4.
- `KernelViewpointFactory`: `mapLinks(input, view, ...)` next to `mapLists`; adds `links` to the input only when the list is non-empty.
- `ViewInPlateau.canBeDrawn`: the same warning and skip rule as for `pinned`, for entries a plateau lacks (DEC-5).
- Docs and tests as listed in Repository Impact.

DEC-1 — The written form of an entry

- Decision: an entry of `links` is a mapping `{source, destination, label}`; `source` and `destination` are references of the application layer and required; `label` is optional text. A string form is not read. An entry that is not a mapping, lacks a text `source` or `destination`, has a non-text `label`, or has any other key, is one error naming its place: ``the view v: `links[2]` is a mapping with `source`, `destination` and optionally `label`, and <entry> is not one`` (no backticks round the view id: the adapter's prefix is the word view, the id and a colon, as for `pinned`; exit 1, `ArchiCodeException`). `links[n]` is the place of the entry in the list the adapter hands to the kernel, counted after the adapter's filter of DEC-5; the filter acts in plateau and facet workspaces only, and those never reach the shape sentence with a filtered list, so in every case that says it `n` is the manifest's place. `label:` with nothing after it is absent, as everywhere (wave 015 run 0092).
- Rationale: a label is free text, so a one-string form (`a -> b : label`) would need an escape rule both tools must share; a mapping matches how `where` of a patch already names a relationship (`destination`, `label`), and the schema table can say each key. Refusing unknown keys catches `lable`.
- Alternatives considered: a string `"source -> destination [label]"` (shorter in YAML, ambiguous for labels with `->` or brackets); a list `[source, destination, label]` (positional, unreadable); also accepting `from`/`to` aliases (two spellings to keep in both tools).
- Tradeoffs: more lines per entry; none of them hard to write by an agent from the guide.
- Linked PRD IDs: REQ-1, REQ-2.

DEC-2 — Matching rule and what a missing label is

- Decision: an entry matches the relationships declared by the element `source` whose `destination` is equal and whose label is equal after `RelationshipLabel` normalisation (trimmed; empty is none), all of them: the kernel keeps every `Rel` of that source that reads so. An entry with no label matches the relationships that have no label; it is not a wildcard. The match is exact on references (no prefix, no descendants): a relationship declared by a component is selected by naming the component, whatever box it is drawn on.
- Rationale: it is D11's naming (layer, source, destination, label) and the same equality the comparison uses; an exact match makes the entry a stable name that an editor can write from a row of its relationship list.
- Alternatives considered: no label means any label (an author who wants one relationship of a pair that has several would not be able to name it); matching descendants of the source (an entry would select by region, not by relationship).
- Tradeoffs: an author who wants every relationship of a pair lists each label (DEF-2).
- Linked PRD IDs: REQ-1, REQ-2.

DEC-3 — Two relationships with the same triple

- Decision: shown together. Relationships that differ only by qualifiers or tags have the same source, destination and label; one entry selects them all, and the existing grouping by `from -> to` and by what reads the same (the overview's `ReadsTheSame`) draws them as the map already does, one link per distinct caption. A relationship declared twice identically is one relationship (set semantics, as today).
- Rationale: ASM-1 says the model allows it; refusing it would be a new rule on the model for a view property; an entry that cannot distinguish them is the cost of DEC-2, listed as DEF-2.
- Alternatives considered: refuse an entry that names a triple held by several relationships (breaks a legal workspace on a view key); add `qualifiers` to the entry (a fifth field, a longer name, no demand).
- Tradeoffs: a view cannot show one of two same-triple relationships alone.
- Linked PRD IDs: REQ-3.

DEC-4 — What is drawn, and how `links` meets `pinned`, `hidden`, `opened`

- Decision: with a non-empty `links`, the map's relationships are those selected, filtered as they are today by `hidden` (a relationship of or towards a hidden element is dropped) and by `pinned` (when something is pinned, only the relationships that touch a pinned element). The boxes are the ends of the links that remain, projected onto the first closed box as today, plus the pinned elements (and, inside them, what is open), plus the ancestors of all of these. The rule "every visible element of the layer is a box" is not applied: an element no selected link reaches is not drawn. `opened` keeps its meaning: it decides where an end lands (an end inside a closed element lands on that element's box, grouped, with the synthetic label). An entry whose two ends land on one closed box draws no link but still counts as matched, and the box of that closed element is drawn only if it is pinned or another selected link reaches it, so a map can be empty. The children of an `opened` box that no selected link reaches are not drawn. The pinned elements and the visible elements inside them are boxes besides the ends of the links, so "nothing else" of REQ-1 means no other element of the layer. Each of these three sentences has a Rust case. `links` absent, `null`, or an empty list is no selection and the map is drawn exactly as before (the convention of `pinned: []`).
- Rationale: it is the wave purpose ("the boxes drawn are the ends of those relationships with their ancestors") with the three existing lists left meaning what they meant; matched is decided on the model, before projection and filters, so that hiding or closing a box never turns a valid entry into an error.
- Alternatives considered: `links: []` draws nothing (would let an editor keep a view with nothing ticked, at the price of an empty diagram and a rule different from `pinned: []`; W-5 can tell the editor not to write the key); `pinned` ignored when `links` is given (a second meaning for an existing key).
- Tradeoffs: `links: []` and no key are the same view, said in the guide.
- Linked PRD IDs: REQ-1, REQ-5.

DEC-5 — An entry that names nothing: error, and the cases that are not a mistake

- Decision: in a workspace with no plateau and no facet, an entry that matches no relationship is an error, first one only, one line, exit 1, nothing written for that view (a view named with `-i` fails before its folder, like a dangling `pinned`): ``error: the view v: `links[1]` names a relationship from `a` to `b` with the label `reads`, which does not exist`` (no backticks round the view id in an error, backticks in a warning; `links[1]` is the place in the list the kernel receives, which equals the manifest's place because the adapter's filter acts in plateau and facet workspaces only and those never reach this sentence) (`with no label` when it has none). An unknown `source` or `destination` is the sentence `pinned` gives (``error: the view v: dangling reference: x``, turned into the located sentence when an element holds it). The kernel says these two as `error`; the adapter prefixes "the view <id>: ", as it does for a map. In a workspace with plateaus or a facet, the adapter drops an entry whose relationship the main index lacks (the rule of `mapLists` for `pinned`), and `ViewInPlateau` warns ``the view `v` is drawn without the link `a -> b`, which the plateau `p` does not have`` and skips a view none of whose `links` entries is there (``skip `v`: none of its links is in the plateau `p` ``, text fixed in Stage 6 and pinned by a test). A facet that removes the relationship drops it without a word, as for `pinned`.
- Rationale: the same two behaviours as `pinned` (error where the workspace is one plateau, warning where a view belongs to no plateau and another plateau may have the name), so an author learns one rule; a typo in a workspace with plateaus is only a warning in every plateau until the load check exists (DEF-1, a known limit, written in the manual).
- Alternatives considered: a warning everywhere (a wrong entry would hide in a drawn map that looks fine); an error everywhere (a view of a plateau tree would fail in the plateaus that lack the relationship, which the wave 015 rule forbids).
- Tradeoffs: the typo in a layered workspace is weaker than for `pinned`, which has the load check.
- Linked PRD IDs: REQ-4.

DEC-6 — Kernel details that keep the editor and the command line equal

- Decision: (a) `links` is checked in `map` after `pinned`, `opened`, `hidden` and before any drawing: first the ends of every entry with `require` (so the unknown reference is `dangling reference: x`), then the match; (b) `dangling_in_lists` also lists the unknown `source` and `destination` ends, after the three lists, so a host that edits the lists gets them in one answer; (c) `links` given to a map of `layer: technology` is an `error` (`links is read in the map of the application layer only`), because ignoring a selection the author wrote would draw the wrong view (the two booleans of the technology map are ignored in the other layer; they are defaults, this is a selection); (d) the answer's `version` stays 5 and `links` is documented in the header of `lib.rs` and in `README.md` as additive; (e) the comparison needs no new work: a relationship of the union with a `change` is matched like any other, so a removed relationship can be named and is drawn as removed; (f) order of the checks in `map` (F-7): the technology refusal (c), the shape of the entries (`invalid input`), the ends of every entry (`dangling reference: x`, an empty-string `source` or `destination` is `dangling reference: ` with nothing after it), then the match (DEC-5); an entry repeated twice is harmless, the entries are a set; (g) facet (F-3, decision of this run): when the input carries a `facet` (the editor, W-5), `prepare` applies it before `map`, and an entry whose relationship the facet removed fails with the same no-match error as a typo; the kernel adds no list of unmatched entries and the error names the entry (`links[n]`, source, destination, label), which is all a host needs to find it; any richer answer (an additive key of the error) is W-5's to ask for when the editor reads `links`, and DEF-1 says so; (h) the match is decided in the kernel only, but the adapter's drop of an entry the main index lacks (DEC-5) and `ViewInPlateau`'s warning are a second, plain existence test of the same triple (source, destination, `RelationshipLabel.same`); to keep the two from drifting, one case table, `src/test/javascript/viewpoint-kernel/map-links-cases.json`, is read by the Rust tests (match and no match) and by the Java test (exists in the index or not).
- Rationale: one place decides what is drawn and what is refused, both hosts get it from the wasm; the Java existence test of (h) decides only whether to drop an entry in a plateau or facet workspace, over the same cases.
- Alternatives considered: matching in Java and sending the kernel a list of kept relationships (two implementations, the editor would need a third); ignoring `links` in the technology layer (silent wrong view).
- Tradeoffs: (c) is the one refusal the editor will have to mirror in W-5.
- Linked PRD IDs: REQ-1, REQ-4, REQ-5, REQ-7.

DEC-7 — Guide, schema and manual

- Decision: `guide.md` gets one row, `links | map, application | list of {source, destination, label}: draw only these relationships, their ends and what encloses them; no label means a relationship with no label; one that matches nothing is an error`, and the "Not in the schema" paragraph keeps saying the properties are not in the schema. `golden.md` is regenerated in the same commit. `GuideViewPropertiesTest` gets a `links` case (a relationship of the guide's workspace changes the file; the bare map and `links: []` give the same file). The schema is unchanged: `properties` stays `any`, so `manifest.schema.json` does not move and `not-expressible.json` gets no entry (an entry there needs a `negative-cases.json` case, which the editor cannot pass yet, CON-7). The manual's `[[map-viewpoint]]` paragraph gets a short `links` paragraph with an inline listing (not an `include::` of a shipped file, CON-5) and one sentence in the plateaus part; `CLAUDE.md` gets one paragraph in Architecture.
- Rationale: the P2 gate names the guide, the golden file and `GuideViewPropertiesTest`.
- Alternatives considered: a typed `links` in the schema (changes `manifest.schema.json`, the schema table and the editor's `READ_SCHEMA` comparison in `EditorReadSchemaTest` for a key the editor does not yet read).
- Tradeoffs: none that matter.
- Linked PRD IDs: REQ-2, REQ-6.

DEC-8 — The kernel's own tests carry the contract; Java tests carry the sentences

- Decision: The cases are one table, `src/test/javascript/viewpoint-kernel/map-links-cases.json`, read by the Rust tests and the Java existence test (DEC-6 (h)). Rust tests in `lib_tests.rs` (boxes and links for: one link, two links sharing an end, an end inside a closed box, an opened box, `hidden`, `pinned`, same-triple pair, no label versus label, unknown end, no match, technology layer refused, `links: []` and `null` equal to absent, a union with a removed relationship, a closed box holding both ends, an opened box no link reaches, pinned elements with their inside, the order of the checks, a repeated entry, an empty `source`). Java tests in `KernelViewpointFactoryTest` (or a new `MapLinksTest` beside it) and in `ViewInPlateau`'s test class: the sentences, the exit code, the plateau warning and skip, a step with an inline recipe in `stories generate`. The Rust cases keep `links: []` and `null` equal to absent; one Java test shows that the adapter does not send the key for an empty list (CON-2), and `scripts/byte-identity.sh` guards the shipped examples and the layered Brightcart. `scripts/byte-identity.sh` is run by the executor as the gate's guard.
- Rationale: the gate asks for a Rust test and a Java test of boxes and links, and for the sentence and exit code.
- Alternatives considered: only Java tests over the wasm (the kernel's coverage floor is measured by `cargo llvm-cov`, which sees Rust tests only).
- Tradeoffs: tests in two languages.
- Linked PRD IDs: REQ-5, REQ-6.

DEC-9 — No shipped example or fixture uses `links` in this run

- Decision: tests build their views in temp copies. The shipped Brightcart and examples gain a saved view with `links` in W-6 (its story), once the editor draws it.
- Rationale: CON-5, ASM-3: a shipped view must be drawn alike by both tools, and the editor ignores `links` until W-5.
- Alternatives considered: ship one now with a note (a failing editor-equals-command-line test).
- Tradeoffs: the manual's example is inline, not loaded.
- Linked PRD IDs: REQ-5, REQ-6.

# Repository Impact

- IMP-1 — Kernel
  - Path(s): `src/main/rust/viewpoint-kernel/src/lib.rs`, `src/main/rust/viewpoint-kernel/src/lib_tests.rs`, `src/main/rust/viewpoint-kernel/README.md`
  - Change type: modify (additive key)
  - Why impacted: DEC-1 to DEC-6.
  - Linked PRD IDs: REQ-1 to REQ-5, REQ-7
  - Risks / notes: `fn map` is shared by both layers; the `None` path must stay the same code (CON-2). Keep what stays uncovered under the 90 % floor.
- IMP-2 — The compiled kernel and the page's block
  - Path(s): `src/main/wasm/viewpoint_kernel.wasm`, `src/main/resources/editor-webapp/standalone.html` (the block `viewpoint-kernel-wasm` only)
  - Change type: modify (written by `embed.sh`)
  - Why impacted: both hosts run the wasm.
  - Linked PRD IDs: REQ-5
  - Risks / notes: `embed.sh --check` must pass; `check-editor-statements.test.js` compares the page with HEAD, so commit sources and page together (lesson of gate P1).
- IMP-3 — Adapter
  - Path(s): `src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java`
  - Change type: modify
  - Why impacted: DEC-1, DEC-5, DEC-6; method `mapLinks`, called where `mapLists` is.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4
  - Risks / notes: keep PMD happy (the class is already long; extract a small helper class if a rule fires, not a suppression).
- IMP-4 — Plateau rule
  - Path(s): `src/main/java/io/morin/archicode/cli/ViewInPlateau.java`
  - Change type: modify
  - Why impacted: DEC-5.
  - Linked PRD IDs: REQ-4
  - Risks / notes: `stories generate` shares it.
- IMP-5 — Java tests
  - Path(s): `src/test/java/io/morin/archicode/viewpoint/kernel/` (new `MapLinksTest` or additions), `src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java`, the test of `ViewInPlateau` / `StoriesTest`
  - Change type: additive / modify
  - Why impacted: DEC-8, DEC-7.
  - Linked PRD IDs: REQ-5, REQ-6
  - Risks / notes: the Java coverage floors.
- IMP-6 — Guide
  - Path(s): `src/main/resources/guide/guide.md`, `src/test/resources/guide/golden.md`
  - Change type: modify
  - Why impacted: DEC-7.
  - Linked PRD IDs: REQ-2, REQ-6
  - Risks / notes: regenerate with `archicode guide | sed '1s/.*/archicode guide @VERSION@/' > src/test/resources/guide/golden.md`; 30 KB budget of `GuideTest`.
- IMP-7 — Manual and project notes
  - Path(s): `src/doc/README.adoc` (`[[map-viewpoint]]`, the properties row near line 3503), `CLAUDE.md`
  - Change type: modify
  - Why impacted: P2 gate, DEC-7.
  - Linked PRD IDs: REQ-6
  - Risks / notes: no `include::` of a file with `links`; the manual builds in `./mvnw verify`.
- IMP-8 — Run record
  - Path(s): `docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/`
  - Change type: additive
  - Why impacted: the P2 gate reads the sentence and exit code from the run document.
  - Linked PRD IDs: REQ-4
  - Risks / notes: the run document states the sentences of DEC-5 as built.

# Canonical Impact

Not applicable — no canonical registers declared (`docs/CLAUDE.md` does not exist in this repository, and the wave names neither a `docs/bkg` nor a `docs/ana` register).

# Data Model and Contracts

CTR-1 — Input of the kernel's `compute`

- Current contract: `map` takes `pinned`, `opened`, `hidden`, and `applications` and `relationships` (technology). Contract number 5.
- Proposed contract: an optional `links: [{source, destination, label?}]` for `viewpoint: map`; absent, `null` or empty means as before; refused in `layer: technology`; entries with another key are an `invalid input` error; the output shape is unchanged; on failure on an end the error's `dangling` also lists the unknown ends. Number stays 5.
- Affected files: `lib.rs`, `README.md`, the wasm, the page block, `ViewpointKernel` callers (`KernelViewpointFactory` only; `ViewpointKernelTest` pins the number).
- Migration or compatibility notes: additive; an old host that never sends the key gets old output; the editor's page carries the new wasm and ignores the key until W-5.
- Linked PRD IDs: REQ-1, REQ-5

CTR-2 — The `properties` of a Map view

- Current contract: `pinned`, `hidden`, `opened` (lists of references), `applications`, `relationships` (technology booleans) read by the command line; other keys ignored.
- Proposed contract: plus `links` (DEC-1, DEC-2, DEC-4, DEC-5), read in `layer: application` maps and steps with an inline recipe; refused in the technology layer.
- Affected files: view and story manifests (no schema change), `guide.md`, `README.adoc`.
- Migration or compatibility notes: a view written before has no `links`; one that already carried an unread `links` key (ignored until now) would now be read: accepted, since no shipped file has one (checked in Stage 6 by `grep -r "links:" src`).
- Linked PRD IDs: REQ-1, REQ-2, REQ-4

CTR-3 — Messages

- Current contract: ``the view v: dangling reference: x`` for a map.
- Proposed contract: the two sentences of DEC-5 and the shape sentence of DEC-1, one `error:` line, exit 1, no backticks round the view id; the plateau warnings of DEC-5, with backticks round it.
- Affected files: `KernelViewpointFactory.java`, `ViewInPlateau.java`.
- Migration or compatibility notes: new sentences only.
- Linked PRD IDs: REQ-4

No file format, schema or API of the manifests changes.

# Interfaces and Behavior

- IF-1 — `archicode views generate -i <view>`: a saved Map view with `links` is drawn as DEC-4; a bad entry is one `error:` line and exit 1; in a workspace with plateaus a missing entry is `warning:` and exit 0.
- IF-2 — `archicode stories generate`: a step with an inline `viewpoint: map` recipe or a saved view reads `links` the same way (same adapter), with the skip warning of `ViewInPlateau`.
- IF-3 — `archicode diff` and `views generate` of a comparison: a map with `links` is drawn on the union, a removed relationship that is named is drawn as removed.
- IF-4 — `archicode guide`: the row of DEC-7.
- IF-5 — Not changed: `query graph`, `query views`, the editor's behaviour, `plateau list`.

# Flows and Processing Logic

FLOW-1 — A Map with `links` is drawn

- Trigger: `archicode views generate -i v` (or a story step) on a view `viewpoint: map, layer: application, properties.links`.
- Steps: (1) the workspace loads; (2) `ViewInPlateau.canBeDrawn` (plateau workspaces only) warns and drops missing entries or skips the view; (3) `KernelViewpointFactory.mapLinks` checks the shape of each entry (DEC-1), drops entries the main index lacks in a plateau or facet workspace, and adds `links` to the kernel input only when entries remain; (4) the kernel's `map` checks the ends, matches each entry against the relationships of its source (DEC-2), keeps the matched relationships through `hidden` and `pinned`, projects ends on the first closed box, groups, and lists the boxes of the ends, the pinned ones and their ancestors (DEC-4); (5) the existing renderer writes the `.puml`.
- Branches / failure paths: shape wrong → `error:` before the kernel; unknown end → `dangling reference`; no match → the DEC-5 sentence; technology layer → the DEC-6 (c) sentence; every entry dropped in a plateau → the view is skipped with a warning; all entries dropped by a facet → an empty map, drawn.
- Final output / rendered result: a `.puml` whose boxes are the ends and what encloses them and whose links are the selected relationships.
- Linked PRD IDs: REQ-1, REQ-4

FLOW-2 — A view saved before the wave

- Trigger: any `views generate` on an existing workspace.
- Steps: the properties have no `links`; the adapter adds no key; the kernel takes the `None` path.
- Branches / failure paths: none.
- Final output / rendered result: byte for byte as before (`scripts/byte-identity.sh`).
- Linked PRD IDs: REQ-5

# Reliability, Performance, and Scalability

The match is one pass over the relationships already walked by `map`, with a set of the entries; cost is that of the existing loop. The risk is regression of the existing maps, not speed: CON-2 and the byte-identity checks are the guards. The kernel runs inside a Chicory-compiled module and in the browser; no new dependency.

# Security and Privacy

Not applicable beyond input hygiene: `links` text goes into JSON through Jackson and into messages through the existing `ArchiCodeException` formatting (`"%s"` form, as `create` already does); labels appear in a message only inside backticks.

# Observability and Verification

- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`; the coverage command of `CLAUDE.md` (kernel line floor 90 %); `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`.
- `src/main/rust/viewpoint-kernel/embed.sh`, then `embed.sh --check`; `npm run editor:build` is not needed (embed.sh writes the page) but `npm run editor:check` must pass.
- `JAVA_HOME` of JDK 25, then `./mvnw test-compile pmd:check`, `./mvnw verify` and `./mvnw verify -DskipITs=false` (P2 gate); `GuideTest`, `GuideViewPropertiesTest`, `TechnologyMapTest`, `ViewpointKernelTest`, the new tests.
- `npm run test:unit` (editor suite with the new wasm; the saved maps of `expected-boxes.json` unchanged).
- `scripts/byte-identity.sh` (V-C): no unexpected difference.
- Show the tests fail first: a Rust test and a Java test written before the kernel change, run red, then green (TDD).

# Deployment and Rollout

Code and documentation only; the build assembles the wasm into the jar, native image and page. Backward compatible by CON-2. Rollback is a revert of the commit(s) with the regenerated wasm and page block. The native runner needs no reflection entry (no new class read by reflection); only the Native job proves that on a pull request. Planning guidance only; this run commits nothing it was not asked to.

# Risks and Tradeoffs

- RISK-1: a change in `fn map` moves a saved Map. Guards: CON-2, the `expected-boxes.json` contract, byte-identity, a test with `links: []`.
- RISK-2: between this run and W-5 the editor draws a view that has `links` as the whole map and drops the key on save (ASM-3). Mitigation: DEC-9 (no shipped file), the wave's P3 and its gate; the manual describes the finished wave, so the limit is recorded in this run's prg and the wave Findings, not in the manual.
- RISK-3: a typo in `links` in a layered workspace is only a warning (DEC-5, DEF-1).
- RISK-4: the same-triple rule (DEC-3) surprises an author who wants one of two. Said in the guide and the manual.
- RISK-5: PMD or coverage fails on the grown adapter class. Mitigation: extract a helper.
- RISK-6: the Rust and Java label normalisation differ on an exotic Unicode space. Mitigation: ASM-2 test on the `RelationshipLabelTest` cases through both.

# Open Questions

- Q-1: closed in Stage 6 (2026-10-28). A workspace with two relationships of one source, one destination and one label, differing by `qualifiers` (`[sync]` and `[async]`), was built from the `init` resources and run on the packaged jar: `query graph` lists both, `views generate` exits 0 and draws both (`customer --> shop.web : uses\n[async]` and `[sync]` in the deep view of `customer`, one grouped caption `[async, sync]` in the overview). ASM-1 holds and DEC-3 stands as written. The Rust and Java case tables of the build carry this workspace as a case (the Java test reads it from the case table, not from the scratch folder).
- Q-2: closed in Stage 6. The text of the skip warning is ``skip `v`: none of its links is in the plateau `p` ``, the shape of the existing ``skip `v`: it is pinned on x, which the plateau `p` does not have`` (`ViewInPlateau`, line 75); DEC-5 says it in that form and the test pins it. Not a blocker.

No hard-judgment question remains open: the decisions the wave left to this run (the written form, same-triple, command-line behaviour of an entry that names nothing) are DEC-1, DEC-3 and DEC-5. The form of the highlight and the editor's rewrite on rename and move are W-4's and W-5's.

# Deferred Work

- DEF-1: a load check of `links` in a layered workspace (the ends exist in some plateau, `LayerLoader.entryProblems` and `entryProblemsOf`, cases K and N of both tools). Owner: W-5, when the editor reads `links`; it also owns any richer answer for an entry that a facet removed (DEC-6 (g), F-3).
- DEF-2: a wildcard or a qualifier in an entry, to name one of two same-triple relationships or all labels of a pair. No demand; revisit with the editor's list in W-5.
- DEF-3: `links` in the technology layer, with derived dependencies. Out of the wave.
- DEF-4: a shipped saved view and a story that use `links` (W-6).

# File Placement and Frontmatter

This file is `docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/tdd-0197-map-links-kernel.md`, `type: tdd`, `run: 0197`, `wave: 026`, as the neighbouring run 0196. The repository has no `docs/CLAUDE.md`; the conventions followed are those of runs 0195 and 0196.

Review pass: dispatched. Stage 5 ran `review-kdmllc-content` over this TDD in an agent other than the drafter of Stage 4 (a leaf agent has no `Agent` tool, so the reviewer worked in its own fresh context; it is independent of the drafting). Referent read for C: `src/main/rust/viewpoint-kernel/src/lib.rs` (`Input`, `Rel`, `Elem`, `fn map`, `compute_json`, `dangling_in_lists`), `KernelViewpointFactory.java` (`mapLists`, `mapParts`, `create`), `ViewInPlateau.java`, `RelationshipLabel.java`, `Relationship.java`, `src/main/resources/guide/guide.md`, `GuideViewPropertiesTest`, `src/main/editor/application/view-recipe.js` (`canonicalViewProperties`), `src/doc/README.adoc` (`[[map-viewpoint]]`, line 3503), a grep of `links:` in `src`. Verdict: Acceptable overall, no S3; the findings F-1 to F-7 were logged in `prg-0197-map-links-kernel.md` and are applied to this text by task-001 of the plan (2026-10-28): F-1 in DEC-1, DEC-5 and CTR-3, F-2 and F-3 in DEC-6, F-4 in DEC-4, F-5 in DEC-1 and DEC-5, F-6 in DEC-8, F-7 in DEC-6 (f); no decision of DEC-1 to DEC-3 changed.
