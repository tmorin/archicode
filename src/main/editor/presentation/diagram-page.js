// ---- Diagram: the perspective's markup and the computation behind it ----

/**
 * The canvas, its tools and the status line; `mountDiagramIfNeeded` fills the canvas once render() has put it in the page.
 * `host` is only given by the page of a view in the Library ({ view, isMap, hideUnlinked, shows }, see `libraryDiagramRecipe`): its
 * canvas names the view, its tools show what that page draws and offer no folding (a Map view's open boxes are part of the view).
 */
function renderDiagramCanvasHtml(record, overlayHtml, host) {
  // no record: the map of the whole layer (the workspace for the application layer)
  const subject = host
    ? 'the view ' + escapeHtml(viewLabel(host.view))
    : record
      ? escapeHtml(record.name || record.id)
      : mapLayer() === 'technology'
        ? 'the technology layer'
        : 'the workspace';
  const canvasAttributes = host
    ? ' data-host="library" data-view="' +
      escapeHtml(host.view.id) +
      '" tabindex="0" aria-label="Diagram of ' +
      subject +
      '. Arrow keys move between boxes, Enter selects one, plus and minus zoom."'
    : (record ? '' : ' data-map="true"') +
      ' tabindex="0" aria-label="' +
      (record ? 'Diagram' : 'Map') +
      ' of ' +
      subject +
      '. Arrow keys move between boxes, Enter opens one, plus and minus zoom." data-ref="' +
      (record ? escapeHtml(record.reference) : '') +
      '"';
  const hideUnlinked = host ? host.hideUnlinked : diagramHideUnlinked;
  return (
    '<div class="diagram-stage">' +
    (overlayHtml || '') +
    '<div class="diagram-canvas" id="diagram-canvas"' +
    canvasAttributes +
    '><span class="muted">Computing the diagram…</span></div>' +
    '<div class="diagram-tools" role="toolbar" aria-label="Diagram tools">' +
    // folding is for exploring: the three viewpoints of an element are drawn as the CLI draws them
    (record || host
      ? ''
      : '<span class="button-group" role="group" aria-label="Fold the boxes">' +
        '<button type="button" data-action="fold-all" title="Fold every box that contains others and close the ones that were opened">Fold all</button>' +
        '<button type="button" data-action="unfold-all" title="Unfold every folded box and open the boxes that hide children (one more level each time)">Unfold all</button></span>') +
    '<button type="button" data-action="toggle-hide-unlinked" aria-pressed="' +
    hideUnlinked +
    '" title="Leave out the boxes that no link reaches, such as the children a facet left without any relationship">Hide unlinked</button>' +
    // wave 015 (run 0097, W-9, #98): what the diagram draws of a comparison is the diagram's choice, not the band's; only while a plateau is compared
    (layerCompareOther()
      ? '<span class="button-group changes-switch" role="group" aria-label="What the diagram draws of the comparison">' +
        '<button type="button" data-action="set-changes-only" data-value="0" aria-pressed="' +
        !AppState.changesOnly +
        '" title="Draw the whole plateau, with what changed marked">Everything</button>' +
        '<button type="button" data-action="set-changes-only" data-value="1" aria-pressed="' +
        AppState.changesOnly +
        '" title="Draw only what is new, changed or removed, with the boxes around it and the ends of the changed links (drawn faded) to place it">Changes only</button></span>'
      : '') +
    renderMapPartsToolHtml(record, host) +
    renderColumnsToolHtml(record, host) +
    '<span class="diagram-tools-sep" aria-hidden="true"></span>' +
    renderDiagramShowGroupHtml(host ? host.isMap : !record, host ? host.shows : undefined) +
    '<span class="diagram-tools-sep" aria-hidden="true"></span>' +
    '<span class="button-group" role="group" aria-label="Zoom">' +
    '<button type="button" data-action="diagram-zoom" data-dir="out" aria-label="Zoom out" title="Zoom out (−)">−</button>' +
    '<button type="button" id="diagram-zoom-label" data-action="diagram-zoom" data-dir="reset" aria-label="Actual size" title="Actual size (0)">100%</button>' +
    '<button type="button" data-action="diagram-zoom" data-dir="in" aria-label="Zoom in" title="Zoom in (+)">+</button></span>' +
    '<button type="button" id="diagram-center-button" data-action="diagram-recenter" data-lit="' +
    (diagramScale === 'auto') +
    '" title="Back to how the diagram opens: this element in the middle, at a readable size (C). Lit while the diagram is framed that way.">Center</button>' +
    '<button type="button" id="diagram-fit-button" data-action="diagram-zoom" data-dir="fit" aria-pressed="' +
    (diagramScale === 'fit') +
    '" title="Fit the whole diagram in the panel (F)">Fit</button>' +
    '</div></div>' +
    // under the drawing: what it is (its status), the hint, and the key to the lines
    '<div class="diagram-status"><span id="diagram-status" role="status"></span><span id="diagram-hint"></span><span id="diagram-legend" class="dg-legend"></span></div>'
  );
}

/**
 * Download the diagram: two buttons set side by side, one click each, rather than a menu to open for two choices. Off
 * until a drawing is on screen (`showDiagramScene` turns them on).
 */
function renderDiagramDownloadHtml() {
  const icon =
    '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><path d="M8 2v8M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const tool = (format, title) =>
    '<button type="button" class="download-button" data-action="diagram-export" data-format="' +
    format +
    '" disabled aria-label="Download as ' +
    format.toUpperCase() +
    '" title="' +
    escapeHtml(title) +
    '">' +
    icon +
    '<span>' +
    format.toUpperCase() +
    '</span></button>';
  return (
    '<span class="button-group" role="group" aria-label="Download the diagram">' +
    tool('png', 'Download the diagram as a PNG image, twice the size it has on screen') +
    tool('svg', 'Download the diagram as a self-contained SVG file') +
    '</span>'
  );
}

/**
 * The two toggles of the Map of the technology layer (issue #107): the applications deployed on the nodes and the relationships, each drawn or left out. Only there: the Map of the
 * application layer and the diagrams of an element have neither. On the page of a saved view they edit the view, as the texts do.
 */
function renderMapPartsToolHtml(record, host) {
  const parts = host
    ? host.isMap && host.layer === 'technology'
      ? host.parts
      : null
    : !record && mapLayer() === 'technology'
      ? mapPartsShown()
      : null;
  if (!parts) return '';
  const tool = (name, label, title) =>
    '<button type="button" data-action="toggle-map-part" data-part="' +
    name +
    '" aria-pressed="' +
    parts[name] +
    '" title="' +
    escapeHtml(title) +
    '">' +
    label +
    '</button>';
  return (
    '<span class="button-group" role="group" aria-label="What the map draws">' +
    tool(
      'applications',
      'Applications',
      'Draw the applications deployed on the nodes, as boxes inside the nodes that are open'
    ) +
    tool(
      'relationships',
      'Relationships',
      'Draw the links: the relationships that environments and nodes declare, and the dependencies between environments that the deployed applications give'
    ) +
    '</span>'
  );
}

/** The texts the diagram draws, each one a button that is lit while it is shown. */
function renderDiagramShowGroupHtml(isMap, drawn) {
  const shows = drawn || diagramShows(isMap); // `drawn`: what the page of a view in the Library draws
  const tool = (name, label, title) =>
    '<button type="button" data-action="toggle-show" data-show="' +
    name +
    '" aria-pressed="' +
    shows[name] +
    '" title="' +
    escapeHtml(title) +
    '">' +
    label +
    '</button>';
  return (
    '<span class="button-group" role="group" aria-label="Show">' +
    tool('labels', 'Labels', 'The caption of each link: its label, and its qualifiers in brackets') +
    tool('qualifiers', 'Qualifiers', 'The qualifiers of each element, after its kind') +
    tool(
      'descriptions',
      'Descriptions',
      'The description of each element that does not contain others, up to ' +
        DIAGRAM_DESCRIPTION_LINES +
        ' lines (all of it with Wrap)'
    ) +
    tool(
      'wrap',
      'Wrap',
      'Break long names, qualifiers and descriptions over several lines instead of cutting them with an ellipsis (a box that contains others still cuts its kind), and show the whole of a long link label (otherwise cut after four lines)'
    ) +
    '</span>'
  );
}

/**
 * What the toolbar's "Fold all" / "Unfold all" act on: the boxes that contain others (except the focal one and the
 * ones around it, which the kernel never folds) and the boxes that hide children of the model.
 */
function diagramFoldTargets(result, focalReference) {
  const parents = new Set(result.items.map((item) => item.parent).filter(Boolean));
  const foldable = result.items
    .filter((item) => parents.has(item.id) && item.id !== focalReference && !focalReference.startsWith(item.id + '.'))
    .map((item) => item.id);
  const expandable = result.items.filter((item) => item.expandable).map((item) => item.id);
  return { foldable, expandable };
}

/**
 * Issue #37. The two caches that follow (`diagramCache`, `treeQuietCache`) are keyed on the version of the models (`modelVersion`, bumped by `modelsChanged()`)
 * and on the small parts that vary, never on the kernel input: that input carries every element of the model (the union of the two plateaus with a comparison
 * on), and serialising it, or walking the index to fingerprint it, cost a render in proportion to the model for an answer that had not changed.
 * What a key holds is whatever else a drawing or a quiet set is made from: the facet as the kernel reads it, `changesOnly`, `hideWording`, the plateau
 * compared with, the text of an empty relationship, the styles. The entry also keeps the two indexes it was made from, and is used only while they are the
 * ones now (a net under a replacement of a model that forgot `modelsChanged()`, as `comparisonCache` has).
 */
function modelsNow() {
  return { index: AppState.index, baselineIndex: AppState.baseline ? AppState.baseline.index : null };
}

function modelsAreThoseOf(entry) {
  return entry.index === AppState.index && entry.baselineIndex === (AppState.baseline ? AppState.baseline.index : null);
}

/** The part of a cache key that tells which models a kernel input is made from and with what knobs; `comparison` is `comparisonState()`. */
function modelsKey(comparison, facet) {
  return [
    modelVersion,
    facet ? JSON.stringify(toKernelFacet(facet)) : '',
    comparison && comparison.layers
      ? 'vs:' +
        AppState.baseline.plateau.id +
        (comparison.future ? ':future' : '') +
        ':' +
        AppState.changesOnly +
        ':' +
        AppState.hideWording
      : '',
    AppState.workspace.settings.relationships.defaultSyntheticLabel
  ].join('~');
}

/** The key of the drawing `recipe` asks for (see `mountDiagramIfNeeded`): the models and the knobs of the kernel input, then what is drawn from its answer. */
function diagramCacheKey(recipe, comparison, viewKey) {
  const { isMap, reference, viewpoint, facet, mapState, shows, hideUnlinked } = recipe;
  const layer = isMap
    ? recipe.layer === 'technology'
      ? 'technology'
      : 'application'
    : recipe.layer || layerOfReference(reference) || 'technology'; // as `buildKernelInput` settles it
  return (
    [
      modelsKey(comparison, facet),
      viewpoint,
      layer,
      reference,
      isMap ? JSON.stringify([mapState.opened, mapState.pinned, mapState.hidden]) : '',
      // wave 026 run 0199: the relationships a Map is narrowed to; the key is the one it always was when there are none
      isMap && mapState.links && mapState.links.length ? JSON.stringify(canonicalLinkEntries(mapState.links)) : '',
      // wave 026 run 0200: the relationships drawn heavy; a map without one keeps the key it had
      isMap && mapState.highlight && mapState.highlight.length
        ? 'highlight:' + JSON.stringify(canonicalLinkEntries(mapState.highlight))
        : '',
      // issue #107: what a Map of the technology layer draws besides its elements is part of what is drawn
      isMap && layer === 'technology'
        ? JSON.stringify([recipePartsOf(recipe).applications, recipePartsOf(recipe).relationships])
        : '',
      hideUnlinked,
      JSON.stringify(shows),
      JSON.stringify(AppState.workspace.styles || null)
    ]
      // wave 027, run 0202 (DEC-6): only a diagram that has a value says it, so every other key is the string it was
      .concat(recipe.columns ? ['cols:' + recipe.columns] : [], [viewKey])
      .join('|')
  );
}

/**
 * The references whose diagram has nothing to draw through the facet, in the viewpoint now selected (what a click on
 * the element would show). The kernel answers for a whole layer in one call (`quiet`, issue #81: one `compute` per element cost 420 ms on the 82 elements of
 * the largest plateau of the Brightcart fixture, in proportion to the model): the kernel input of the layer goes in once, with the elements to ask about
 * and the viewpoint each one is drawn in, so at most two calls however many elements there are. Cached until the model, the facet or the viewpoint changes.
 */
function quietReferencesThroughFacet(kernel, facet) {
  // issue #37: found in the cache from the version of the models and the knobs, before any kernel input is built
  const viewpointKey = mapIsShown() || elementTab === 'details' ? 'overview' : elementTab;
  const key = viewpointKey + '|' + modelsKey(comparisonState(), facet);
  if (treeQuietCache && treeQuietCache.key === key && modelsAreThoseOf(treeQuietCache)) return treeQuietCache.quiet;
  const models = modelsNow();
  const quiet = new Set();
  for (const layer of ['application', 'technology']) {
    const first = AppState.index[layer].keys().next().value;
    if (first === undefined) continue;
    const focals = [];
    for (const [reference, record] of AppState.index[layer]) {
      const viewpoint =
        mapIsShown() || elementTab === 'details' || (elementTab === 'detailed' && LEAF_KINDS.includes(record.kind))
          ? 'overview'
          : elementTab;
      focals.push({ reference, viewpoint });
    }
    const input = buildKernelInput('overview', first, { layer, facet }).input;
    delete input.focal;
    input.focals = focals;
    const out = kernel.quiet(input);
    // an error through a facet: the facet removes the elements (or fails for all of them, as `compute` does for each)
    if (out.error) {
      if (facet) focals.forEach((focal) => quiet.add(focal.reference));
    } else out.quiet.forEach((reference) => quiet.add(reference));
  }
  treeQuietCache = Object.assign({ key, quiet }, models);
  return quiet;
}

/**
 * In the Diagram perspective, with a facet picked, dims the elements of the tree that the facet leaves with nothing to
 * draw — so the elements worth clicking stand out. Applied on the DOM after the render, like the diagram itself.
 */
async function markTreeThroughFacet() {
  const rows = Array.from(document.querySelectorAll('.tree-node-row[data-ref]'));
  // the map has no element of its own to be quiet: its tree says what is on the map (.off-map), not what the facet empties
  const facet = anyDiagramShown() && !mapIsShown() ? currentDiagramFacet() : null;
  if (!facet) {
    rows.forEach((row) => {
      row.classList.remove('quiet');
      row.removeAttribute('title');
    });
    return;
  }
  try {
    const kernel = await loadViewpointKernel();
    if (currentDiagramFacet() !== facet || mapIsShown()) return; // a newer render took over
    const quiet = quietReferencesThroughFacet(kernel, facet);
    document.querySelectorAll('.tree-node-row[data-ref]').forEach((row) => {
      const isQuiet = quiet.has(row.getAttribute('data-ref'));
      row.classList.toggle('quiet', isQuiet);
      if (isQuiet) row.title = 'Facet “' + facet.name + '” leaves nothing to draw for this element.';
      else row.removeAttribute('title');
    });
  } catch (e) {
    console.error('Marking the tree through the facet failed', e);
  }
}

/**
 * What a diagram draws, and nothing else the pipeline needs to decide: the one argument of `mountDiagramIfNeeded`. A host builds
 * it from the state it owns and the pipeline never reads that state itself, so a host cannot disturb another one:
 *   host      'main' (the Map and the diagrams of Elements, which read the page's state) or 'library' (the page of a view);
 *   view      the saved view, for 'library';
 *   isMap, reference, record   the map of the workspace, or the element drawn (`record` is its model);
 *   layer     the layer of the element (undefined: `layerOfReference` picks it, as the Map and Elements always did);
 *   viewpoint 'map', or the viewpoint actually drawn; facet: the facet of the settings, or null;
 *   mapState  { opened, pinned, hidden } of a map, else null;
 *   hideUnlinked, shows   whether the boxes no link reaches are left out; the texts drawn (the four, as booleans).
 */
function mainDiagramRecipe(canvas) {
  const isMap = canvas.hasAttribute('data-map');
  const reference = isMap ? '' : canvas.getAttribute('data-ref');
  const record = isMap ? null : findElementRecord(reference);
  if (!isMap && !record) return null;
  return {
    host: 'main',
    view: null,
    isMap,
    reference,
    record,
    layer: isMap ? mapLayer() : undefined,
    // the diagram of the Elements perspective is always the overview of the element, whatever the Diagram perspective shows
    viewpoint: isMap ? 'map' : effectiveDiagramViewpoint(record),
    facet: currentDiagramFacet(),
    mapState: isMap ? currentMapState() : null,
    parts: isMap ? mapPartsShown() : null,
    hideUnlinked: diagramHideUnlinked,
    shows: diagramShows(isMap),
    ...columnsOfRecipe(null, isMap ? 'map' : effectiveDiagramViewpoint(record), diagramColumns)
  };
}

/** `{ columns, layoutProblem }` of a diagram: the level in force (DEC-2). The toolbar's value is the editor's alone: a view or a step passes none. */
function columnsOfRecipe(view, viewpoint, toolbar) {
  const resolved = resolveDiagramColumns({ toolbar, view, settings: AppState.workspace.settings, viewpoint });
  return { columns: resolved.columns, layoutProblem: resolved.problem };
}

function libraryPickFor(viewId) {
  if (libraryPick.view !== viewId) libraryPick = { view: viewId, selection: null };
  return libraryPick;
}

const NO_SELECTION = Object.freeze({ kind: 'none', key: null, mode: 'view' });

/** The selection of the diagram on screen: the page's own on the page of a view in the Library, else the one of the Map and Elements. */
function diagramSelection() {
  if (currentPerspective !== 'library') return AppState.selection;
  return (libraryTab === 'views' && libraryPickFor(selectedViewId).selection) || NO_SELECTION;
}

/** The parts a recipe says the Map draws: both when it says nothing. */
function recipePartsOf(recipe) {
  return recipe.parts || { applications: true, relationships: true };
}

/** What a saved Map view draws besides its elements: both parts unless its properties say `false` (the Map of the application layer has neither, so both are drawn there). */
function mapPartsOf(view) {
  const properties = isPlainObject(view.properties) ? view.properties : {};
  const parts = {};
  for (const part of MAP_PARTS) parts[part] = viewLayerOf(view) !== 'technology' || properties[part] !== false;
  return parts;
}

/** The recipe of a saved view, or null when it cannot be drawn (`viewProblem`). Reads the view and the model, and nothing else: an edit of the view is an edit of the entry. */
function libraryDiagramRecipe(view) {
  if (!view) return null;
  // an invalid `layout` is told in the diagram's own panel and the form stays on screen to correct it (wave 027, run 0202, DEC-7); any other problem leaves the view undrawn
  const properties = Object.assign({}, isPlainObject(view.properties) ? view.properties : {});
  delete properties.layout;
  if (viewProblem(Object.assign({}, view, { properties }))) return null;
  return viewDiagramRecipe(view, AppState.index, 'library', AppState.baseline ? AppState.baseline.index : null);
}

/**
 * The recipe of a view (or of a step that carries its own recipe) that can be drawn in the model `index`: the pins, the open and hidden boxes it names that the model has, the
 * facet, the texts and the parts of a map, as the view says them. `host` is the place that draws it (`library`, `story`). Reads the view, the settings and `index`, nothing else.
 */
function viewDiagramRecipe(view, index, host, baselineIndex) {
  const properties = isPlainObject(view.properties) ? view.properties : {};
  const isMap = view.viewpoint === 'map';
  const layer = viewLayerOf(view);
  const facet =
    typeof properties.facet === 'string'
      ? AppState.workspace.settings.facets.customs.find((candidate) => candidate.name === properties.facet) || null
      : null;
  const shows = shownTextsOf(view);
  const recipe = {
    host,
    view,
    isMap,
    reference: '',
    record: null,
    layer,
    viewpoint: 'map',
    facet,
    mapState: null,
    parts: isMap ? mapPartsOf(view) : null,
    hideUnlinked: properties['hide-unlinked'] === true,
    shows
  };
  if (isMap) {
    const known = (list) => stringList(list).filter((reference) => index[layer].has(reference));
    recipe.mapState = {
      opened: known(properties.opened),
      pinned: known(properties.pinned),
      hidden: known(properties.hidden)
    };
    // issue #143: the relationships of a Map of the application layer that the model drawn has (the one compared with too)
    if (layer === 'application') {
      const asked = linkEntriesOf(properties.links).entries;
      if (asked.length)
        recipe.mapState.links = drawnLinkEntries(asked, [
          index.application,
          baselineIndex ? baselineIndex.application : null
        ]);
      // the highlight the model drawn has; one it lacks is dropped and never makes "nothing is drawn" (DEC-3)
      const wanted = linkEntriesOf(properties.highlight, 'highlight').entries;
      if (wanted.length)
        recipe.mapState.highlight = drawnLinkEntries(wanted, [
          index.application,
          baselineIndex ? baselineIndex.application : null
        ]);
    }
  } else {
    recipe.reference = properties.element;
    recipe.record = index[layer].get(properties.element);
    recipe.viewpoint = leafSafeViewpoint(view.viewpoint, recipe.record);
  }
  // the player and the page of a view have no toolbar: the view, then the workspace (DEC-7)
  Object.assign(recipe, columnsOfRecipe({ id: view.id, properties }, recipe.viewpoint, null));
  return recipe;
}

/** The recipe of the diagram in `canvas`, from the host that wrote it; null when there is nothing to draw (the element is gone). */
function diagramRecipeOf(canvas) {
  if (canvas.getAttribute('data-host') === 'library')
    return libraryDiagramRecipe(findSavedView(canvas.getAttribute('data-view')));
  return mainDiagramRecipe(canvas);
}

/**
 * Called at the end of every render(): when the Diagram canvas is on screen, compute its viewpoint and draw it.
 * The computation is asynchronous (WebAssembly instantiation, ELK), so `diagramSeq` drops the answer of any request
 * that a newer render superseded, and an identical request is served from `diagramCache` without a flash.
 * What to draw comes from the recipe of the host that wrote the canvas (`diagramRecipeOf`), never from the page's state.
 */
function mountDiagramIfNeeded() {
  // every call supersedes the layouts still being computed, also when there is nothing to draw now: a layout started on
  // the map must not end (and be cached) after the user has left it
  const seq = ++diagramSeq;
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas) {
    diagramScene = null;
    pendingDiagramFocus = null;
    return;
  }
  const recipe = diagramRecipeOf(canvas);
  if (!recipe) return;
  const { isMap, reference, viewpoint, facet, mapState } = recipe;
  const readonly = recipe.host === 'library'; // the page of a view only shows the drawing
  // run 0039: a comparison needs the kernel before the input can be built (the union is its answer): load it, then draw again
  if ((comparisonState() || {}).pending) {
    loadViewpointKernel().then(
      () => {
        if (seq === diagramSeq) mountDiagramIfNeeded();
      },
      (e) => {
        if (seq === diagramSeq)
          showDiagramScene(
            buildDiagramScene(
              'kernel-error',
              '<div class="error-panel">The diagram could not be computed: ' +
                escapeHtml(e && e.message ? e.message : String(e)) +
                '</div>',
              '',
              '',
              { width: 0, height: 0 },
              null
            )
          );
      }
    );
    return;
  }
  // issue #37: the key is the version of the models and the small parts that vary, so a render that finds its drawing in `diagramCache` builds no kernel input
  // and serialises no model. The input is built below, only when the drawing is to be computed.
  const viewKey = [
    isMap ? 'map' : reference,
    viewpoint,
    facet ? facet.name : '',
    isMap ? mapState.pinned.join(',') : ''
  ]
    .concat(
      isMap && mapState.links && mapState.links.length ? [JSON.stringify(canonicalLinkEntries(mapState.links))] : [],
      isMap && mapState.highlight && mapState.highlight.length
        ? ['highlight:' + JSON.stringify(canonicalLinkEntries(mapState.highlight))]
        : [],
      isMap && recipe.layer === 'technology' ? ['technology'] : [],
      readonly ? ['view:' + recipe.view.id] : []
    )
    .join('|');
  const comparison = comparisonState();
  const key = diagramCacheKey(recipe, comparison, viewKey);
  const nothing = nothingDrawnScene(
    viewKey,
    comparison,
    // the page Applications: relationships ticked and none of them in the model drawn is not the whole map
    isMap &&
      recipe.host === 'main' &&
      recipe.layer === 'application' &&
      mapLinks.length &&
      !(mapState.links || []).length
      ? 'none of the relationships ticked is in this plateau.'
      : ''
  );
  if (nothing) {
    showDiagramScene(nothing);
    return;
  }
  if (diagramCache && diagramCache.key === key && modelsAreThoseOf(diagramCache)) {
    showDiagramScene(Object.assign({}, diagramCache.scene));
    return;
  }
  const { input } = buildKernelInput(
    viewpoint,
    reference,
    isMap
      ? {
          facet,
          layer: recipe.layer,
          opened: mapState.opened,
          pinned: mapState.pinned,
          links: mapState.links,
          highlight: mapState.highlight,
          applications: recipePartsOf(recipe).applications,
          relationships: recipePartsOf(recipe).relationships
        }
      : { facet, layer: recipe.layer }
  );
  if (isMap) input.hidden = mapState.hidden;
  const models = modelsNow(); // taken before the drawing is computed: an edit that lands while it is being laid out makes the entry stale, not fresh
  (async () => {
    try {
      const [kernel, elk] = await Promise.all([loadViewpointKernel(), loadElk()]);
      const { scene, cacheable } = await computeDiagramScene(
        recipe,
        input,
        comparison,
        null,
        kernel,
        elk,
        viewKey,
        readonly
      );
      if (seq !== diagramSeq) return;
      if (!cacheable) {
        showDiagramScene(scene);
        return;
      } // a message (an error, a facet that removes the element) is shown, not kept
      diagramCache = Object.assign({ key, scene }, models);
      showDiagramScene(Object.assign({}, scene));
    } catch (e) {
      console.error('Diagram failed', e);
      if (seq === diagramSeq) {
        showDiagramScene(
          buildDiagramScene(
            viewKey,
            '<div class="error-panel">The diagram could not be computed: ' +
              escapeHtml(e && e.message ? e.message : String(e)) +
              '</div>',
            '',
            '',
            { width: 0, height: 0 },
            null
          )
        );
      }
    }
  })();
}

/**
 * The scene of a recipe: what `showDiagramScene` puts on screen, computed from a kernel input and nothing else (wave 021, run 0152, #153: the editor's `mountDiagramIfNeeded` and the
 * story player draw through this one function). `input` is the kernel's input (`buildKernelInput`, with the lists of a map), `comparison` the comparison it was made with (or null),
 * `source` what the drawing reads of the model beside the input: null for the editor's own (`AppState.index` and the comparison on screen), else the `{ index, baselineIndex, comparison,
 * changesOnly }` of a step (`storyStepScene`). It reads no selection, writes no global and no `AppState`, and touches no cache or page. Returns `{ scene, cacheable }`: `cacheable` is
 * false for a message (an error, a facet that removes the element), which the editor shows and does not keep.
 */
async function computeDiagramScene(recipe, input, comparison, source, kernel, elk, viewKey, readonly) {
  const { isMap, reference, record, viewpoint, facet, shows, hideUnlinked } = recipe;
  if (recipe.layoutProblem) {
    return {
      scene: buildDiagramScene(
        viewKey,
        '<div class="error-panel">' + escapeHtml(recipe.layoutProblem) + '</div>',
        '',
        '',
        { width: 0, height: 0 },
        null
      ),
      cacheable: false
    };
  }
  const result = isMap && facet ? computeMapThroughFacet(kernel, input) : kernel.compute(input);
  if (result.error) {
    const removed =
      !isMap && facet && facetRemovesElement(kernel, viewpoint, reference, recipe.layer, result.error, source);
    return {
      scene: buildDiagramScene(
        viewKey,
        removed
          ? '<div class="muted diagram-empty">Nothing to show: facet “' +
              escapeHtml(facet.name) +
              '” removes this element.' +
              (readonly ? '' : ' <button type="button" data-action="clear-facet">Show it without the facet</button>') +
              '</div>'
          : '<div class="error-panel">' + escapeHtml(result.error) + '</div>',
        '',
        '',
        { width: 0, height: 0 },
        null
      ),
      cacheable: false
    };
  }
  if (comparison && comparison.layers) tellRemovedItems(result, comparison, input.layer, source);
  const ghosts = buildDiagramGhosts(result, isMap ? null : reference, input.layer, source);
  let drawn = { items: result.items.concat(ghosts.items), links: result.links.concat(ghosts.links) };
  let shownResult = result;
  let hiddenCount = 0;
  if (hideUnlinked) {
    const kept = hideUnlinkedItems(drawn.items, drawn.links, isMap ? input.pinned : reference);
    hiddenCount = kept.hidden;
    drawn = { items: kept.items, links: kept.links };
    const ids = new Set(kept.items.map((item) => item.id));
    shownResult = Object.assign({}, result, {
      items: result.items.filter((item) => ids.has(item.id)),
      links: result.links.filter((link) => ids.has(link.from) && ids.has(link.to))
    });
  }
  let status = diagramStatusText(viewpoint, reference, facet, shownResult, ghosts, input.layer);
  if (hiddenCount) status += ' ' + hiddenCount + ' unlinked ' + (hiddenCount === 1 ? 'box' : 'boxes') + ' hidden.';
  // the styled stereotypes of the boxes on screen, each once, in the order they are met
  const drawnStereotypes = [];
  for (const item of drawn.items)
    for (const name of item.ghost || !Array.isArray(item.stereotypes) ? [] : item.stereotypes)
      if (!drawnStereotypes.includes(name)) drawnStereotypes.push(name);
  const legend =
    diagramLegendHtml(ghosts.items.length > 0, drawnStereotypes) +
    (comparison && comparison.layers
      ? diagramComparisonLegendHtml(comparison, comparisonCountsOf(shownResult, isMap ? null : reference))
      : '');
  let scene;
  if (!elk) {
    scene = buildDiagramScene(
      viewKey,
      renderDiagramFallbackHtml(drawn, input.layer, readonly, source),
      status,
      '',
      { width: 0, height: 0 },
      null
    );
    scene.drawnIds = new Set(drawn.items.filter((item) => !item.ghost).map((item) => item.id));
  } else if (isMap && !drawn.items.length) {
    scene = buildDiagramScene(
      viewKey,
      '<div class="muted diagram-empty">Nothing to show: the map has no ' +
        (input.layer === 'technology' ? 'technology' : 'application') +
        ' element' +
        (input.hidden.length
          ? ' left once the hidden ones are out' +
            (readonly ? '.' : ': show some again with their eye, or with the chips above the map.')
          : ' yet.') +
        '</div>',
      status,
      '',
      { width: 0, height: 0 },
      null
    );
    scene.drawnIds = new Set();
  } else if (!isMap && diagramHasNothingToDraw(drawn)) {
    const hint =
      viewpoint === 'overview' && !LEAF_KINDS.includes(record.kind)
        ? readonly
          ? ' (the deep viewpoint includes what is inside it)'
          : ' (try Deep to include what is inside it)'
        : '';
    scene = buildDiagramScene(
      viewKey,
      diagramEmptyHtml(kernel, viewpoint, reference, facet, hint, { readonly, layer: recipe.layer, source }),
      status,
      '',
      { width: 0, height: 0 },
      null
    );
  } else {
    // the Map starts without captions on its links (they take most of its room): the tooltip says what a link stands for
    const drawing = renderDiagramSvg(
      await elk.layout(
        buildElkGraph(drawn, {
          captions: shows.labels,
          qualifiers: shows.qualifiers,
          descriptions: shows.descriptions,
          wrap: shows.wrap,
          itemLayer: recipe.layer,
          columns: recipe.columns,
          source
        })
      ),
      drawn,
      reference,
      {
        map: isMap,
        layer: input.layer,
        opened: isMap ? input.opened : [],
        pinned: isMap ? input.pinned : [],
        show: shows,
        readonly,
        itemLayer: recipe.layer,
        source
      }
    );
    scene = buildDiagramScene(viewKey, drawing.html, status, legend, drawing, drawing.focal);
    scene.boxes = drawing.boxes;
    scene.links = drawing.links;
    scene.drawnIds = new Set(Object.keys(drawing.boxes));
  }
  // the applications deployed on the nodes that the Map of the technology layer draws are elements of the other layer: a box has their reference, not their id (issue #107)
  if (isMap)
    scene.drawnApps = new Set(
      drawn.items.filter((item) => !item.ghost && item.id !== item.reference).map((item) => item.reference)
    );
  if (isMap && !readonly) Object.assign(scene, diagramFoldTargets(shownResult, reference));
  return { scene, cacheable: true };
}

/**
 * The scene that says nothing is drawn, or null: a reference declared more than once (a model that has no single answer is not drawn from), or two plateaus that cannot be compared
 * (a reference twice in the baseline, a pair the kernel refuses). `comparison` is the comparison the drawing is made with. Both are mistakes of the workspace, not of the view.
 */
function nothingDrawnScene(viewKey, comparison, emptyChoice) {
  const duplicates = elementDuplicates();
  if (duplicates.length) {
    return buildDiagramScene(
      viewKey,
      '<div class="error-panel" role="alert"><strong>Nothing is drawn: ' +
        (duplicates.length === 1 ? 'a reference is' : duplicates.length + ' references are') +
        ' declared more than once.</strong><ul>' +
        duplicates.map((d) => '<li>' + duplicateMessageHtml(d.message) + '</li>').join('') +
        '</ul></div>',
      '',
      '',
      { width: 0, height: 0 },
      null
    );
  }
  if (comparison && comparison.problems) {
    return buildDiagramScene(
      viewKey,
      '<div class="error-panel" role="alert"><strong>Nothing is drawn: ' +
        escapeHtml(comparison.problems[0]) +
        '</strong>' +
        (comparison.problems.length > 1
          ? '<ul>' +
            comparison.problems
              .slice(1)
              .map((m) => '<li>' + duplicateMessageHtml(m) + '</li>')
              .join('') +
            '</ul>'
          : '') +
        '</div>',
      '',
      '',
      { width: 0, height: 0 },
      null
    );
  }
  if (emptyChoice) {
    return buildDiagramScene(
      viewKey,
      '<div class="error-panel" role="alert"><strong>Nothing is drawn: ' +
        escapeHtml(emptyChoice) +
        '</strong> <button type="button" data-action="map-links-clear">Clear</button></div>',
      '',
      '',
      { width: 0, height: 0 },
      null
    );
  }
  return null;
}

/** The center of Elements on a diagram tab: the header (tabs, facet, Maximize) and the diagram of the selected element. */
function renderElementDiagramHtml(record) {
  return (
    '<div class="diagram-view">' +
    renderStoryBarHtml() +
    renderElementHeaderHtml(
      renderElementTitleHtml(record),
      renderDiagramHeaderActionsHtml(renderShowOnMapButtonHtml(record))
    ) +
    renderDiagramCanvasHtml(record) +
    '</div>'
  );
}

/** Elements → Map: the same element, in the whole layer it lives in (the page Applications, or the page Environments for an element of the technology layer). */
function renderShowOnMapButtonHtml(record) {
  const layer = record.layer === 'technology' ? 'technology' : 'application';
  if (!AppState.index[layer].has(record.reference)) return '';
  return (
    '<button type="button" class="with-icon" data-action="show-on-map" data-ref="' +
    escapeHtml(record.reference) +
    '" data-layer="' +
    layer +
    '" aria-label="Show on map" title="Draw the map of the ' +
    (layer === 'technology' ? 'technology layer' : 'workspace') +
    ' keeping only what touches this element">' +
    controlIconHtml(CONTROL_ICON_PATHS.map) +
    '<span class="control-label">Show on map</span></button>'
  );
}

/** The title of a page that draws a Map, by the layer it draws. */
const MAP_PAGE_TITLES = { application: 'Applications', technology: 'Environments' };

/**
 * Map perspective — the whole layer from its roots down, whatever is selected: the element tree on the left says
 * what the map is about (pin) and what it leaves out (hide); picking an element finds it on the map, and clicking a
 * box selects it. The selected element is read in the panel on the right (nothing is rendered while nothing is selected,
 * or when maximized); its relationships are on its Details, one click away. Two pages are a Map: Applications (the application layer)
 * and Environments (the technology layer, wave 015, run 0099); `mapLayer()` tells which one is on screen.
 */
function renderMapPerspectiveHtml() {
  const sel = AppState.selection;
  const record = sel.kind === 'element' ? findElementRecord(sel.key, sel.layer) : null;
  return {
    left: diagramMaximized ? null : renderLeftPanelWrapperHtml(renderMapScopeHtml() + renderMapLinksListHtml()),
    center:
      '<div class="diagram-view">' +
      renderStoryBarHtml() +
      renderElementHeaderHtml(
        '<h2>' +
          MAP_PAGE_TITLES[mapLayer()] +
          '</h2>' +
          (record
            ? '<span class="element-header-subject" title="Selected on the map">' +
              escapeHtml(record.name || record.id) +
              '</span>'
            : ''),
        renderDiagramHeaderActionsHtml(renderOpenAsDiagramButtonHtml(record))
      ) +
      renderDiagramCanvasHtml(null, renderMapChipsHtml()) +
      '</div>',
    right: renderInspectionHtml(true),
    bottom: null
  };
}

/** Map → Diagram: the selected element, on its own. */
function renderOpenAsDiagramButtonHtml(record) {
  if (!record) return '';
  return (
    '<button type="button" class="with-icon" data-action="open-as-diagram" data-ref="' +
    escapeHtml(record.reference) +
    '" data-layer="' +
    escapeHtml(record.layer || 'application') +
    '" aria-label="Open in Elements" title="Open this element in Elements, on its diagram: its relationships, on their own">' +
    controlIconHtml(CONTROL_ICON_PATHS.elements) +
    '<span class="control-label">Open in Elements</span></button>'
  );
}

/** The elements of the layer the Map draws, each with what the map does with it: Pin keeps only what touches it, Hide leaves it out. */
function renderMapScopeHtml() {
  const layer = mapLayer();
  const roots = (AppState.workspace && AppState.workspace[layer] && AppState.workspace[layer].elements) || [];
  const visible = [];
  const collect = (record) => {
    visible.push(nodeKey(record.reference, layer));
    if (AppState.expanded.has(nodeKey(record.reference, layer))) sortedForNav(record.children).forEach(collect);
  };
  sortedForNav(roots).forEach(collect);
  // one tab stop for the whole tree: the row the user was on, or the first one
  resolveNavActive(visible);
  navTabStopGiven = false;
  let html =
    '<div class="nav-section map-scope">' +
    renderNavHeaderHtml(MAP_PAGE_TITLES[layer], renderNavToolsHtml(layer)) +
    '<div class="map-scope-hint" id="map-scope-hint">Pin (P) keeps only what touches an element. The eye (H) leaves it out. Greyed rows are not on the map.</div>';
  treeComparison = comparisonForTrees();
  try {
    html += roots.length
      ? '<div role="tree" aria-label="' +
        (layer === 'technology' ? 'Technology' : 'Application') +
        ' elements of the map" aria-describedby="map-scope-hint">' +
        sortedForNav(roots)
          .map((r) => renderMapScopeNodeHtml(r, 1))
          .join('') +
        '</div>'
      : '<div class="tree-empty">No elements.</div>';
  } finally {
    treeComparison = null;
  }
  return html + '</div>';
}

/** Is the element on the map as it is drawn now: as a box, or inside a box that is folded? Null while no drawing says (computing, fallback). */
function mapElementIsOnMap(reference, layer) {
  const boxes = diagramScene && diagramScene.boxes;
  if (!boxes || !String(diagramScene.viewKey).startsWith('map|')) return null; // a drawing of the map only
  if (layer === 'application' && mapLayer() === 'technology')
    return diagramScene.drawnApps ? diagramScene.drawnApps.has(reference) : null; // a deployed application: not known while the drawing is a fallback
  const folded = diagramScene.expandable || [];
  if (Object.prototype.hasOwnProperty.call(boxes, reference)) return true;
  for (let ref = String(reference); ref.includes('.');) {
    ref = ref.slice(0, ref.lastIndexOf('.'));
    if (Object.prototype.hasOwnProperty.call(boxes, ref)) return folded.includes(ref); // an open box draws what it shows: the rest is out
  }
  return false;
}

/** What a screen reader hears for a row of the tree of the map: the name, then the state the colours and the icons show. */
function mapScopeRowLabel(name, pinned, hidden, offMap, stereotypes, change) {
  return (
    name +
    (stereotypes ? ', ' + stereotypes : '') +
    (pinned ? ', pinned' : '') +
    (hidden ? ', hidden' : '') +
    (offMap && !hidden ? ', not on the map' : '') +
    (change ? ', ' + CHANGE_WORDS[change].word : '')
  );
}

/** Grey the rows of the elements the map does not draw (a pin, a hidden element or "Hide unlinked" left them out); applied after each drawing. */
function markMapScope() {
  document.querySelectorAll('.map-scope-row').forEach((row) => {
    const onMap = mapElementIsOnMap(nodeKeyReference(row.getAttribute('data-node')));
    const offMap = onMap === false;
    const pinned = row.classList.contains('pinned');
    const hidden = row.classList.contains('left-out');
    row.classList.toggle('off-map', offMap && !hidden);
    if (offMap && !hidden) row.title = 'Not on the map right now';
    else row.removeAttribute('title');
    row.setAttribute(
      'aria-label',
      mapScopeRowLabel(
        row.getAttribute('data-name'),
        pinned,
        hidden,
        offMap,
        row.getAttribute('data-stereotypes'),
        row.getAttribute('data-change')
      )
    );
  });
}

/** A short form of the kind for the tree of the map, where every pixel of the row is wanted by the name. */
const MAP_KIND_ABBREVIATIONS = {
  person: 'PRS',
  system: 'SYS',
  solution: 'SOL',
  container: 'CTN',
  component: 'CMP',
  environment: 'ENV',
  node: 'NOD'
};

/** The short form of a kind for the rows of both trees (the full kind is in the tooltip). */
function kindAbbreviation(kind) {
  const k = String(kind);
  return MAP_KIND_ABBREVIATIONS[k] || k.slice(0, 3).toUpperCase();
}

/** Pin and Hide on the rows of the tree of the map: two small icons, 14px, each drawing the state the element is in (outline: not, filled / crossed: yes). */
const MAP_PIN_PATH = 'M9.5 1.5l5 5-1.6.6-2.3 2.3.2 3-1.3 1.3-2.5-2.5L3 14.2 1.8 13l3.7-3.9L3 6.6 4.3 5.3l3 .2L9.6 3.2z';
const MAP_ICON_OPEN = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">';
const MAP_PIN_ICON = MAP_ICON_OPEN + '<path d="' + MAP_PIN_PATH + '" fill="currentColor"/></svg>'; // pinned
const MAP_UNPINNED_ICON =
  MAP_ICON_OPEN +
  '<path d="' +
  MAP_PIN_PATH +
  '" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const MAP_EYE =
  '<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="1.9" fill="currentColor"/>';
const MAP_VISIBLE_ICON = MAP_ICON_OPEN + MAP_EYE + '</svg>';
const MAP_HIDE_ICON =
  MAP_ICON_OPEN + MAP_EYE + '<path d="M2.5 13.5l11-11" stroke="currentColor" stroke-width="1.6"/></svg>'; // hidden

function renderMapScopeNodeHtml(record, level) {
  const reference = record.reference;
  const hasChildren = Array.isArray(record.children) && record.children.length > 0;
  const layer = mapLayer(); // a map draws one layer
  const map = mapStateOf(layer);
  const key = nodeKey(reference, layer);
  const isExpanded = AppState.expanded.has(key);
  const pinned = map.pinned.includes(reference);
  const hidden = map.hidden.some((h) => reference === h || reference.startsWith(h + '.'));
  const hiddenItself = map.hidden.includes(reference);
  const encloses = map.pinned.some((p) => p === reference || p.startsWith(reference + '.'));
  const offMap = mapElementIsOnMap(reference) === false && !hidden;
  const label = record.name !== undefined && record.name !== null && record.name !== '' ? record.name : record.id;
  const ref = escapeHtml(reference);
  const kind = String(record.kind);
  const abbreviation = kindAbbreviation(kind);
  const groupId = treeGroupId('map-scope-group-', record.layer || layer, reference);
  const styled = styledStereotypesOf(stereotypesOfRecord(record));
  const change = treeChangeOf(record); // a comparison: the glyph after the name (run 0040)
  // a row folds or unfolds its branch, nothing more: the tree of the map selects no element
  let html =
    '<div class="tree-node"><div class="tree-node-row map-scope-row' +
    (pinned ? ' pinned' : '') +
    (hidden ? ' left-out' : '') +
    (offMap ? ' off-map' : '') +
    (hasChildren ? ' foldable' : '') +
    '"' +
    ' role="treeitem" style="--level:' +
    level +
    '" aria-level="' +
    level +
    '"' +
    (hasChildren ? ' aria-expanded="' + isExpanded + '"' + (isExpanded ? ' aria-owns="' + groupId + '"' : '') : '') +
    ' tabindex="' +
    navTabIndex(key) +
    '" data-node="' +
    escapeHtml(key) +
    '" data-name="' +
    escapeHtml(label) +
    '"' +
    (styled.length ? ' data-stereotypes="' + escapeHtml(styled.join(', ')) + '"' : '') +
    (change ? ' data-change="' + change + '"' : '') +
    ' aria-label="' +
    escapeHtml(mapScopeRowLabel(label, pinned, hidden, offMap, styled.join(', '), change)) +
    '"' +
    (offMap ? ' title="Not on the map right now"' : '') +
    (hasChildren ? ' data-action="toggle-element" data-ref="' + ref + '" data-layer="' + layer + '"' : '') +
    '>';
  html += hasChildren
    ? '<span class="tree-toggle" aria-hidden="true">' + (isExpanded ? '▾' : '▸') + '</span>'
    : '<span class="tree-toggle tree-toggle-empty" aria-hidden="true">▸</span>';
  html +=
    '<span class="tree-node-kind" title="' +
    escapeHtml(kind) +
    '">' +
    escapeHtml(abbreviation) +
    '</span>' +
    '<span class="tree-node-label" title="' +
    escapeHtml(label) +
    '">' +
    escapeHtml(label) +
    '</span>' +
    treeChangeMarkHtml(change) +
    stereotypeBadgesHtml(styled);
  // what the map does with the element is visible without hovering; the buttons themselves appear on hover, focus and the active row
  if (pinned) html += '<span class="map-scope-mark" title="Pinned" aria-hidden="true">' + MAP_PIN_ICON + '</span>';
  // Pin is always the last button, at the same place under the mouse: Hide comes before it, and is not drawn at all when it cannot be used
  // (a pinned element, or one around a pinned element, is not hidden), so that pinning or unpinning never moves the button to click next.
  // The buttons are for the pointer and the finger: the keyboard has the row itself (arrows, P and H), so they are not tab stops.
  const canHide = !pinned && !encloses;
  html +=
    '<span class="map-scope-actions">' +
    (canHide || hiddenItself
      ? '<button type="button" tabindex="-1" class="map-scope-btn" data-action="map-hide" data-ref="' +
        ref +
        '" aria-pressed="' +
        hiddenItself +
        '" aria-label="' +
        (hiddenItself ? 'Show ' : 'Hide ') +
        escapeHtml(label) +
        '" title="' +
        (hiddenItself
          ? 'Bring this element back on the map'
          : 'Leave this element and what is inside it out of the map') +
        ' (H)">' +
        (hiddenItself ? MAP_HIDE_ICON : MAP_VISIBLE_ICON) +
        '</button>'
      : '') +
    '<button type="button" tabindex="-1" class="map-scope-btn" data-action="map-pin" data-ref="' +
    ref +
    '" aria-pressed="' +
    pinned +
    '" aria-label="' +
    (pinned ? 'Unpin ' : 'Pin ') +
    escapeHtml(label) +
    '" title="' +
    (pinned
      ? 'Stop keeping only what touches this element'
      : hiddenItself
        ? 'Keep only what touches this element (it comes back on the map)'
        : 'Keep only what touches this element') +
    ' (P)">' +
    (pinned ? MAP_PIN_ICON : MAP_UNPINNED_ICON) +
    '</button>' +
    '</span></div>';
  if (hasChildren && isExpanded)
    html +=
      '<div class="tree-node-children" role="group" id="' +
      groupId +
      '">' +
      sortedForNav(record.children)
        .map((child) => renderMapScopeNodeHtml(child, level + 1))
        .join('') +
      '</div>';
  return html + '</div>';
}

/** The rows of the tree of the map that can be reached now, top to bottom. */
function navRows() {
  return Array.from(document.querySelectorAll('.tree-node-row[role="treeitem"]'));
}

/** Move the single tab stop of the navigation to a row, and focus it. */
function focusNavRow(row) {
  if (!row) return;
  navRows().forEach((other) => other.setAttribute('tabindex', other === row ? '0' : '-1'));
  navActiveKey = row.getAttribute('data-node');
  row.focus();
}

/**
 * Keyboard on the tree of the map (the pattern of a tree view): up and down move, right unfolds or goes to the first child,
 * left folds or goes to the parent, Enter and Space fold or unfold, Home and End jump, P pins and H hides.
 */
/**
 * Enter and Space on the controls that are not native buttons (a file of the Files list, the title of a branch of the
 * tree): they do what a click on them does, through the delegated click handler.
 */
function handleActivateKeydown(e) {
  if ((e.key !== 'Enter' && e.key !== ' ') || e.ctrlKey || e.metaKey || e.altKey) return;
  const control = e.target.closest && e.target.closest('.nav-row[role="button"], .tree-branch-title[role="button"]');
  if (!control || e.target !== control) return;
  e.preventDefault();
  control.click();
}

/** How to find a non-native control again once render() has rebuilt the page: its selector, and the attribute that tells its twins apart. */
function plainControlFocusOf(el) {
  const control = el && el.closest ? el.closest('.nav-row[role="button"], .tree-branch-title[role="button"]') : null;
  if (!control) return null;
  if (control.hasAttribute('data-story'))
    return { selector: '.nav-row[role="button"]', attribute: 'data-story', value: control.getAttribute('data-story') };
  if (control.classList.contains('nav-row'))
    return {
      selector: '.nav-row[role="button"]',
      attribute: 'data-relpath',
      value: control.getAttribute('data-relpath')
    };
  const header = control.closest('.tree-branch-header');
  return {
    selector: '.tree-branch-title[role="button"]',
    attribute: 'data-branch',
    value: header ? header.getAttribute('data-branch') : null,
    parent: '.tree-branch-header'
  };
}

function handleNavKeydown(e) {
  const row = e.target.closest && e.target.closest('.tree-node-row[role="treeitem"]');
  if (!row || e.target !== row || e.ctrlKey || e.metaKey || e.altKey) return;
  const rows = navRows();
  const index = rows.indexOf(row);
  const foldable = row.hasAttribute('aria-expanded');
  const expanded = row.getAttribute('aria-expanded') === 'true';
  const toggle = () => {
    navActiveKey = row.getAttribute('data-node');
    toggleExpandedKey(row.getAttribute('data-node'));
    requestRedraw();
  };
  switch (e.key) {
    case 'ArrowDown':
      focusNavRow(rows[index + 1]);
      break;
    case 'ArrowUp':
      focusNavRow(rows[index - 1]);
      break;
    case 'Home':
      focusNavRow(rows[0]);
      break;
    case 'End':
      focusNavRow(rows[rows.length - 1]);
      break;
    case 'ArrowRight':
      if (foldable && !expanded) toggle();
      else if (foldable) focusNavRow(rows[index + 1]);
      break;
    case 'ArrowLeft':
      if (foldable && expanded) toggle();
      else {
        const parent = row.closest('.tree-node-children');
        focusNavRow(parent && parent.parentElement.querySelector(':scope > .tree-node-row'));
      }
      break;
    case 'Enter':
    case ' ':
      // on the map a row only folds; in Elements it selects the element (the arrows fold)
      if (row.classList.contains('map-scope-row')) {
        if (foldable) toggle();
      } else {
        navActiveKey = row.getAttribute('data-node');
        row.click();
      }
      break;
    case 'p':
    case 'P': {
      navActiveKey = row.getAttribute('data-node');
      const button = row.querySelector('[data-action="map-pin"]');
      if (button) button.click();
      break;
    }
    case 'h':
    case 'H': {
      navActiveKey = row.getAttribute('data-node');
      const button = row.querySelector('[data-action="map-hide"]');
      if (button) button.click();
      break;
    }
    default:
      return;
  }
  e.preventDefault();
}

/** The pinned and the hidden elements of the map, each removable. */
function renderMapChipsHtml() {
  const map = mapStateOf();
  const linksChip = renderMapLinksChipHtml() + renderMapHighlightChipHtml();
  if (!map.pinned.length && !map.hidden.length && !linksChip) return '';
  const chip = (reference, kind) => {
    const record = AppState.index[mapLayer()].get(reference);
    if (!record) return '';
    return (
      '<span class="map-chip map-chip-' +
      kind +
      '"><span>' +
      (kind === 'pin' ? 'Pinned' : 'Hidden') +
      ': ' +
      escapeHtml(record.name || record.id) +
      '</span>' +
      '<button type="button" data-action="map-' +
      (kind === 'pin' ? 'unpin' : 'unhide') +
      '" data-ref="' +
      escapeHtml(reference) +
      '" aria-label="' +
      (kind === 'pin' ? 'Unpin ' : 'Show again ') +
      escapeHtml(record.name || record.id) +
      '" title="' +
      (kind === 'pin' ? 'Unpin' : 'Show again') +
      '">×</button></span>'
    );
  };
  const clear =
    map.pinned.length + map.hidden.length + (mapLinks.length ? 1 : 0) + (mapHighlight.length ? 1 : 0) > 2
      ? '<button type="button" class="map-chips-clear" data-action="map-clear" title="Show the whole map again: nothing pinned, nothing hidden, no relationship ticked">Clear all</button>'
      : '';
  return (
    '<div class="map-chips">' +
    map.pinned.map((r) => chip(r, 'pin')).join('') +
    map.hidden.map((r) => chip(r, 'hide')).join('') +
    linksChip +
    clear +
    '</div>'
  );
}

/**
 * Settings perspective — the workspace settings form, standalone (there
 * is only one settings page, so unlike every other region it doesn't
 * depend on `AppState.selection` at all). Left/right/bottom are all
 * hidden — no sub-navigation exists yet (a natural later addition, not
 * invented now).
 */
function renderSettingsPerspectiveHtml() {
  return { left: null, center: renderSettingsViewHtml(), right: null, bottom: null };
}
