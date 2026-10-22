---
type: run
run: 0141
status: completed
profile: single-document
wave: 019
---

# Run 0141: stories-tables-and-facets

Wave 019, W-5. stories generate writes the table of changes beside a comparison step and draws the facets of the workspace (#140, decision T6).

## Scope

#140, left over from #109: `archicode stories generate` (1) writes the table of changes beside each comparison step, (2) draws the facets of `settings.facets`, with no new key in a story, (3) leaves the files of the global views byte for byte as in 0.17.0.

## Decisions

- **Table of changes**: `gap.md` and `gap.json` go in the folder of the step (`<views.path>-stories/<story>/<NN>-<view>/`), beside its `plantuml/` folder, as `views generate` writes them in the folder of a comparison beside its views. The writer is the same (`GapFiles`, extracted from `GenerateViewsCommand`; `GapReport.render(comparison, format, false, cascade)` with `Removal.cascade(plateau.getRemovals(), base)`), so the content is identical to the `views-<plateau>-vs-<against>` table of the same pair (the test compares the bytes). A step that compares nothing has none; the facet folders have none (`views generate` writes none for facets either). The table is written even if `global-enabled` is false.
- **Facet folders**: `views generate` names a facet folder by the template of the facets (`directory-name-template`, `%s-%s`) applied to the views folder; here it is applied to the step folder name: `<NN>-<view>-<facet>`, a sibling of `<NN>-<view>` under `<story>/`. For a compared step the facet is applied to the union with the comparison (`create(union, facet, comparison)`), as `views generate` does; made once per plateau or pair, whatever the number of steps.
- **`global-enabled: false`**: honoured as in `views generate`: the global folder of the step is not drawn, only the facets. Consequence: a workspace that sets it to false and has stories draws no global step folder any more (it did in 0.17.0). Noted as a behaviour change, only for that setting.
- **A facet that removes an element the step names**: warning ``skip <story>/<n> in the facet `f`: it names `x`, which the facet removes``, that facet's folder skipped, the others and the global folder drawn, exit 0 (the step is not asked for by name as `-i` is, so no error). Only the `element` property of non-map views is checked, as `requireViewsKeepTheirElement`; an entry of a map that a facet removes is dropped silently, as in `views generate`.
- Facet name used in a folder is not sanitised, as in `views generate`.

## Verification of byte equality with 0.17.0

Jar of tag `archicode-0.17.0` against this tree, on copies of the shipped fixtures: layered Brightcart `--plateau saas -s fork_tour`, layered Brightcart `--plateau marketplace` (all stories), `domain_plateaus` `-s migration`. No file of the old output differs or is missing in the new (`diff -rq`); only additions. New files: per step of `fork_tour` and `order_journey` / `seller_journey`: a folder `<NN>-<view>-journey`, `-no-externals`, `-without-cart` with `plantuml/...` (without-cart/no-externals skipped with a warning where the step names an element they remove); `gap.md` and `gap.json` in each compared step folder (`fork_tour` 02 to 07, 27 new entries on saas); `migration/02-overview` and `04-overview` gain `gap.md` and `gap.json` (`domain_plateaus` has no facet).

## Manual passages for W-9

`[[stories-generate]]`: the sentence that says the facets are not drawn and no table is written; add the folder layout `<NN>-<view>-<facet>`, `gap.md`/`gap.json` in a comparison step folder, `global-enabled: false`, the warning for a facet that removes the named element, and the `--help` text. Also the stories paragraph of `[[plateaus-upgrade]]` if it repeats the limits, and `[[plateau-limits]]` if it lists "no facet / no table" for stories.

## Canonical impact

None: no architecture or domain packet; the only canonical text that changes is the `stories generate` sentence of CLAUDE.md, updated.

## Tasks

- [x] GapFiles extracted, facets and tables in GenerateStoriesCommand, --help updated
- [x] GenerateStoriesTest and StoriesGenerateIT extended
- [x] 0.17.0 comparison
- [x] Verification set (final): mvn verify with ITs 1258 unit (2 skipped) + 27 IT green; cargo 233; embed --check ok; node 2377 pass; prettier ok. Also reflect-config.json gained GapFiles.
