---
type: run
run: 0011
status: completed
---

# Run 0011: Editor — UI state per layer

Profile: `single-document` (scope settled by a named defect, no design fork worth a TDD, one sequence). Source: item
"Per-reference UI state ignores the layer" of GitHub issue tmorin/archicode#8.

## Scope and done criteria

An application element and a technology element can share a reference (the solution `epr` and the environment `epr`).
The standalone editor (`src/main/resources/editor-webapp/standalone.html`) kept three pieces of UI state keyed by the
reference alone — `AppState.expanded`, `AppState.dirtyReferences` and `navActiveRef` — so the two elements shared them.
Done when:

- unfolding, the "modified" dot and the tab stop of a row belong to one layer's element;
- a rename or a delete in one layer leaves the other layer's rows alone;
- revealing an element (hash, link, saved view, diagram box) unfolds the branches in that element's layer;
- the existing behaviour for references that exist in one layer only is unchanged.

## Decisions

- **Key = `layer:reference`** (`nodeKey`, `nodeKeyLayer`, `nodeKeyReference`, `recordKey`). `expanded` and `dirtyReferences`
  stay `Set`s, now of keys; `navActiveRef` becomes `navActiveKey`. The `data-node` of a row is the key, so the focus kept
  across a redraw finds the right twin. The Map's tree is the application layer (`nodeKey(ref, 'application')`).
- `rewriteUiReferences` / `forgetUiReferences` act on the keys of the layer the rename or delete happened in. Map state
  (`mapPinned`, `mapHidden`, `mapOpened`) stays reference-keyed: the Map draws the application layer only.
- `toggle-element` carries `data-layer`; `expandAncestorsOf(reference, layer)` takes the layer and falls back to
  `layerOfReference`.
- Rejected: one `Set` per layer (`{application, technology}`) — it changes the shape of `AppState.expanded` for every reader
  for no gain over a prefixed key, and the prefix is what makes `data-node` unambiguous in the DOM.
- Rejected: dropping the sharing by forbidding a reference in both layers — the CLI allows it.

## Canonical impact

None: no architecture or domain packet. The manual (`src/doc`) says nothing about this state; no user-visible wording
changed.

## Verification

- `node --test "src/test/javascript/**/*.test.js"`: 193 tests, all pass (190 before; 10 existing tests moved to keys, 3 new
  tests and one reshaped for the layered state: tab stop, fold / modified / fold-all per layer, reveal per layer, rename and
  delete per layer).
- `./mvnw test` (JDK 25): 102 tests, BUILD SUCCESS.
- Not verified: the page in a real browser (File System Access needs a folder picker). The DOM is exercised by the tests only,
  as for the other editor changes (see the issue's "Visual check of the editor").

## Findings

- Two rows with the same reference used to be told apart only by `navTabStopGiven` (the first one took the tab stop). With
  distinct keys that guard is no longer what decides, it is only a safeguard; left in place.
