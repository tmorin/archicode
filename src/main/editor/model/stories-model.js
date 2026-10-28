// =====================================================================
// Stories — diagrams put in order, with a sentence for each
//
// A *saved view* is the recipe of a diagram, not its picture: the element and the viewpoint (Elements), or what is
// pinned, hidden and open (Map), with the facet and the texts it draws. A *story* lists steps in the order they are
// told, with a text for each; a step names a saved view, or carries its own recipe. Both are manifests, like the
// elements: `view.<id>.yaml` and `story.<id>.yaml` (kinds `archicode.morin.io/view` and `…/story`), one file each, so
// that they are saved, cancelled and checked against the disk file by file, and never grow .archicode.yaml. The ones
// that older workspaces keep in `views:` and `stories:` of .archicode.yaml are still read and edited where they are,
// until "Move to manifests" takes them out.
// =====================================================================

/** The story walked through on the diagrams ({ id, step }), kept in the URL (`story=`, `step=`). Null: none. */
let activeStory = null;
/** The story the Stories perspective shows, kept in the URL (`story=`). */
let selectedStoryId = null;
let selectedViewId = null;
let libraryTab = 'stories'; // the Library shows 'stories' or 'views'
/** A line the Stories perspective says once (a step that cannot be shown, a list the editor leaves alone). */
let storyNotice = null;

const STORY_DIAGRAM_VIEWPOINTS = ['overview', 'detailed', 'deep'];

function stringList(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string' && entry) : [];
}

function workspaceTopLevel() {
  const workspace = AppState.workspace;
  if (!workspace) return {};
  if (!isPlainObject(workspace.topLevel)) workspace.topLevel = {};
  return workspace.topLevel;
}

/** Where an entry lives: the manifest file it was read from, or null (.archicode.yaml: where older workspaces keep them). */
const entryOwners = new WeakMap();

/**
 * The views or stories that are manifests: the `content` of each file of that kind. They belong to no plateau (wave 015, run 0100, issue #100): the same ones are listed
 * whatever plateau is drawn.
 */
function manifestEntries(kind) {
  const out = [];
  for (const mf of AppState.manifestFiles || []) {
    if (mf.error || !mf.header || !mf.content || stripArchicodeKindPrefix(String(mf.header.kind)) !== kind) continue;
    if (!isPlainObject(mf.content) || typeof mf.content.id !== 'string' || !mf.content.id) continue;
    entryOwners.set(mf.content, mf);
    out.push(mf.content);
  }
  return out;
}

/** The ids a new view or story must not take: a view (a story) is declared once in the workspace. */
function takenEntryIds(kind, key) {
  return new Set(
    manifestEntries(kind)
      .concat(legacyEntries(key))
      .map((entry) => entry.id)
  );
}

/** The entries of `views:` / `stories:` of .archicode.yaml (an older place for them). Nothing is created by reading. */
function legacyEntries(key) {
  const list = AppState.workspace ? workspaceTopLevel()[key] : null;
  const out = Array.isArray(list)
    ? list.filter((entry) => isPlainObject(entry) && typeof entry.id === 'string' && entry.id)
    : [];
  for (const entry of out) entryOwners.set(entry, null);
  return out;
}

/** Manifests first; an entry of .archicode.yaml with the same id is shadowed by the manifest, as the file of an element would. */
function entriesOf(kind, key) {
  const own = manifestEntries(kind);
  const ids = new Set(own.map((entry) => entry.id));
  return own.concat(legacyEntries(key).filter((entry) => !ids.has(entry.id)));
}

/** .archicode.yaml has changed in memory: "Save all changes" writes it (with the settings). */
function markWorkspaceYamlChanged() {
  if (layerCache) layerCache.entryProblems = undefined; // the views and stories it keeps are looked at by `entryProblemsOf`, which keeps its answer with the layers
  const workspace = AppState.workspace;
  workspace.settingsDirty = true;
  workspace.settingsRevision = (workspace.settingsRevision || 0) + 1;
  saveStatus = { state: 'idle' };
}

/** An entry changed in memory: its manifest is rewritten and marked modified, or .archicode.yaml is, for an older entry. */
function markEntryChanged(entry) {
  const owner = entryOwners.get(entry);
  if (!owner) {
    markWorkspaceYamlChanged();
    return;
  }
  owner.rawText = reserializeManifestFile(owner);
  // an edit that puts everything back leaves the file as it is on disk: it is not modified (a file that is not on disk yet always is)
  owner.dirty = !(
    owner.existedOnDisk &&
    typeof owner.savedRawText === 'string' &&
    owner.rawText === owner.savedRawText
  );
  saveStatus = { state: 'idle' };
}

function savedViews() {
  return entriesOf('view', 'views');
}
function storiesList() {
  return entriesOf('story', 'stories');
}
function findSavedView(id) {
  return savedViews().find((view) => view.id === id) || null;
}
function findStory(id) {
  return storiesList().find((story) => story.id === id) || null;
}

/** The steps of a story as the file has them; one that is not an object stands for a view that is missing. */
function storySteps(story) {
  return Array.isArray(story.steps) ? story.steps.map((step) => (isPlainObject(step) ? step : { view: '' })) : [];
}

/** The view a step draws: the named one it points at (null when there is none), or the recipe the step carries. */
function stepView(step) {
  if (typeof step.view === 'string' && step.view) return findSavedView(step.view);
  return typeof step.viewpoint === 'string' && step.viewpoint ? step : null;
}

/**
 * What a step draws (wave 026, run 0200, issue #143, DEC-2): the view of `stepView`, and, when the step has a `highlight` key, a shallow copy of it whose `properties.highlight` is the
 * step's list (an empty one switches the view's off); the saved view itself is never touched. The twin of the command line's `GenerateStoriesCommand.viewOf`.
 */
function stepViewForDrawing(step) {
  const view = stepView(step);
  if (!view || !Object.prototype.hasOwnProperty.call(step, 'highlight')) return view;
  const properties = Object.assign({}, isPlainObject(view.properties) ? view.properties : {}, {
    highlight: step.highlight
  });
  return Object.assign({}, view, { properties });
}

/**
 * Why a step cannot be drawn now, or null when it can. A step is drawn in the plateau it says (`at`, else the plateau drawn, which is what the page has when the step is
 * played) and compared with the one it names (`against`): the plateau that is not one, and one the editor cannot draw, are told before the view is looked at, and the
 * view is looked at in the plateau of the step, not in the one that happens to be drawn now. `plateau` (the scene of the story player, wave 021): the plateau the step is drawn
 * at once the home is applied (a step that names none is drawn at the home), null for a workspace whose plateaus are not drawn; absent (undefined), what the step says.
 * `number` is the place of the step in its story, from 1: a step that carries its own recipe is named `step_NN` in the sentences, as the command line names it.
 */
function stepProblem(step, plateau, number) {
  const plateauProblem = stepPlateauProblem(step);
  if (plateauProblem) return plateauProblem.problem;
  const at = plateau !== undefined ? plateau : stepPlateauKeys(step).at;
  if (typeof step.view === 'string' && step.view) {
    const view = stepViewForDrawing(step);
    return view
      ? viewProblem(view, at, undefined, stepPlateauKeys(step).against)
      : 'The view “' + step.view + '” does not exist any more.';
  }
  return typeof step.viewpoint === 'string' && step.viewpoint
    ? viewProblem(
        stepViewForDrawing(step),
        at,
        'step_' + String(number).padStart(2, '0'),
        stepPlateauKeys(step).against
      )
    : 'This step has no view.';
}

/**
 * What is wrong with the plateaus a step names, as `{ problem }`, or null: a plateau that is none (the sentence of `stepPlateauProblems` without the story and the file:
 * what the step is told in its own place), one the editor cannot draw (the band says why), or a comparison with the plateau it is told at (it is no comparison).
 */
function stepPlateauProblem(step) {
  const keys = stepPlateauKeys(step);
  if (keys.at === null && keys.against === null) return null;
  if (AppState.layers && AppState.layers.blocked) {
    // the tree is wrong: only baseline is drawn, and there is nothing to compare it with
    if ((keys.at !== null && keys.at !== BASELINE_PLATEAU) || keys.against !== null)
      return {
        problem:
          'Only baseline is drawn (' +
          AppState.layers.blocked +
          '), so a step cannot be told at another plateau or compared.'
      };
    return null;
  }
  const tree = AppState.plateauTree;
  const ids = tree && tree.layered ? tree.ids : [];
  for (const key of ['at', 'against']) {
    const value = keys[key];
    if (value === null || ids.includes(value)) continue;
    return {
      problem: ids.length
        ? 'The plateau “' + value + '” is not a plateau of this workspace.'
        : 'This workspace has no plateau, so a step cannot be told at “' + value + '”.'
    };
  }
  if (keys.at !== null && keys.at === keys.against)
    return {
      problem:
        'A plateau is never compared with itself: “' +
        keys.at +
        '” is both where the step is told and what it is compared with.'
    };
  for (const id of [keys.at, keys.against]) {
    // `layerStateOf` is what a plateau is drawn from (kept with the layers): no model is built to ask whether the kernel refused its patches
    if (id !== null && layerStateOf(id, AppState.workspace.settings).fatal)
      return { problem: 'The plateau “' + id + '” cannot be drawn: the command line refuses its patches.' };
  }
  return null;
}

function storyLabel(story) {
  return story.name || story.id;
}

function capitalizeWord(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/** Letters, digits and underscores, unique among `taken`: what a view or story id looks like. */
function uniqueIdFor(text, taken, fallback) {
  const base =
    String(text || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallback;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = base + '_' + n;
  return id;
}
