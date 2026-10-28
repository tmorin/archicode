// ---- The comparison of two plateaus (run 0039) ----

/** The plateau drawn, as a plateau of the page: the one of the band. */
function drawnPlateau(layers = AppState.layers) {
  return layerPlateauModel(layers.current);
}

/** The cascade of the REMOVE patches of the target of the comparison on screen, among what the base has (see `cascadeOf`): what the command line lists after the table of changes. */
function layeredCascadeNow(future, drawing = editorDrawing()) {
  const targetId = future ? drawing.layers.compare.other : drawing.layers.current;
  return cascadeOf(
    layerModelOf(targetId, AppState.workspace.settings).removals,
    future ? drawing.index : drawing.baseline.index
  );
}

/**
 * The input of the kernel's `compare`: both layers of the two plateaus, with the properties a comparison reads (kind, name, description). The plateau drawn is the
 * target and the plateau compared with the base, except with the future (the layers): there the plateau drawn is the base.
 */
function comparisonInput(drawing = editorDrawing()) {
  const { layers } = drawing;
  const future = layerCompareIsFuture(layers);
  const onOneChain = plateausOnOneChain(layers.current, layers.compare.other);
  const [baseId, targetId] = future ? [layers.current, layers.compare.other] : [layers.compare.other, layers.current];
  return comparisonInputBetween(
    future ? drawing.index : drawing.baseline.index,
    future ? drawing.baseline.index : drawing.index,
    onOneChain,
    replacesChainBetween(baseId, targetId)
  );
}

/**
 * The plateaus the target stands on, for the kernel to compose the `replaces` of the layers between the base and the target (wave 017, issue #89; `PlateauComparer.chain`):
 * each layer writes `replaces` relative to the plateau it overrides, so a move made in two steps names, for a plateau two steps up, an element the base does not have.
 * From the base (for two siblings, the plateau they have in common: `PlateauTree.standsOn`) to the plateau the target overrides, oldest first, each as
 * `{ application: [{ reference, replaces? }], technology: [...] }`, `replaces` being what the layer that declared the element wrote. `null` when there is nothing to compose
 * (fewer than two plateaus), or a plateau of the chain cannot be drawn (then the comparison cannot be either).
 */
function replacesChainBetween(baseId, targetId) {
  const tree = AppState.plateauTree;
  if (!tree || !tree.nodes.has(baseId) || !tree.nodes.has(targetId)) return null;
  const chain = plateauChain(tree, targetId);
  const shared = new Set(plateauChain(tree, baseId).map((node) => node.id));
  let common = -1;
  chain.forEach((node, at) => {
    if (shared.has(node.id)) common = at;
  });
  const nodes = common < 0 ? [] : chain.slice(common, chain.length - 1);
  if (nodes.length < 2) return null;
  const steps = [];
  for (const node of nodes) {
    const model = layerModelOf(node.id, AppState.workspace.settings);
    if (model.undrawable) return null;
    const layer = (records) =>
      Array.from(records.values(), (record) => {
        const replaces = kernelStringsOf(record.replaces);
        return replaces.length
          ? { reference: String(record.reference), replaces }
          : { reference: String(record.reference) };
      });
    steps.push({ application: layer(model.index.application), technology: layer(model.index.technology) });
  }
  return steps;
}

/**
 * Whether one of two plateaus is the past of the other: the same, or one is an ancestor of the other (`PlateauTree.onOneChain`). Two plateaus that override the same
 * one are siblings, two alternatives, and the kernel does not propose a pair of `replaces` between them because they are the only two of their kind under a parent
 * (contract 5, issue #70). Only the tree knows it: the kernel is told.
 */
function plateausOnOneChain(first, second) {
  const tree = AppState.plateauTree;
  for (const id of [first, second])
    if (!tree.nodes.has(id))
      throw new Error('There is no plateau “' + id + '”: it cannot be told whether it is on one chain with another.'); // as `PlateauTree.onOneChain`
  return (
    plateauChain(tree, first).some((node) => node.id === second) ||
    plateauChain(tree, second).some((node) => node.id === first)
  );
}

/**
 * The input of `compare` for two models. The target is a layer, which holds with its own elements the ones it inherits, and an inherited element keeps the
 * `replaces` of the layer that declared it. Compared with a plateau that has that layer the entry says nothing the comparison does not know, and the kernel would warn,
 * for every one, that it names nothing of the base: the `replaces` that the base writes the same way for the same element are left out of the target
 * (`PlateauComparer.carries`). `onOneChain`: whether one of the two plateaus is the past of the other (`plateausOnOneChain`), required by the kernel (contract 5).
 * `chain`: the plateaus the target stands on when it is several layers above the base (`replacesChainBetween`), additive to contract 5.
 */
function comparisonInputBetween(baseIndex, targetIndex, onOneChain, chain) {
  const layers = (indexes) => ({
    application: toKernelElements(indexes.application, true).elements,
    technology: toKernelElements(indexes.technology, true).elements
  });
  const input = { base: layers(baseIndex), target: layers(targetIndex), on_one_chain: onOneChain };
  if (chain) input.chain = chain; // the plateaus between the base and the target, to compose the `replaces` (`replacesChainBetween`); absent: nothing to compose
  for (const layer of LAYER_NAMES) {
    const known = new Map();
    for (const element of input.base[layer])
      if (element.replaces) known.set(element.reference, JSON.stringify(element.replaces));
    for (const element of input.target[layer]) {
      if (element.replaces && JSON.stringify(element.replaces) === known.get(element.reference))
        delete element.replaces;
    }
  }
  return input;
}

/**
 * What a caller does with the answer of `compare` to draw it (as `change.test.js` shows): the elements of a layer, each with the relationships
 * of the layer that it declares nested under it. The kernel draws that union as it draws a plateau; a removed element keeps its place under its parent.
 */
function unionLayersOf(union) {
  const declared = new Map();
  for (const rel of union.relationships) {
    const key = rel.layer + '|' + rel.from;
    if (!declared.has(key)) declared.set(key, []);
    declared.get(key).push(rel);
  }
  const layers = { application: [], technology: [] };
  const records = new Map(); // layer|reference -> the union element: what a removed box is told from
  for (const element of union.elements) {
    if (!layers[element.layer]) continue;
    layers[element.layer].push(
      Object.assign({}, element, { relationships: declared.get(element.layer + '|' + element.reference) || [] })
    );
    records.set(element.layer + '|' + element.reference, element);
  }
  return { layers, records };
}

let comparisonCache = null; // { version, index, baselineIndex, value }: the last answer of `compare`, kept while the two models are what they were (see `modelVersion`)

/**
 * The comparison with the wording-only changes set aside (run 0040): an element whose natures are exactly `description` is given to the kernel as
 * unchanged (`change: none`, no natures), so it is not marked in the drawing, it keeps no `contains-changes` marker above it that only it earned,
 * and `only_changes` does not keep it; the list drops its row and the counts say how many were set aside. The override is on the *input* of `compute`,
 * so the kernel computes its markers and its filter from it. `records` follows (what the panel reads of an element), `counts.relationships` is untouched.
 */
function setWordingAside(value) {
  const wording = (element) => element.change === 'changed' && element.wording_only === true;
  // an element set aside is unchanged, and what the kernel says of the union is true of the whole union: the state of a box that holds a change is then the one the
  // kernel says of the changes that are not only a rewording (`contains_more_than_wording`, which says it for every element), for the box that is unchanged now
  const quieter = (element) => {
    const copy = Object.assign({}, element);
    if (wording(element)) {
      copy.change = 'none';
      delete copy.natures;
      delete copy.wording_only;
    }
    if (copy.change === 'none' && element.contains_more_than_wording === true) copy.contains_changes = true;
    else delete copy.contains_changes;
    return copy;
  };
  const layers = {};
  for (const layer of Object.keys(value.layers)) layers[layer] = value.layers[layer].map(quieter);
  const records = new Map();
  for (const [key, element] of value.records) records.set(key, quieter(element));
  const { counts: kernelCounts, changes: kernelChanges } = value.answer;
  const n = kernelCounts.elements.wording_only;
  const counts = {
    elements: Object.assign({}, kernelCounts.elements, { changed: kernelCounts.elements.changed - n, wording_only: 0 }),
    relationships: kernelCounts.relationships
  };
  return {
    layers,
    records,
    counts,
    changes: kernelChanges.filter((row) => !(row.thing === 'element' && row.wording_only === true)),
    wordingHidden: n
  };
}

/**
 * The comparison of the plateau drawn with the baseline, as the page needs it now:
 *   null                nothing is compared (the band compares nothing, or still waits for the choice of the future);
 *   { pending: true }   a comparison is asked for and the kernel is not loaded yet (the drawing loads it, then asks again);
 *   { problems }        it cannot be drawn: one of the two plateaus cannot be, or the kernel refused the pair (the messages);
 *   { base, target, layers, records, counts, changes, wordingOnly, wordingHidden }   the answer, `layers` being the union of each layer ready for `compute`.
 * `candidates` and `warnings` (wave 009) are the kernel's, as it gave them: the pairs it proposes (`{ layer, from, to, reasons }`, none applied) and the sentences about a `replaces` it ignored.
 * `counts` and `changes` are the kernel's table (run 0036); with `AppState.hideWording` the wording-only changes are out of `layers`, `records`, `counts`
 * and `changes` (`wordingHidden` says how many), else they are all in and `wordingOnly` says how many of the changed elements they are. A record says
 * `contains_changes` when the kernel says that the box did not change and holds a change (`comparisonStateOfElement`).
 */
function comparisonState() {
  return comparisonStateOf(editorDrawing(), editorComparisonMemo);
}

/**
 * What the editor draws, as the data `comparisonStateOf` and the scene of a story read: the band's layers (the plateau drawn and the comparison), the model of the plateau drawn,
 * the plateau compared with (`AppState.baseline`), whether the plateau drawn can be drawn at all, the sentences of its mistakes, and the two toggles of the diagram.
 */
function editorDrawing() {
  return {
    layers: AppState.layers,
    index: AppState.index,
    baseline: AppState.baseline,
    undrawable: AppState.layerUndrawable,
    problems: AppState.layerProblems,
    hideWording: AppState.hideWording,
    changesOnly: AppState.changesOnly
  };
}

/** Where the editor keeps the answer of the kernel's `compare` for the two models on screen (`comparisonCache`, valid while `modelVersion` and the two indexes are what they were). */
const editorComparisonMemo = {
  find(drawing, future) {
    const kept = comparisonCache;
    return kept &&
      kept.version === modelVersion &&
      kept.index === drawing.index &&
      kept.baselineIndex === drawing.baseline.index &&
      kept.future === future
      ? kept.value
      : null;
  },
  keep(drawing, future, value) {
    comparisonCache = {
      version: modelVersion,
      index: drawing.index,
      baselineIndex: drawing.baseline.index,
      future,
      value
    };
  }
};

/**
 * The comparison of a drawing (`editorDrawing()`, or the one of a step of a story, `drawingOfPlateaus`), as `comparisonState` says it. `memo` keeps the answer of the kernel for
 * a pair of models (`find`, `keep`): the editor's is `editorComparisonMemo`, and nothing here writes to `AppState`.
 */
function comparisonStateOf(drawing, memo) {
  const target = compareTargetPlateau(drawing.layers);
  if (!target || !drawing.baseline || !drawing.baseline.plateau || drawing.baseline.plateau.id !== target.id)
    return null;
  if (drawing.undrawable)
    return {
      problems: [
        'The plateau “' +
          plateauTitle(drawnPlateau(drawing.layers)) +
          '” cannot be drawn, so there is nothing to compare:'
      ].concat(drawing.problems || [])
    };
  if (drawing.baseline.undrawable)
    return {
      problems: [
        'The plateau “' + plateauTitle(target) + '”, which the drawing is compared with, cannot be drawn:'
      ].concat(drawing.baseline.problem.split('\n'))
    };
  if (!loadedKernel) return { pending: true };
  // run 0045: the answer is kept while the version of the models is the one it was computed at (the two models themselves are compared too, a net
  // under a replacement that forgot `modelsChanged()`): a plain render serialises nothing and builds no input
  const future = layerCompareIsFuture(drawing.layers);
  let value = memo.find(drawing, future);
  if (!value) {
    const answer = loadedKernel.compare(comparisonInput(drawing));
    value = answer.error
      ? { error: answer.error }
      : Object.assign({ answer, cascade: layeredCascadeNow(future, drawing) }, unionLayersOf(answer));
    memo.keep(drawing, future, value);
  }
  if (value.error)
    return { problems: ['The comparison with “' + plateauTitle(target) + '” could not be made: ' + value.error] };
  if (!value.shown) {
    const full = {
      layers: value.layers,
      records: value.records,
      counts: value.answer.counts,
      changes: value.answer.changes,
      wordingHidden: 0
    };
    value.shown = { full: Object.assign(full, { wordingOnly: value.answer.counts.elements.wording_only }) };
  }
  if (drawing.hideWording && !value.shown.quiet) {
    const quiet = setWordingAside(value);
    value.shown.quiet = Object.assign(quiet, { wordingOnly: value.answer.counts.elements.wording_only });
  }
  // wave 009: the pairs the kernel proposes as one thing said twice (never applied) and what it ignored in the `replaces` it was given; neither depends on the wording toggle
  // `full`: the answer with every change in it, whatever the wording toggle says (what the hand-written state words are compared with, see `stateWordHintsOf`)
  const drawn = drawnPlateau(drawing.layers);
  return Object.assign(
    {
      base: future ? drawn : drawing.baseline.plateau,
      target: future ? drawing.baseline.plateau : drawn,
      future,
      cascade: value.cascade,
      candidates: value.answer.candidates || [],
      warnings: value.answer.warnings || [],
      full: value.shown.full
    },
    value.shown[drawing.hideWording ? 'quiet' : 'full']
  );
}

/** Whether the references of the union (the elements of both plateaus) include this one in a layer: the map can open a removed box. */
function comparisonHasElement(layer, reference) {
  const state = comparisonState();
  return !!(state && state.records && state.records.has(layer + '|' + reference));
}

/** A facet of the settings as the kernel reads it. */
function toKernelFacet(facet) {
  return {
    name: facet.name,
    actions: (facet.actions || []).map((action) => ({ operator: action.operator, json_path: action.jsonPath })),
    hide_unlinked: facet.hideUnlinked === true
  };
}

/**
 * The kernel input for one viewpoint of one element, from the current in-memory model.
 * options.layer — only needed when an application element and a technology element share a reference (the
 *   selection carries its layer: without one, `layerOfReference` decides — the selected element's layer, else the application one);
 *   a map has no element to decide: its layer is this one, else the application one;
 * options.facet — a facet of the settings: the diagram is then the one the CLI generates for that facet;
 * options.collapsed — ids of the diagram boxes that are folded;
 * options.expanded — ids of the diagram boxes that are opened (overview and detailed only);
 * options.source — what the input is made from when it is not the editor's drawing (a step of the story player, `storyStepScene`): `{ index, comparison, changesOnly }`, read and never
 *   written. Absent, the model on screen, its comparison and its toggles, as ever.
 */
function buildKernelInput(viewpoint, reference, options) {
  const opts = options || {};
  const source = opts.source || null;
  const index = source ? source.index : AppState.index;
  const isMap = viewpoint === 'map';
  const layer = isMap
    ? opts.layer === 'technology'
      ? 'technology'
      : 'application'
    : opts.layer || (source ? layerOfReferenceIn(index, reference) : layerOfReference(reference)) || 'technology'; // no layer asked: the selected element's own, else the application one
  const main = toKernelElements(index[layer], !!opts.facet);
  // the applications deployed on the nodes are what the viewpoints of an element draw inside a node (and derive links from), and the Map of the technology layer draws them too
  // (issue #107): the Map of the application layer needs no other layer
  const apps =
    layer === 'technology' ? toKernelElements(index.application, !!opts.facet) : { elements: [], dangling: 0 };
  // run 0039: with a comparison on, the kernel draws the union of the two plateaus (each element and relationship says what changed); `dangling` is still the plateau drawn's own
  const comparison = source ? source.comparison : comparisonState();
  if (comparison && comparison.layers) {
    main.elements = comparison.layers[layer];
    if (layer === 'technology') apps.elements = comparison.layers.application;
  }
  const input = {
    viewpoint,
    layer,
    focal: isMap ? '' : reference,
    default_synthetic_label: AppState.workspace.settings.relationships.defaultSyntheticLabel,
    elements: main.elements,
    app_elements: apps.elements
  };
  if (isMap) {
    input.opened = Array.from(opts.opened || []);
    input.pinned = Array.from(opts.pinned || []);
    input.hidden = Array.from(opts.hidden || []);
    // the relationships the Map of the application layer is narrowed to; absent when none (the whole map)
    if (layer === 'application' && opts.links && opts.links.length)
      input.links = opts.links.map((link) => Object.assign({}, link));
    // what the Map of the technology layer draws besides its elements: absent is drawn (the kernel's own default)
    if (layer === 'technology') for (const part of MAP_PARTS) if (opts[part] === false) input[part] = false;
  }
  if (opts.facet) input.facet = toKernelFacet(opts.facet);
  // run 0040: Changes only, for every host (the Map, the diagrams of Elements, the page of a view): the kernel keeps what changed and, as context, what places it
  if (comparison && comparison.layers && (source ? source.changesOnly : AppState.changesOnly))
    input.only_changes = true;
  const collapsed = Array.from(opts.collapsed || []); // a Set in the UI, an array in tests
  if (collapsed.length) input.collapsed = collapsed;
  const expanded = Array.from(opts.expanded || []);
  if (expanded.length) input.expanded = expanded;
  return { dangling: main.dangling, input };
}
