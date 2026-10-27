/**
 * The key of a row of a tree. A reference can exist in both layers (the application solution `hub` and the environment
 * `hub`), so what the UI remembers about a row (unfolded, modified, the tab stop) is keyed by layer and reference:
 * `application:shop.web`. `layer` defaults to the one `layerOfReference` picks.
 */
function nodeKey(reference, layer) {
  return (layer || layerOfReference(reference) || 'application') + ':' + reference;
}
function nodeKeyLayer(key) {
  return String(key).slice(0, String(key).indexOf(':'));
}
function nodeKeyReference(key) {
  return String(key).slice(String(key).indexOf(':') + 1);
}
/** The key of the row an ElementRecord has in its tree. */
function recordKey(record) {
  return nodeKey(record.reference, record.layer || 'application');
}

/** Add every ancestor reference of `reference` (itself included, in `layer`) to AppState.expanded (FR-14/FLOW-5). */
function expandAncestorsOf(reference, layer) {
  if (!reference) return;
  const owner = layer || layerOfReference(reference) || 'application';
  const segments = String(reference).split('.');
  let acc = '';
  for (const segment of segments) {
    acc = acc ? acc + '.' + segment : segment;
    AppState.expanded.add(nodeKey(acc, owner));
  }
}

/** Fold or unfold a row of a tree; `key` is a `nodeKey`. */
function toggleExpandedKey(key) {
  if (AppState.expanded.has(key)) {
    AppState.expanded.delete(key);
  } else {
    AppState.expanded.add(key);
  }
}

/**
 * The layer ('application' | 'technology') an element lives in, or null when no layer has the reference. A reference
 * can exist in both layers (the application solution `hub` and the environment `hub`): the layer asked for wins when
 * it has the reference; else the layer of the selected element when it is that very reference (the edit form, the
 * delete and create buttons all act on the selection); else the application layer, as before.
 */
function layerOfReference(reference, layer) {
  const has = (candidate) =>
    !!AppState.index && !!AppState.index[candidate] && AppState.index[candidate].has(reference);
  if (layer && has(layer)) return layer;
  const sel = elementSelection();
  if (!layer && sel && sel.kind === 'element' && sel.key === reference && sel.layer && has(sel.layer)) return sel.layer;
  if (has('application')) return 'application';
  if (has('technology')) return 'technology';
  return null;
}

/**
 * The layer a reference lives in, in a model that is not the editor's (the `index` of a step of the story player): the layer asked for when it has the reference, else the
 * application one, else the technology one, else null. `layerOfReference` without the selection, which belongs to the editor.
 */
function layerOfReferenceIn(index, reference, layer) {
  const has = (candidate) => !!index && !!index[candidate] && index[candidate].has(reference);
  if (layer && has(layer)) return layer;
  if (has('application')) return 'application';
  if (has('technology')) return 'technology';
  return null;
}

/** The record of a reference in the model `index` of a step of the story player (`layerOfReferenceIn` picks the layer); null when it has none. */
function recordIn(index, reference, layer) {
  const resolved = layerOfReferenceIn(index, reference, layer);
  return resolved ? index[resolved].get(reference) : null;
}

/** Whether both layers have an element with this reference (then a link to it needs to say which one). */
function referenceIsInBothLayers(reference) {
  return AppState.index.application.has(reference) && AppState.index.technology.has(reference);
}

/** Look up an ElementRecord by reference (DEC-6) in the layer asked for, else the layer `layerOfReference` picks. */
function findElementRecord(reference, layer) {
  const resolved = layerOfReference(reference, layer);
  return resolved ? AppState.index[resolved].get(reference) : null;
}

/**
 * Locate the live, mutable `content` node a `reference` denotes (TDD-0009
 * DEC-4) — never a disposable `ElementRecord` copy from `index`, since
 * `indexElementRecursive` builds a fresh `record` object on every
 * `buildIndex` call. Returns `{ mf, node, parentArray, indexInParent }`,
 * or `null` if `reference` does not resolve (should not happen for a
 * reference `findElementRecord` itself returned — see DEC-4's rationale).
 */
function locateContentNode(reference, layer, given) {
  const record = given || findElementRecord(reference, layer); // `given`: the record of an element of the plateau compared with, when the edit is made on that one (see `acceptLayeredCandidate`)
  if (!record) return null;
  const mf = AppState.manifestFiles.find((f) => f.relPath === record.sourceFile);
  if (!mf || !mf.header || !mf.content) return null;

  const rootRef = mf.header.parent ? mf.header.parent + '.' + mf.content.id : String(mf.content.id);
  if (reference === rootRef) {
    return { mf, node: mf.content, parentArray: null, indexInParent: null };
  }
  if (reference.indexOf(rootRef + '.') !== 0) return null;

  // Walk the nested elements by matching the rest of the reference against `<id>` or `<id>.…`, so an id that
  // happens to contain a '.' (nothing forbade it in a hand-written manifest) is still found.
  let currentRef = rootRef;
  let searchArray = Array.isArray(mf.content.elements) ? mf.content.elements : [];
  let matchedNode = null;
  let parentArray = null;
  let indexInParent = null;
  while (currentRef !== reference) {
    const rest = reference.slice(currentRef.length + 1);
    let foundIndex = -1;
    for (let i = 0; i < searchArray.length; i++) {
      const child = searchArray[i];
      if (!child || typeof child !== 'object' || child.id === undefined || child.id === null) continue;
      const childId = String(child.id);
      if (rest === childId || rest.indexOf(childId + '.') === 0) {
        foundIndex = i;
        break;
      }
    }
    if (foundIndex === -1) return null; // contract violation (DEC-4) — should not happen
    parentArray = searchArray;
    indexInParent = foundIndex;
    matchedNode = searchArray[foundIndex];
    currentRef = currentRef + '.' + String(matchedNode.id);
    searchArray = Array.isArray(matchedNode.elements) ? matchedNode.elements : [];
  }
  return { mf, node: matchedNode, parentArray, indexInParent };
}
