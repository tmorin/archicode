// =====================================================================
// Settings parsing with documented defaults. The keys are told in kebab-case (`global-enabled`); the camel-case spelling that earlier
// versions still read is refused by the reader of the file (`readObject`), with the sentence that says what to write.
// =====================================================================

function readKey(obj, key, fallback) {
  if (!obj || typeof obj !== 'object') return fallback;
  // a key with nothing after it is a key that is not there (the command line leaves the default alone: `views: {path: }` is `views`)
  if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null) return obj[key];
  return fallback;
}

// =====================================================================
// Plateaus (run 0035, wave 014 run 0084): a plateau is a layer (see "The band of plateaus"); what is left of the earlier key is the sentence that
// tells a workspace file that has it what to write instead, and the small readers the settings share.
// =====================================================================

/** A scalar of the file as the command line reads it into a String (a number or a boolean is its text); '' for anything else. */
function plateauText(value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

/** Why a path may not name the folder of a plateau or of manifests, or null when it may: empty, absolute, or going up with `..`. */
function plateauPathProblem(path) {
  if (typeof path !== 'string' || path.trim() === '') return 'is empty';
  if (path.startsWith('/') || path.startsWith('\\') || /^[A-Za-z]:/.test(path)) return 'is absolute';
  if (path.split(/[/\\]/).includes('..')) return 'contains `..`';
  return null;
}

// ---- Where the manifests are (run 0076, issue #73): the entries of `settings.manifests.paths`. The rules are the ones of the command line
// (`ManifestDiscovery.java`), and one list of cases, discovery-cases.json, is run by both: keep them alike. ----

/** Whether an entry of `manifests.paths` is read recursively: it ends in `/**` (`manifests/**`, or `./**` for the folder of .archicode.yaml). */
function isRecursiveManifestsPath(path) {
  return typeof path === 'string' && path.endsWith('/**');
}

/** The folder an entry names: the entry without its `/**`, if it has one. */
function manifestsFolderOf(path) {
  return isRecursiveManifestsPath(path) ? path.slice(0, -3) : path;
}

/** `**` means something at the end of an entry, after a `/`, and nowhere else: the end of the sentence that says so, or null. */
function manifestsPatternProblem(path) {
  if (typeof path !== 'string' || !manifestsFolderOf(path).includes('**')) return null;
  return (
    'uses `**` where ArchiCode does not read it: only a path that ends in `/**` is read recursively (`manifests/**`, or `./**` for the folder of .archicode.yaml), ' +
    'and `**` means nothing anywhere else. Write one path for each folder, or end the path with `/**`'
  );
}

/** Why an entry of `settings.manifests.paths` is refused, in the words of the command line, or null: empty, absolute, `..`, or `**` where it is not read. */
function manifestsPathSentence(path) {
  const problem = plateauPathProblem(path);
  if (problem !== null) {
    return (
      'the path `' +
      path +
      '` of `settings.manifests.paths` ' +
      problem +
      ': a manifests folder must be below the folder of .archicode.yaml, written relative to it, without `..`. ' +
      'Move the folder below .archicode.yaml (or move .archicode.yaml up, to a folder that holds both) and change the path to match'
    );
  }
  const pattern = manifestsPatternProblem(path);
  return pattern === null ? null : 'the path `' + path + '` of `settings.manifests.paths` ' + pattern;
}

/** Two paths compared by Unicode code point: the order of the manifests, which depends on neither the file system nor the locale (not `localeCompare`, not UTF-16 units). */
function compareCodePoints(a, b) {
  if (a === b) return 0;
  const x = Array.from(a);
  const y = Array.from(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    const d = x[i].codePointAt(0) - y[i].codePointAt(0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return x.length === y.length ? 0 : x.length < y.length ? -1 : 1;
}

/**
 * Whether a folder found below an entry that ends in `/**` is one of the generated views: the folder `views.path` names, or a sibling that begins with its
 * name and a dash (`views-to-be`, `views-to-be-vs-baseline`, `views-shop`). `folder` is its segments from the folder of .archicode.yaml.
 */
function isGeneratedViewsFolder(folder, viewsPath) {
  if (typeof viewsPath === 'number' || typeof viewsPath === 'boolean') viewsPath = String(viewsPath); // a scalar is read as the text it is, as the command line reads it
  if (typeof viewsPath !== 'string' || viewsPath.startsWith('/') || viewsPath.startsWith('\\')) return false;
  const views = viewsPath.split('/').filter((seg) => seg !== '' && seg !== '.');
  if (views.length === 0 || views.includes('..') || views.length !== folder.length) return false;
  for (let i = 0; i < views.length - 1; i++) if (views[i] !== folder[i]) return false;
  const name = views[views.length - 1];
  const found = folder[folder.length - 1];
  return found === name || found.startsWith(name + '-');
}

/** The files a comparison writes beside its views, always together (`ManifestDiscovery.COMPARISON_FILES`). */
const COMPARISON_FILES = ['gap.json', 'gap.md'];

/**
 * Whether a folder, given as the entries it lists (`[name, handle]`), is the folder of a comparison `views generate` wrote: it holds both files of the table of changes
 * (`ManifestDiscovery.holdsComparison`). Its `gap.json` is no manifest, and which `--output` the run was given is not known to the tool that reads the folder next; a lone
 * `gap.json` is read, since it may be an author's manifest.
 */
function holdsComparisonFiles(listed) {
  return COMPARISON_FILES.every((file) => listed.some(([name, handle]) => name === file && handle.kind === 'file'));
}

/** The entries of `settings.manifests.paths` the command line refuses before it reads any manifest (`ManifestDiscovery.pathProblems`), in its words, sorted as it sorts them. */
function manifestsPathProblems(settings) {
  const problems = [];
  for (const path of settings.manifests.paths.slice().sort()) {
    const sentence = manifestsPathSentence(path);
    if (sentence !== null) problems.push(sentence);
  }
  return problems;
}

/**
 * Why a facet name cannot be the name of a folder, or null when it can (wave 020, run 0146, issue #147): the name of a facet goes into the name of the folders the views are
 * written in, as it is written, so the command line refuses one that is not a folder name when it loads the workspace (`FacetNames.reasonOf`, the same words). Refused: an empty
 * name, `.`, `..`, a name that holds `/`, `\`, a NUL or another control character, and the names Windows refuses (`<>:"|?*` and a name that ends with a dot or a space). The first
 * reason found, reading from the left, is the one told.
 */
function facetNameReason(name) {
  if (name === '') return 'is empty';
  if (name === '.') return 'is `.`, the folder itself';
  if (name === '..') return 'is `..`, the folder above';
  for (let i = 0; i < name.length; i++) {
    const c = name.charAt(i);
    const code = name.charCodeAt(i);
    if (c === '/' || c === '\\') return 'holds `' + c + '`, which separates the folders of a path';
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f))
      return 'holds a control character (' + facetNameEscape(code) + ')';
    if ('<>:"|?*'.indexOf(c) >= 0) return 'holds `' + c + '`, which Windows does not allow in the name of a folder';
  }
  const last = name.charAt(name.length - 1);
  if (last === '.') return 'ends with a dot, which Windows does not allow in the name of a folder';
  if (last === ' ') return 'ends with a space, which Windows does not allow in the name of a folder';
  return null;
}

/** A control character as the sentence writes it, `\u0001`. */
function facetNameEscape(code) {
  return '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
}

/** The sentence for a facet whose name cannot be the name of a folder (`FacetNames.problemOf`), or null. */
function facetNameProblem(name) {
  const reason = facetNameReason(name);
  if (reason === null) return null;
  const shown = Array.from(name)
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return ch.length === 1 && (code < 0x20 || (code >= 0x7f && code <= 0x9f)) ? facetNameEscape(code) : ch;
    })
    .join('');
  return (
    'the facet name `' +
    shown +
    '` cannot be the name of a folder: it ' +
    reason +
    ' (write a plain word, such as `journey`)'
  );
}

/** The sentences for the facets of the settings that cannot be a folder, in the order of the file (`FacetNames.problems`). */
function facetNameProblems(settings) {
  const problems = [];
  for (const facet of settings.facets.customs) {
    const name =
      typeof facet.name === 'string'
        ? facet.name
        : facet.name === undefined || facet.name === null
          ? ''
          : String(facet.name);
    const sentence = facetNameProblem(name);
    if (sentence !== null) problems.push(sentence);
  }
  return problems;
}

/** What the page calls a plateau: its name, else its id. */
function plateauTitle(plateau) {
  return plateau.name.trim() !== '' ? plateau.name : plateau.id;
}

// The plateau drawn is remembered per folder, in this browser, like the sizes of the panels: not in the workspace (it is
// a choice of whoever looks, not a fact of the architecture), and the page works the same when the storage is refused.
const PLATEAU_STORAGE_PREFIX = 'archicode-standalone-editor:plateau:';

/**
 * What the remembered choices of a folder are keyed on (run 0192, TDD IMP-12): `bw:<id>` for a browser workspace, so that a rename of
 * it keeps them and a folder of the same name does not inherit them, else the id of the remembered folder, else its name (a served folder).
 */
function rememberedChoiceKey(folder) {
  return folder.browserWorkspace ? 'bw:' + folder.browserWorkspace : folder.id || 'name:' + folder.name;
}

function plateauStorageKey() {
  const folder = AppState.folder;
  return folder ? PLATEAU_STORAGE_PREFIX + rememberedChoiceKey(folder) : null;
}

// what was chosen in this page, for a browser that refuses its storage: the choice then lasts as long as the page
const chosenPlateaus = new Map();

function recalledPlateauId() {
  const key = plateauStorageKey();
  if (key === null) return null;
  return chosenPlateaus.has(key) ? chosenPlateaus.get(key) : panelSizeStorage.get(key);
}

function rememberPlateauId(id) {
  const key = plateauStorageKey();
  if (key === null) return;
  chosenPlateaus.set(key, id);
  panelSizeStorage.set(key, id);
}

// =====================================================================
// The comparison (run 0039, wave 014 run 0084): the plateau drawn can be compared with another one of the same workspace, on the band. The other one is another
// resolution of the manifests already read (`AppState.baseline`), kept apart from the plateau being edited, and never written. What the band chose is
// remembered per folder in this browser, with the plateau drawn and the two flags of whoever looks.
// =====================================================================

const COMPARE_STORAGE_PREFIX = 'archicode-standalone-editor:compare:';

// what was chosen in this page, for a browser that refuses its storage: the choice then lasts as long as the page
const chosenComparisons = new Map();

function compareStorageKey() {
  const folder = AppState.folder;
  return folder ? COMPARE_STORAGE_PREFIX + rememberedChoiceKey(folder) : null;
}

/** The comparison remembered for this folder in this browser (see `layerCompareChoice`): '' (nothing compared), `past`, `future`, `future:<id>` or `other:<id>`; null when none was ever chosen. */
function recalledComparison() {
  const key = compareStorageKey();
  if (key === null) return null;
  return chosenComparisons.has(key) ? chosenComparisons.get(key) : panelSizeStorage.get(key);
}

function rememberComparison(choice) {
  const key = compareStorageKey();
  if (key === null) return;
  chosenComparisons.set(key, choice);
  panelSizeStorage.set(key, choice);
}

// Two more choices of whoever looks (run 0040), remembered per folder like the comparison: `changes-only` and `hide-wording`, '1' or '0'.
const FLAG_STORAGE_PREFIX = 'archicode-standalone-editor:flag:';
const chosenFlags = new Map(); // for a browser that refuses its storage: the choice then lasts as long as the page

function flagStorageKey(name) {
  const folder = AppState.folder;
  return folder ? FLAG_STORAGE_PREFIX + name + ':' + rememberedChoiceKey(folder) : null;
}

/** A flag remembered for this folder in this browser; false when none was ever set. */
function recalledFlag(name) {
  const key = flagStorageKey(name);
  if (key === null) return false;
  return (chosenFlags.has(key) ? chosenFlags.get(key) : panelSizeStorage.get(key)) === '1';
}

function rememberFlag(name, value) {
  const key = flagStorageKey(name);
  if (key === null) return;
  chosenFlags.set(key, value ? '1' : '0');
  panelSizeStorage.set(key, value ? '1' : '0');
}

/** The plateau the one drawn is compared with (a plateau of the page), or null: nothing is compared, or the band still waits for the choice of the future. */
function compareTargetPlateau(layers) {
  return layerCompareOther(layers);
}

function parseSettings(rawSettings) {
  const raw = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  const manifestsRaw = raw.manifests && typeof raw.manifests === 'object' ? raw.manifests : {};
  const relationshipsRaw = raw.relationships && typeof raw.relationships === 'object' ? raw.relationships : {};
  const viewsRaw = raw.views && typeof raw.views === 'object' ? raw.views : {};
  const facetsRaw = raw.facets && typeof raw.facets === 'object' ? raw.facets : {};

  const customsRaw = readKey(facetsRaw, 'customs', []);
  // the model of the page says `jsonPath` and `hideUnlinked`; the file says `json-path` and `hide-unlinked`.
  const customs = (Array.isArray(customsRaw) ? customsRaw : []).map((c) => {
    const custom = c && typeof c === 'object' ? c : {};
    const actions = (Array.isArray(custom.actions) ? custom.actions : []).map((a) => {
      const action = a && typeof a === 'object' ? a : {};
      const rest = Object.assign({}, action);
      delete rest['json-path'];
      return Object.assign(rest, { jsonPath: readKey(action, 'json-path', undefined) });
    });
    const rest = Object.assign({}, custom);
    delete rest['hide-unlinked'];
    return Object.assign(rest, { actions, hideUnlinked: readKey(custom, 'hide-unlinked', false) === true });
  });

  // `name` is optional; Jackson reads a number or a boolean into a String field, a blank name is no name
  const nameRaw = raw.name;
  const name =
    typeof nameRaw === 'string'
      ? nameRaw
      : typeof nameRaw === 'number' || typeof nameRaw === 'boolean'
        ? String(nameRaw)
        : '';

  return {
    name: name.trim() === '' ? '' : name,
    manifests: {
      // a number or a boolean is read as the text it is, as the command line reads it
      // an item with no value is no item (`paths: [null]` is an empty list), as the command line reads it
      paths: Array.isArray(manifestsRaw.paths)
        ? manifestsRaw.paths
            .filter((p) => p !== null && p !== undefined)
            .map((p) => (typeof p === 'number' || typeof p === 'boolean' ? String(p) : p))
        : ['manifests']
    },
    current: plateauText(raw.current),
    relationships: {
      defaultSyntheticLabel: readKey(relationshipsRaw, 'default-synthetic-label', 'uses')
    },
    views: {
      path: readKey(viewsRaw, 'path', 'views'),
      labels: readKey(viewsRaw, 'labels', {}) || {},
      properties: readKey(viewsRaw, 'properties', {}) || {}
    },
    facets: {
      globalEnabled: readKey(facetsRaw, 'global-enabled', true),
      directoryNameTemplate: readKey(facetsRaw, 'directory-name-template', '%s-%s'),
      customs
    }
  };
}
