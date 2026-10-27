// =====================================================================
// The band of plateaus (wave 014, run 0080; read-only and on the pages of Timeline only since wave 015, run 0097). The state it chooses is `AppState.layers`: the plateau drawn
// (the whole editor draws it: `AppState.index` is its resolved model) and the comparison (`AppState.baseline` is the plateau compared with, the machinery of run 0039).
// The comparison is the past (the plateau it overrides), the future (the plateau that overrides it; the band lists each when there are several) or any other plateau.
// =====================================================================

/**
 * The layers of the workspace on screen: `{ current, compare, blocked }`, or null while no workspace is open.
 * `current`: the id of the plateau drawn. `compare`: null, or `{ mode, other, chosen }`: `mode` is `past` (`other` is the plateau it overrides: the base), `future`
 * (`other` is a plateau that overrides it: the target; null while the band waits for the choice) or `other` (any other plateau: the base); `chosen` says that the
 * target was picked on the band. `blocked`: null, or why only `baseline` is drawn (a mistake in the tree, a reference declared twice).
 */
function createLayers(current, compare) {
  return { current: current || BASELINE_PLATEAU, compare: compare || null, blocked: null };
}

/** Why the plateaus other than baseline are not drawn, or null: the tree has a mistake, or a reference is declared twice (the command line refuses the workspace). */
function layersBlockedReason() {
  const tree = AppState.plateauTree;
  if (!tree || !tree.layered) return null;
  if (tree.problems.length) return tree.problems.length === 1 ? 'The plateaus have a mistake (see the note in Elements or Files), so only baseline is drawn.' : 'The plateaus have ' + tree.problems.length + ' mistakes (see the note in Elements or Files), so only baseline is drawn.';
  if ((tree.redeclared || []).length) return 'A reference is declared again in a plateau that overrides the one that declares it (see the note in Elements or Files), so only baseline is drawn.';
  if (elementDuplicates().length) return 'A reference is declared twice (see the note in Elements or Files), so only baseline is drawn.';
  return null;
}

/** The ancestors of a plateau, nearest first. */
function layerAncestorsOf(id) {
  const out = [];
  const nodes = AppState.plateauTree.nodes;
  for (let at = nodes.get(id); at && at.parent !== null; at = nodes.get(at.parent)) out.push(at.parent);
  return out;
}

/** The plateaus that override a plateau directly, in the order of the band. */
function layerChildrenOf(id) {
  return Array.from(AppState.plateauTree.nodes.values()).filter((n) => n.parent === id).sort(compareBandSiblings).map((n) => n.id);
}

/** Whether a plateau is below another in the tree (it overrides it, directly or not). */
function layerIsBelow(id, ancestor) {
  return layerAncestorsOf(id).includes(ancestor);
}

/**
 * The comparison after the plateau drawn changed (or the tree did): `past` follows the plateau it overrides, `future` follows the one that overrides it (waiting for the
 * choice when there are several, keeping a target picked on the band while it is still below), `other` stays while it is another plateau. Nothing when nothing is left to compare.
 */
function normalizedLayerCompare(layers) {
  const c = layers.compare;
  if (!c) return null;
  const tree = AppState.plateauTree;
  if (c.mode === 'past') {
    const node = tree.nodes.get(layers.current);
    return node && node.parent !== null ? { mode: 'past', other: node.parent, chosen: false } : null;
  }
  if (c.mode === 'future') {
    if (c.chosen && c.other && tree.nodes.has(c.other) && layerIsBelow(c.other, layers.current)) return c;
    const children = layerChildrenOf(layers.current);
    if (!children.length) return null;
    return { mode: 'future', other: children.length === 1 ? children[0] : null, chosen: false };
  }
  if (!c.other || c.other === layers.current || !tree.nodes.has(c.other)) return null;
  // a plateau chosen on the band is read as it stands to the plateau drawn now: the future when it overrides it, the past when it is the plateau it overrides, whichever way it was reached
  if (layerIsBelow(c.other, layers.current)) return { mode: 'future', other: c.other, chosen: true };
  if (tree.nodes.get(layers.current).parent === c.other) return { mode: 'past', other: c.other, chosen: false };
  return { mode: 'other', other: c.other, chosen: true };
}

/**
 * The plateau compared with, as a plateau of the page, or null (nothing compared, or the band still waits for the choice of the future). `layers`: the band's state it is read in, the
 * editor's (`AppState.layers`) unless a scene of the story player asks for the one of a step (`drawingOfPlateaus`).
 */
function layerCompareOther(layers = AppState.layers) {
  if (!layers || !layers.compare || !layers.compare.other || layers.compare.other === layers.current || !AppState.plateauTree.nodes.has(layers.compare.other)) return null;
  return layerPlateauModel(layers.compare.other);
}

/** The comparison is with the future: the plateau drawn is the base and the other one the target. `layers` as for `layerCompareOther`. */
function layerCompareIsFuture(layers = AppState.layers) {
  return !!(layers && layers.compare && layers.compare.mode === 'future' && layerCompareOther(layers));
}

/**
 * Make `AppState` hold what the band says: the model of the plateau drawn is `AppState.index` (with its roots and its relationships), the plateau compared with is
 * `AppState.baseline`. Resolves what is not resolved yet (see `layerModelOf`); a workspace that is not layered, or whose plateaus cannot be drawn (`blocked`), keeps the
 * index of `buildIndex`, which holds the manifests of baseline.
 */
function syncLayers() {
  const layers = AppState.layers;
  if (!layers || !AppState.workspace) return;
  const tree = AppState.plateauTree;
  layers.blocked = layersBlockedReason();
  AppState.layerProblems = null;
  AppState.layerUndrawable = false;
  if (!tree || !tree.layered || layers.blocked) {
    layers.current = BASELINE_PLATEAU;
    layers.compare = null;
    AppState.baseline = null;
    modelsChanged();
    return;
  }
  if (!tree.nodes.has(layers.current)) layers.current = BASELINE_PLATEAU;
  layers.compare = normalizedLayerCompare(layers);
  const settings = AppState.workspace.settings;
  const model = layerModelOf(layers.current, settings);
  const other = layerCompareOther();
  const otherModel = other ? layerModelOf(other.id, settings) : null;
  AppState.index = model.index;
  AppState.baseline = other ? { plateau: other, index: otherModel.index, problem: otherModel.problems ? otherModel.problems.join('\n') : null, undrawable: otherModel.undrawable } : null;
  modelsChanged();
  AppState.workspace.application.elements = model.roots.application;
  AppState.workspace.technology.elements = model.roots.technology;
  AppState.relationshipStats = model.stats;
  AppState.layerProblems = model.problems;
  AppState.layerUndrawable = model.undrawable;
}

/**
 * Draw the plateau of a node of the band. The folder is not read again and nothing is lost: the manifests stay what they are, the model drawn is another resolution of them.
 * `options.compare` (wave 015, run 0096, W-8, #91) is the comparison an address names, as `layerCompareChoice` writes it (`past`, `future:<id>`, `other:<id>`, empty for none):
 * it is set with the plateau, in one drawing. `options.fromAddress` says the change comes from the address (typed, or Back): the address already says it, so no entry
 * is added to the history and the page is not drawn here, the caller does it (`syncPerspectiveFromHash`). Returns whether anything changed.
 */
function drawPlateau(id, options) {
  const layers = AppState.layers;
  const compare = options && typeof options.compare === 'string' ? options.compare : null;
  if (!layers || !AppState.workspace || !AppState.plateauTree || !AppState.plateauTree.nodes.has(id) || layers.blocked) return false;
  const before = layers.current + '|' + layerCompareChoice();
  layers.current = id;
  if (compare !== null) layers.compare = layerCompareFromChoice(compare);
  layers.compare = normalizedLayerCompare(layers);
  if (layers.current + '|' + layerCompareChoice() === before) return false;
  rememberLayerChoice();
  if (options && options.fromAddress) settleAfterLayerChange(false);
  else settleAfterLayerChange();
  return true;
}

/**
 * Wave 015 (run 0096, W-8, #91): an address typed while the editor is open (or reached by Back and Forward) draws the plateau and the comparison it names, as the band
 * does, through `drawPlateau`: nothing is read from the disk and nothing is lost. The address is the whole say of the plateau: one that names none is the root (that is
 * what the page writes for it, so Back to such an address draws it), one that names a plateau that does not exist leaves the plateau drawn (the page writes its own
 * address back). `compare=` is read when the address has it (the page writes it with a removed element; a typed or kept link may carry it): empty is no comparison.
 * A write in flight, or a dialog that is open (a form of a plateau, the question of a write that other plateaus inherit), keeps the plateau it was opened in: the address is
 * not followed and the page writes back the address of what is drawn. Returns whether anything was drawn again.
 */
function drawLayersNamedByAddress() {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  if (!layers || !AppState.workspace || !tree || !tree.layered || layers.blocked || saveInFlight || appDialog) return false;
  const named = plateauFromHash();
  const id = named === null ? BASELINE_PLATEAU : named;
  if (!tree.nodes.has(id)) return false;
  const compare = compareFromHash();
  return drawPlateau(id, { compare: compare === null ? undefined : compare, fromAddress: true });
}

/** Whether the next address the page writes is a new entry of the history: a plateau or a comparison the author chose is, a rewrite of what the address means is not. */
let layerChangeIsAnEntry = false;

/**
 * After another plateau is drawn or another comparison is chosen: the page is drawn again from the new models, and what it held that is not in them is let go.
 * `draw` false: the caller draws (an address; see `drawPlateau`). Otherwise the change is a step of the author: the address it makes is an entry of the history, so that Back returns to the plateau before.
 */
function settleAfterLayerChange(draw = true) {
  layerChangeIsAnEntry = draw;
  syncLayers();
  const selection = AppState.selection;
  if (selection.kind === 'element') {
    if (selection.mode === 'edit') selection.mode = 'view';
    const layer = selection.layer || layerOfReference(selection.key, selection.layer);
    if (!layer || !AppState.index[layer] || !AppState.index[layer].has(selection.key)) AppState.selection = { kind: 'none', key: null, mode: 'view' };
  } else if (selection.kind === 'link' || selection.kind === 'create') {
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
  }
  pendingDeleteConfirmation = null;
  removedPick = null;
  changesTabPick = null;
  candidateMessage = null;
  mapSelectionCheck = true;
  diagramCache = null;
  if (draw) {
    try {
      render();
    } finally {
      layerChangeIsAnEntry = false; // a render that showed no shell (or failed) did not write the address: the next one is not this change
    }
  }
}

/** The Past toggle: compare the plateau drawn with the plateau it overrides, or stop. Nothing for `baseline`, which overrides nothing. */
function toggleCompareWithPast() {
  const layers = AppState.layers;
  if (!layers || layers.blocked || !AppState.plateauTree.nodes.has(layers.current)) return;
  if (layers.compare && layers.compare.mode === 'past') layers.compare = null;
  else if (AppState.plateauTree.nodes.get(layers.current).parent !== null) layers.compare = { mode: 'past', other: AppState.plateauTree.nodes.get(layers.current).parent, chosen: false };
  else return;
  rememberLayerChoice();
  settleAfterLayerChange();
}

/**
 * The Future toggle: compare the plateau drawn with the plateau that overrides it, or stop. With several plateaus on top of it the choice is made on the band
 * (`compareWithPlateau` on one of them); until then the band says so and nothing is compared.
 */
function toggleCompareWithFuture() {
  const layers = AppState.layers;
  if (!layers || layers.blocked) return;
  if (layers.compare && layers.compare.mode === 'future') layers.compare = null;
  else if (layerChildrenOf(layers.current).length) layers.compare = { mode: 'future', other: null, chosen: false };
  else return;
  layers.compare = normalizedLayerCompare(layers);
  rememberLayerChoice();
  settleAfterLayerChange();
}

/**
 * Compare the plateau drawn with any other plateau of the band. One that the drawn plateau overrides is the past, one that overrides it is the future (the target,
 * picked on the band), any other (a sibling, a cousin) is the base the drawn plateau is compared with, as `archicode diff --plateau <drawn> --against <id>`.
 * The same node again stops the comparison.
 */
function compareWithPlateau(id) {
  const layers = AppState.layers;
  if (!layers || layers.blocked || !AppState.plateauTree.nodes.has(id)) return;
  const node = AppState.plateauTree.nodes.get(layers.current);
  if (id === layers.current || (layers.compare && layers.compare.other === id)) {
    layers.compare = null;
  } else if (layerIsBelow(id, layers.current)) {
    layers.compare = { mode: 'future', other: id, chosen: true };
  } else if (id === node.parent) {
    layers.compare = { mode: 'past', other: id, chosen: false };
  } else {
    layers.compare = { mode: 'other', other: id, chosen: true };
  }
  rememberLayerChoice();
  settleAfterLayerChange();
}

/** What is remembered for this folder in this browser: the plateau drawn, and the comparison as `past`, `future`, `future:<id>`, `other:<id>` or empty. */
function layerCompareChoice() {
  const c = AppState.layers && AppState.layers.compare;
  if (!c) return '';
  if (c.mode === 'past') return 'past';
  return c.mode + (c.chosen && c.other ? ':' + c.other : '');
}

function rememberLayerChoice() {
  if (!AppState.layers) return;
  rememberPlateauId(AppState.layers.current);
  rememberComparison(layerCompareChoice());
}

/** A remembered or addressed comparison as `{ mode, other, chosen }`, or null when it says nothing the tree can honour. */
function layerCompareFromChoice(choice) {
  if (typeof choice !== 'string' || choice === '') return null;
  const [mode, other] = [choice.split(':')[0], choice.includes(':') ? choice.slice(choice.indexOf(':') + 1) : null];
  if (mode === 'past') return { mode: 'past', other: null, chosen: false };
  if (mode === 'future') return { mode: 'future', other, chosen: !!other };
  if (mode === 'other' && other) return { mode: 'other', other, chosen: true };
  return null;
}

/** `settings.current` when it names no plateau of the layers: the sentence of the command line (`WorkspaceFactory.chosen`, `noPlateausProblems`), else null. */
function layersOfSettingsCurrentProblem(current, tree) {
  if (!tree.layered) return '`settings.current` is `' + current + '` but the workspace declares no plateau' + NO_PLATEAU;
  if (tree.problems.length || tree.nodes.has(current)) return null;
  return '`settings.current` names the plateau `' + current + '`, which is not a plateau of this workspace (the plateaus are ' + tree.ids.map((id) => '`' + id + '`').join(', ') + ')';
}

/** The plateau the address names (`plateau=`), or null. */
function plateauFromHash() {
  const queryIdx = location.hash.indexOf('?');
  if (queryIdx === -1) return null;
  return new URLSearchParams(location.hash.slice(queryIdx + 1)).get('plateau');
}

/**
 * The band: the plateau drawn is the one the address names, else the one this browser last drew in this folder, else
 * `settings.current`, else `baseline` (the command line asks for a name when the plateaus fork; the editor starts from the root, where it can edit); the comparison is the
 * one of the address, else the one this browser last chose. The kernel is loaded first when there are layers to resolve, since the patches are applied by it.
 */
async function openLayers(settings, tree) {
  const known = (id) => !!id && tree.layered && !tree.problems.length && tree.nodes.has(id);
  const current = [plateauFromHash(), recalledPlateauId(), settings.current === '' ? null : settings.current].find(known) || BASELINE_PLATEAU;
  const fromAddress = compareFromHash();
  AppState.layers = createLayers(current, layerCompareFromChoice(fromAddress !== null ? fromAddress : recalledComparison()));
  if (tree.layered && !layersBlockedReason()) {
    try {
      await loadViewpointKernel();
    } catch (e) {
      console.error('ArchiCode: the viewpoint kernel could not be loaded, the patches of the plateaus are not applied', e);
    }
  }
  syncLayers();
  if (fromAddress !== null && AppState.layers.compare) rememberLayerChoice(); // an address that names a comparison the plateaus can honour is a choice made (run 0040): it wins over what this browser had, and is kept like it
}

// ---- What each node says: the changes it brings over the plateau it overrides ----

/** The counts of a plateau compared with its parent (`{ elements: { new, changed, removed }, relationships }`), or null for the root, a plateau that cannot be drawn, or before the kernel is loaded. Kept with the models. */
function layerNodeCounts(id) {
  const settings = AppState.workspace.settings;
  const node = AppState.plateauTree.nodes.get(id);
  if (!node || node.parent === null || !loadedKernel) return null;
  const cache = ensureLayerCache(settings);
  if (!cache.counts) cache.counts = new Map();
  if (cache.counts.has(id)) return cache.counts.get(id);
  const target = layerModelOf(id, settings);
  const base = layerModelOf(node.parent, settings);
  let counts = null;
  if (!target.problems && !base.problems) {
    const answer = loadedKernel.compare(comparisonInputBetween(base.index, target.index, true)); // a plateau and the one it overrides: a chain
    if (!answer.error) counts = answer.counts;
  }
  cache.counts.set(id, counts);
  return counts;
}

/** The counts of a plateau if they were computed (null: they cannot be, undefined: not yet), without computing them. */
function cachedNodeCounts(id) {
  const cache = AppState.workspace ? ensureLayerCache(AppState.workspace.settings) : null;
  return cache && cache.counts && cache.counts.has(id) ? cache.counts.get(id) : undefined;
}

/** Compute the counts of the plateaus that have none yet, one per turn of the event loop, and write them in the page Plateaus as they come (a big tree does not hold the first drawing). Only while that page is on screen (wave 015, run 0097: the band no longer says them). */
let bandCountsTimer = null;
function schedulePlateauCounts() {
  if (bandCountsTimer !== null || currentPerspective !== 'plateaus' || !AppState.layers || !loadedKernel || !AppState.plateauTree || !AppState.plateauTree.layered || AppState.layers.blocked) return;
  const settings = AppState.workspace.settings;
  const missing = () => {
    const cache = ensureLayerCache(settings);
    return AppState.plateauTree.ids.filter((id) => AppState.plateauTree.nodes.get(id).parent !== null && !(cache.counts && cache.counts.has(id)));
  };
  if (!missing().length) return;
  bandCountsTimer = setTimeout(function step() {
    bandCountsTimer = null;
    if (currentPerspective !== 'plateaus' || !AppState.layers || !AppState.workspace || !AppState.plateauTree || !AppState.plateauTree.layered || AppState.layers.blocked) return;
    const next = missing()[0];
    if (next === undefined) return;
    layerNodeCounts(next);
    if (typeof document !== 'undefined' && document.querySelectorAll) {
      // the Plateaus page, when it is on screen, has the same counts in its entries
      for (const holder of Array.from(document.querySelectorAll('.timeline-item .timeline-changes'))) {
        const item = holder.closest('.timeline-item');
        const id = item ? item.getAttribute('data-plateau') : null;
        if (id && AppState.plateauTree.nodes.has(id) && AppState.plateauTree.nodes.get(id).parent !== null && cachedNodeCounts(id) !== undefined && /Counting/.test(holder.textContent)) holder.innerHTML = timelineChangesHtml(id);
      }
    }
    if (missing().length) bandCountsTimer = setTimeout(step, 0);
  }, 0);
}

// ---- The band ----
//
// Wave 015 (run 0097, W-9, #98): the band chooses the plateau drawn and the plateau compared with, on the pages of the perspective Timeline, and does nothing else.
// Two lists, one row: "Plateau" (every plateau of the tree, indented by its depth) and "Compare with" (nothing, the past that follows the plateau drawn, then the same tree, the plateau drawn greyed in it; wave 016, run 0109), then, only when
// there is one, a button that opens the mistakes of the plateaus. What the tree of buttons held moved to where it belongs: the tree and the counts of each plateau are on the
// page Plateaus, the sentence that said what is compared is the Changes panel's (and the list says it), Everything / Changes only is among the tools of the diagram, and the
// mistakes are behind the button. The state is `AppState.layers`, not the band's: the band is not drawn on Stories, Files and Settings, and nothing is reset there.

/** The band is on screen: a workspace is open, it has layers, and the page is one of the perspective Timeline. */
function bandIsShown() {
  return !!(AppState.workspace && !AppState.fatalError && AppState.layers && AppState.plateauTree && PERSPECTIVES[currentPerspective].group === 'timeline');
}

/** The sentences of the first layer of the chain of a plateau that the command line refuses, or null (resolves the plateau if it was not: a click on its node would). */
function layerModelBroken(id) {
  if (!AppState.layers || AppState.layers.blocked || !AppState.plateauTree.layered) return null; // a workspace with no layer has the one plateau, drawn from its manifests
  return layerModelOf(id, AppState.workspace.settings).problems;
}

/** The text of a plateau in a list of the band: its name (else its id) and its horizon, a `!` before it when the command line refuses it. */
function bandPlateauLabel(id) {
  const node = AppState.plateauTree.nodes.get(id);
  return (layerModelBroken(id) ? '! ' : '') + plateauTitle(layerPlateauModel(id)) + (node && node.horizon ? ' · ' + node.horizon : '');
}

/** One step of indentation in the lists of the band: an em space (U+2003), which an `<option>` keeps (only ASCII white space at the start of an option's text is collapsed). */
const BAND_INDENT = '\u2003';

function bandOptionHtml(value, label, selected, extra) {
  return '<option value="' + escapeHtml(value) + '"' + (selected ? ' selected' : '') + (extra || '') + '>' + escapeHtml(label) + '</option>';
}

/** The list "Plateau": every plateau in the order of the tree, each indented by its depth; the one drawn is selected. */
function bandPlateauSelectHtml(root, disabled) {
  const layers = AppState.layers;
  const options = [];
  const walk = (item, depth) => {
    options.push(bandOptionHtml(item.id, BAND_INDENT.repeat(Math.min(depth, 6)) + bandPlateauLabel(item.id), item.id === layers.current));
    item.children.forEach((child) => walk(child, depth + 1));
  };
  walk(root, 0);
  const node = AppState.plateauTree.nodes.get(layers.current);
  return '<label class="band-field"><span class="plateau-label" id="band-plateau-label">Plateau</span>' +
    '<select id="band-plateau" data-band-select="plateau" aria-labelledby="band-plateau-label"' + (disabled ? ' disabled' : '') + ' title="The plateau drawn in the whole editor' + (node && node.parent !== null ? ' (it overrides ' + escapeHtml(node.parent) + ')' : '') + '">' + options.join('') + '</select></label>';
}

/**
 * The list "Compare with" (wave 016, run 0109, W-3, #72): nothing; the past, which follows the plateau drawn (the plateau it overrides, whichever that is); then the tree of the
 * plateaus, the same as the list "Plateau" (every plateau in the order of the tree, indented by its depth, the same labels), where the plateau drawn is greyed (disabled) in its
 * place, so that the hierarchy can be read in both lists. A plateau of the tree is a fixed comparison, as `archicode diff --plateau <drawn> --against <id>`. A future the address
 * asked for with several plateaus on top of the drawn one is told as a choice still to make (a first entry, disabled and selected, with the tree under it and nothing selected in it);
 * with one plateau on top of it, the entry of that plateau is the one selected.
 */
function bandCompareSelectHtml(root, disabled) {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  const node = tree.nodes.get(layers.current);
  const parent = node && node.parent !== null ? node.parent : null;
  const listing = !layers.blocked; // a write in flight disables the list, it does not change what it says; blocked plateaus have nothing to choose from
  const compare = layers.compare;
  const other = layerCompareOther();
  let selected = '';
  if (compare && !other && compare.mode === 'future') selected = 'future'; // waiting for the choice of the future
  else if (other) selected = compare.mode === 'past' && !compare.chosen ? 'past' : 'plateau:' + other.id;
  let html = bandOptionHtml('', 'Nothing', selected === '');
  if (selected === 'future') html += bandOptionHtml('future', 'Choose a future plateau', true, ' disabled');
  if (parent !== null && listing) html += bandOptionHtml('past', 'Past (follows the plateau drawn)', selected === 'past');
  if (listing) {
    const walk = (item, depth) => {
      html += bandOptionHtml('plateau:' + item.id, BAND_INDENT.repeat(Math.min(depth, 6)) + bandPlateauLabel(item.id), selected === 'plateau:' + item.id, item.id === layers.current ? ' disabled' : '');
      item.children.forEach((child) => walk(child, depth + 1));
    };
    walk(root, 0);
  }
  return '<label class="band-field"><span class="plateau-label" id="band-compare-label">Compare with</span>' +
    '<select id="band-compare" data-band-select="compare" aria-labelledby="band-compare-label"' + (disabled ? ' disabled' : '') + ' title="What the plateau drawn is compared with: the Changes panel lists what differs. The plateau drawn is greyed in the tree.">' + html + '</select></label>';
}

/**
 * The mistakes of the plateaus the page knows of, as sections `{ heading, lines }` (the heading may be null): why only baseline is drawn, the sentences of the first layer of the
 * chain of the plateau drawn that the command line refuses, and the same for the plateau it is compared with. `note` is the one thing said without being counted: why nothing is written.
 */
function bandMistakes() {
  const layers = AppState.layers;
  const sections = [];
  if (layers.blocked) sections.push({ heading: 'Only baseline is drawn:', lines: [layers.blocked] });
  if (AppState.layerProblems) {
    const name = plateauTitle(layerPlateauModel(layers.current));
    sections.push({ heading: AppState.layerUndrawable ? name + ' cannot be drawn.' : name + ' is drawn, and the command line refuses it:', lines: AppState.layerProblems });
  }
  if (AppState.baseline && AppState.baseline.problem) {
    const name = plateauTitle(AppState.baseline.plateau);
    sections.push({ heading: AppState.baseline.undrawable ? name + ', which the drawing is compared with, cannot be drawn.' : name + ', which the drawing is compared with, is refused by the command line:', lines: AppState.baseline.problem.split('\n') });
  }
  // not a mistake of a plateau: a view or a story names an element that no plateau has (wave 015, run 0100); told whatever plateau is drawn
  // the steps of a story that name a plateau that is none are told apart from the names (run 0101): a workspace with no plateau has them too
  const entries = entryProblemsOf(AppState.workspace.settings);
  const names = entries.filter((line) => line.endsWith(', which exists in no plateau'));
  const steps = entries.filter((line) => !names.includes(line));
  if (names.length) sections.push({ heading: 'The views and the stories name elements that no plateau has:', lines: names });
  if (steps.length) sections.push({ heading: 'The steps of the stories name plateaus that are none:', lines: steps });
  return { sections, count: sections.reduce((n, section) => n + section.lines.length, 0), note: readOnlyPlateauMessage() };
}

/** The body of the dialog of the mistakes (the band's button opens it): the sections of `bandMistakes`, read from the state each time the page is drawn. */
function renderMistakesDialogBodyHtml() {
  const mistakes = AppState.layers ? bandMistakes() : { sections: [], count: 0, note: null };
  if (!mistakes.count) return '<p>No mistake in the plateaus.</p>';
  return mistakes.sections.map((section) => '<section class="band-errors">' + (section.heading ? '<strong>' + escapeHtml(section.heading) + '</strong>' : '') +
    '<ul>' + section.lines.map((line) => '<li>' + duplicateMessageHtml(line) + '</li>').join('') + '</ul></section>').join('') +
    (mistakes.note ? '<p class="band-readonly">' + duplicateMessageHtml(mistakes.note) + '</p>' : '');
}

/** The band: the plateau drawn and what it is compared with, and, when there are some, the button of the mistakes. Nothing while no workspace is open. */
function renderPlateauBandHtml() {
  const layers = AppState.layers;
  if (!layers || !AppState.workspace || !AppState.plateauTree) return '';
  const tree = AppState.plateauTree;
  const root = bandTreeOf(tree) || { id: BASELINE_PLATEAU, node: { id: BASELINE_PLATEAU, name: null, horizon: null, parent: null }, children: [] };
  const disabled = !!layers.blocked || saveInFlight;
  const mistakes = bandMistakes();
  return '<nav class="plateau-band col-span-3" id="plateau-band" aria-label="Plateaus">' +
    bandPlateauSelectHtml(root, disabled) + bandCompareSelectHtml(root, disabled) +
    (mistakes.count ? '<button type="button" class="band-mistakes" data-action="open-mistakes" title="' + escapeHtml(mistakes.sections[0].lines[0]) + '">' +
      '<span class="band-flag" aria-hidden="true">!</span> ' + mistakes.count + (mistakes.count === 1 ? ' mistake' : ' mistakes') + '</button>' : '') +
    '</nav>';
}

/**
 * The controls of the plateaus (wave 014, run 0082; the page Plateaus, wave 015, run 0096, W-8, #99): "writing in: <plateau>" says the plateau drawn is the one a write goes to
 * (when the workspace has layers), the buttons make a plateau that overrides it, and rename it, give it a horizon or another parent. They are on the page Plateaus and nowhere
 * else: the band does not write.
 */
function plateauWritingHtml() {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  if (!layers || !tree || layers.blocked) return '';
  const id = layers.current;
  const title = plateauTitle(layerPlateauModel(id));
  const writing = writingPlateau();
  const busy = saveInFlight ? ' disabled' : '';
  return '<span class="band-writing">' +
    (writing !== null ? '<span class="band-writing-label" role="status">writing in: <strong>' + escapeHtml(title) + '</strong>' + (title !== id ? ' <code>' + escapeHtml(id) + '</code>' : '') + '</span>' : '') +
    '<button type="button" data-action="plateau-create" data-plateau="' + escapeHtml(id) + '"' + busy + ' title="Create a plateau that overrides ' + escapeHtml(title) + '">New plateau</button>' +
    (tree.layered ? '<button type="button" data-action="plateau-edit" data-plateau="' + escapeHtml(id) + '"' + busy + ' title="Rename ' + escapeHtml(title) + ', give it a horizon or another parent">Edit plateau</button>' : '') +
    (tree.layered && id !== BASELINE_PLATEAU ? plateauDeleteButtonHtml(id, 'Delete plateau', busy) : '') +
    '</span>';
}

/** The button that opens the dialog of the delete (run 0102): offered for every plateau but the root; for one that others override (run 0132, #112) the dialog also says what they lose. */
function plateauDeleteButtonHtml(id, label, busy) {
  const children = layerChildrenOf(id);
  const title = 'Delete ' + plateauTitle(layerPlateauModel(id)) + ' and its files, after a list of what goes' +
    (children.length ? ' and of what ' + (children.length === 1 ? children[0] + ', which overrides it, loses' : children.join(', ') + ', which override it, lose') + ' (' + (children.length === 1 ? 'it goes' : 'they go') + ' under ' + AppState.plateauTree.nodes.get(id).parent + ')' : '');
  return '<button type="button" class="btn-danger" data-action="plateau-delete" data-plateau="' + escapeHtml(id) + '"' + busy + ' title="' + escapeHtml(title) + '">' + escapeHtml(label) + '</button>';
}

/**
 * What a change of one of the two lists of the band does: draw the plateau, or compare. The lists are the band's way to say it, the functions are the ones the page, the address
 * and the tests use (`drawPlateau`, `toggleCompareWithPast`, `toggleCompareWithFuture`, `compareWithPlateau`). A refusal (a form that was typed in and not kept, a write in flight,
 * a plateau that cannot be drawn) puts the list back as it was.
 */
function chooseOnBand(select) {
  const layers = AppState.layers;
  const value = select.value;
  const kind = select.getAttribute('data-band-select');
  if (!layers || !AppState.plateauTree || layers.blocked || saveInFlight || (draftTyped && !confirmDiscardingDraft())) {
    restoreBandLists();
    return;
  }
  const compare = layers.compare;
  let changed = true;
  if (kind === 'plateau') changed = drawPlateau(value);
  else if (value === '') {
    if (compare) {
      layers.compare = null;
      rememberLayerChoice();
      settleAfterLayerChange();
    }
  } else if (value === 'past') {
    if (!compare || compare.mode !== 'past') toggleCompareWithPast();
  } else if (value === 'future') { // not an entry a person can choose since run 0109 (the one entry of that value is disabled); kept for a script and for the tests
    if (!compare || compare.mode !== 'future') toggleCompareWithFuture();
  } else if (value.indexOf('plateau:') === 0) {
    const id = value.slice('plateau:'.length);
    // a list chooses, it does not toggle: the plateau the drawing is compared with already (the past that follows the plateau drawn is one) is not pressed twice
    if (id === layers.current || (compare && compare.other === id)) changed = false;
    else compareWithPlateau(id);
  }
  if (!changed) restoreBandLists();
}

/** Puts the two lists of the band back on what the state says, without drawing the page again: what was typed in a form of the page stays where it is. */
function restoreBandLists() {
  const band = typeof document !== 'undefined' ? document.getElementById('plateau-band') : null;
  if (!band || !AppState.layers) return;
  const holder = document.createElement('template');
  holder.innerHTML = renderPlateauBandHtml();
  if (holder.content && holder.content.firstElementChild) band.replaceWith(holder.content.firstElementChild);
}

/** The form of a plateau: a new one that overrides `id` (`create`), or `id` itself (`edit`). */
function openPlateauDialog(mode, id) {
  const tree = AppState.plateauTree;
  if (!AppState.layers || !tree || AppState.layers.blocked) return;
  if (mode === 'edit') {
    const node = tree.nodes.get(id);
    if (!node) return;
    openAppDialog({ kind: 'plateau-form', mode, plateau: id, values: { id, name: node.name || '', horizon: node.horizon || '', parent: node.parent === null ? '' : node.parent } });
  } else {
    openAppDialog({ kind: 'plateau-form', mode: 'create', plateau: null, values: { id: '', name: '', horizon: '', parent: tree.nodes.has(id) ? id : BASELINE_PLATEAU } });
  }
}

// ---- Writing in a layer (wave 014, run 0082, W-8) ----
//
// A write goes to the plateau drawn ("writing in: <plateau>" on the page Plateaus), in the file of that plateau and nowhere else:
//   - a new element is a manifest whose header says `plateau: <the plateau>` (none for baseline, the default); a new view or story belongs to no plateau and says none (run 0100);
//   - a field of an element the plateau declares is edited in the manifest that declares it, as before;
//   - a field of an element the plateau inherits is a patch of the plateau (`SET`, `ADD` or `MERGE`, see `patchFor`), found again by (target, field) so that a second
//     edit of the same field changes that patch and does not add another;
//   - an element the plateau inherits is removed by a `REMOVE` patch (the cascade is the kernel's);
//   - a plateau is created, renamed, given a horizon or another parent in its manifest of kind `archicode.morin.io/plateau`.
// Every one of these runs under `guardedLayerWrite`: the plateaus are resolved again, and the write is kept only if the plateau written gives back the value that was edited,
// no plateau that resolved before is refused now, and, when other plateaus inherit what was written, the author said yes (a plateau with descendants asks first and lists them).
// A workspace that is not layered (`writingPlateau()` is null) does not go through any of it and saves exactly as before.

/** The plateau a write goes to: the plateau drawn, when the workspace is layered and its plateaus are drawn. Null otherwise (the old rules apply and nothing here runs). */
function writingPlateau() {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  if (!layers || !tree || !tree.layered || layers.blocked || !tree.nodes.has(layers.current)) return null;
  return layers.current;
}

/** Why nothing is written while this plateau is drawn, or null: the kernel refused its patches, so there is no graph to edit. */
function readOnlyPlateauMessage() {
  const plateau = writingPlateau();
  if (plateau === null || !AppState.layerUndrawable) return null;
  return 'The plateau `' + plateau + '` cannot be drawn, so nothing is written in it: repair its patches in Files first.';
}

/** Why a click that writes an element is not done, or null: the plateau cannot be drawn. A view and a story belong to no plateau, so nothing here concerns them. */
function layerActionRefusal() {
  return readOnlyPlateauMessage();
}

/** Throws the sentence of `readOnlyPlateauMessage` when the plateau drawn cannot be written. Every writer of an element starts with it. */
function requireWritablePlateau() {
  const message = readOnlyPlateauMessage();
  if (message) throw new Error(message);
}

/**
 * Whether a write in the plateau drawn may rewrite this file: it belongs to the plateau drawn or to one that stands on it (a rename, a delete, a move reach what points
 * at the element, and only those files can). A plateau beside it may declare an element with the same reference, which is another element. True for a workspace that is
 * not layered and for baseline (every plateau stands on it).
 */
function writeScopeHas(mf) {
  const plateau = writingPlateau();
  if (plateau === null || plateau === BASELINE_PLATEAU) return true;
  if (!mf || !mf.header) return false;
  const owner = manifestKindName(mf.header.kind) === 'plateau' && mf.content ? String(mf.content.id) : plateauOfManifest(mf);
  return owner === plateau || layerIsBelow(owner, plateau);
}

/** A sentence on one line (the kernel's and the tree's sentences may be told with a line break). */
function oneLine(text) {
  return String(text).replace(/\s*\n\s*/g, ' ').trim();
}

/** The same JSON whatever the order of the keys of an object: what two values must share to be called equal. */
function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  return JSON.stringify(value === undefined ? null : value);
}

function sameJson(a, b) {
  return canonicalJson(a) === canonicalJson(b);
}

function copyJson(value) {
  return value === undefined ? undefined : clonePlain(value);
}

/** The state a write may change, kept so that a write that is refused puts everything back (the manifests as they were, the lists of files, the marks of what is modified). */
function snapshotWriteState() {
  const workspace = AppState.workspace;
  return {
    files: AppState.manifestFiles.map((mf) => ({ mf, props: Object.assign({}, mf, { header: copyJson(mf.header), content: copyJson(mf.content) }) })),
    pendingFileRemovals: AppState.pendingFileRemovals.slice(),
    removedFileBaselines: new Map(AppState.removedFileBaselines),
    dirtyReferences: new Set(AppState.dirtyReferences),
    expanded: new Set(AppState.expanded),
    selection: Object.assign({}, AppState.selection),
    topLevel: workspace ? copyJson(workspace.topLevel) : undefined,
    settingsCurrent: workspace ? workspace.settings.current : undefined, // the delete of a plateau takes out a `settings.current` that names it (run 0102)
    layers: AppState.layers ? { current: AppState.layers.current, compare: copyJson(AppState.layers.compare) } : null, // and draws another plateau when it was the one drawn
    settingsDirty: workspace ? workspace.settingsDirty : undefined,
    settingsRevision: workspace ? workspace.settingsRevision : undefined,
    saveStatus,
    pendingDeleteConfirmation,
    rawYamlEditDraft,
    mapPinned: mapPinned.slice(),
    mapHidden: mapHidden.slice(),
    mapOpened: mapOpened ? new Set(mapOpened) : mapOpened,
    technologyMapState: { pinned: technologyMapState.pinned.slice(), hidden: technologyMapState.hidden.slice(), opened: technologyMapState.opened ? new Set(technologyMapState.opened) : technologyMapState.opened },
    navActiveKey
  };
}

function restoreWriteState(snapshot) {
  const files = [];
  for (const { mf, props } of snapshot.files) {
    for (const key of Object.keys(mf)) if (!(key in props)) delete mf[key];
    Object.assign(mf, props);
    files.push(mf);
  }
  AppState.manifestFiles = files;
  AppState.pendingFileRemovals = snapshot.pendingFileRemovals;
  AppState.removedFileBaselines = snapshot.removedFileBaselines;
  AppState.dirtyReferences = snapshot.dirtyReferences;
  AppState.expanded = snapshot.expanded;
  AppState.selection = snapshot.selection;
  const workspace = AppState.workspace;
  if (workspace) {
    workspace.topLevel = snapshot.topLevel;
    workspace.settings.current = snapshot.settingsCurrent;
    workspace.settingsDirty = snapshot.settingsDirty;
    workspace.settingsRevision = snapshot.settingsRevision;
  }
  saveStatus = snapshot.saveStatus;
  pendingDeleteConfirmation = snapshot.pendingDeleteConfirmation;
  rawYamlEditDraft = snapshot.rawYamlEditDraft;
  mapPinned = snapshot.mapPinned;
  mapHidden = snapshot.mapHidden;
  mapOpened = snapshot.mapOpened;
  technologyMapState = snapshot.technologyMapState;
  navActiveKey = snapshot.navActiveKey;
  if (snapshot.layers && AppState.layers) {
    AppState.layers.current = snapshot.layers.current;
    AppState.layers.compare = snapshot.layers.compare;
  }
}

/**
 * What a write is judged on: for every plateau of the tree, whether it resolves (`fatal`: the kernel refused a patch), what its resolved graph is (as a text, to tell
 * whether a write changed it) and the sentences the command line refuses it with; and the mistakes of the tree itself.
 */
function layerDigest() {
  const tree = AppState.plateauTree;
  const settings = AppState.workspace.settings;
  const digest = {
    // what a view or a story names is looked at too (run 0100): a delete that leaves a view naming an element that no plateau has now is refused, as it was when the view belonged to a plateau
    sentences: tree.problems.map(String).concat((tree.redeclared || []).map(String), elementDuplicates().map((d) => 'the reference `' + d.reference + '` is declared twice (' + d.sources.join(', ') + ')'), entryProblemsOf(settings)),
    byPlateau: new Map()
  };
  if (tree.problems.length || layersBlockedReason()) return digest;
  for (const id of tree.ids) {
    const result = layerStateOf(id, settings);
    if (result.fatal) digest.byPlateau.set(id, { fatal: oneLine(result.fatal[0]), graph: null, sentences: result.earlier ? result.earlier.sentences : [] });
    else digest.byPlateau.set(id, { fatal: null, graph: JSON.stringify(result.state.graph), sentences: result.state.problems ? result.state.problems.sentences : [] });
  }
  return digest;
}

/**
 * A sentence of a check as two states of the workspace are compared on it: the list of the plateaus some sentences end with is left out, and a step that names no plateau
 * is the same mistake whether the workspace has other plateaus or none. A step that was wrong before a plateau is created or deleted is not a new mistake (run 0102).
 */
function comparableSentence(sentence) {
  const text = String(sentence);
  const step = text.match(/^(the story .* step \d+ says `(?:at|against): [^`]*`)(?:, which is not a plateau of this workspace| but the workspace declares no plateau)/);
  if (step) return step[1] + ': not a plateau';
  return text.replace(/ \(the plateaus are [^)]*\)$/, '');
}

/** `{ broken, changed }`: the first sentence of what a write broke (a plateau that resolved no longer does, or the command line refuses it for a new reason), and the plateaus other than `written` whose graph it changed. */
function judgeLayerWrite(before, after, written) {
  const fresh = (now, then) => { const known = then.map(comparableSentence); return now.find((sentence) => !known.includes(comparableSentence(sentence))) || null; };
  const mistake = fresh(after.sentences, before.sentences);
  if (mistake) return { broken: oneLine(mistake), changed: [] };
  const changed = [];
  for (const [id, now] of after.byPlateau) {
    const then = before.byPlateau.get(id);
    if (now.fatal && (!then || !then.fatal)) return { broken: 'the plateau `' + id + '` could no longer be resolved (' + now.fatal + ')', changed: [] };
    const sentence = fresh(now.sentences, then ? then.sentences : []);
    if (sentence) return { broken: oneLine(sentence), changed: [] };
    if (then && id !== written && now.graph !== then.graph) changed.push(id);
  }
  return { broken: null, changed };
}

/**
 * Runs `spec.write()` (which edits the manifests and ends in `rebuildIndexAndRender`) under the rules of writing in a layer, and keeps it only if all of them hold:
 *   - `spec.verify(result)`, if given, throws when the resolution does not give back what was edited;
 *   - no plateau that resolved before is refused now, and no new mistake appears in the tree or in a plateau;
 *   - the plateaus other than `spec.plateau` whose graph changed are told to the author, who has to say yes (`spec.confirmed`); until then nothing is kept.
 * A write that is not kept puts everything back (`snapshotWriteState`) and the page is drawn again. A refusal is an `Error` with one sentence. Pending confirmation:
 * the dialog of `spec.again` is opened and `{ pending: true, changed }` (the plateaus it changes) is returned. `spec`: { plateau, write, verify, confirmed, confirmedFor, again,
 * summary } (`confirmedFor`: the plateaus the author already said yes to, in a dialog of the write itself; a change of any other one is still asked).
 */
function guardedLayerWrite(spec) {
  if (!AppState.layers || !AppState.workspace || !AppState.plateauTree) return spec.write();
  if (AppState.plateauTree.layered && !loadedKernel) {
    throw new Error('The viewpoint kernel is not loaded yet, so the plateaus cannot be resolved and checked: nothing was written. Try again in a moment.');
  }
  const before = layerDigest();
  const snapshot = snapshotWriteState();
  const typedForm = keepElementForm(); // the write is tried, then put back with a redraw when the dialog is to be asked: the form as typed is kept before it (run 0121, #123)
  let result;
  let verdict;
  try {
    result = spec.write();
    if (spec.verify) spec.verify(result);
    verdict = judgeLayerWrite(before, layerDigest(), spec.plateau);
  } catch (e) {
    restoreWriteState(snapshot);
    rebuildIndexAndRender();
    throw e;
  }
  // `spec.confirmedFor`: the plateaus whose change the author has already been shown and said yes to (the dialog of the delete of a plateau lists what each plateau above loses)
  const confirmed = spec.confirmed || (Array.isArray(spec.confirmedFor) && verdict.changed.every((changed) => spec.confirmedFor.includes(changed)));
  if (verdict.broken || (verdict.changed.length && !confirmed)) {
    restoreWriteState(snapshot);
    rebuildIndexAndRender();
    if (verdict.broken) throw new Error('Not written: ' + verdict.broken.replace(/\.$/, '') + '. Nothing was changed.');
    openAppDialog({ kind: 'layer-confirm', plateau: spec.plateau, summary: spec.summary, changed: verdict.changed.slice(), onConfirm: spec.again, afterConfirm: spec.afterConfirm, typedForm });
    return { pending: true, changed: verdict.changed.slice() };
  }
  return result;
}

/** What the dialog "this also changes ..." does when the author says yes: the write again, confirmed. A refusal is told in the top bar, as any write's. */
function confirmLayerWrite(dialog) {
  // the form behind the dialog holds what was typed (`render()` put it back): kept before the write, so that a write the yes then fails on gives it back, as `writeElementDraft` does (wave 019, run 0138, #137)
  const typedForm = keepElementForm();
  try {
    const result = dialog.onConfirm();
    if (dialog.afterConfirm) dialog.afterConfirm(result); // what the click that asked would have done next (select what was created, unfold what was moved)
  } catch (e) {
    saveStatus = { state: 'error', failedFile: dialog.plateau, message: e && e.message ? e.message : String(e) };
    keptElementForm = typedForm; // `render()` puts it back and drops it (no dialog is open): view state, no `modelsChanged()`
    render();
  }
}

// ---- The plateau manifest and the folder of a plateau ----

/** The manifest of kind `archicode.morin.io/plateau` that declares a plateau (it holds its name, horizon, parent and patches), or null when the plateau exists through headers only, or is `baseline` with none. */
function plateauManifestFile(id) {
  const node = AppState.plateauTree && AppState.plateauTree.nodes.get(id);
  if (!node || !node.manifest) return null;
  return AppState.manifestFiles.find((mf) => mf.relPath === node.manifest) || null;
}

/**
 * The folder a new manifest of a plateau is written in: the folder of a manifest the plateau already has (one of the layer of the element, when it has one), so that the new file
 * is where the author keeps the plateau's files and in a folder the command line reads; else the first folder of `manifests.paths`.
 */
function plateauFolderFor(id, category) {
  const own = AppState.manifestFiles.filter((mf) => !mf.error && mf.header && mf.content && manifestKindName(mf.header.kind) !== 'plateau' && plateauOfManifest(mf) === id);
  const pick = (category && own.find((mf) => manifestLayer(mf) === category)) || own[0];
  if (pick) return pick.relPath.split('/').slice(0, -1).join('/');
  const dir = firstManifestsDir();
  return dir === undefined ? 'manifests' : dir;
}

/** The manifest of a plateau where its patches are written; one with only its id is made (in memory, like any new file) when the plateau has none. */
function ensurePlateauManifest(id) {
  const existing = plateauManifestFile(id);
  if (existing) return existing;
  const header = { kind: ARCHICODE_KIND_PREFIX + 'plateau', version: '1' };
  const content = { id };
  const relPath = allocateManifestRelPath(plateauFolderFor(id), 'plateau.', id);
  const mf = { relPath, header, content, error: null, rawText: serializeManifestFile(header, content), dirty: true, existedOnDisk: false, lastKnownDiskModified: null };
  adoptRemovedFile(mf);
  AppState.manifestFiles.push(mf);
  AppState.manifestFiles.sort((a, b) => compareCodePoints(a.relPath, b.relPath));
  return mf;
}

/** The manifest is rewritten from its content (the line-preserving save) and marked modified; an edit that puts the file back as it is on disk leaves it unmodified. */
function touchManifest(mf) {
  mf.rawText = reserializeManifestFile(mf);
  mf.dirty = !(mf.existedOnDisk && typeof mf.savedRawText === 'string' && mf.rawText === mf.savedRawText);
}

// ---- Patches ----

/** The element a plateau resolves to, as the JSON of its graph (a copy), or null. */
function resolvedNodeOf(plateau, category, reference) {
  const result = layerStateOf(plateau, AppState.workspace.settings);
  if (result.fatal) return null;
  const node = graphReferencesOf(result.state.graph)[category].get(reference);
  return node ? clonePlain(node) : null;
}

/** The `SET`, `ADD`, `MERGE` and `REMOVE` patches of a plateau that name an element and a field with a `target` (what `patchFor` writes), `[{ patch, rank }]`; the rank is the kernel's (from 1). */
function plateauPatchesOn(plateau, category, reference, field) {
  const out = [];
  AppState.plateauTree.nodes.get(plateau).patches.forEach((patch, i) => {
    if (!patch || typeof patch !== 'object') return;
    if (readIsMissing(patch.target) || !readIsMissing(patch['json-path']) || !readIsMissing(patch.json_path)) return;
    const layer = readIsMissing(patch.layer) ? 'application' : String(patch.layer).toLowerCase();
    if (String(patch.target) === reference && layer === category && !readIsMissing(patch.field) && String(patch.field) === field) out.push({ patch, rank: i + 1 });
  });
  return out;
}

/** The value of a field after the patches of `plateau` except `patch`: what the patch that replaces it applies on. `{ known: false }` when that cannot be resolved. */
function fieldBaseWithout(plateau, patch, category, reference, field) {
  const settings = AppState.workspace.settings;
  const node = AppState.plateauTree.nodes.get(plateau);
  const above = node.parent === null ? null : layerStateOf(node.parent, settings);
  if (above && above.fatal) return { known: false };
  const cache = ensureLayerCache(settings);
  const result = resolveLayerStep(above ? above.state : null, Object.assign({}, node, { patches: node.patches.filter((p) => p !== patch) }), { byPlateau: cache.byPlateau, kernel: loadedKernel, layered: !!cache.tree.layered });
  if (result.fatal) return { known: false };
  const found = graphReferencesOf(result.state.graph)[category].get(reference);
  return found ? { known: true, value: copyJson(found[field]) } : { known: false };
}

function isPlainJsonObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The patch that turns the value a field has (`base`) into the one it must have (`after`), or null when they are the same. The operator is the least that says it:
 *   - a list that gains items at its end: `ADD` (the item, or the list of items);
 *   - a relationship that is changed in place, found by (destination, label) among the relationships of `base`: `SET` with `where` and the fields that changed;
 *   - an object (tags) that keeps every key it had: `MERGE` of the keys that are new or changed;
 *   - a text or a number that is cleared (the field is not a list nor an object, and the plateau no longer has it): `REMOVE` of the field (wave 017, run 0126, #94; a `SET` has no way
 *     to say "absent"). An emptied list or object is still a `SET` of the empty one: an empty list or object is a value;
 *   - anything else, a list that loses or reorders items, an object that loses a key, a text, a number: `SET` of the whole value.
 * When `base` is not known the value is set whole.
 */
function patchFor(field, base, after) {
  const listy = Array.isArray(after) || (base.known && Array.isArray(base.value));
  const objecty = isPlainJsonObject(after) || (base.known && isPlainJsonObject(base.value));
  const empty = listy ? [] : objecty ? {} : undefined;
  const now = readIsMissing(after) ? empty : after;
  const was = base.known ? (readIsMissing(base.value) ? empty : base.value) : undefined;
  if (base.known && sameJson(was, now)) return null;
  if (now === undefined) return { operator: 'REMOVE' };
  if (Array.isArray(now)) {
    if (base.known && Array.isArray(was)) {
      if (now.length > was.length && was.every((item, i) => sameJson(item, now[i]))) {
        const extra = now.slice(was.length);
        return { operator: 'ADD', value: extra.length === 1 ? extra[0] : extra };
      }
      if (field === 'relationships' && now.length === was.length) {
        const differing = now.map((item, i) => i).filter((i) => !sameJson(was[i], now[i]));
        if (differing.length === 1) {
          const i = differing[0];
          const old = was[i];
          const next = now[i];
          if (isPlainJsonObject(old) && isPlainJsonObject(next) && typeof old.destination === 'string' && Object.keys(old).every((key) => key in next)) {
            const label = readIsMissing(old.label) ? '' : String(old.label);
            const same = was.filter((item) => isPlainJsonObject(item) && item.destination === old.destination && (readIsMissing(item.label) ? '' : String(item.label)) === label);
            if (same.length === 1) {
              const value = {};
              for (const key of Object.keys(next)) if (!sameJson(old[key], next[key])) value[key] = next[key];
              const where = { destination: old.destination };
              if (label !== '') where.label = label;
              return { operator: 'SET', where, value };
            }
          }
        }
      }
    }
    return { operator: 'SET', value: now };
  }
  if (isPlainJsonObject(now) && base.known && (was === undefined || isPlainJsonObject(was)) && Object.keys(was || {}).every((key) => key in now)) {
    const value = {};
    for (const key of Object.keys(now)) if (!was || !sameJson(was[key], now[key])) value[key] = now[key];
    return { operator: 'MERGE', value };
  }
  return { operator: 'SET', value: now };
}

/** A patch as a manifest holds it, the keys in the order the fixture writes them: operator, target, layer, field, where, value (a `REMOVE` of a field has no value). */
function newPatchObject(category, reference, field, wanted) {
  const patch = { operator: wanted.operator, target: reference };
  if (category === 'technology') patch.layer = 'technology';
  patch.field = field;
  if (wanted.where) patch.where = wanted.where;
  if (wanted.operator !== 'REMOVE') patch.value = wanted.value;
  return patch;
}

/** Puts `value` under `key` of `object` just before `beforeKey` (the keys already there keep their order). */
function insertKeyBefore(object, beforeKey, key, value) {
  const entries = Object.keys(object).map((k) => [k, object[k]]);
  for (const [k] of entries) delete object[k];
  let placed = false;
  for (const [k, v] of entries) {
    if (k === beforeKey) { object[key] = value; placed = true; }
    object[k] = v;
  }
  if (!placed) object[key] = value;
}

/** The patch `patch` of a manifest now says `wanted`: only the keys that differ are written, so the lines of the others stay as the author wrote them. */
function updatePatchInPlace(patch, wanted) {
  if (String(patch.operator).toUpperCase() !== wanted.operator) patch.operator = wanted.operator;
  if (wanted.where) {
    if (patch.where === undefined) insertKeyBefore(patch, 'value', 'where', wanted.where);
    else if (!sameJson(patch.where, wanted.where)) patch.where = wanted.where;
  } else if ('where' in patch) {
    delete patch.where;
  }
  if (wanted.operator === 'REMOVE') delete patch.value; // a `REMOVE` of a field takes no value
  else if (!sameJson(patch.value, wanted.value)) patch.value = wanted.value;
}

/** The items a patch adds, as a list (`value` is one item or a list of them). */
function patchItems(patch) {
  return Array.isArray(patch.value) ? patch.value : [patch.value];
}

/**
 * Whether the patch `last` can say `delta` (the patch an edit asks for, computed from the value the field has now) instead of a patch after it: a `SET` of the whole value says
 * the new value (`after`); an `ADD` gains the items, a `MERGE` the keys; a `SET` with `where` takes the fields when it finds the relationship `delta.where` finds once it has
 * run. Changes the patch and returns true, or leaves it and returns false.
 */
function absorbIntoPatch(last, delta, after) {
  const operator = String(last.operator).toUpperCase();
  if (delta.operator === 'REMOVE') { // the field is cleared: a whole-value `SET` becomes the `REMOVE`, one that already took it out says so; any other patch stays and the `REMOVE` follows it
    if (operator === 'SET' && !last.where) updatePatchInPlace(last, delta);
    return (operator === 'SET' && !last.where) || operator === 'REMOVE';
  }
  if (operator === 'SET' && !last.where) {
    last.value = readIsMissing(after) ? (Array.isArray(last.value) ? [] : {}) : after;
    return true;
  }
  if (operator === 'ADD' && delta.operator === 'ADD') {
    const items = patchItems(last).concat(patchItems(delta));
    last.value = items.length === 1 ? items[0] : items;
    return true;
  }
  if (operator === 'MERGE' && delta.operator === 'MERGE' && isPlainJsonObject(last.value)) {
    last.value = Object.assign({}, last.value, delta.value);
    return true;
  }
  if (operator === 'SET' && last.where && delta.operator === 'SET' && delta.where && isPlainJsonObject(last.value) && isPlainJsonObject(delta.value)) {
    const destination = 'destination' in last.value ? String(last.value.destination) : String(last.where.destination);
    const label = 'label' in last.value ? String(last.value.label) : (readIsMissing(last.where.label) ? '' : String(last.where.label));
    if (destination === delta.where.destination && label === (readIsMissing(delta.where.label) ? '' : String(delta.where.label))) {
      last.value = Object.assign({}, last.value, delta.value);
      return true;
    }
  }
  return false;
}

/** Whether a `SET` with `where` only says what the relationship it finds already says without that patch (relabeled and then relabeled back): it can go. */
function patchSaysNothingNew(plateau, patch, category, reference, field) {
  const base = fieldBaseWithout(plateau, patch, category, reference, field);
  if (!base.known || !Array.isArray(base.value) || !isPlainJsonObject(patch.value)) return false;
  const label = readIsMissing(patch.where.label) ? '' : String(patch.where.label);
  const found = base.value.filter((item) => isPlainJsonObject(item) && item.destination === patch.where.destination && (readIsMissing(item.label) ? '' : String(item.label)) === label);
  return found.length === 1 && Object.keys(patch.value).every((key) => sameJson(found[0][key], patch.value[key]));
}

/**
 * Writes the change of one field of an inherited element (or of one a patch of the plateau already sets) as a patch of the plateau, and returns the manifest written.
 *   - the plateau has no patch on (target, field): one is added at the end (`patchFor`, from the value the field has now);
 *   - it has one that sets the whole value (`SET`): that patch says the new value, or is taken out when the field is back to what it was before it;
 *   - it has one that adds or merges (`ADD`, `MERGE`, `SET` with `where`): that patch is changed when the edit is of its kind, taken out when the field is back to what it was
 *     before it, and otherwise a patch for the edit is added at the end (an `ADD` of a relationship stays when another relationship is relabeled). A patch is never put in the middle of the list: the comment above a patch of the author's would end up above the new one.
 */
function writePatchChange(plateau, category, reference, change) {
  const mf = ensurePlateauManifest(plateau);
  if (!Array.isArray(mf.content.patches)) mf.content.patches = [];
  const patches = mf.content.patches;
  const mine = plateauPatchesOn(plateau, category, reference, change.field);
  const now = { known: true, value: change.before };
  if (mine.length === 0) {
    const wanted = patchFor(change.field, now, change.after);
    if (wanted) patches.push(newPatchObject(category, reference, change.field, wanted));
  } else if (mine.length > 1) {
    // several patches on the field (a relationship added, another relabeled): none is rewritten; the last absorbs an edit of its kind, else the edit is a patch at the end
    const last = mine[mine.length - 1].patch;
    const delta = patchFor(change.field, now, change.after);
    if (delta && !absorbIntoPatch(last, delta, change.after)) patches.push(newPatchObject(category, reference, change.field, delta));
    else if (delta && last.where && patchSaysNothingNew(plateau, last, category, reference, change.field)) patches.splice(patches.indexOf(last), 1); // relabeled and relabeled back
  } else {
    const patch = mine[0].patch;
    const operator = String(patch.operator).toUpperCase();
    const base = fieldBaseWithout(plateau, patch, category, reference, change.field);
    const inPlace = patchFor(change.field, base, change.after);
    if (base.known && !inPlace) {
      patches.splice(patches.indexOf(patch), 1);
    } else if (inPlace && inPlace.operator === 'REMOVE') {
      updatePatchInPlace(patch, inPlace); // the field is gone: the patch that set it says so (or the one that took it out keeps saying it)
    } else if (operator === 'REMOVE' && inPlace) {
      updatePatchInPlace(patch, inPlace); // the plateau gives the field a value again: the patch that took it out says that value instead
    } else if (operator === 'SET' && !patch.where) {
      updatePatchInPlace(patch, { operator: 'SET', value: readIsMissing(change.after) ? (Array.isArray(change.before) ? [] : {}) : change.after });
    } else if (inPlace && inPlace.operator === operator && sameJson(inPlace.where, patch.where)) {
      updatePatchInPlace(patch, inPlace);
    } else {
      const delta = patchFor(change.field, now, change.after);
      if (delta) patches.push(newPatchObject(category, reference, change.field, delta));
    }
  }
  if (!patches.length) delete mf.content.patches;
  return mf;
}

/** The sentence for a field that cannot be written because of a patch the author wrote by hand (a free `json-path`, which the editor shows and does not edit field by field). */
function handWrittenPatchSentence(record, field, plateau) {
  const last = record.patched ? record.patched.get(field) : null;
  if (!last || last.plateau !== plateau || last.operator === 'REMOVE' || !/^json-path /.test(String(last.selector))) return null;
  return 'Not written: `' + field + '` of `' + record.reference + '` is set by patch ' + last.rank + ' of the plateau `' + plateau + '` (' + last.operator + ' ' + last.selector + '), which was written by hand with a free `json-path`: the editor shows it and does not edit it field by field. Edit the patch in Files. Nothing was changed.';
}

/**
 * What an edit of an element does in a layered plateau. The mutator is tried on a copy of the element as the plateau resolves it; the fields it changes are each written where
 * they belong (`route`): `manifest` (the element is declared in the plateau, and no patch of the plateau sets the field), else `patch` (the plateau has a patch on the field, or
 * inherits the element). Returns `{ changes: [{ field, before, after, route }], renamed }`, or throws the sentence that refuses the edit.
 */
function planLayerElementEdit(plateau, record, category, reference, mutatorFn) {
  const resolved = resolvedNodeOf(plateau, category, reference);
  if (!resolved) throw new Error('"' + reference + '" cannot be found in the plateau `' + plateau + '`; nothing was changed.');
  const trial = clonePlain(resolved);
  const outcome = mutatorFn(trial, null, null);
  const renamed = (outcome && outcome.renamedTo) || (String(trial.id) !== String(resolved.id) ? { from: reference, to: null } : null);
  if (renamed && plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau) {
    throw new Error('Not written: `' + reference + '` is declared in the plateau `' + record.declaredIn + '`, and a patch never changes an id: it is renamed where it is declared. Draw `' + record.declaredIn + '` to rename it. Nothing was changed.');
  }
  if (String(trial.kind) !== String(resolved.kind)) throw new Error('Not written: the kind of an element is not edited here. Nothing was changed.');
  const located = plateau !== BASELINE_PLATEAU && record.declaredIn === plateau ? locateContentNode(reference, category, record) : null;
  const changes = [];
  for (const field of Array.from(new Set(Object.keys(resolved).concat(Object.keys(trial)))).sort(compareUnits)) {
    if (field === 'id' || field === 'elements' || field === 'kind') continue;
    if (sameJson(resolved[field], trial[field])) continue;
    const change = { field, before: copyJson(resolved[field]), after: copyJson(trial[field]), route: 'manifest' };
    if (plateau !== BASELINE_PLATEAU) {
      const handWritten = handWrittenPatchSentence(record, field, plateau);
      if (handWritten) throw new Error(handWritten);
      const mine = plateauPatchesOn(plateau, category, reference, field);
      if (mine.length >= 1 || !located || !sameJson(located.node[field], resolved[field])) change.route = 'patch';
    }
    changes.push(change);
  }
  if (renamed && changes.some((change) => change.route === 'patch')) {
    throw new Error('Not written: `' + reference + '` is renamed and a patch of the plateau `' + plateau + '` sets a field in the same edit (' + changes.filter((change) => change.route === 'patch').map((change) => change.field).join(', ') + '): save the rename, then the change. Nothing was changed.');
  }
  return { changes, renamed };
}

/** After a write: the resolution of the plateau gives back every field that was edited (an empty list or object stands for an absent one), and the new reference of a renamed element. Throws the sentence otherwise. */
function verifyLayerElementEdit(plateau, category, reference, plan) {
  const target = plan.renamed && plan.renamed.to ? plan.renamed.to : reference;
  const node = resolvedNodeOf(plateau, category, target);
  const refused = node ? null : layerStateOf(plateau, AppState.workspace.settings);
  if (refused && refused.fatal) throw new Error('Not written: the plateau `' + plateau + '` could no longer be resolved (' + oneLine(refused.fatal[0]) + '). Nothing was changed.');
  if (!node) throw new Error('Not written: after the edit the plateau `' + plateau + '` has no element `' + target + '`. Nothing was changed.');
  for (const change of plan.changes) {
    const empty = Array.isArray(change.before) || Array.isArray(change.after) ? [] : isPlainJsonObject(change.before) || isPlainJsonObject(change.after) ? {} : undefined;
    const wanted = readIsMissing(change.after) ? empty : change.after;
    const got = readIsMissing(node[change.field]) ? empty : node[change.field];
    if (!sameJson(got, wanted)) {
      throw new Error('Not written: the resolution of the plateau `' + plateau + '` does not give back the new `' + change.field + '` of `' + target + '` (it reads ' + oneLine(JSON.stringify(got === undefined ? null : got)).slice(0, 80) + '). Nothing was changed.');
    }
  }
}

/** The edit of an element in a layered plateau (see `planLayerElementEdit`), under `guardedLayerWrite`. */
function commitLayeredElementEdit(plateau, reference, mutatorFn, layer, options) {
  const category = layerOfReference(reference, layer);
  const record = category ? AppState.index[category].get(reference) : null;
  if (!record) return commitElementEditNow(reference, mutatorFn, layer, options); // says it cannot be found
  const label = record.name || reference;
  const base = {
    plateau, confirmed: !!options.confirmed, afterConfirm: options.afterConfirm, summary: 'Edit “' + label + '” in the plateau `' + plateau + '`',
    again: () => commitElementEdit(reference, mutatorFn, layer, Object.assign({}, options, { confirmed: true }))
  };
  if (options.live) {
    // the mutator edits the file that declares the element itself (a move, a child written in the file of its parent): it must be a file of the plateau written
    if (plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau) {
      throw new Error('Not written: `' + reference + '` is declared in the plateau `' + record.declaredIn + '`, not in `' + plateau + '`, and a patch never changes where an element is. Draw `' + record.declaredIn + '` to do it. Nothing was changed.');
    }
    return guardedLayerWrite(Object.assign(base, {
      write: () => commitElementEditNow(reference, mutatorFn, layer, options),
      verify: (result) => verifyLayerElementEdit(plateau, category, reference, { changes: [], renamed: result && result.renamedTo ? result.renamedTo : null })
    }));
  }
  const plan = planLayerElementEdit(plateau, record, category, reference, mutatorFn);
  const inherited = plateau !== BASELINE_PLATEAU && record.declaredIn !== plateau;
  if (!plan.changes.length && !plan.renamed && inherited) { // nothing to say: nothing is written, and the file of another plateau is not marked
    saveStatus = { state: 'idle' };
    rebuildIndexAndRender();
    return undefined;
  }
  const write = plan.changes.every((change) => change.route === 'manifest')
    ? () => commitElementEditNow(reference, mutatorFn, layer, options)
    : () => writeMixedElementEdit(plateau, record, category, reference, plan);
  return guardedLayerWrite(Object.assign(base, { write, verify: () => verifyLayerElementEdit(plateau, category, reference, plan) }));
}

/** An edit whose fields do not all belong in the same file: the ones of the manifest that declares the element are set on it, the others are patches of the plateau. */
function writeMixedElementEdit(plateau, record, category, reference, plan) {
  const touched = new Set();
  for (const change of plan.changes) {
    if (change.route === 'patch') {
      touched.add(writePatchChange(plateau, category, reference, change));
    } else {
      const located = locateContentNode(reference, category, record);
      if (readIsMissing(change.after)) delete located.node[change.field]; else located.node[change.field] = clonePlain(change.after);
      touched.add(located.mf);
    }
  }
  for (const mf of touched) touchManifest(mf);
  AppState.dirtyReferences.add(nodeKey(reference, category));
  saveStatus = { state: 'idle' };
  rebuildIndexAndRender();
  return undefined;
}

/** An inherited element is taken out by a `REMOVE` patch at the end of the patches of the plateau: the kernel takes what is in it and what points at it. */
function writeRemovePatch(plateau, category, reference) {
  const mf = ensurePlateauManifest(plateau);
  if (!Array.isArray(mf.content.patches)) mf.content.patches = [];
  const patch = { operator: 'REMOVE', target: reference };
  if (category === 'technology') patch.layer = 'technology';
  mf.content.patches.push(patch);
  touchManifest(mf);
  forgetUiReferences(computeDeletedReferenceSet(reference, category), category);
  pendingDeleteConfirmation = null;
  saveStatus = { state: 'idle' };
  rebuildIndexAndRender();
}

/**
 * Takes out of the patches of a plateau the ones that name an element that was deleted from its own manifests (their `target`, the relationship they find with `where`, the
 * relationships they add): left in, the plateau would no longer resolve. Returns whether the manifest of the plateau changed.
 */
function prunePatchesNaming(plateau, deletedRefs, category) {
  const mf = plateauManifestFile(plateau);
  if (!mf || !Array.isArray(mf.content.patches)) return null;
  const gone = (value) => (typeof value === 'string' || typeof value === 'number') && deletedRefs.has(String(value));
  const patchLayer = (patch) => (readIsMissing(patch.layer) ? 'application' : String(patch.layer).toLowerCase());
  const kept = [];
  let modified = false;
  // what a patch adds or sets as a list of references: the destinations of relationships, the applications a node hosts, the elements an environment uses
  const listOf = (patch) => {
    const field = String(patch.field);
    if (field === 'relationships' && patchLayer(patch) === category) return { items: Array.isArray(patch.value) ? patch.value : [patch.value], named: (item) => isPlainJsonObject(item) && gone(item.destination) };
    if (field === 'applications' && category === 'application' && patchLayer(patch) === 'technology') return { items: Array.isArray(patch.value) ? patch.value : [patch.value], named: gone };
    if (field === 'uses' && category === 'technology' && patchLayer(patch) === 'technology') return { items: Array.isArray(patch.value) ? patch.value : [patch.value], named: gone };
    return null;
  };
  for (const patch of mf.content.patches) {
    if (patch && typeof patch === 'object') {
      if (patchLayer(patch) === category && (gone(readIsMissing(patch.target) ? null : String(patch.target)) || (isPlainJsonObject(patch.where) && gone(patch.where.destination)))) { modified = true; continue; }
      const operator = String(patch.operator).toUpperCase();
      const list = !readIsMissing(patch.value) && (operator === 'ADD' || operator === 'SET') && !patch.where ? listOf(patch) : null;
      if (list) {
        const left = list.items.filter((item) => !list.named(item));
        if (left.length !== list.items.length) {
          modified = true;
          if (!left.length && operator === 'ADD') continue; // nothing is left to add
          patch.value = Array.isArray(patch.value) ? left : left[0];
        }
      }
    }
    kept.push(patch);
  }
  if (!modified) return null;
  if (kept.length) mf.content.patches = kept; else delete mf.content.patches;
  return mf;
}

