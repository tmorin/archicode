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

