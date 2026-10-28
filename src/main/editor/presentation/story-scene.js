// ---- The announcer of the story player (wave 021, run 0152) ----

/**
 * What a screen reader is told when a step of a story is shown: "Step n of N", then the title of the view when the step names one. Pure: it reads the story, not the page.
 */
function storyStepAnnouncement(story, index) {
  const steps = story ? storySteps(story) : [];
  if (!Number.isInteger(index) || index < 0 || index >= steps.length) return '';
  const view = stepView(steps[index]);
  return 'Step ' + (index + 1) + ' of ' + steps.length + (view ? ', ' + viewLabel(view) : '');
}

/**
 * Says `text` once through the live region outside #app (`#story-announcer`, which `render()` does not replace: it is the text that changes, so the change is announced). The same text
 * twice in a row is said once; an empty text empties the region, so that the next step is a change again. The player of wave 021 drives it; nothing in the editing layout calls it.
 */
let storyAnnounced = '';
function announceStoryStep(text) {
  const region = typeof document.getElementById === 'function' ? document.getElementById('story-announcer') : null;
  if (!region) return;
  const said = String(text || '');
  if (said === storyAnnounced) return;
  storyAnnounced = said;
  region.textContent = said;
}

// ---- The scene of a step, drawn without the editor (wave 021, run 0152, #153; plan decision T4) ----

/**
 * The plateau and the comparison the editor draws now, as a plain copy: the home of a story that is played (what a step that names none is drawn at), fixed when *Play* is pressed.
 * Null while no workspace is open.
 */
function storyHomeNow() {
  const now = currentPlateauDrawing();
  return now ? { plateau: now.plateau, against: now.against } : null;
}

/**
 * The drawing of a plateau and a comparison that is not the editor's (`editorDrawing()` has the same shape): the layers of the band as `syncLayers` would settle them for
 * `plateau` and `against`, the model of each from `layerModelOf` (kept in `layerCache`), and the toggles of the diagram as the editor has them now. It reads `AppState`, and writes nothing
 * to it. A workspace whose plateaus are not drawn (not layered, or `blocked`) has one drawing, the editor's.
 */
function drawingOfPlateaus(plateau, against, toggles) {
  const tree = AppState.plateauTree;
  if (!AppState.layers || !tree || !tree.layered || AppState.layers.blocked)
    return Object.assign({}, editorDrawing(), togglesOf(toggles));
  const settings = AppState.workspace.settings;
  const layers = {
    current: plateau,
    compare: against ? { mode: 'other', other: against, chosen: true } : null,
    blocked: null
  };
  layers.compare = normalizedLayerCompare(layers);
  const model = layerModelOf(plateau, settings);
  const other = layerCompareOther(layers);
  const otherModel = other ? layerModelOf(other.id, settings) : null;
  return {
    layers,
    index: model.index,
    undrawable: model.undrawable,
    problems: model.problems,
    hideWording: togglesOf(toggles).hideWording,
    changesOnly: togglesOf(toggles).changesOnly,
    baseline: other
      ? {
          plateau: other,
          index: otherModel.index,
          problem: otherModel.problems ? otherModel.problems.join('\n') : null,
          undrawable: otherModel.undrawable
        }
      : null
  };
}

/**
 * The two toggles of the diagram that a scene is drawn with (wave 021, run 0153): `changesOnly` (draw only what changed) and `hideWording` (leave the wording-only changes out), each off
 * unless the caller says so. They are the editor's choices for the diagram it shows, kept per folder; a scene that is not the editor's reads neither of them.
 */
function togglesOf(toggles) {
  return { hideWording: !!(toggles && toggles.hideWording), changesOnly: !!(toggles && toggles.changesOnly) };
}

/**
 * The plateau and the comparison a step is drawn at from `home` (what it names, else the home's): `{ layered, wanted: { plateau, against } }`. `layered` is false for a workspace
 * whose plateaus are not drawn, which has one drawing, the editor's.
 */
function stepDrawnAt(step, home) {
  const tree = AppState.plateauTree;
  const layered = !!(AppState.layers && tree && tree.layered && !AppState.layers.blocked);
  const wanted =
    layered && home
      ? stepDrawing(step, home)
      : { plateau: AppState.layers ? AppState.layers.current : BASELINE_PLATEAU, against: null };
  return { layered, wanted };
}

/** The plateau `stepProblem` looks at for a step drawn from `home`: the one it is drawn at, or null where the plateaus are not drawn. */
function stepPlateauAt(step, home) {
  const drawn = stepDrawnAt(step, home);
  return drawn.layered ? drawn.wanted.plateau : null;
}

/** Where a scene keeps the answers of `compare` for the pairs of plateaus it has drawn: on `layerCache`, so that they go with the manifests they were made from. */
function sceneComparisonMemo() {
  const cache = ensureLayerCache(AppState.workspace.settings);
  if (!cache.comparisons) cache.comparisons = new Map();
  const keyOf = (drawing, future) =>
    drawing.layers.current + '>' + drawing.layers.compare.other + (future ? ':future' : '');
  return {
    find(drawing, future) {
      const kept = cache.comparisons.get(keyOf(drawing, future));
      return kept && kept.index === drawing.index && kept.baselineIndex === drawing.baseline.index ? kept.value : null;
    },
    keep(drawing, future, value) {
      cache.comparisons.set(keyOf(drawing, future), {
        index: drawing.index,
        baselineIndex: drawing.baseline.index,
        value
      });
    }
  };
}

/**
 * The scene of step `index` of a story, as the editor draws it for that step, computed on the side (wave 021, run 0152, #153): the plateau the step is told at (`at`, else the
 * home) and the one it is compared with (`against`, else the home's, as `stepDrawing` settles them) come from `layerModelOf`, the comparison from the kernel's `compare`, the drawing
 * from `computeDiagramScene` (the function the editor draws through), laid out and rendered as the editor does. It writes no `AppState` (no `index`, `baseline`, `layers`, selection
 * or address), no page and no cache but `layerCache`, and never calls `modelsChanged()`. `options.home` is `{ plateau, against }`, fixed by the caller when the story begins
 * (`storyHomeNow()`), else taken now; `options.readonly` draws the page-of-a-view way (no fold buttons); `options.changesOnly` and `options.hideWording` are the two toggles of the
 * diagram, off unless given (the editor's own are never read: a scene is not the editor's). Resolves to null for a story or a step that is not there, else
 * `{ storyId, index, count, title, text, announcement, plateau, against, told, problem, comparison, diagram }`:
 *   title, text      the title the menu gives the step (`storyStepTitle`) and its words;   announcement   what a screen reader is told (`storyStepAnnouncement`);
 *   plateau, against the ids it is drawn at and compared with (null: no comparison); told  `{ at, against }` as the step says them (`stepPlateauKeys`);
 *   problem          why it cannot be drawn (`stepProblem`, in the plateau of the step), else null; the diagram is then null;
 *   comparison       null, or `{ base, target, future }`: the ids of the two sides of the comparison drawn;
 *   diagram          the scene `showDiagramScene` takes: `{ html, status, legend (the key of a comparison included), width, height, focal, hasSvg, boxes, links, drawnIds, ... }`.
 */
async function storyStepScene(storyId, index, options) {
  const story = findStory(storyId);
  const steps = story ? storySteps(story) : [];
  if (!story || !Number.isInteger(index) || index < 0 || index >= steps.length) return null;
  const step = steps[index];
  const home = (options && options.home) || storyHomeNow();
  const readonly = !!(options && options.readonly);
  const { layered, wanted } = stepDrawnAt(step, home);
  const scene = {
    storyId,
    index,
    count: steps.length,
    title: storyStepTitle(step),
    text: typeof step.text === 'string' ? step.text : '',
    announcement: storyStepAnnouncement(story, index),
    plateau: wanted.plateau,
    against: wanted.against,
    told: stepPlateauKeys(step),
    problem: stepProblem(step, layered ? wanted.plateau : null, index + 1),
    comparison: null,
    diagram: null
  };
  if (scene.problem) return scene;
  const viewKey = 'story|' + storyId + '|' + index + '|' + wanted.plateau + '|' + (wanted.against || '');
  try {
    const [kernel, elk] = await Promise.all([loadViewpointKernel(), loadElk()]);
    const drawing = layered
      ? drawingOfPlateaus(wanted.plateau, wanted.against, options)
      : Object.assign({}, editorDrawing(), togglesOf(options));
    const comparison = drawing.layers && drawing.baseline ? comparisonStateOf(drawing, sceneComparisonMemo()) : null;
    if (comparison && comparison.layers)
      scene.comparison = { base: comparison.base.id, target: comparison.target.id, future: comparison.future };
    const nothing = nothingDrawnScene(viewKey, comparison);
    if (nothing) {
      scene.diagram = nothing;
      return scene;
    }
    const source = {
      index: drawing.index,
      baselineIndex: drawing.baseline ? drawing.baseline.index : null,
      comparison,
      changesOnly: drawing.changesOnly
    };
    const recipe = viewDiagramRecipe(
      stepViewForDrawing(step),
      drawing.index,
      'story',
      drawing.baseline ? drawing.baseline.index : null
    );
    const { isMap, reference, viewpoint, facet, mapState } = recipe;
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
            relationships: recipePartsOf(recipe).relationships,
            source
          }
        : { facet, layer: recipe.layer, source }
    );
    if (isMap) input.hidden = mapState.hidden;
    scene.diagram = (
      await computeDiagramScene(recipe, input, comparison, source, kernel, elk, viewKey, readonly)
    ).scene;
  } catch (e) {
    scene.problem = 'The diagram could not be computed: ' + (e && e.message ? e.message : String(e));
    scene.diagram = null;
  }
  return scene;
}
