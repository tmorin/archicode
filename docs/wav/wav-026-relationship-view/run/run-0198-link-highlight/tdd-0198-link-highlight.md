---
title: Highlight of a relationship in a Map view and a story step
type: tdd
status: draft
run: 0198
wave: 026
owner: tmorin
date: 2026-10-28
related:
  - 'gh:tmorin/archicode#143'
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
  - docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/tdd-0197-map-links-kernel.md
---

# Highlight of a relationship in a Map view and a story step

# Summary

A Map view of the application layer, and a step of a story, can name relationships to highlight. The relationships are named the way `links` names them (`{source, destination, label}`, run 0197), the kernel marks the links that stand for them (`highlighted: true`, an additive key of the output, contract number 5 unchanged), and the PlantUML renderer draws a marked link heavier and the other links calmer. This run builds the `highlight` property of a view, the `highlight` key of a step, the kernel marking, the Java adapter, the PlantUML rendering, `views generate` and `stories generate` (which share the adapter and the renderer), the guide and the manual. The editor does not draw it (W-5, W-6); it only learns that the key exists in a step (`READ_SCHEMA`), so that its read schema stays equal to the classes. A view or a step without `highlight` is drawn byte for byte as before. There is no PRD (profile TDD+pln): the sources are #143 (decision D11), the wave plan (W-4 and its open question "the form of the highlight"), the TDD of run 0197 and the code read for this design, so traceability is incomplete (see PRD Traceability).

# Scope

In scope:

- The kernel `src/main/rust/viewpoint-kernel/src/lib.rs` (input key `highlight`, output key `highlighted` on a link), its tests, its header documentation and `README.md`; the `.wasm` and the page's kernel block, both written by `embed.sh`.
- `MapLinks` (generalised to read `links` or `highlight`), `KernelViewpointFactory` (forwards `highlight`, reads `highlighted` into `Link`), `Link` (new field), `Story.Step` (new key `highlight`), `GenerateStoriesCommand` (a step's `highlight` reaches the view it draws), `ViewInPlateau` (what a plateau lacks).
- `rendering/plantuml` (`LinkRenderer`, a new `HighlightMarks`, and the look of a link in `ChangeMarks` untouched).
- `src/main/editor/core/read-schema.js`: the key `highlight` of a step, nothing else of the editor; the page is rebuilt with `npm run editor:build`.
- The guide (`src/main/resources/guide/guide.md`, `src/test/resources/guide/golden.md`), `GuideViewPropertiesTest`, the manual (`src/doc/README.adoc`, `[[map-viewpoint]]` and `[[stories-generate]]`), `reflect-config.json` if a class is added, `CLAUDE.md`, the golden `manifest.schema.json`.

Out of scope: the editor's list, click, drawing and player of highlights (W-5, W-6); the technology layer; a highlight in the overview, detailed and deep viewpoints; `highlight` in `.archicode.yaml`; a rename or a move that rewrites an entry (editor, W-5).

# PRD Traceability

There is no PRD. The requirements are labelled here from #143 decision D11 and the wave purpose ("a step of a story, and a view, can highlight one relationship against the ones shown"), so traceability is incomplete: every REQ is an assumption sourced from those two documents, not from a PRD.

- REQ-1: a view and a step can name relationships to highlight, by the entry that `links` already uses. Addressed (DEC-1, DEC-2).
- REQ-2: the highlighted link stands out and the others are calmer, in PlantUML, without colour alone, and composed with the states of a comparison. Addressed (DEC-4, DEC-5).
- REQ-3: the same kernel marks it for the command line and, later, the editor. Addressed (DEC-3); the editor's drawing is W-5 and W-6.
- REQ-4: an entry that names nothing is told as `links` tells it. Addressed (DEC-6).
- REQ-5: a view and a step without `highlight` are drawn byte for byte as before, and the kernel contract number stays 5. Addressed (DEC-3, CON-1, CON-2).
- REQ-6: `stories generate` draws the highlight of a step. Addressed (DEC-2, FLOW-2).
- REQ-7: the guide, its golden file, the manual and `CLAUDE.md` say it. Addressed (IMP-9).

Partially addressed: none. Unresolved: the editor's drawing and the player (W-6).

# Technical Goals

- TG-1: one kernel marking, `highlighted` on a link, read by every host.
- TG-2: one written form: the entry of `links`, so an author and the editor learn one shape.
- TG-3: a PlantUML look that composes with `new`, `changed`, `removed` and secondary links and never relies on colour alone.
- TG-4: a step can highlight on a saved view without editing the view.
- TG-5: no output moves for anything written before the wave (`scripts/byte-identity.sh`).

# Non-Goals

- No editor behaviour (W-5, W-6); no new viewpoint; no change to the kernel contract number.
- No highlight of an element (box); relationships only.
- No wildcard label and no `qualifiers` in an entry (as DEF-2 of run 0197).
- No technology layer.
- No new look for a link in the editor's SVG: the CSS (`.dg-dim`, `.dg-on` of `src/main/editor/style.css`) is W-6's.

# Assumptions

- ASM-1: `links` and `highlight` accept the same entries, so the shape check, the match and the dangling rule of run 0197 are reusable. Validated by the shared case table (Observability and Verification).
- ASM-2: `scripts/byte-identity.sh` is the proof that nothing written before the wave moves; `highlighted` is skipped from the output when false and `highlight` is added to the input only when non-empty. Validated by the Rust and Java tests of the absent key and by the script.
- ASM-3: the editor's kernel (the page's WebAssembly block) may emit `highlighted` before the editor reads it: its diagram code ignores keys it does not know. To be validated by `npm run test:unit` (the conformance tests compare the editor's items and links with Java's; if one compares the whole link object, it is updated in this run and the update is logged).
- ASM-4: `Story.Step` is lenient (`ignoreUnknown`), so a step with `highlight` already loads in older tools; the new key is in the class for the schema and the guide. Validated by reading `Story.java` (done).
- ASM-5: PlantUML 1.2024.7 reads `-[thickness=5,#D55E00]->` and `<color:#7F7F7F>text</color>` in a label as the rest of the renderer writes them (`ChangeMarks.arrow` uses the first form). Validated by one rendered file in Stage 6 of this run.

# Constraints

- CON-1: the kernel contract number stays 5; `highlight` (input) and `highlighted` (output) are additive and optional (wave Non-Goals).
- CON-2: an input without `highlight` gives exactly the output it gave; the Java adapter adds the key only when the list is non-empty; the output key is skipped when false.
- CON-3: `embed.sh` writes the `.wasm` and the page's block; its `--check` agrees (P2 gate). Maven needs no Rust.
- CON-4: coverage floors (Java 0.90 line, instruction, branch; kernel line coverage 90 %), PMD without baseline, Prettier on `src/**/*.java`.
- CON-5: every shipped file is loaded by the command line and the editor in a test (`CLAUDE.md`); this run ships no example or fixture with `highlight` (DEC-9), so the editor, which drops the key on save until W-5, loses nothing.
- CON-6: a user-facing warning goes through `Warnings`.
- CON-7: `negative-cases.json` and `layer-checks-cases.json` are run by both tools; this run adds none (the editor does not refuse a highlight until W-5).
- CON-8: the ratchet of `src/main/editor/layers.json` does not rise; the editor edit is one entry of a table.

# Current State

Run 0197 (uncommitted in the working tree when this is written) added `links` to the kernel's `map` (`Input.links`, `LinkRef`, `map_links`), `MapLinks` (shape, `exists`, `existsInUnion`), `KernelViewpointFactory.mapLinks`, `ViewInPlateau.linksCanBeDrawn` and the guide rows. The kernel emits `OutLink { from, to, label, synthetic, qualifiers, tags, secondary, relationships: [OutRel], change? }`; an `OutRel` has `from`, `destination`, `label`, `qualifiers`, `tags`, `change?`. `KernelViewpointFactory` builds a `Link` from each (`from`, `to`, `label`, `synthetic`, `qualifiers`, `tags`, `relationships`, `change`). `LinkRenderer` writes `from <arrow> to : label`, the arrow from `ChangeMarks.arrow(state)` (`-->` when nothing changed; `-[thickness=3,#009E73]->` new; `-[dotted,thickness=2,#E69F00]->` changed; `-[dashed,#7F7F7F]->` removed) or `..[#gray]>` for a secondary link, and the label from `ChangeMarks.label` (a bold glyph before it). A step (`Story.Step`) has `view`, `viewpoint`, `layer`, `properties`, `name`, `text`, `at`, `against`; `GenerateStoriesCommand.viewOf` returns the saved view it names or a `View` built from the step's own recipe, and `ViewInPlateau.canBeDrawn` runs on it. The editor draws a hovered or focused link with `.dg-dim`/`.dg-on` (opacity 0.22 for the rest) in `style.css` and `presentation/diagram-interaction.js`; it has no notion of a highlight.

# Proposed Design

One optional input key, `highlight`, on the kernel's `compute` for `viewpoint: map` of the application layer; one optional output key, `highlighted`, on a link; one new look in `LinkRenderer`. No diagram: one component (the map) gains a flag that travels the existing path (adapter, `Link`, renderer).

DEC-1 — The written form: the entry of `links`, a list under the key `highlight`

- Decision: `highlight` is a list of `{source, destination, label}` entries, the shape, the label rule (trimmed; none matches only no label), the exact match on references and the error sentence for a wrong shape of DEC-1 and DEC-2 of run 0197, with the word `highlight` in place of `links` in the sentence: ``the view v: `highlight[2]` is a mapping with `source`, `destination` and optionally `label`, and <entry> is not one``. A string form, `from`/`to` aliases and a `true` on a `links` entry are not read.
- Rationale: one form to learn, write and rewrite (the editor's rename follow-up will treat both lists the same); the wave plan says "a `highlight` list of the same entries on the step and on the view".
- Alternatives considered: a flag on a `links` entry (`highlighted: true`; couples the two keys, and a highlight without a `links` would not exist); a list of indexes into `links` (breaks when `links` is reordered).
- Tradeoffs: a story that grows a list of links and highlights the newest writes the newest entry twice (in `links` and in `highlight`).
- Linked PRD IDs: REQ-1.

DEC-2 — Where it is written, and the step's key

- Decision: on a view, `properties.highlight`. On a step, a key `highlight` beside `view`, `at` and `against` (`Story.Step#highlight`, a `JsonNode` list, `@JsonSetter(nulls = Nulls.SET)` like `properties`). `GenerateStoriesCommand.viewOf` hands the kernel a view whose `properties.highlight` is the step's `highlight` when the step has the key (non-null), whether the step names a saved view (a copy of that view with the key replaced, the saved view untouched, `View.toBuilder` over an `ObjectNode` copy of its properties) or carries its own recipe (the step's `highlight` wins over a `properties.highlight` of the same step; the guide says one place is enough). An empty `highlight: []` on a step switches off a highlight the saved view has.
- Rationale: a story step is where a highlight changes from step to step while the view stays the same; if the highlight could be written only in the view, every step would need its own saved view. Replace, not merge, so the step says exactly what it shows.
- Alternatives considered: only `properties.highlight` (the step with `view:` could not highlight); merging the step's list into the view's (a step could not remove a highlight); a new `Step.highlights` plural (a second spelling).
- Tradeoffs: a second place for the same word; the key is in the schema of `Step` and so in `READ_SCHEMA` (IMP-7).
- Linked PRD IDs: REQ-1, REQ-6.

DEC-3 — The kernel marks, it does not restyle

- Decision: `Input.highlight: Vec<serde_json::Value>` (JSON, so that the technology layer is refused before the shape is looked at, as `links`), read by `map_links`'s twin `map_highlight` (same `LinkRef`, same normal label). An `OutLink` gets `highlighted: bool`, `#[serde(skip_serializing_if = "std::ops::Not::not")]`: true when any `OutRel` of the link is declared by an entry's `source`, with its `destination` and its normalised label (`OutRel.from` is the source). A grouped (synthetic) link is highlighted when any of the relationships it stands for is, since the entry names a relationship and the link is where the reader sees it. The marking runs once, in `map`, after `merge_links` (and the `collapse` that follows it) has merged the links, so that it reads the `relationships` a merged link holds, and before `annotate`/`only_changes`; `highlighted` is not part of the key `merge_links` merges on (that key is the tuple of `from`, `to`, `label`, `synthetic`, `qualifiers`, `tags` and `secondary`), and since `OutLink` derives `Ord` and `PartialEq` over all its fields, `highlighted` is declared as the last field, so that it breaks no tie of the existing order and is set only after merging; `only_changes` that drops a link drops its mark. The kernel says nothing of "calm": a host derives it as "some link of the view is highlighted" (DEC-4). The technology layer refuses the key with ``highlight is read in the map of the application layer only`` (the sentence of `links`). `highlight` is read for `viewpoint: map` only, as `KernelViewpointFactory` forwards `links` for `map` only: a view or a step of another viewpoint (`overview`, `detailed`, `deep`) that has `highlight` ignores it, draws as without it and raises no error or warning; the guide says so.
- Rationale: marking at the one place where the model and the links meet keeps the editor and the command line equal (the reason of run 0197); a boolean on the link is the least a host needs; absent-when-false keeps every existing output byte for byte (CON-2).
- Alternatives considered: the host marks by comparing `OutRel`s with the entries (two implementations of the match, the failure DEC-6 of run 0197 avoided); a `calm` flag on every other link (a key on every link of every highlighted view).
- Tradeoffs: a grouped link can be highlighted for one of several relationships; the editor's drawing (W-6) must say what it shows for that case (Q-1).
- Linked PRD IDs: REQ-3, REQ-5.

DEC-4 — What the highlight does to the drawing

- Decision: the highlight changes how links are drawn and nothing else: it adds no box and no link. An entry that names an existing relationship the map does not draw (not in `links`, hidden, both ends on one closed box, dropped by `only_changes`) marks nothing and is no error, as run 0197 decides for `links` ("matched on the model, before projection and filters"). `highlight` without `links` marks links of the whole map.
- Rationale: it keeps the two keys independent and the story-player case simple (W-6 sets `links` to the relationships so far and `highlight` to the newest); an author who highlights a link that is not drawn gets an unchanged picture, which the guide says.
- Alternatives considered: highlight implies the link is drawn (a second way to select, in conflict with `hidden`); an error when an entry is not drawn (a hidden or closed box would turn a valid view into an error, the case run 0197 DEC-4 refused).
- Tradeoffs: a typo that still names an existing relationship cannot be told from a deliberately undrawn one.
- Linked PRD IDs: REQ-1, REQ-2.

DEC-5 — The PlantUML look

- Decision: new `rendering/plantuml/HighlightMarks`, a utility class like `ChangeMarks`, called by `LinkRenderer`. The view is "highlighting" when at least one of its links is highlighted; `LinkRenderer` computes this once per view, before it writes the first link, as `any(link.highlighted)` over the links of the view, and hands the result to `HighlightMarks`. In such a view:
  - a highlighted link without state: arrow `-[thickness=5,#D55E00]->`, label `**<U+25B6>** **label**` (a black-triangle glyph, then the label in bold; the glyph alone when the link has no label). The bold covers the label text only: the qualifiers and the state glyph that the formatters add to the label are outside it;
  - a highlighted link with a state (`new`, `changed`, `removed`): the arrow of the state with `thickness=5` in place of its thickness (removed gets `thickness=5` too and stays dashed grey), and the label of the state's glyph, then `**<U+25B6>**`, then the label in bold;
  - a link that is not highlighted, has no state and is not secondary: arrow `-[#A6A6A6]->` and its label in `<color:#7F7F7F>`...`</color>` (thin, grey, solid);
  - a link with a state that is not highlighted, and a secondary link (`..[#gray]>`), are drawn as without the highlight.
  A view with no highlighted link is drawn exactly as before. Colour is never alone: weight (5 against 3 of `new`), the glyph and the bold label tell the highlight; the calm links lose weight and keep their label.
- Rationale: thickness and a glyph carry the meaning, as `ChangeMarks` does; the state keeps its colour and dash so a compared view still reads (`ChangeMarks` documents that states are told by outline and glyph); grey solid is distinct from removed (dashed) and from secondary (dotted); vermilion `#D55E00` is the Okabe-Ito colour that the palette of `ChangeMarks` leaves free (it uses `#009E73`, `#E69F00`, `#0072B2`, `#CC79A7`, `#56B4E9`).
- Alternatives considered: change the colour of the highlighted link only (colour alone); grey out the calm links with a state too (loses the comparison); `hidden` instead of calm (would be `links`).
- Tradeoffs: a highlight on a `removed` link looks like a heavy dashed grey line; the glyph decides. Both calm labels and bold labels depend on Creole in the label, written by the existing formatters (`linkFormatter.getLabel()`), so a custom `formatters.link.label` that already contains Creole is wrapped, not rewritten.
- Linked PRD IDs: REQ-2.

DEC-6 — An entry that names nothing: the rules of `links`

- Decision: exactly DEC-5 of run 0197 with `highlight[n]` in the sentence, built from one function: in a workspace with no plateau and no facet, an entry that matches no relationship is ``error: the view v: `highlight[1]` names a relationship from `a` to `b` with the label `reads`, which does not exist`` (kernel `error`, prefixed by the adapter; `with no label` for none), an unknown end is ``the view v: dangling reference: x`` and joins `dangling`; in a workspace of a plateau or a facet, `KernelViewpointFactory` drops an entry the index lacks and `ViewInPlateau` warns ``... is drawn without the highlight `a -> b`, which the plateau `p` does not have`` (a view whose `links` all lack skips as before; a view whose `highlight` entries all lack is drawn, without highlight, with the warnings: a highlight is not what the view is about). In a comparison an entry may name a relationship that only the plateau compared with had (`MapLinks.existsInUnion`). `links` is checked before `highlight` (the first error wins), and in a step the entries are those after the step's replacement of DEC-2.
- Rationale: one rule to learn; the only difference from `links` is that a missing highlight never skips the view.
- Alternatives considered: skip a view with a missing highlight (hides a whole picture for a decoration); ignore silently (a typo hides).
- Tradeoffs: as run 0197 (DEF-1): a typo in a workspace with plateaus is only a warning in every plateau.
- Linked PRD IDs: REQ-4.

DEC-7 — Generalise `MapLinks`, do not copy it

- Decision: `MapLinks.entries`, `wellFormed`, `exists` and `existsInUnion` take the key (`links` or `highlight`) and are the one implementation for both; the kernel's `LinkRef` and normal label serve both lists; the case table `src/test/javascript/viewpoint-kernel/map-links-cases.json` (created by run 0197; the highlight cases are added to it, in a `highlight` section beside the `links` cases, so that one file serves both keys; no `map-highlight-cases.json`) is read by the Rust and Java tests.
- Rationale: the match must not exist twice (DEC-6 of run 0197); the sentences differ only by the key.
- Alternatives considered: a second class `MapHighlight` (duplicated shape and match code, coverage cost).
- Tradeoffs: `MapLinks` is a name that now also reads `highlight`; its Javadoc says so.
- Linked PRD IDs: REQ-1, REQ-4.

DEC-8 — The editor learns the key and nothing else

- Decision: `src/main/editor/core/read-schema.js` gains `highlight` in the fields of a step (the same shape as `properties`), so that `EditorReadSchemaTest.shouldSayWhatTheEditorTableSays` stays equal to the classes; the editor does not read, draw, write or keep the key (it drops it on the save of a view until W-5, ASM-3 of run 0197). The page is rebuilt with `npm run editor:build`; the commit takes the sources and the page together.
- Rationale: the test fails otherwise (CLAUDE.md: "a class that gains a key fails until the page knows it").
- Alternatives considered: put the step's highlight in `properties` only (no class change, but DEC-2's reason fails); defer to W-5 (the Java suite is red meanwhile).
- Tradeoffs: this run edits one table of the editor, against the wave's "W-4 touches the page through `embed.sh`".
- Linked PRD IDs: REQ-1.

DEC-9 — No shipped file carries `highlight`

- Decision: no example, fixture or shipped story uses `highlight` in this run (the shipped story of a flow with highlights is W-6's); tests build their workspaces in a temp folder or from the guide's blocks.
- Rationale: CON-5: the editor cannot draw it yet.
- Alternatives considered: a shipped example now (the editor would show it without highlight, and `shipped-files.test.js` would hold a lie).
- Tradeoffs: the manual's example is a snippet until W-6.
- Linked PRD IDs: REQ-7.

# Repository Impact

- IMP-1 — Kernel
  - Path(s): `src/main/rust/viewpoint-kernel/src/lib.rs`, `src/main/rust/viewpoint-kernel/src/lib_tests.rs` (or a new `map_highlight_tests.rs` declared with `#[path]`), `src/main/rust/viewpoint-kernel/README.md`, header doc of `lib.rs`.
  - Change type: additive (schema-affecting for the kernel's JSON, contract number unchanged).
  - Why impacted: `Input.highlight`, `OutLink.highlighted`, `map_highlight`, the marking in `map`.
  - Linked PRD IDs: REQ-3, REQ-5.
  - Risks / notes: `OutLink` derives `Ord`: the new field must not change the order of the existing links (checked in task 001: the derive is `PartialEq, Eq, PartialOrd, Ord` over all fields and `merge_links` merges on its own tuple key, `highlighted` is not in it; `highlighted` is the last field of the struct, so it orders after every existing field and is set after merging).
- IMP-2 — Wasm and page block
  - Path(s): `src/main/wasm/viewpoint_kernel.wasm`, `src/main/resources/editor-webapp/standalone.html` (the block only).
  - Change type: modify (written by `embed.sh`).
  - Why impacted: the kernel changes.
  - Linked PRD IDs: REQ-3.
  - Risks / notes: commit with the sources; `embed.sh --check` agrees (CON-3).
- IMP-3 — Java adapter and model
  - Path(s): `src/main/java/io/morin/archicode/viewpoint/kernel/MapLinks.java`, `KernelViewpointFactory.java`, `src/main/java/io/morin/archicode/viewpoint/Link.java`.
  - Change type: modify.
  - Why impacted: DEC-7 (key parameter), `mapHighlight` next to `mapLinks`, `Link.highlighted` (`@Builder.Default boolean`, included in `ORDER` only if two links can differ by it alone: they cannot, it is derived from `relationships`, so it is left out of the comparator).
  - Linked PRD IDs: REQ-1, REQ-3, REQ-4.
  - Risks / notes: `Link` is a `@Value` with equality on all fields; check no test builds a `Link` and compares it to a kernel result.
- IMP-4 — Story step and command line
  - Path(s): `src/main/java/io/morin/archicode/resource/story/Story.java`, `src/main/java/io/morin/archicode/cli/GenerateStoriesCommand.java` (`viewOf`), `src/main/java/io/morin/archicode/cli/ViewInPlateau.java`, `GenerateViewsCommand.java` if it needs the comparison supplier for `highlight`.
  - Change type: additive (schema-affecting: the manifest schema gains `highlight` on a step).
  - Why impacted: DEC-2, DEC-6.
  - Linked PRD IDs: REQ-1, REQ-4, REQ-6.
  - Risks / notes: `src/test/resources/schemas/manifest.schema.json` changes in the same commit (regenerate with `archicode query schemas manifest`); the workspace schema is unchanged (verify with its golden file).
- IMP-5 — PlantUML rendering
  - Path(s): `src/main/java/io/morin/archicode/rendering/plantuml/LinkRenderer.java`, new `HighlightMarks.java`.
  - Change type: additive.
  - Why impacted: DEC-5.
  - Linked PRD IDs: REQ-2.
  - Risks / notes: no change for a view with no highlighted link (golden `.puml` files of the whole repository).
- IMP-6 — Native image
  - Path(s): `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json`.
  - Change type: modify only if a class that is read by reflection is added (`HighlightMarks` is not).
  - Why impacted: `Story$Step` is already listed; its new field is covered by `allDeclaredFields` if set (check).
  - Linked PRD IDs: REQ-6.
  - Risks / notes: `StoriesGenerateIT` on the native runner is the proof, in the Native job, not here.
- IMP-7 — Editor read schema
  - Path(s): `src/main/editor/core/read-schema.js`, `src/main/resources/editor-webapp/standalone.html` (rebuilt), `src/main/editor/names.json` only if a top-level name is added (none is).
  - Change type: additive.
  - Why impacted: DEC-8.
  - Linked PRD IDs: REQ-1.
  - Risks / notes: `npm run editor:check` and `EditorReadSchemaTest`.
- IMP-8 — Tests
  - Path(s): Rust `*_tests.rs`; Java `src/test/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactoryTest.java` (or a new `MapHighlightTest`), `src/test/java/io/morin/archicode/rendering/plantuml/` (a `HighlightMarksTest`), `GenerateStoriesTest`, `ViewInPlateauTest`, `GuideViewPropertiesTest`, `ManifestSchemaTest`, `EditorReadSchemaTest`; `src/test/javascript/viewpoint-kernel/map-links-cases.json` (case table, shared with `links`).
  - Change type: additive.
  - Why impacted: every DEC.
  - Linked PRD IDs: REQ-1 to REQ-6.
  - Risks / notes: none beyond coverage floors.
- IMP-9 — Documentation
  - Path(s): `src/main/resources/guide/guide.md`, `src/test/resources/guide/golden.md`, `src/doc/README.adoc` (`[[map-viewpoint]]`, `[[stories-generate]]`), `CLAUDE.md`.
  - Change type: modify.
  - Why impacted: REQ-7; the guide's table of view properties gains `highlight`, the story paragraph gains the step key, the golden file is regenerated with the command of `CLAUDE.md`.
  - Linked PRD IDs: REQ-7.
  - Risks / notes: `GuideTest` (30 KB budget), `GuideViewPropertiesTest` (`highlight` must change the drawing: a map with `links` and a `highlight` differs from the same map without).

# Canonical Impact

Not applicable — no canonical registers declared (`docs/CLAUDE.md` does not exist in this repository; the `arc` and `dom` registers are not declared).

# Data Model and Contracts

- CTR-1 — Kernel input `highlight`
  - Current contract: `compute` for `map` takes `links` (run 0197); no `highlight`.
  - Proposed contract: optional `highlight: [{source, destination, label?}]`, JSON, absent/null/empty meaning none; refused in the technology layer; the same shape and match as `links` (DEC-3); an entry matching nothing is `error`, an unknown end `dangling reference: x`.
  - Affected files: IMP-1, IMP-2.
  - Migration or compatibility notes: additive, contract number 5; an input without the key is unchanged.
  - Linked PRD IDs: REQ-3, REQ-5.
- CTR-2 — Kernel output `highlighted`
  - Current contract: a link has no mark.
  - Proposed contract: `highlighted: true` on a link that stands for a highlighted relationship; absent otherwise.
  - Affected files: IMP-1, IMP-3.
  - Migration or compatibility notes: additive; hosts that do not know the key ignore it (ASM-3).
  - Linked PRD IDs: REQ-3, REQ-5.
- CTR-3 — Properties of a view
  - Current contract: a map reads `pinned`, `hidden`, `opened`, `links` (application), `applications`, `relationships` (technology).
  - Proposed contract: a map of the application layer also reads `highlight`; the guide's table and `GuideViewPropertiesTest` say it; the editor's `canonicalViewProperties` does not know it until W-5.
  - Affected files: IMP-3, IMP-9.
  - Migration or compatibility notes: properties are `any` in the schema, so the schema does not move.
  - Linked PRD IDs: REQ-1, REQ-7.
- CTR-4 — Story step
  - Current contract: `view`, `viewpoint`, `layer`, `properties`, `name`, `text`, `at`, `against`.
  - Proposed contract: `highlight`, a list of entries, replacing the highlight of the view the step draws (DEC-2).
  - Affected files: IMP-4, IMP-7, `manifest.schema.json`.
  - Migration or compatibility notes: additive; old tools ignore it (ASM-4).
  - Linked PRD IDs: REQ-1, REQ-6.
- CTR-5 — PlantUML of a highlighted link
  - Current contract: a link is `a --> b : label` or the state's arrow.
  - Proposed contract: DEC-5.
  - Affected files: IMP-5.
  - Migration or compatibility notes: only a view with a highlighted link changes.
  - Linked PRD IDs: REQ-2.

# Interfaces and Behavior

- IF-1: `archicode views generate` and `archicode stories generate` read `highlight` and draw as DEC-5; no new option.
- IF-2: errors and warnings as DEC-6: one `error:` line (exit 1) or a `warning:`; a view named with `-i` fails before its folder.
- IF-3: `archicode guide` and `archicode query schemas manifest` show the new key (the step's `highlight`).
- IF-4: the editor shows no highlight; a story with `highlight` plays as before (ASM-3 of run 0197).

# Flows and Processing Logic

- FLOW-1 — A view with a highlight
  - Trigger: `views generate` on a saved map with `links` and `highlight`.
  - Steps: `KernelViewpointFactory.create` reads the two lists (shape checked by `MapLinks.entries`), forwards them; the kernel checks `links`, then `highlight`, selects and draws, marks the links; the factory builds `Link`s with `highlighted`; the renderer finds the view highlighting and writes the links of DEC-5.
  - Branches / failure paths: wrong shape or no match: `error:` (exit 1); entry lacking in a plateau: dropped, warning; no link marked (the entry names a relationship that is not drawn): the view is drawn as without highlight.
  - Final output / rendered result: a `.puml` where the marked link is heavier and the rest lighter.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4.
- FLOW-2 — A step with a highlight
  - Trigger: `stories generate`.
  - Steps: `viewOf` returns the saved view (or the step's recipe) with `properties.highlight` replaced by the step's; `ViewInPlateau.canBeDrawn` checks `links` and `highlight` in the plateau of the step; for a step with `against`, the comparison supplier is the one run 0197 added; the view is drawn as FLOW-1, with the step's states.
  - Branches / failure paths: as FLOW-1; the saved view is never written.
  - Final output / rendered result: `step_NN.puml` with the highlight.
  - Linked PRD IDs: REQ-6.

# Reliability, Performance, and Scalability

The marking is one pass over the links of a map with a set of at most the length of `highlight`; no measurable cost, and none for a view without the key. The kernel's time budget test (`npm run test:timing`) is not expected to move; it is run once.

# Security and Privacy

No new input beyond the YAML of a workspace; labels are text written into PlantUML as today (the renderer already writes labels; `<color:...>` is added around, not from, author text). Not materially relevant otherwise.

# Observability and Verification

- Rust: tests red first for the marking (plain, grouped, in a comparison, `only_changes`, an entry not drawn, an unknown end, no match, the technology refusal, absent key gives the same JSON). `cargo test`, `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo llvm-cov ... --fail-under-lines 90`, `embed.sh` then `embed.sh --check`.
- Java: `./mvnw test-compile pmd:check`; `./mvnw verify` and `./mvnw verify -DskipITs=false`; `HighlightMarksTest` (every combination of DEC-5, with a golden `.puml` string); a rendering test that a view without highlight is byte for byte the golden file of the repository; `GenerateStoriesTest` (a step with `view` and `highlight`; a step with its own recipe; `highlight: []`; the saved view not changed); `ViewInPlateauTest`; `GuideViewPropertiesTest`; `GuideTest` with the regenerated golden file; `ManifestSchemaTest` with the new `manifest.schema.json`; `EditorReadSchemaTest`.
- Page: `npm run editor:build`, `npm run editor:check`, `npm run test:unit`.
- Regression: `scripts/byte-identity.sh` reports no unexpected difference (REQ-5); a grep shows no shipped file with `highlight` (DEC-9).
- One manual check: render a `.puml` from a workspace made of the guide's blocks with PlantUML (ASM-5) and look at it.

# Deployment and Rollout

Code and generated files only (the `.wasm` and the page block). Backward compatible (CON-2). Rollback is a revert of the commit with the regenerated files. The tag run, the native runner and the real Safari are not proved by this run.

# Risks and Tradeoffs

- RISK-1: `OutLink`'s derived `Ord` or `PartialEq` includes the new field and reorders or splits links (a grouped link merged by `merge_links`): the mark must be set after merging and kept out of the key that merges. Mitigated by the Rust test on a grouped link.
- RISK-2: `ChangeMarks.label` and the new label compose in the wrong order for a state plus highlight. Mitigated by `HighlightMarksTest` on the nine combinations.
- RISK-3: the editor's conformance tests compare a whole link (ASM-3). Mitigated by running `npm run test:unit`.
- RISK-4: a highlighted removed link is hard to read (DEC-5 tradeoff). Accepted; the glyph decides.
- RISK-5: this run edits the editor's `read-schema.js` while W-5 plans the editor work; a merge conflict is possible only if W-5 starts first, and the P2 gate comes first (wave plan).

# Open Questions

- Q-1 (resolved, Stage 6, a design tradeoff decided by the stage agent): what the editor and the player draw for a grouped link that is highlighted because one of its relationships is. Decision: the whole link is drawn highlighted, exactly as the kernel's `highlighted` flag says on it, and the editor adds no finer rule of its own. Reason: the flag is one boolean per link, so the editor has no per-relationship information to draw anything else without a second contract key; the PlantUML renderer of this run (DEC-5) already draws the whole link; the same drawing in both tools keeps the conformance tests (ASM-3) a comparison of a whole link. The user can still tell which relationship is meant from the link's label and the entry of `highlight`. A finer drawing (the label of the highlighted relationship only) is a later change with its own key, left to W-6 if the reader needs it. W-5 and W-6 read this as their input; nothing in this run changes.

None blocks this run: the form, the place, the match, the error rules and the PlantUML look are decided above (DEC-1 to DEC-6), including the open question the wave left to this run.

# Deferred Work

- DEF-1: the editor's drawing of a highlight (the whole link for a grouped one, Q-1), its list, click, address and the rename/move rewrite of `highlight` entries (W-5, W-6).
- DEF-2: the shipped story of a flow that highlights (W-6).
- DEF-3: a wildcard label, `qualifiers` in an entry, a highlight of boxes, a highlight in the other viewpoints.
- DEF-4: the load check of a typo in a workspace with plateaus (as DEF-1 of run 0197).

# File Placement and Frontmatter

Saved as `docs/wav/wav-026-relationship-view/run/run-0198-link-highlight/tdd-0198-link-highlight.md`, `type: tdd`, `run: 0198`, `wave: 026`, status `draft`. Review pass: dispatched to a different agent in Stage 5 (this draft is by the main agent; the independence of the review comes from its being run by another agent); its findings F-1 to F-4 are applied (task-001: DEC-7 and IMP-8 case table path, DEC-3 viewpoint scope and marking after `merge_links`, DEC-5 bold and where the highlighting test is computed, IMP-1 `OutLink` order).
