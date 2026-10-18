'use strict';
// Plateaus that are complete folders of manifests, written as layers (wave 014, run 0084).
//
// The key that listed such folders in workspace.yaml is gone. Tests that built "a plateau is a folder" in memory to have two states of an architecture to draw
// and compare build the same two states here: each plateau is a layer over an empty `baseline`, the manifests of its folder say `plateau: <id>` in their header, and a
// manifest of kind `archicode.morin.io/plateau` gives it its name and its horizon. Plateaus built this way do not stack (none overrides another), so each may declare
// what the others declare, and a comparison is made on the band with `compareWithPlateau` (mode `other`: the plateau drawn is the target, the other one the base),
// which is what the control it replaces did. `manifests.paths` reads every folder below `plateaus/`.
// Everything here is invented; nothing of a real workspace is in it.

/** The text of a manifest with `plateau: <id>` in its header (the first `header:` line, whatever its line breaks); a text that has no such line is returned as it is. */
function inPlateau(id, text) {
  return text.replace(/^header:(\r?\n)/m, (all, eol) => 'header:' + eol + '  plateau: ' + id + eol);
}

/** The manifest of kind plateau that names a plateau; `override` is its parent (none: `baseline`). */
function plateauManifest(plateau) {
  const lines = ['header:', '  kind: "archicode.morin.io/plateau"', '  version: "1"', 'content:', '  id: "' + plateau.id + '"'];
  if (plateau.name) lines.push('  name: "' + plateau.name + '"');
  if (plateau.horizon) lines.push('  horizon: "' + plateau.horizon + '"');
  if (plateau.override) lines.push('  override: "' + plateau.override + '"');
  return lines.join('\n') + '\n';
}

/**
 * The files of a workspace of layers. `plateaus`: `[{ id, name?, horizon?, override?, path }]`, `path` being the folder that holds the plateau's manifests;
 * `files`: `{ 'folder/file.yaml': text }`, every file below one of those folders (a file elsewhere is kept as it is). `settings`: the lines of `settings:` to add.
 * `paths`: the entry of `manifests.paths` that reads the folders (default `plateaus/**`). The plateau manifest of each plateau is `<path>/plateau.yaml`.
 */
function layeredFiles(plateaus, files, settings, paths) {
  const out = { 'workspace.yaml': 'settings:\n' + (settings || '') + '  manifests:\n    paths:\n      - ' + (paths || 'plateaus/**') + '\n' };
  for (const [file, text] of Object.entries(files)) {
    const plateau = plateaus.find((p) => file.startsWith(p.path + '/'));
    out[file] = plateau ? inPlateau(plateau.id, text) : text;
  }
  for (const plateau of plateaus) out[plateau.path + '/plateau.yaml'] = plateauManifest(plateau);
  return out;
}

/**
 * A workspace of layers opened in a sandbox, the plateau `drawn` drawn (none: `baseline`, as the page opens) and, when `compared` is given, compared with
 * `compared` on the band.
 */
async function openLayered(createApp, memFolder, files, options) {
  const opts = options || {};
  const mem = memFolder(files);
  const sandbox = createApp(opts.app || {});
  if (opts.hash) sandbox.location.hash = opts.hash; // read when the folder is opened
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  if (opts.drawn) sandbox.drawPlateau(opts.drawn);
  if (opts.compared) sandbox.compareWithPlateau(opts.compared);
  return { sandbox, state, mem };
}

/** Compare the plateau drawn with `id` on the band, as a press on its ⇄ does; `''` stops the comparison, whichever plateau it was with. */
function compareWith(sandbox, id) {
  const state = sandbox.__state();
  if (id === '' || id === null) {
    if (state.layers.compare && state.layers.compare.other) sandbox.compareWithPlateau(state.layers.compare.other);
    else if (state.layers.compare) sandbox.toggleCompareWithFuture();
    return;
  }
  if (state.layers.compare && state.layers.compare.other === id) return; // the same comparison again is not a press that stops it
  sandbox.compareWithPlateau(id);
}

module.exports = { inPlateau, plateauManifest, layeredFiles, openLayered, compareWith };
