/** The name of the folder of the generated views (`views.path`), or null when it is not a plain relative folder. */
function viewsFolderName() {
  const path = AppState.workspace && AppState.workspace.settings.views ? AppState.workspace.settings.views.path : null;
  if (typeof path !== 'string' || plateauPathProblem(path)) return null;
  return path.replace(/\/+$/, '').replace(/^\.\//, '');
}

/**
 * Build the application/technology element indexes from every
 * successfully-parsed manifest file (DEC-5/FR-6). Mutates manifestFiles'
 * entries in place to record a per-file error for an unrecognized
 * header.kind (DEC-10), without aborting the rest of the load.
 *
 * DEC-5b: a manifest's root element is only a *candidate* top-level root.
 * After every manifest is indexed, a second pass looks up each root's own
 * `header.parent` (if any) in the same-layer index and, when found,
 * attaches that root under the found parent's `children` instead of
 * leaving it at the top level — mirroring the real
 * `ElementIndexFactory.create()`'s cross-manifest attachment loop. In
 * `.custom`, this is how `auth`/`access`/`portal`/etc. end up nested under
 * `platform` even though `app.platform.yaml` itself declares no
 * `content.elements` — the nesting is entirely cross-file.
 */
function buildIndex(manifestFiles, settings) {
  const index = { application: new Map(), technology: new Map() };
  const candidateRoots = { application: [], technology: [] }; // { record, parentReference }
  // what each plateau declares, by plateau: reference (id, for a view and a story) -> the files that declare it, by layer. Until the plateaus are
  // loaded as layers (run 0077), the index holds the manifests of `baseline` alone; the others are read, checked, and not drawn
  const declarationsByPlateau = new Map();
  const declarationsOf = (plateau) => {
    if (!declarationsByPlateau.has(plateau)) declarationsByPlateau.set(plateau, { application: new Map(), technology: new Map() });
    return declarationsByPlateau.get(plateau);
  };
  // a view and a story belong to no plateau (wave 015, run 0100): each is declared once in the whole workspace
  const untied = { view: new Map(), story: new Map() };

  for (const mf of manifestFiles) {
    if (mf.error) continue;
    if (!mf.header || !mf.header.kind || !mf.content || mf.content.id === undefined) {
      mf.error = mf.error || 'Missing header.kind or content.id';
      continue;
    }
    const bareKind = stripArchicodeKindPrefix(mf.header.kind);
    if (bareKind === 'plateau') continue; // a manifest, not an element: the tree of plateaus is built below
    if (bareKind === 'view' || bareKind === 'story') { // manifests, but not elements: see "Stories"
      const id = String(mf.content.id);
      if (!untied[bareKind].has(id)) untied[bareKind].set(id, []);
      untied[bareKind].get(id).push(mf.relPath);
      continue;
    }
    const plateau = plateauOfManifest(mf);
    const declarations = declarationsOf(plateau);
    const mapping = ARCHICODE_KIND_MAP[bareKind];
    if (!mapping) {
      mf.error = unrecognizedKindProblem(mf.header.kind);
      continue;
    }
    const { category, rootKind } = mapping;
    // DEC-3: the root's own nesting-rule level is its kind
    const rootLevel = rootKind;
    const rootReference = mf.header.parent
      ? (mf.header.parent + '.' + mf.content.id)
      : String(mf.content.id);
    // the elements of another plateau are walked to tell what they declare, into an index of their own that nothing reads
    const into = plateau === BASELINE_PLATEAU ? index : { application: new Map(), technology: new Map() };
    const rootRecord = indexElementRecursive(mf.content, rootKind, rootReference, mf.relPath, category, into, settings, rootLevel, declarations);
    if (plateau === BASELINE_PLATEAU) candidateRoots[category].push({ record: rootRecord, parentReference: mf.header.parent || null });
  }

  // DEC-5b: attach each candidate root under its resolved parent (if any);
  // only unattached candidates remain top-level.
  const rootsByCategory = { application: [], technology: [] };
  for (const category of ['application', 'technology']) {
    for (const candidate of candidateRoots[category]) {
      const parentRecord = candidate.parentReference ? index[category].get(candidate.parentReference) : null;
      if (parentRecord) {
        parentRecord.children.push(candidate.record);
      } else {
        rootsByCategory[category].push(candidate.record);
      }
    }
  }

  const plateauTree = buildPlateauTree(manifestFiles);
  checkPlateauRedeclarations(plateauTree, declarationsByPlateau);
  return { index, rootsByCategory, duplicates: findDuplicateReferences(Array.from(declarationsByPlateau.values()).concat([Object.assign({ application: new Map(), technology: new Map() }, untied)])), plateauTree };
}

/**
 * The message for a reference declared more than once, naming the reference and the files. The wording is the one of the
 * command line (`ManifestParser.duplicateMessage`): keep them alike. Files are in code-unit order, as Java sorts them.
 */
function duplicateReferenceMessage(reference, sources, noun) {
  noun = noun || 'reference';
  const counts = new Map();
  for (const source of sources) counts.set(source, (counts.get(source) || 0) + 1);
  const times = sources.length === 2 ? 'twice' : sources.length + ' times';
  if (counts.size === 1) return 'the ' + noun + ' `' + reference + '` is declared ' + times + ' in `' + sources[0] + '`';
  const files = Array.from(counts.keys()).sort().map((file) => {
    const n = counts.get(file);
    return '`' + file + '`' + (n === 1 ? '' : n === 2 ? ' (twice)' : ' (' + n + ' times)');
  });
  return 'the ' + noun + ' `' + reference + '` is declared ' + times + ': in ' + files.slice(0, -1).join(', ') + ' and ' + files[files.length - 1];
}

/**
 * The references declared more than once in a layer of a plateau (by two files, by a file and an element nested in another, or twice in
 * one file; `declarationsOfPlateaus` is one set of declarations for each plateau, since two plateaus that do not stack may declare the same reference), and the views and stories (`layer` is then `view` or `story`) that share an id, as `[{ layer, reference, sources, message }]`, by reference. A reference may exist in both
 * layers: that is no duplicate. The command line fails on the same set.
 */
function findDuplicateReferences(declarationsOfPlateaus) {
  const found = [];
  for (const declarations of declarationsOfPlateaus) {
    for (const layer of ['application', 'technology', 'view', 'story']) {
      const noun = layer === 'view' || layer === 'story' ? layer : 'reference'; // a view and a story have an id of their own
      for (const [reference, sources] of declarations[layer] || []) {
        if (sources.length > 1) found.push({ layer, reference, sources: sources.slice(), message: duplicateReferenceMessage(reference, sources, noun) });
      }
    }
  }
  found.sort((a, b) => compareUnits(a.reference, b.reference) || compareUnits(a.message, b.message)); // code units, as Java orders a String
  // the same reference told twice, with the same files, in both layers: said once, as the command line does
  return found.filter((d, i) => i === 0 || d.message !== found[i - 1].message);
}

/**
 * Walk every indexed element's relationships and mark each `resolved`
 * per DEC-5: application relationships resolve only against the
 * application index, technology only against technology, never
 * cross-layer (FR-7, FLOW-4).
 */
function resolveRelationships(index) {
  let total = 0;
  let dangling = 0;
  for (const category of ['application', 'technology']) {
    for (const record of index[category].values()) {
      for (const rel of record.relationships) {
        total++;
        rel.resolved = index[category].has(rel.destination);
        if (!rel.resolved) dangling++;
      }
    }
  }
  return { total, dangling };
}

// =====================================================================
// Workspace + manifest loading (TDD FLOW-1; PRD FR-4/FR-5/FR-16/DEC-10).
// =====================================================================

/**
 * A relative directory path as the editor writes it: segments joined by '/', with the empty and '.' ones dropped
 * (`./manifests`, `manifests/` and `manifests` are one directory; `.` is the folder itself, ''). Null when the path
 * leaves the folder (`..`) or is not a string.
 */
function normalizeRelDir(relDir) {
  if (typeof relDir !== 'string') return null;
  const segments = relDir.split('/').filter((seg) => seg !== '' && seg !== '.');
  return segments.includes('..') ? null : segments.join('/');
}

/**
 * The folder a new manifest is written to: the first manifests directory of the workspace (as loadWorkspace reads it: `./manifests` is `manifests`);
 * undefined when there is none.
 */
function firstManifestsDir() {
  return AppState.workspace.settings.manifests.paths.map((p) => normalizeRelDir(manifestsFolderOf(p))).find((p) => p !== null);
}

/** Resolve a (possibly multi-segment) relative directory path from a root handle; `options.create` makes the missing directories. */
async function getDirectoryHandleByRelativePath(rootHandle, relPath, options) {
  const normalized = normalizeRelDir(String(relPath));
  if (normalized === null) throw new Error('The path "' + relPath + '" is outside the folder.');
  let current = rootHandle;
  for (const seg of normalized.split('/').filter(Boolean)) {
    current = await current.getDirectoryHandle(seg, options && options.create ? { create: true } : undefined);
  }
  return current;
}

