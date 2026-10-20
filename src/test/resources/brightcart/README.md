# Brightcart

An invented online retailer whose architecture changes over four plateaus (`baseline`, the alternatives `saas` and `inhouse`, then `marketplace` under `inhouse`). It is a shared fixture: the tests of the command line and of the editor read `layered/`, which is generated from one description. The story, the tables and the reasons are in `docs/fixtures/brightcart-spec.md`; this folder is the specification as files. It also ships a few views and stories (`layered/shared/`, spec section 9).

Nothing here comes from a real workspace. Every name, id and label is invented.

## Regenerate

```
node src/test/resources/brightcart/generate.mjs
```

Everything below, except `description.mjs`, `generate.mjs`, `negative-cases.json` and this file, is written by that command, and a second run gives the same bytes (`brightcart-layered.test.js` runs it in a copy and compares). It empties `layered/`, `variants/` and `expected/` before it writes them (and writes the last column of the table of variants of `docs/fixtures/brightcart-spec.md`, when it runs from its place in the repository),
so do not edit those by hand: change `description.mjs` (the data) or `generate.mjs` (the rules), and regenerate.

The generator fails (exit code 1, the differences printed) when:

- the description stops giving the sizes (50, 42, 66 and 82 elements) or the comparisons P1 to P6 that the document records;
- a notable case N1 to N17 stops holding in the model's comparisons;
- the resolver finds a difference with the model: it reads `layered/` back from the files, applies the patches plateau after plateau, and compares each result, element by element, with what the model resolved;
- a negative variant V1 to V8 stops failing in the model with the words it expects;
- a variant has no `runToday`, or the document does not have exactly one row for each of V1 to V14 in its table of variants.

## What is here

| Path | What | Read by |
| --- | --- | --- |
| `description.mjs` | The data: elements, manifests (files), patches, the numbers of the document, the variants, the notable cases. | `generate.mjs` |
| `generate.mjs` | The port of the throwaway model of the specification: layers, the patch operators, the rules of `compare`, the YAML emitter, the resolver. | you |
| `layered/` | The layered rendition: a folder per plateau (`baseline/`, `saas/`, `inhouse/`, `marketplace/`) with a `plateau.yaml` (`Kind: Plateau`: `id`, `name`, `horizon`, `override` when the parent is not `baseline`, and the `patches`) and its manifests, each with a `plateau: <id>` header (the `baseline`'s have none); and the folder `shared/`, which no plateau owns, with seven views and three stories (`ENTRIES` of `description.mjs`; no `plateau:`, since a view and a story belong to no plateau). `workspace.yaml` has `settings.manifests.paths: ["./**"]` and no other word about plateaus. | the layered tools: `archicode diff --plateau <id> [--against <id>]`, `views generate --plateau <id>`, `plateau list`; the editor opens it and draws `baseline` |
| `variants/` | V1 to V14 (negative variants) and M1 to M3 (merge scenarios), one JSON description each, with the expected class of message and a `status`: what a tool does with it today, the `runToday` field of `description.mjs`, which is also the last column of the table of variants of the document. V1 to V11 are run on `layered/`, on the command line and in the editor, by the cases of `negative-cases.json` (V11 also by `plateau-model-cases.json`); V12 to V14 and M1 to M3 wait for `plateau merge`. V1 to V8 also carry what the model reports. | the tests of the variants and `plateau merge` |
| `negative-cases.json` | The negative cases the tools run on `layered/`: V1 to V10 of the document (a typo in a `target`, a plateau that overrides the wrong one, a manifest without its `plateau:` header, a typo in a plateau id, a `SET` of an `id`, a `REMOVE` that selects nothing, a renamed element, two `SET` of one field, a horizon earlier than the parent's), a plateau declared twice, a `current` that names nothing, a reference declared twice, a `replaces` that names nothing, a mistyped `--plateau` or `--against`, an unknown key in a header, a workspace that still has `settings.plateaus`, ...: for each, the alteration of `layered/` (applied in a temporary folder by the tests, so nothing negative is a committed workspace), the commands with their exit code and error output, and what the editor says. Written by hand; `generate.mjs` does not touch it. | `BrightcartNegativeCasesTest` (command line), `brightcart-negative.test.js` (editor) |
| `expected/` | `sizes.json`, `renditions.json` (files, lines and bytes of the rendition), `comparisons.json` (P1 to P6, with `verified`: `archicode diff` or `model only`, the `command` that asks the question of `layered/`, and what the tool prints for P4: `gives`), `changes.json` (the table of changes of each comparison), `notable-cases.json` (N1 to N17), `entries.json` (for each view of `shared/`, the plateaus that can draw it, the file it writes and the warning of the command line where it cannot or leaves an entry out; for each step of each story, the view, `at`, `against` and the comparison it draws). | the tests |

## The layered rendition

`layered/` is the source of truth and is read by the layered tools. It holds 60 files: 46 manifests of elements, 4 `plateau.yaml` (68 patches), 7 views and 3 stories (`expected/renditions.json`). The tree forks (`inhouse` and `saas` both override `baseline`), so every command names the plateau; the folder is shipped, so it is opened by the shipped-files tests of both tools (`exceptions.json` stays empty).

Run the command line on a **copy** of it: `views generate` writes `views-*` folders next to `workspace.yaml`.

```
cp -r src/test/resources/brightcart/layered /tmp/brightcart-layered
archicode -w /tmp/brightcart-layered/workspace.yaml plateau list
archicode -w /tmp/brightcart-layered/workspace.yaml diff --plateau saas                      # P1 (compared with baseline, the plateau it overrides)
archicode -w /tmp/brightcart-layered/workspace.yaml diff --plateau inhouse                   # P2
archicode -w /tmp/brightcart-layered/workspace.yaml diff --plateau marketplace               # P3 (compared with inhouse)
archicode -w /tmp/brightcart-layered/workspace.yaml diff --plateau inhouse --against saas    # P5
archicode -w /tmp/brightcart-layered/workspace.yaml diff --plateau marketplace --against baseline   # P4 as the tool reads it: one move less than the model
archicode -w /tmp/brightcart-layered/workspace.yaml views generate --plateau marketplace     # views-marketplace, views-marketplace-vs-inhouse, the facets
archicode -w /tmp/brightcart-layered/workspace.yaml query graph --plateau inhouse
```

`archicode diff` without `--plateau` fails on this fixture (``the plateaus of this workspace are not one line``). `BrightcartLayeredDiffTest` requires, for P1, P2, P3 and P5, the counts, the text, the table of changes (equal to `expected/changes.json`), the notable cases N1 to N12 and N14 to N16 (N13, a state of the drawing, is read in the views) and the cascade of a `REMOVE`; `BrightcartLayeredViewsTest` that `views generate` for the four plateaus writes the number of PlantUML files of `expected/sizes.json` (the built-in views: a saved view is drawn only when it is named with `-i`, so the views of `shared/` are not in that number), the comparison folders with their table and the facets, and, run twice for `saas` and `marketplace`, gives the same bytes; `BrightcartViewsAndStoriesTest` that `views generate -i <every view of shared/>` draws, in each plateau, the views `expected/entries.json` says and warns of the others, and `brightcart-views-and-stories.test.js` that the editor lists the same stories and views whatever plateau is drawn and plays the steps.

## Not here

`plateau migrate` and `plateau merge`, a story drawn from the command line (#109), the composition of `replaces` across several plateaus (P4 stays the model's), the large variant of the specification (section 15).
