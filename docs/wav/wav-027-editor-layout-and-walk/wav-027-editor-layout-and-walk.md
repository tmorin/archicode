---
type: wave
wave: 027
status: in-progress
date: 2026-10-29
related:
  - docs/wav/wav-027-editor-layout-and-walk/wbc-027-editor-layout-and-walk.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-001-diagram-layout-address-and-walk.md
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
---

# Wave 027 — Editor layout and walk

## Purpose

The Changes list of every page can be walked with the mouse for any number of changes with the walk controls and the selected row in view. Every diagram of the editor (the page of an element in its three viewpoints, the Maps of both layers, the page of a saved view, a story step) is laid out by one resolved `layout.columns` (the toolbar, then the view, then the workspace, then none), a link from the address bar reproduces everything that changes the boxes and links drawn, and the command line draws what it drew. The diagram toolbar has a written inventory over all those diagrams and a proposal that waits for the author's agreement. #155 is closed with its limits already written in the manual.

## Non-Goals

- No toolbar redesign in code: W-4 writes a document and a mock-up; the code is wave 028, after the author agrees.
- No lateral rail (#179, option C): W-4's document decides whether it is wanted.
- No `direction` or spacing option, and no hard cap on boxes per row.
- No change to the command line's output, to `workspace.schema.json` or to the kernel contract (5). The key `layout` is ignored by the command line.
- #155 L3 and L4 are not fixed; #134, #135, #65 and #24 are not in this wave.
- No change to zoom and pan in the address, to the wording toggle or to the key's open state in it.
- The ratchet of `src/main/editor/layers.json` does not rise (99); no coverage floor is lowered; the tag run, the native runner and the real Safari stay unproved.

## Decision Prerequisites

None open. The five decisions are accepted and recorded in `rfc/rfc-001-diagram-layout-address-and-walk.md`. One decision follows the wave and is not waited for inside it: the author's agreement on W-4's proposal, which gates wave 028.

## Open questions

- The upper bound of `columns` and the exact sentence of an invalid value. Decided by W-2's TDD, who says it in the guide.
- The values the toolbar list offers (empty, then which numbers). W-2.
- How the fold and unfold state is written in the address (a list as `pin` is, or a count), and how long an address may get on a large Map. W-3's TDD, who measures a Map of the layered Brightcart.
- Whether `layout.columns` on the page of a saved view is edited the way the four texts are (the toolbar edits the view, `setViewLayout`) or only by its form. W-2 follows the texts, and says if it cannot.
- Whether Safari's sticky behaviour inside a scrolling panel needs a run of the e2e spec in WebKit. Not proved by this wave; W-1 records it as a limit.

## Wave Manifest

```yaml
wave_manifest:
  wave: 027
  slug: editor-layout-and-walk
  status: in-progress
  sources:
    - 'gh:tmorin/archicode#179'
    - 'gh:tmorin/archicode#178'
    - 'gh:tmorin/archicode#155'
  phases:
    - id: P1
      name: The walk bar
      gate:
        criteria:
          - '`npm run editor:build`, `npm run test:unit`, `npm run lint`, `npm run format:check` and `npm run editor:check` pass, and `ratchet.max` in `src/main/editor/layers.json` is not above 99; the committed `standalone.html` is the assembly of the parts'
          - 'the end-to-end spec named in the run document of W-1, in Chromium and Firefox, opens a comparison of the fixture `replaces-large-pair` (360 changes), presses *Next change* thirty times with the mouse at 1280 px and at 360 px, and after each press asserts that the bounding box of the button is inside the panel''s box and that the top of the selected row is at or below the bottom of the sticky block (`npm run test:e2e`)'
          - 'the run document of W-1 records the height of the sticky block as a share of the panel at 360 × 640, and the verdict: option A if it is at most 35 %, option B (the rows scroll in their own box) built instead if it is above, with the measure'
          - 'a node test shows that a list shorter than the panel renders no sticky block more than the tabs, and that every page that writes the Changes list (Plateaus, Applications, Environments, Elements, Stories, a story''s right panel) gets the walk bar from `renderChangesPanelHtml`; `j` and `k` behave as before (`handleChangesKeydown` tests unchanged)'
    - id: P2
      name: Layout and address on every diagram
      gate:
        criteria:
          - '`./mvnw verify -DskipITs=false`, `npm run test:coverage`, `npm run test:e2e`, `npm run lint`, `npm run format:check` and `npm run editor:check` pass; no coverage floor in `scripts/editor-coverage-floor.json` is lowered; `ratchet.max` is not above 99'
          - '`scripts/byte-identity.sh` shows no unexpected difference; `src/test/resources/schemas/workspace.schema.json` is unchanged; `GuideViewPropertiesTest` passes with `layout` in the guide''s table of keys the command line ignores, and `src/test/resources/guide/golden.md` is regenerated in the same commit'
          - 'a node test asserts that with no `layout` set, every saved Map of the shipped examples and fixtures has the boxes and links of `src/test/resources/technology-map/expected-boxes.json` and `src/test/resources/map-links/expected-boxes.json`, and that `buildElkGraph` sets the layer bound on the root and on each compound node when `columns` is set and on none when it is not'
          - 'a node test asserts the resolution order of the one function (toolbar, view, workspace per viewpoint, none) for each of the four viewpoints, that a value equal to the default is not remembered, that an invalid value gives an editor sentence, and that the story player''s step draws the boxes of the editor for the same view with a `layout`'
          - 'an end-to-end spec in Chromium and Firefox, named in W-2''s run document, draws a Map of the layered Brightcart with `columns: 4` in `settings.views.properties.map.layout`, asserts at most 5 boxes in a row in each container (the bound aims at 4 and may exceed it, see RFC-001), then overrides it in a saved view and with the toolbar, and removing the value restores today''s boxes'
          - 'W-2''s run document records the same `columns: 4` on a real diagram of the layered Brightcart: the rows per container before and after, for the page of an element, a Map, and a saved view'
          - 'for each option that changes what is drawn (`layout`, *Changes only*, the fold and unfold state, and each option already in the address), on the page of an element, on both Maps and on the page of a saved view, a node test shows that the address written, read back by `applyDiagramParamsFromHash`, gives the same drawn boxes and links, and an end-to-end spec in Chromium and Firefox opens the copied address in a new page and finds the same diagram; the wording toggle, the key and the zoom are not in the address'
    - id: P3
      name: The toolbar review
      gate:
        criteria:
          - '`docs/wav/wav-027-editor-layout-and-walk/run/` holds W-4''s document with an inventory table whose rows are every control of the diagram toolbar and whose columns are the page of an element (overview, detailed, deep), the Map of the application layer, the Map of the technology layer, the page of a saved view, a story step in the editor and the story player, each cell saying whether the control is there, what it saves and where; and a mock-up (an HTML file in the same folder) at 1280 px and 360 px'
          - 'the document answers each item of #178''s toolbar review (grouping, saved with the view or session only, *Reset to the view*, one `aria-pressed` convention, keyboard order, narrow screens, same controls on the page of an element and of a saved view), decides the rail of #179 option C, and lists the changes it proposes, each with the test that would guard it; no file under `src/main/editor` changed in this run'
          - 'the wave''s progress log says that the toolbar proposal waits for the author''s agreement before wave 028'
  runs:
    - id: W-1
      slug: sticky-walk-bar
      phase: P1
      depends_on: []
      run: 0201
      delegation: standard
      likely_paths:
        - 'src/main/editor/style.css'
        - 'src/main/editor/presentation/changes-panel.js'
        - 'src/main/editor/presentation/right-panel.js'
        - 'src/main/editor/composition/render.js'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/e2e/**'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'a reader of a large comparison presses Next change with the mouse thirty times in a row without scrolling back to the buttons, on any page that lists the changes (#179)'
    - id: W-2
      slug: diagram-layout-columns
      phase: P2
      depends_on: []
      run: 0202
      delegation: standard
      likely_paths:
        - 'src/main/editor/model/**'
        - 'src/main/editor/application/**'
        - 'src/main/editor/presentation/diagram-layout.js'
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/diagram-state.js'
        - 'src/main/editor/presentation/view-edit.js'
        - 'src/main/editor/presentation/stories-pages.js'
        - 'src/main/editor/presentation/story-scene.js'
        - 'src/main/editor/style.css'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      focus: 'an author sets layout.columns once for a workspace, overrides it in a view, and changes it on the diagram on screen, for an element, a Map, a saved view and a story step, and wide diagrams stop being one long row (#178, the option)'
    - id: W-3
      slug: diagram-address
      phase: P2
      depends_on: [W-2]
      run: 0203
      delegation: standard
      likely_paths:
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/diagram-state.js'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      focus: 'a reader who opens a copied link sees the diagram the sender saw, on every diagram: the address carries what changes the boxes and links drawn and nothing else (#178, the address)'
    - id: W-4
      slug: toolbar-review
      phase: P3
      depends_on: [W-3]
      run: 0204
      delegation: standard
      profile: single-document
      likely_paths:
        - 'docs/wav/wav-027-editor-layout-and-walk/run/**'
      focus: 'the author reads one inventory of the diagram toolbar across all the diagrams and a mock-up, and decides what wave 028 builds (#178, the toolbar review; #179 option C)'
```

## Phase P1 — The walk bar

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `sticky-walk-bar` | — | walk the changes with the mouse for any number of changes | one sticky block (tabs, *Previous change*, *Next change*, "n of N", *Show all*), `scroll-padding-top`, `block: 'nearest'`; option B if the block is above 35 % of the panel at 360 × 640 | the e2e spec of the gate in Chromium and Firefox, the measure, node tests |

**Gate:** see the manifest.

## Phase P2 — Layout and address on every diagram

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-2 | — | `diagram-layout-columns` | — | `layout.columns` at three levels on every diagram | the resolver, the ELK options on every compound node, the toolbar control, the view form and `setViewLayout`, `settings.views.properties`, the cache key, the player's step, the guide's table, the manual | node tests of the resolver and of `buildElkGraph`, the e2e spec, byte-identity, the real-diagram record |
| W-3 | — | `diagram-address` | W-2 | the address carries everything that changes the drawing | the rule of RFC-001 DEC-2 on the page of an element, both Maps and the page of a saved view; `layout`, *Changes only* and the fold state in; the comment in `address-routing.js` corrected | a round-trip node test per option and surface, the e2e spec of a copied address |

**Gate:** see the manifest.

## Phase P3 — The toolbar review

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-4 | — | `toolbar-review` | W-3 | the inventory, the proposal and the mock-up | every control against every diagram surface; no editor code | the document and the mock-up under the run folder |

**Gate:** see the manifest.

## Dependency View

```
W-1 sticky-walk-bar =(gate P1)=> W-2 diagram-layout-columns -> W-3 diagram-address -> W-4 toolbar-review -> (author agrees) -> wave 028
#155: closed with a comment, no run
```

W-2 has no edge to W-1: the gate of P1 already holds P2 back, and the overlap between them is a `serialize` verdict under Risks, not a dependency.

## Risks

- **Overlap, verdict `serialize`.** Every run of P1 and P2 rebuilds the generated page `src/main/resources/editor-webapp/standalone.html` and edits `names.json`; W-1 and W-2 also share `style.css`, W-2 and W-3 share `diagram-page.js`, `diagram-state.js` and `ui-state.js`. The phases and the edges W-2 to W-3 to W-4 put them in separate batches, so none is in the same batch as another; if a later edit puts W-1 and W-2 in one phase, the verdict stays `serialize`.
- **ELK on nested boxes is a tendency, not a cap.** The bound reached 5 in a row with a bound of 4 once links joined containers (RFC-001). The acceptance says "at most 5" for 4 and the manual says "aims at"; a run that finds a case far above this reports it and does not promise more.
- **The sticky block can eat the panel at 360 px.** Mitigation: the measure and the 35 % rule that switches to option B.
- **ELK cannot run in the node suite** (the page loads it from a CDN). Node tests assert the options set on the ELK graph (`buildElkGraph`); the real layout is only checked by the end-to-end spec. A run that needs ELK in node adds a pinned dev dependency and says so.
- **The address grows.** The fold state of a large Map may make a long hash. W-3 measures it on the layered Brightcart and states the encoding.
- **A rule reversed.** *Changes only* enters the address, against a comment in `address-routing.js` and the editor paragraph of `CLAUDE.md`. W-3 changes both in the same commit.
- **W-4 has a human gate** that no run can pass. It ends with the document and a log line; the wave completes without the author's agreement, which wave 028 waits for.
- **Outward-facing step left to the author:** closing #155 with its comment and corrected title is a GitHub action and is not done by any run.

## Completion Criteria

- Every gate of P1, P2 and P3 holds, checked by a fresh agent.
- `CLAUDE.md` and the manual (`[[editor-small-screen]]`, the diagram section, `[[editor-changes]]` or the page that names the Changes panel) describe the sticky walk bar, `layout.columns`, the address rule and its three exceptions; `archicode guide` names `layout` among the keys the command line ignores.
- #155 is closed (a comment that says L2 was fixed by run 0162 and that L3 and L4 are accepted limits pinned by their tests and written in `[[plateau-limits]]`, the title corrected) by the author or on the author's word.
- The wave's pull request has `Java`, `Page`, `Kernel`, `E2E` and `Native` green, with the run id recorded in the progress log.
