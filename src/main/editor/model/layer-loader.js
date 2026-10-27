// =====================================================================
// The layers (wave 014, run 0080). A plateau is drawn as its chain: for each plateau from `baseline` down to it, the elements whose manifests say
// `plateau: <layer>` are added to the graph of the plateau above, then the ordered patches of the layer change that graph (the kernel's `apply_patches`),
// then the layer is checked: what the graph points at must be there (what the views and stories name is not a layer's mistake: `entryProblemsOf`). A mistake names the
// layer, in the sentences of the command line (`LayerLoader.java`: keep them alike). The first layer that is wrong ends the chain.
//
// The result of a layer is a *state* (the JSON graph, who declared each root, which patch set which field, the REMOVE patches with their cascade) and is
// kept per plateau, so that a plateau reuses the state of the plateau it overrides and a click on the band resolves nothing twice. The states and the models
// drawn from them (`layerModelOf`) are kept for as long as the tree of the plateaus (`AppState.plateauTree`, rebuilt by every load and every edit) and the
// text of the manifests are what they were; any edit ends in `rebuildIndexAndRender`, which builds a new tree, so a cache that was not told is not used.
// =====================================================================

const LAYER_NAMES = ['application', 'technology'];

/**
 * The period a horizon label reads as, `{ start, end }`, each a number that sorts (`yyyymmdd`), or null when it reads as none: `2026`, `2026-10`, `2026-10-18`, a quarter
 * (`2026-Q4`, `2026Q4`) or a half (`2026-H2`). The first and the last day of the period. `PlateauTree.horizonPeriod` reads labels the same way: keep them alike.
 */
function horizonPeriod(label) {
  if (label === null || label === undefined) return null;
  const text = String(label).trim();
  const valid = (year, month, day) => {
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? year * 10000 + month * 100 + day : null;
  };
  const lastDay = (year, month) => valid(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate());
  const period = (start, end) => (start === null || end === null ? null : { start, end });
  let m = /^(\d{4})$/.exec(text);
  if (m) return period(valid(Number(m[1]), 1, 1), valid(Number(m[1]), 12, 31));
  m = /^(\d{4})-(\d{2})$/.exec(text);
  if (m) return period(valid(Number(m[1]), Number(m[2]), 1), lastDay(Number(m[1]), Number(m[2])));
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m) return period(valid(Number(m[1]), Number(m[2]), Number(m[3])), valid(Number(m[1]), Number(m[2]), Number(m[3])));
  m = /^(\d{4})-?Q([1-4])$/i.exec(text);
  if (m) return period(valid(Number(m[1]), (Number(m[2]) - 1) * 3 + 1, 1), lastDay(Number(m[1]), Number(m[2]) * 3));
  m = /^(\d{4})-?H([12])$/i.exec(text);
  if (m) return period(valid(Number(m[1]), (Number(m[2]) - 1) * 6 + 1, 1), lastDay(Number(m[1]), Number(m[2]) * 6));
  return null;
}

/** The date a horizon label reads as (the first day of its period, `yyyymmdd`), or null when it reads as none: what orders the siblings of the band. */
function horizonDate(label) {
  const period = horizonPeriod(label);
  return period === null ? null : period.start;
}

/**
 * The order of the siblings in the band (the Open Question "the order of the layers in a band"): the plateaus whose horizon reads as a date come first, by date
 * and then by id; the others follow, by id (code units, as the rest of the plateaus are sorted). A total order, so the band is the same on every opening.
 */
function compareBandSiblings(a, b) {
  const da = horizonDate(a.horizon);
  const db = horizonDate(b.horizon);
  if (da !== null && db !== null) return da - db || compareUnits(a.id, b.id);
  if (da !== null) return -1;
  if (db !== null) return 1;
  return compareUnits(a.id, b.id);
}

/** The tree of the band: `{ id, node, children: [...] }` from `baseline` down, the siblings in the order of `compareBandSiblings`. Null when the tree has no nodes. */
function bandTreeOf(tree) {
  if (!tree || !tree.nodes || !tree.nodes.has(BASELINE_PLATEAU)) return null;
  const children = new Map();
  for (const node of tree.nodes.values()) {
    if (node.parent === null) continue;
    if (!children.has(node.parent)) children.set(node.parent, []);
    children.get(node.parent).push(node);
  }
  const build = (node) => ({ id: node.id, node, children: (children.get(node.id) || []).slice().sort(compareBandSiblings).map(build) });
  return build(tree.nodes.get(BASELINE_PLATEAU));
}

/** The ids of the band in reading order (a plateau, then what overrides it): the order the band lists its nodes in. */
function bandOrderOf(tree) {
  const out = [];
  const walk = (item) => { out.push(item.id); item.children.forEach(walk); };
  const root = bandTreeOf(tree);
  if (root) walk(root);
  return out;
}

/** A plateau of the tree as the page holds a plateau: `{ id, name, horizon }`, the texts of its manifest ('' when it has none). */
function layerPlateauModel(id) {
  const node = AppState.plateauTree && AppState.plateauTree.nodes.get(id);
  return { id, name: node && node.name ? node.name : '', horizon: node && node.horizon ? node.horizon : '' };
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

/** A patch as the kernel takes it: the operator in capitals, the layer in lower case, `json-path` as the manifest writes it (the reader also accepts `json_path`). */
function layerKernelPatch(raw) {
  const patch = { operator: String(raw.operator).toUpperCase() };
  const text = (value) => String(value);
  if (!readIsMissing(raw.target)) patch.target = text(raw.target);
  if (!readIsMissing(raw.layer)) patch.layer = text(raw.layer).toLowerCase();
  const jsonPath = !readIsMissing(raw['json-path']) ? raw['json-path'] : raw.json_path;
  if (!readIsMissing(jsonPath)) patch['json-path'] = text(jsonPath);
  if (!readIsMissing(raw.expect)) patch.expect = Number(raw.expect);
  if (!readIsMissing(raw.field)) patch.field = text(raw.field);
  if (!readIsMissing(raw.where) && typeof raw.where === 'object') {
    patch.where = { destination: text(raw.where.destination) };
    if (!readIsMissing(raw.where.label)) patch.where.label = text(raw.where.label);
  }
  if (!readIsMissing(raw.value)) patch.value = raw.value;
  return patch;
}

/** What the manifests of each plateau declare: Map plateau id -> `{ elements }` (the manifests, in the order of the files); a file with an error declares nothing. A view and a story belong to no plateau. */
function layerManifestsByPlateau(manifestFiles) {
  const out = new Map();
  for (const mf of manifestFiles) {
    if (mf.error || !mf.header || !mf.header.kind || !mf.content || mf.content.id === undefined) continue;
    const bare = stripArchicodeKindPrefix(mf.header.kind);
    if (bare === 'plateau' || isPlateauFreeManifest(mf)) continue;
    const plateau = plateauOfManifest(mf);
    if (!out.has(plateau)) out.set(plateau, { elements: [] });
    if (ARCHICODE_KIND_MAP[bare]) out.get(plateau).elements.push(mf);
  }
  return out;
}

function emptyLayerState() {
  return {
    graph: { application: { elements: [] }, technology: { elements: [] } },
    roots: new Map(), // layer|reference -> { kind, level, file, plateau }: the root of every manifest, where it was declared
    patched: new Map(), // layer|reference -> Map field -> { plateau, rank, operator, selector }: the last patch that set the field
    touched: new Map(), // layer|reference -> [{ plateau, rank, operator, selector, field }]: every patch that selected the element
    removals: [], // [{ plateau, rank, operator, selector, touched, removed, dropped }]: the REMOVE patches of the chain, in the order they were applied
    unplaced: new Map(), // layer|id -> reference: a root that says `header.parent` of an element the graph does not have stays at the top, under the reference its manifest gives it
    problems: null // { plateau, sentences }: the mistakes of the first layer of the chain that has some (the command line stops there); the plateau is drawn all the same, so that it can be repaired
  };
}

function cloneLayerState(state) {
  return {
    graph: clonePlain(state.graph),
    roots: new Map(state.roots),
    patched: new Map(Array.from(state.patched, ([key, fields]) => [key, new Map(fields)])),
    touched: new Map(Array.from(state.touched, ([key, list]) => [key, list.slice()])),
    removals: state.removals.slice(),
    unplaced: new Map(state.unplaced),
    problems: state.problems
  };
}

/** Every element of a graph by reference, per layer: Map reference -> the JSON node. */
function graphReferencesOf(graph) {
  const out = { application: new Map(), technology: new Map() };
  const walk = (layer, node, reference) => {
    out[layer].set(reference, node);
    for (const child of Array.isArray(node.elements) ? node.elements : []) {
      if (!child || typeof child !== 'object' || !child.id) continue;
      walk(layer, child, reference + '.' + child.id);
    }
  };
  for (const layer of LAYER_NAMES) {
    for (const root of graph[layer].elements) if (root && typeof root === 'object' && root.id) walk(layer, root, String(root.id));
  }
  return out;
}

/** The references the properties of a view name: `element`, and the entries of `pinned`, `opened` and `hidden` (sorted, once each). */
function namedByProperties(properties) {
  const names = new Set();
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return [];
  if (typeof properties.element === 'string') names.add(properties.element);
  for (const key of ['pinned', 'opened', 'hidden']) {
    for (const entry of Array.isArray(properties[key]) ? properties[key] : []) if (typeof entry === 'string') names.add(entry);
  }
  return Array.from(names).sort(compareUnits);
}

/** The file that declares an element: the manifest of the nearest root at or above its reference (`state.roots`), or null (an element of .archicode.yaml has none). */
function layerFileOf(roots, layer, reference) {
  if (!roots) return null;
  for (let ref = reference; ref; ref = ref.indexOf('.') === -1 ? '' : ref.slice(0, ref.lastIndexOf('.'))) {
    const root = roots.get(layer + '|' + ref);
    if (root) return root.file || null;
  }
  return null;
}

/**
 * What a layer is checked for (`LayerLoader.problems`, `DanglingReferences`): a relationship, an entry of `uses` and an application hosted on a node must name an element of the graph.
 * The sentence says the element, the file that declares it and the key of the reference in it (issue #159); a workspace with no plateau tells it without the plateau, as the command line does.
 * Sorted by element, then by what it points at. What the views and the stories name is not a mistake of a layer: see `entryProblemsOf`.
 * `options.layered` is whether the workspace has plateaus; `options.roots` is `state.roots`, which knows the file of each manifest.
 */
function layerProblemsOf(plateau, graph, options) {
  const layered = !options || options.layered !== false;
  const refs = graphReferencesOf(graph);
  const found = [];
  const in_ = layered ? 'in the plateau `' + plateau + '`, ' : '';
  for (const layer of LAYER_NAMES) {
    for (const [reference, node] of refs[layer]) {
      const file = layerFileOf(options && options.roots, layer, reference);
      const told = (verb, other, key) => '`' + reference + '` ' + verb + ' `' + other + '`, which does not exist, ' + (file ? 'in `' + file + '` ' : '') + 'at `' + key + '`';
      let position = 0;
      for (const rel of Array.isArray(node.relationships) ? node.relationships : []) {
        if (!rel || typeof rel !== 'object') continue;
        const key = 'relationships[' + position++ + '].destination';
        const destination = kernelStringOf(rel.destination);
        if (destination !== null && !refs[layer].has(destination)) found.push({ element: reference, other: destination, sentence: told('has a relationship towards', destination, key) });
      }
      if (node.kind === 'environment') {
        let at = 0;
        for (const used of kernelStringsOf(node.uses)) {
          const key = 'uses[' + at++ + ']';
          if (!refs[layer].has(used)) found.push({ element: reference, other: used, sentence: told('uses', used, key) });
        }
      }
      if (node.kind === 'node') {
        let at = 0;
        for (const application of kernelStringsOf(node.applications)) {
          const key = 'applications[' + at++ + ']';
          if (!refs.application.has(application)) found.push({ element: reference, other: application, sentence: told('hosts', application, key) });
        }
      }
    }
  }
  found.sort((a, b) => compareUnits(a.element, b.element) || compareUnits(a.other, b.other) || compareUnits(a.sentence, b.sentence));
  // one sentence for each thing that is missing: the elements that point at it are one cause (`DanglingReferences.sentences`)
  const byMissing = new Map();
  for (const problem of found) {
    if (!byMissing.has(problem.other)) byMissing.set(problem.other, []);
    byMissing.get(problem.other).push(problem);
  }
  const scope = layered ? ' of the plateau' : '';
  const out = new Set();
  for (const group of byMissing.values()) {
    const others = new Set(group.map((p) => p.element)).size - 1;
    out.add(in_ + group[0].sentence + (others === 0 ? '' : ' (' + others + (others === 1 ? ' more element' + scope + ' points at it)' : ' more elements' + scope + ' point at it)')));
  }
  return Array.from(out);
}

/** The layer a view, or a step of a story, is about: `technology` or else `application` (the command line reads the layer in any case). */
function entryLayerOf(value) {
  return String(value === undefined || value === null ? '' : value).toLowerCase() === 'technology' ? 'technology' : 'application';
}

/** The references that the manifests declare, whatever the plateau, by layer: each root (under its `header.parent`) and every element nested in it (`ManifestParser.declaredReferences`). */
function declaredReferencesOf(manifestFiles) {
  const declared = { application: new Set(), technology: new Set() };
  for (const mf of manifestFiles) {
    const category = manifestLayer(mf);
    if (!category || !mf.content || mf.content.id === undefined || mf.content.id === null) continue;
    walkContentNodes(mf, (node, reference) => { declared[category].add(reference); });
  }
  return declared;
}

/** `declaredReferencesOf` for the manifests as they are, kept with the layer cache (it is dropped when a manifest changes). */
function declaredAnywhereCached() {
  const cache = ensureLayerCache(AppState.workspace.settings);
  if (!cache.declared) cache.declared = declaredReferencesOf(AppState.manifestFiles);
  return cache.declared;
}

/**
 * The plateau-free check (wave 015, run 0100, issue #100): what a view and a story name must exist in at least one plateau. Not a mistake of a plateau: the page tells it
 * once, whatever plateau is drawn. "Exists in a plateau" is decided from what the manifests declare, as `LayerLoader.entryProblems` does (a patch never creates an
 * element). Only a workspace that has plateaus is checked, as the command line does; the views first, then the stories, in the order of the files, those of .archicode.yaml
 * after those of the manifests.
 */
function entryProblemsOf(settings) {
  const tree = AppState.plateauTree;
  const layered = !!(tree && tree.layered);
  // a workspace with no plateau has no layer cache to keep it in (and little to look at: the steps that name a plateau)
  const cache = layered ? ensureLayerCache(settings) : null;
  if (cache && cache.entryProblems !== undefined) return cache.entryProblems;
  const problems = entryProblemsIn(AppState.manifestFiles, tree, layered ? declaredAnywhereCached() : null);
  if (cache) cache.entryProblems = problems;
  return problems;
}

/**
 * `entryProblemsOf` for a list of manifests and the tree of plateaus they make, kept nowhere: what the check would say of the workspace if it had these files (the dialog
 * that deletes a plateau asks it of the files that stay, wave 015 run 0102). `declared`: `declaredReferencesOf(manifestFiles)` when it is known already, else it is computed.
 */
function entryProblemsIn(manifestFiles, tree, declaredGiven) {
  const layered = !!(tree && tree.layered);
  const out = [];
  // what a view or a story step names must exist in a plateau: a workspace with no plateau is not looked at (the editor says a view that cannot be drawn in its place)
  const declared = layered ? declaredGiven || declaredReferencesOf(manifestFiles) : null;
  const told = (noun, id, source, recipe) => {
    if (!layered) return;
    for (const name of namedByProperties(recipe.properties)) {
      if (!declared[entryLayerOf(recipe.layer)].has(name)) out.push('the ' + noun + ' `' + id + '` (`' + source + '`) names `' + name + '`, which exists in no plateau');
    }
  };
  const files = (kind) => manifestFiles.filter((mf) => !mf.error && mf.header && mf.content && isPlainObject(mf.content) && manifestKindName(mf.header.kind) === kind);
  // the views and stories of .archicode.yaml (an older place for them) come after those of the manifests, unless a manifest has the id: it shadows them (`entriesOf`)
  const legacy = (key, kind) => { const own = new Set(files(kind).map((mf) => String(mf.content.id))); return legacyEntries(key).filter((entry) => !own.has(entry.id)); };
  if (layered) {
    for (const mf of files('view')) told('view', mf.content.id, mf.relPath, mf.content);
    for (const view of legacy('views', 'view')) told('view', view.id, '.archicode.yaml', view);
  }
  const ids = layered ? tree.ids : [];
  const broken = !!(tree && tree.problems && tree.problems.length); // a tree that is refused names the plateaus that exist no better than a workspace with none: the tree is what is told
  const tellSteps = (id, source, steps) => {
    // the steps are numbered as the command line does: an item with no value in the list is absent (run 0092), so it takes no number
    (Array.isArray(steps) ? steps : []).filter((step) => step !== null && step !== undefined).forEach((step, i) => {
      if (!isPlainObject(step)) return;
      if (!broken) for (const sentence of stepPlateauProblems(source, id, i + 1, step, ids)) out.push(sentence);
      told('story', id, source, step);
    });
  };
  for (const mf of files('story')) tellSteps(mf.content.id, mf.relPath, mf.content.steps);
  for (const story of legacy('stories', 'story')) tellSteps(story.id, '.archicode.yaml', story.steps);
  return Array.from(new Set(out));
}

/**
 * What a step of a story says about the plateau it is told at (`at`) and the plateau it is compared with (`against`), wave 015 run 0101 (issue #24): each is a text, and
 * an empty one names nothing (`readText`: a key with no value is absent). Returns `{ at, against }`, each a plateau id or null.
 */
function stepPlateauKeys(step) {
  const text = (value) => ((typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') && String(value) !== '' ? String(value) : null);
  return { at: text(step.at), against: text(step.against) };
}

/**
 * The sentences about the plateaus of a step: each must be a plateau of the workspace (`ids`, empty when it has none), and they cannot be one plateau, since a plateau is
 * never compared with itself. `against` with no `at` is read (the step is told at the plateau drawn). The sentences of `LayerLoader.stepPlateauProblems`: keep them alike.
 */
function stepPlateauProblems(source, id, number, step, ids) {
  const keys = stepPlateauKeys(step);
  const where = 'the story `' + id + '` (`' + source + '`) step ' + number + ' says `';
  const out = [];
  let unknown = false;
  for (const key of ['at', 'against']) {
    const value = keys[key];
    if (value === null || ids.includes(value)) continue;
    unknown = true;
    out.push(ids.length ? where + key + ': ' + value + '`, which is not a plateau of this workspace (the plateaus are ' + ids.map((i) => '`' + i + '`').join(', ') + ')' : where + key + ': ' + value + '` but the workspace declares no plateau' + NO_PLATEAU);
  }
  if (!unknown && keys.at !== null && keys.at === keys.against) out.push(where + 'at: ' + keys.at + '` and `against: ' + keys.against + '`: a plateau is never compared with itself');
  return out;
}

/**
 * The level of a node of a graph for the nesting rule: its kind. `refs` is the map reference -> node of a layer. Null when the node is not there.
 */
function nestingLevelIn(refs, reference) {
  const node = refs.get(reference);
  return node && typeof node.kind === 'string' ? node.kind : null;
}

/**
 * The sentence for a manifest declared under a parent that cannot hold its kind: the one of the reader for a nested element of a kind its parent does not hold, with
 * the file, the parent and the place of the fault (`ElementIndexFactory.refusal`): keep them alike.
 */
function nestingProblem(item, held) {
  return '`' + item.mf.relPath + '` is not valid: unknown kind `' + item.rootKind + '` under `' + item.parentReference + '` (known: ' + (held.length ? held.slice().sort(compareUnits).join(', ') : 'none') + ') at `header.kind`';
}

/**
 * The sentence for a manifest with no `header.parent` of a kind its layer does not hold at its top (issue #106, wave 016 run 0108), in the words of `nestingProblem`: the
 * cause, no parent, takes the place of the parent (`ElementIndexFactory.rootRefusal`): keep them alike. Told in a workspace that has plateaus only.
 */
function rootProblem(item, held) {
  return '`' + item.mf.relPath + '` is not valid: unknown kind `' + item.rootKind + '` with no `header.parent` (known: ' + held.join(', ') + ') at `header.kind`';
}

/**
 * One layer: the state of the plateau above (null for the root) with the elements of the manifests of `node` added, then its patches applied by the kernel, then
 * the checks. Returns `{ state }` (`state.problems` holds the sentences of the first layer of the chain that is wrong, told by the command line, which stops there; the
 * graph is built all the same), or `{ fatal, plateau }` when the kernel refuses the patches of the layer: there is no graph then.
 */
function resolveLayerStep(parent, node, context) {
  const state = parent ? cloneLayerState(parent) : emptyLayerState();
  const own = context.byPlateau.get(node.id) || { elements: [] };
  const refs = graphReferencesOf(state.graph);
  const register = (category, json, reference) => {
    const walk = (item, ref) => {
      refs[category].set(ref, item);
      for (const child of Array.isArray(item.elements) ? item.elements : []) if (child && typeof child === 'object' && child.id) walk(child, ref + '.' + child.id);
    };
    walk(json, reference);
  };
  const waiting = [];
  const nesting = { application: new Map(), technology: new Map() }; // reference -> the sentence for a manifest declared under a parent that cannot hold its kind (the command line refuses it when the element is added)
  for (const mf of own.elements) {
    const bare = stripArchicodeKindPrefix(mf.header.kind);
    const { category, rootKind } = ARCHICODE_KIND_MAP[bare];
    const level = rootKind;
    const parentReference = mf.header.parent ? String(mf.header.parent) : null;
    const reference = parentReference ? parentReference + '.' + mf.content.id : String(mf.content.id);
    const json = clonePlain(mf.content);
    json.kind = rootKind;
    const item = { mf, category, rootKind, level, parentReference, reference, json };
    if (parentReference === null) {
      // in a workspace that has plateaus a layer holds only the kinds of its model class at its top: a container, a component or a node with no parent is held by no layer, so
      // a patch could not select it (issue #106). It is drawn where its manifest puts it, so that it can be repaired
      if (context.layered) {
        const held = topLevelKindsOf(category);
        if (held.indexOf(rootKind) === -1) nesting[category].set(reference, rootProblem(item, held));
      }
      state.graph[category].elements.push(json);
      register(category, json, reference);
      state.roots.set(category + '|' + reference, { kind: rootKind, level, file: mf.relPath, plateau: node.id });
    } else {
      waiting.push(item);
    }
  }
  // a manifest that says `header.parent` goes inside the element it names, whichever file comes first
  let pending = waiting;
  while (pending.length) {
    const left = [];
    for (const item of pending) {
      const host = refs[item.category].get(item.parentReference);
      if (!host) { left.push(item); continue; }
      // the parent has to hold the kind (issue #87): told as the command line tells it, and drawn where the manifest puts it, so that it can be repaired
      const held = childKindOptionsForLevel(nestingLevelIn(refs[item.category], item.parentReference));
      if (held.indexOf(item.rootKind) === -1) nesting[item.category].set(item.reference, nestingProblem(item, held));
      if (!Array.isArray(host.elements)) host.elements = [];
      host.elements.push(item.json);
      register(item.category, item.json, item.reference);
      state.roots.set(item.category + '|' + item.reference, { kind: item.rootKind, level: item.level, file: item.mf.relPath, plateau: node.id });
    }
    if (left.length === pending.length) break;
    pending = left;
  }
  // before the patches: a patch may remove a parent, and the elements declared under it go with it. A manifest whose parent is not there is told, and stays at the top
  // (the editor draws what it can, so that the mistake can be repaired in it)
  // told first, and alone (the command line stops there): the application layer, then the technology layer, each by reference, as `ElementIndexFactory.indexLayers` tells them
  let mine = [];
  for (const category of LAYER_NAMES) mine = mine.concat(Array.from(nesting[category].keys()).sort(compareUnits).map((reference) => nesting[category].get(reference)));
  if (pending.length) {
    const sentences = new Map();
    for (const item of pending) {
      sentences.set(item.reference, 'in the plateau `' + node.id + '`, `' + item.reference + '` is declared under `' + item.parentReference + '`, which does not exist');
      state.graph[item.category].elements.push(item.json);
      state.unplaced.set(item.category + '|' + item.json.id, item.reference);
      state.roots.set(item.category + '|' + item.reference, { kind: item.rootKind, level: item.level, file: item.mf.relPath, plateau: node.id });
    }
    const folded = foldParentProblems(Array.from(sentences.keys()).sort(compareUnits).map((k) => sentences.get(k)));
    if (!mine.length) mine = folded;
  }

  if (node.patches.length) {
    // the command line stops at the first layer that is wrong and tells it: a layer before this one (or this one's own parents) that is wrong is what is told, though nothing is drawn
    const earlier = state.problems || (mine.length ? { plateau: node.id, sentences: mine } : null);
    if (!context.kernel) return { fatal: ['the viewpoint kernel is not loaded, so the patches of the plateau `' + node.id + '` cannot be applied'], plateau: node.id, earlier };
    const patches = node.patches.map((raw) => ({ raw, kernel: layerKernelPatch(raw) }));
    const answer = context.kernel.applyPatches({ workspace: { application: state.graph.application, technology: state.graph.technology }, plateau: node.id, patches: patches.map((p) => p.kernel) });
    if (answer.error) return { fatal: [answer.error], plateau: node.id, earlier };
    const layerOf = (value) => ({ elements: value && Array.isArray(value.elements) ? value.elements : [] });
    state.graph = { application: layerOf(answer.workspace && answer.workspace.application), technology: layerOf(answer.workspace && answer.workspace.technology) };
    for (const report of answer.patches || []) {
      const sent = patches[report.rank - 1] ? patches[report.rank - 1].kernel : {};
      const origin = { plateau: node.id, rank: report.rank, operator: report.operator, selector: report.selector };
      // a REMOVE that names a `field` takes the field out of the elements it selects (wave 017, run 0126, #94): nothing leaves the graph, so it is no removal and has no
      // cascade; it is a change of that field, made by the patch, like a SET
      if (report.operator === 'REMOVE' && sent.field === undefined) {
        state.removals.push(Object.assign({ touched: report.touched || [], removed: report.removed || [], dropped: report.dropped || [] }, origin));
        // what the cascade took out of an element that stays is a change of that element's field, made by this patch
        for (const gone of report.dropped || []) {
          const key = gone.layer + '|' + gone.reference;
          if (!state.patched.has(key)) state.patched.set(key, new Map());
          state.patched.get(key).set(gone.field, origin);
          if (!state.touched.has(key)) state.touched.set(key, []);
          state.touched.get(key).push(Object.assign({ field: gone.field }, origin));
        }
        continue;
      }
      const field = sent.field || (sent.where ? 'relationships' : null);
      for (const element of report.touched || []) {
        const key = element.layer + '|' + element.reference;
        if (!state.touched.has(key)) state.touched.set(key, []);
        state.touched.get(key).push(Object.assign({ field }, origin));
        if (field) {
          if (!state.patched.has(key)) state.patched.set(key, new Map());
          state.patched.get(key).set(field, origin);
        }
      }
    }
  }

  // the checks of the layer; told alone when a parent is missing, as the command line tells that first (and stops)
  if (!mine.length) mine = layerProblemsOf(node.id, state.graph, { layered: !!context.layered, roots: state.roots });
  if (!state.problems && mine.length) state.problems = { plateau: node.id, sentences: mine };
  return { state };
}

/**
 * One sentence for the elements declared under a parent the graph does not have: they have one cause (a plateau that overrides the wrong one, a manifest that was
 * left out), so the first one is told, with how many others there are (`LayerLoader.foldParentProblems`).
 */
function foldParentProblems(sentences) {
  if (sentences.length < 2) return sentences;
  const others = sentences.length - 1;
  return [sentences[0] + ' (' + others + (others === 1 ? ' more element of the plateau is declared under a parent that does not exist' : ' more elements of the plateau are declared under a parent that does not exist') + ')'];
}

/** The cache of the states and models of the plateaus, for one tree of plateaus and one text of the manifests (see the note above). */
let layerCache = null;

function layerCacheSignature(manifestFiles) {
  return manifestFiles.map((mf) => [mf, mf.rawText]);
}

function layerCacheHolds(settings) {
  if (!layerCache || layerCache.tree !== AppState.plateauTree || layerCache.settings !== settings || layerCache.kernel !== loadedKernel) return false;
  if (layerCache.label !== settings.relationships.defaultSyntheticLabel || layerCache.signature.length !== AppState.manifestFiles.length) return false;
  return layerCache.signature.every(([mf, text], i) => AppState.manifestFiles[i] === mf && mf.rawText === text);
}

function ensureLayerCache(settings) {
  if (!layerCacheHolds(settings)) {
    const filePlateau = new Map();
    for (const mf of AppState.manifestFiles) filePlateau.set(mf.relPath, plateauOfManifest(mf));
    layerCache = {
      tree: AppState.plateauTree, settings, kernel: loadedKernel, label: settings.relationships.defaultSyntheticLabel, signature: layerCacheSignature(AppState.manifestFiles),
      byPlateau: layerManifestsByPlateau(AppState.manifestFiles), filePlateau, states: new Map(), models: new Map(), counters: { steps: 0, models: 0 }
    };
  }
  return layerCache;
}

/** The state of a plateau: `{ state }` or `{ fatal, plateau }`. A plateau whose ancestor has no graph has none. */
function layerStateOf(id, settings) {
  const cache = ensureLayerCache(settings);
  if (cache.states.has(id)) return cache.states.get(id);
  const node = cache.tree.nodes.get(id);
  const above = node.parent === null ? null : layerStateOf(node.parent, settings);
  let result;
  if (above && above.fatal) {
    result = above;
  } else {
    cache.counters.steps++;
    result = resolveLayerStep(above ? above.state : null, node, { byPlateau: cache.byPlateau, kernel: loadedKernel, layered: !!cache.tree.layered });
  }
  cache.states.set(id, result);
  return result;
}

/**
 * The model of a plateau, as the page draws it: `{ id, plateau, index, roots, stats, removals, problems, failedAt, undrawable }`. `index` holds the records of every
 * element of the chain, each with where it was declared (`declaredIn`, `sourceFile`) and the fields a patch set (`patched`), `roots` the records with no parent per layer;
 * `problems` is null, or the sentences of the first layer of the chain that is wrong (`failedAt`), which the command line refuses the plateau for. The plateau is drawn
 * all the same (a link to nothing, a parent that is not there), so that it can be repaired, unless `undrawable`: the kernel refused the patches of a layer, there is no
 * graph, the index is empty and `problems` holds the kernel's sentence.
 */
function layerModelOf(id, settings) {
  const cache = ensureLayerCache(settings);
  if (cache.models.has(id)) return cache.models.get(id);
  const result = layerStateOf(id, settings);
  const index = { application: new Map(), technology: new Map() };
  const roots = { application: [], technology: [] };
  let stats = { total: 0, dangling: 0 };
  let removals = [];
  if (!result.fatal) {
    const state = result.state;
    for (const category of LAYER_NAMES) {
      for (const root of state.graph[category].elements) {
        if (!root || typeof root !== 'object' || !root.id) continue;
        const reference = state.unplaced.get(category + '|' + root.id) || String(root.id);
        const info = state.roots.get(category + '|' + reference);
        const kind = info ? info.kind : root.kind;
        const level = info ? info.level : kind;
        roots[category].push(indexElementRecursive(root, kind, reference, info ? info.file : '', category, index, settings, level, null, state.roots));
      }
    }
    for (const category of LAYER_NAMES) {
      for (const record of index[category].values()) {
        record.declaredIn = cache.filePlateau.get(record.sourceFile) || BASELINE_PLATEAU;
        const key = category + '|' + record.reference;
        record.patched = state.patched.get(key) || null;
        record.touchedBy = state.touched.get(key) || [];
      }
    }
    stats = resolveRelationships(index);
    removals = state.removals;
  }
  cache.counters.models++;
  const told = result.fatal ? result.earlier : result.state.problems; // `{ plateau, sentences }` of the first layer of the chain that is wrong, if any
  let problems = told ? told.sentences : result.fatal ? result.fatal : null;
  // the command line reads every manifest before it loads a layer, and stops at the first it refuses: while one is refused, that is the sentence (the elements it
  // cannot declare leave "declared under X, which does not exist" behind, which are its consequences, not other mistakes)
  const unreadable = problems ? AppState.manifestFiles.find((mf) => mf.error) : null;
  if (unreadable) problems = ['`' + unreadable.relPath + '` is not valid: ' + unreadable.error];
  const failedAt = told ? told.plateau : result.fatal ? result.plateau : null;
  const model = { id, plateau: layerPlateauModel(id), index, roots, stats, removals, problems, failedAt, undrawable: !!result.fatal };
  cache.models.set(id, model);
  return model;
}

