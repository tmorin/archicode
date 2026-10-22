---
type: run
run: 0138
status: completed
profile: single-document
wave: 019
---

# Run 0138: editor-rough-edges

Wave 019, W-2. Three rough edges of the editor left by wave 018 (#137): the cap of the open key on a resize, the typed form kept by the catch of confirmLayerWrite, a node test of a saved view with a Jayway facet.

## Scope and decisions

View state only; no `modelsChanged()`; every other file the tools write is byte for byte as it was (only `standalone.html` changes).

1. **Resize.** `window.addEventListener('resize', syncDiagramKey)`; the function already sets `--dg-key-max` only for an open key with a measured holder. Test: `diagram-key-folded.test.js`, "a resize of the window sets the cap ...".
2. **`confirmLayerWrite`.** Takes `keepElementForm()` before the write the yes runs again and hands it to `keptElementForm` in its `catch`, before the `render()` that shows the sentence, exactly as `writeElementDraft` (#129). Test: `cancel-keeps-the-typed-form.test.js`, "layer-confirm: a write that the yes then fails on ...".
3. **Jayway facet on a saved view.** Writing the test found a real fault: the page said "Nothing to show: facet f removes this element" for a facet the kernel refuses, hiding the one sentence of #128. `facetRemovesElement` now takes the error and answers no for the four sentences of a refused facet (`the facet path ...`, `unsupported facet action`, `invalid facet JSONPath`, `a facet cannot remove the whole`, `a facet left an unreadable`); the kernel's "the facet removed everything" is still a removal. It also holds for the tab greying of an element. Test: `saved-view-jayway-facet.test.js` (case F3 of `facet-dialect-cases.json`; the standard form draws).

All three new tests fail on the page of `archicode-0.17.0` (checked by swapping in `git show archicode-0.17.0:...standalone.html`) and pass on the new one.

## Canonical impact

CLAUDE.md: yes, two sentences changed in place (the key paragraph: the resize; the typed-form paragraph: `confirmLayerWrite`, and the refused facet shown as the error of the view). No `dom`/`arc` packet.

## Manual passages for W-9 (src/doc/README.adoc, not edited here)

- "The key is folded" (about line 1848): the cap of the open key follows a resize of the window.
- "Cancelling" (about line 1591): a write that fails after the yes of the dialog of the plateaus also gives the form back as typed, beside the sentence.
- The Jayway entry of the upgrade list (about line 1480) and the facets chapter (`[[facets]]`): the editor shows the sentence as the error of the view/diagram, not "facet removes this element".

## Verification

See the report of the run: `./mvnw -o verify -DskipITs=false` green, cargo 230 passed, `embed.sh --check` ok, node 2358/2358, prettier clean.
