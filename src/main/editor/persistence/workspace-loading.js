/**
 * The failure that stops a folder from opening (`AppState.fatalError`), with its type when the page has to tell it from the others (#146): `'unreadable'` when the
 * workspace file cannot be had (absent, not a file, refused) and `'renamed'` when the folder holds `workspace.yaml` and not `.archicode.yaml`, the two failures of
 * `WorkspaceFileException` in the command line. The landing card words the first one as "could not be read" and the list of the remembered folders notes both; no other
 * failure is reworded, whatever file name its sentence holds. `setFatalError(null)` clears both.
 */
function setFatalError(message, kind) {
  AppState.fatalError = message;
  AppState.fatalErrorKind = message === null ? null : kind || null;
}

const WORKSPACE_FILE_NAME = '.archicode.yaml'; // the only workspace file the editor opens (and writes)
const FORMER_WORKSPACE_FILE_NAME = 'workspace.yaml'; // its name before 0.18: no alias, a folder that still has it is told to rename it
/** The sentence for a folder that holds the former file and not the new one; the command line says the same, word for word (`WorkspaceFactory.FORMER_NAME_SENTENCE`; `workspace-file-name-cases.json` pins both). */
const FORMER_WORKSPACE_FILE_SENTENCE =
  '`workspace.yaml` is no longer the name of the workspace file: rename it to `.archicode.yaml` (`git mv workspace.yaml .archicode.yaml`), or tell the command line where it is with `-w workspace.yaml`';

/**
 * The manifests of one folder below the root handle (the reading loop of `loadWorkspace` as a function of a folder): the direct children of `relDir` that are YAML, as the records
 * `buildIndex` takes, and the paths of the `.toml` and `.json` files the command line reads and the editor does not. `missing`:
 * the folder is not there (or cannot be read). The records are new objects each call; nothing here writes.
 *
 * With `options.recursive` (an entry of `manifests.paths` that ends in `/**`, run 0076, issue #73) the folders below are read too, the way the command line
 * reads them (`ManifestDiscovery.java`): not a file or a folder whose name begins with a dot, not the folders of the generated views
 * (`options.viewsPath`, see `isGeneratedViewsFolder`), not a folder that holds the files of a comparison (`holdsComparisonFiles`), not a folder that is a symbolic link (the served folder says which are: `symbolicLink`) and not a folder
 * that is one of those it is inside of (a browser may follow a link: that loop is cut with `isSameEntry`). The records are not sorted here.
 */
async function readManifestFolder(rootHandle, relDir, options) {
  const recursive = !!(options && options.recursive);
  const result = { files: [], unread: [], missing: false };
  let folderHandle;
  try {
    folderHandle = await getDirectoryHandleByRelativePath(rootHandle, relDir);
  } catch (e) {
    console.warn('ArchiCode: manifests path "' + relDir + '" not found/readable:', e);
    result.missing = true;
    return result;
  }
  const visit = async (handle, dir, ancestors) => {
    const listed = [];
    for await (const entry of handle.entries()) listed.push(entry);
    // below the entry, the folder of a comparison is no folder of manifests (the entry itself is read whatever it holds)
    if (recursive && dir !== relDir && holdsComparisonFiles(listed)) return;
    for (const [name, entryHandle] of listed) {
      if (recursive && name.startsWith('.')) continue; // a hidden file or folder below the entry is not read
      if (entryHandle.kind === 'directory') {
        if (!recursive || entryHandle.symbolicLink) continue;
        const below = dir === '' ? [name] : dir.split('/').concat(name);
        if (isGeneratedViewsFolder(below, options.viewsPath)) continue;
        let loop = false;
        for (const ancestor of ancestors) {
          if (typeof entryHandle.isSameEntry === 'function' && (await entryHandle.isSameEntry(ancestor))) {
            loop = true;
            break;
          }
        }
        if (!loop) await visit(entryHandle, below.join('/'), ancestors.concat([entryHandle]));
        continue;
      }
      if (entryHandle.kind !== 'file') continue;
      const relPath = (dir ? dir + '/' : '') + name;
      // the workspace is not a manifest of itself (a folder written `.`): the file the editor opened, like the CLI, which leaves out the workspace file it read and nothing else
      if (relPath === WORKSPACE_FILE_NAME) continue;
      // a file of that name in a folder below is the workspace file of that folder, never a manifest (hidden, so left out below a `/**` path too; a folder read without `/**` leaves it out as well)
      if (name === WORKSPACE_FILE_NAME) continue;
      // like the CLI (String.endsWith): `.YAML` is not a manifest. The CLI reads .toml and .json too; the editor writes YAML only
      if (/\.(toml|json)$/.test(name)) result.unread.push(relPath);
      if (!/\.(ya?ml)$/.test(name)) continue;
      let rawText = '';
      let header = null;
      let content = null;
      let error;
      let lastKnownDiskModified = null; // TDD-0010 DEC-8
      let bom = false;
      try {
        const file = await entryHandle.getFile();
        lastKnownDiskModified = file.lastModified;
        ({ text: rawText, bom } = await readTextAndMark(file));
        ({ header, content, error } = parseManifestText(rawText));
      } catch (e) {
        error = e && e.message ? e.message : String(e);
      }
      result.files.push({
        relPath,
        rawText,
        header,
        content,
        error,
        dirty: false,
        existedOnDisk: true,
        lastKnownDiskModified,
        bom, // the file starts with a UTF-8 byte-order mark: `rawText` never does, the write puts it back (`withByteOrderMark`, #119)
        savedRawText: rawText // what the file holds on disk, as far as this editor knows: an edit that restores it is no change
      });
    }
  };
  await visit(folderHandle, relDir, [folderHandle]);
  return result;
}

async function loadWorkspace(dirHandle) {
  if (filesFoldsOwner !== dirHandle) {
    // the folds of the Files page belong to one folder; a reload of it keeps them
    filesFolded = new Set();
    filesSelectionSeen = null;
    filesFoldsOwner = dirHandle;
  }
  landingBusy = null; // the next render() is the result (workspace or error), not another "Opening…"
  setFatalError(null);
  AppState.workspace = null;
  AppState.manifestFiles = [];
  AppState.unreadManifestFiles = [];
  AppState.layers = null;
  AppState.layerProblems = null;
  AppState.layerUndrawable = false;
  layerCache = null;
  AppState.index = { application: new Map(), technology: new Map() };
  AppState.relationshipStats = { total: 0, dangling: 0 };
  AppState.duplicateReferences = [];
  AppState.baseline = null;
  modelsChanged(); // the models are emptied here, and a load that stops on an error leaves them so
  AppState.plateauTree = null;
  AppState.dirtyReferences = new Set();
  AppState.pendingFileRemovals = []; // a reload starts from the disk: a removal queued before it must not delete a file later
  AppState.removedFileBaselines = new Map();

  // FR-4 / DEC-10: .archicode.yaml is fatal to the open attempt if missing/unparseable.
  let workspaceRaw;
  let workspaceLastKnownDiskModified; // TDD-0010 DEC-8
  let workspaceText; // the file as it is: the next Save keeps of it what the edit did not touch
  let workspaceBom; // it starts with a UTF-8 byte-order mark (`workspaceText` does not, #119)
  // The file cannot be had (absent, not a file, refused by the browser or the server): the typed failure of the page (`setFatalError(..., 'unreadable')`), the one the landing card words as "could not be read".
  // What was read and found wrong (a YAML that is not valid, a document that is not a mapping, a key or a path the command line refuses) is told as it is, whatever file name its sentence holds (#146).
  try {
    const fileHandle = await dirHandle.getFileHandle(WORKSPACE_FILE_NAME);
    const file = await fileHandle.getFile();
    workspaceLastKnownDiskModified = file.lastModified;
    const read = await readTextAndMark(file);
    workspaceText = read.text;
    workspaceBom = read.bom;
  } catch (e) {
    let renamed = false;
    try {
      await dirHandle.getFileHandle(WORKSPACE_FILE_NAME);
    } catch (_) {
      try {
        await dirHandle.getFileHandle(FORMER_WORKSPACE_FILE_NAME);
        renamed = true;
      } catch (__) {
        /* neither: the error below */
      }
    }
    // the file is absent and the folder still has its former name: the one sentence, as the command line says it (a file that is there and cannot be read is the error below)
    if (renamed) setFatalError(FORMER_WORKSPACE_FILE_SENTENCE, 'renamed');
    else
      setFatalError('Could not read/parse .archicode.yaml: ' + (e && e.message ? e.message : String(e)), 'unreadable');
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
    requestRedraw();
    return;
  }
  try {
    workspaceRaw = parseYaml(workspaceText) || {};
    // a .archicode.yaml that is not a mapping is not one the editor can write back without losing it
    if (typeof workspaceRaw !== 'object' || Array.isArray(workspaceRaw))
      throw new Error(readWrongShape(workspaceRaw, '')); // the sentence of the command line
  } catch (e) {
    setFatalError('Could not read/parse .archicode.yaml: ' + (e && e.message ? e.message : String(e)));
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
    requestRedraw();
    return;
  }

  // run 0072: the key that no longer exists, then the keys and the shapes the command line refuses, in its words
  const readProblem = workspaceProblem(workspaceRaw);
  if (readProblem) {
    setFatalError('Could not read/parse .archicode.yaml: ' + readProblem);
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
    requestRedraw();
    return;
  }

  const settings = parseSettings(workspaceRaw.settings);

  // a manifests path that leaves the folder, or uses `**` where it is not read, is refused like the command line refuses it, with its words
  const pathProblems = manifestsPathProblems(settings);
  if (pathProblems.length) {
    setFatalError('Could not read the plateaus of .archicode.yaml:\n' + pathProblems.join('\n'));
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
    requestRedraw();
    return;
  }

  // a facet whose name cannot be the name of a folder is refused like the command line refuses it, with its words (after the paths, as it does)
  const facetProblems = facetNameProblems(settings);
  if (facetProblems.length) {
    setFatalError('Could not read the plateaus of .archicode.yaml:\n' + facetProblems.join('\n'));
    AppState.selection = { kind: 'none', key: null, mode: 'view' };
    requestRedraw();
    return;
  }
  AppState.changesOnly = recalledFlag('changes-only'); // run 0040: how the comparison is read, as the last time in this folder
  AppState.hideWording = recalledFlag('hide-wording');

  // FR-5: the direct children of each settings.manifests.paths dir (the folders below too when the path ends in `/**`, run 0076).
  const manifestFiles = [];
  const unreadManifestFiles = [];
  const seenManifestDirs = new Set(); // `manifests` and `./manifests/` are one directory: read it once
  const seenManifestFiles = new Set(); // a file that two paths find (`manifests` and `manifests/**`) is one file
  for (const rawDirPath of settings.manifests.paths) {
    const recursive = isRecursiveManifestsPath(rawDirPath);
    const relDirPath = normalizeRelDir(recursive ? manifestsFolderOf(rawDirPath) : rawDirPath);
    if (relDirPath === null) {
      console.warn('ArchiCode: manifests path "' + rawDirPath + '" is not a path inside the folder; skipped.');
      continue;
    }
    const seenKey = relDirPath + (recursive ? '/**' : '');
    if (seenManifestDirs.has(seenKey)) continue;
    seenManifestDirs.add(seenKey);
    const folder = await readManifestFolder(dirHandle, relDirPath, { recursive, viewsPath: settings.views.path });
    if (folder.missing) continue;
    for (const file of folder.files) {
      if (seenManifestFiles.has(file.relPath)) continue;
      seenManifestFiles.add(file.relPath);
      manifestFiles.push(file);
    }
    for (const unread of folder.unread) if (!unreadManifestFiles.includes(unread)) unreadManifestFiles.push(unread);
  }
  manifestFiles.sort((a, b) => compareCodePoints(a.relPath, b.relPath));
  AppState.manifestFiles = manifestFiles;
  AppState.unreadManifestFiles = unreadManifestFiles.sort(compareCodePoints);

  // DEC-5 / FR-6 / FR-7: index + resolve (per-file parse errors do not abort this).
  const { index, rootsByCategory, duplicates, plateauTree } = buildIndex(manifestFiles, settings);
  // wave 014 (run 0080): `settings.current` of a workspace with no plateau names a plateau of the layers, as the command line reads it (`WorkspaceFactory.chosen`)
  if (settings.current !== '') {
    const sentence = layersOfSettingsCurrentProblem(settings.current, plateauTree);
    if (sentence !== null) {
      setFatalError('Could not read the plateaus of .archicode.yaml:\n' + sentence);
      AppState.selection = { kind: 'none', key: null, mode: 'view' };
      requestRedraw();
      return;
    }
  }
  const relationshipStats = resolveRelationships(index);
  AppState.index = index;
  modelsChanged();
  AppState.duplicateReferences = duplicates;
  AppState.plateauTree = plateauTree;
  AppState.relationshipStats = relationshipStats;

  AppState.workspace = {
    application: { elements: rootsByCategory.application },
    technology: { elements: rootsByCategory.technology },
    settings,
    styles: workspaceRaw.styles && typeof workspaceRaw.styles === 'object' ? workspaceRaw.styles : {},
    formatters: workspaceRaw.formatters && typeof workspaceRaw.formatters === 'object' ? workspaceRaw.formatters : {},
    // The whole parsed .archicode.yaml: writeWorkspaceYaml re-emits it, with only styles/formatters/settings replaced,
    // so the other top-level keys (application, technology, views, ...) and the unknown settings survive a save.
    topLevel: workspaceRaw,
    settingsDirty: false, // TDD-0010 DEC-8
    settingsLastKnownDiskModified: workspaceLastKnownDiskModified,
    rawText: workspaceText,
    bom: workspaceBom
  };
  await openLayers(settings, plateauTree);
  applySelectionFromHashRef(); // a bookmarked/shared "?ref=..." lands directly there; otherwise the DEC-9 default empty selection
  const playing = storyPlayerAddress(); // read before render(), which writes the address back without `play=`
  requestRedraw();
  if (playing) openStoryPlayer(playing.story, playing.step, { address: 'replace' }); // a link to a story opens the player once the folder is open (wave 021, run 0153)
  await noteWorkspaceName(); // the list of folders says it, and so does the next "Opening" of this folder (TDD-0020 DEC-4)
}
