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

/** Compare the plateau drawn with `id`, as `compareWithPlateau` does (what a choice of "plateau:<id>" in the list "Compare with" of the band calls); `''` stops the comparison, whichever plateau it was with. */
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

/**
 * A choice made in one of the two lists of the band (wave 015, run 0097): `kind` is `plateau` (the list "Plateau") or `compare` (the list "Compare with"), `value` the value of the
 * option chosen, as `renderPlateauBandHtml` writes it (a plateau id; for the comparison: '' for nothing, `past`, `future`, `plateau:<id>`). What the page does when the person changes the list.
 */
function chooseOnBand(sandbox, kind, value) {
  const attributes = { 'data-band-select': kind };
  const target = { id: 'band-' + kind, value, tagName: 'SELECT', matches: () => false, closest: () => null, getAttribute: (name) => (name in attributes ? attributes[name] : null) };
  sandbox.handleAppInput({ target });
}

/**
 * What the band says, read from its markup: `plateaus` and `compare` are the options of the two lists (`{ value, label, selected, disabled }`; a label is the text as the person reads it,
 * without the indentation), `mistakes` the text of the button of the mistakes or null, and `disabled` whether the lists are.
 */
function bandOf(sandbox) {
  const html = sandbox.renderPlateauBandHtml();
  const unescape = (text) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const list = (id) => {
    const at = html.indexOf('<select id="' + id + '"');
    if (at < 0) return null;
    const block = html.slice(at, html.indexOf('</select>', at));
    return {
      disabled: /^<select[^>]*\sdisabled/.test(block),
      options: Array.from(block.matchAll(/<option value="([^"]*)"([^>]*)>([^<]*)<\/option>/g)).map((m) => ({ value: unescape(m[1]), label: unescape(m[3]).replace(/^\u2003+/, ''), selected: /\sselected/.test(m[2]), disabled: /\sdisabled/.test(m[2]) }))
    };
  };
  const plateau = list('band-plateau');
  const compare = list('band-compare');
  const button = html.match(/<button[^>]*class="band-mistakes"[^>]*>(.*?)<\/button>/);
  return {
    html,
    plateaus: plateau ? plateau.options : null,
    compare: compare ? compare.options : null,
    disabled: !!(plateau && plateau.disabled),
    drawn: plateau ? (plateau.options.find((o) => o.selected) || {}).value : null,
    compared: compare ? (compare.options.find((o) => o.selected) || {}).value : null,
    mistakes: button ? button[1].replace(/<[^>]*>/g, '').trim() : null
  };
}

module.exports = { inPlateau, plateauManifest, layeredFiles, openLayered, compareWith, chooseOnBand, bandOf };
