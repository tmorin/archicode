// ---- Left panel — pure navigation (FR-8/FR-9/FR-10, AC-2/AC-3/AC-4) ----

/**
 * The id of the group of children of a row of a tree: one per layer and per element. The reference is escaped so that
 * two different ones never give the same id (`shop.web` and `shop_web` did), and the layer tells apart an application
 * element from a technology element of the same reference.
 */
function treeGroupId(prefix, layer, reference) {
  return prefix + layer + '-' + String(reference).replace(/[^A-Za-z0-9-]/g, (c) => '_' + c.charCodeAt(0).toString(16) + '_');
}

/** The tab stop of a tree is one row: a reference that is in both layers has two rows, and only the first takes it. */
let navTabStopGiven = false;
function navTabIndex(key) {
  if (key !== navActiveKey || navTabStopGiven) return '-1';
  navTabStopGiven = true;
  return '0';
}

/**
 * The order of the rows of a navigation: by kind, from the widest to the narrowest (solution, system, container,
 * component; then person, group, environment, node), then by name — the id when there is no name. The model keeps the
 * order of the manifests; only the navigation sorts.
 */
const NAV_KIND_ORDER = ['solution', 'system', 'container', 'component', 'person', 'environment', 'node'];
function navKindRank(kind) {
  const k = String(kind);
  const rank = NAV_KIND_ORDER.indexOf(k);
  return rank === -1 ? NAV_KIND_ORDER.length : rank;
}
function sortedForNav(records) {
  const label = (r) => String(r.name !== undefined && r.name !== null && r.name !== '' ? r.name : r.id);
  return (records || []).slice().sort((a, b) =>
    navKindRank(a.kind) - navKindRank(b.kind) ||
    label(a).localeCompare(label(b), undefined, { sensitivity: 'base', numeric: true }) ||
    (a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0));
}

/**
 * The comparison the rows of a tree read while it is drawn (run 0040): one lookup for the whole tree, not one per row (the answer is cached, but its
 * key is the whole model). Null while nothing is compared, and outside the drawing of a tree: a row then has no mark and is what it always was.
 */
let treeComparison = null;

function comparisonForTrees() {
  const state = comparisonState();
  return state && state.records ? state : null;
}

/** The state a row of a tree says for an element: its own change, `contains-changes` for one that has a change below it (the kernel says so, `comparisonStateOfElement`), or null. A removed element is not in a tree. */
function treeChangeOf(record) {
  if (!treeComparison) return null;
  const layer = record.layer || 'application';
  return comparisonStateOfElement(treeComparison.records.get(layer + '|' + record.reference));
}

/** The mark of a row of a tree: a glyph (+ new, ~ changed, ± contains changes; the word is in the tooltip and in what a screen reader reads, see `treeChangeWord`). */
function treeChangeMarkHtml(change) {
  return change ? '<span class="tree-change" data-state="' + change + '" title="' + escapeHtml(treeChangeWord(change)) + '" aria-hidden="true">' + escapeHtml(CHANGE_GLYPHS[change]) + '</span>' : '';
}

/** What the mark of a row says in words. */
function treeChangeWord(change) {
  return change === 'contains-changes' ? 'Contains changes: something inside it is new, changed or removed' : CHANGE_WORDS[change].word.charAt(0).toUpperCase() + CHANGE_WORDS[change].word.slice(1) + ' since ' + (treeComparison ? plateauTitle(treeComparison.base) : 'the other plateau');
}

function renderTreeNodeHtml(record, level) {
  const hasChildren = Array.isArray(record.children) && record.children.length > 0;
  const key = recordKey(record);
  const isExpanded = AppState.expanded.has(key);
  // the same reference can be an element of both layers: only the row of the selected layer is the selected one
  const selected = elementSelection();
  const isActive = selected.kind === 'element' && selected.key === record.reference &&
    layerOfReference(record.reference, selected.layer) === (record.layer || 'application');
  const label = (record.name !== undefined && record.name !== null && record.name !== '') ? record.name : record.id;
  const modified = AppState.dirtyReferences.has(key);
  const ref = escapeHtml(record.reference);
  const groupId = treeGroupId('tree-group-', record.layer || 'application', record.reference);
  const styled = styledStereotypesOf(stereotypesOfRecord(record)); // what the workspace styled: shown as badges, said in the label
  const change = treeChangeOf(record); // a comparison: the glyph after the name, and the word for a screen reader
  const spoken = label + (styled.length ? ', ' + styled.join(', ') : '') + (modified ? ', modified' : '') + (change ? ', ' + CHANGE_WORDS[change].word : '');

  let html = '<div class="tree-node">';
  html += '<div class="tree-node-row' + (isActive ? ' active' : '') + '" role="treeitem" style="--level:' + level + '" aria-level="' + level + '" aria-selected="' + isActive + '"' +
          (hasChildren ? ' aria-expanded="' + isExpanded + '"' + (isExpanded ? ' aria-owns="' + groupId + '"' : '') : '') +
          ' tabindex="' + navTabIndex(key) + '" data-node="' + escapeHtml(key) + '" data-aria="' + escapeHtml(spoken) + '" aria-label="' + escapeHtml(spoken) + '"' +
          ' data-action="select-element" data-ref="' + ref + '" data-layer="' + escapeHtml(record.layer || 'application') + '">';
  if (hasChildren) {
    html += '<span class="tree-toggle" aria-hidden="true" data-action="toggle-element" data-ref="' + ref + '" data-layer="' + escapeHtml(record.layer || 'application') + '">' + (isExpanded ? '▾' : '▸') + '</span>';
  } else {
    html += '<span class="tree-toggle tree-toggle-empty" aria-hidden="true">▸</span>';
  }
  html += '<span class="tree-node-kind" title="' + escapeHtml(record.kind) + '">' + escapeHtml(kindAbbreviation(record.kind)) + '</span>';
  html += '<span class="tree-node-label" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>' + treeChangeMarkHtml(change) + stereotypeBadgesHtml(styled);
  if (modified) {
    html += '<span class="modified-dot" aria-hidden="true" title="This element has unsaved changes"></span>';
  }
  html += '</div>';
  if (hasChildren && isExpanded) {
    html += '<div class="tree-node-children" role="group" id="' + groupId + '">';
    for (const child of sortedForNav(record.children)) {
      html += renderTreeNodeHtml(child, level + 1);
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

/**
 * The heading of a list in the left panel that does not fold (the Map, Files, Stories, Views): the look of the headings of
 * the Elements tree — title on the left, its tools on the right — so that every perspective's panel reads the same.
 */
function renderNavHeaderHtml(title, actionsHtml) {
  return '<div class="tree-branch-header static"><span class="tree-branch-title">' + escapeHtml(title) + '</span>' +
    (actionsHtml ? '<span class="tree-branch-actions">' + actionsHtml + '</span>' : '') + '</div>';
}

function renderTreeBranchHtml(branchKey, title, category, elements, isExpanded, showAddButton) {
  let html = '<div class="nav-section">';
  html += '<div class="tree-branch-header" data-action="toggle-branch" data-branch="' + escapeHtml(branchKey) + '">' +
            // the title is the control (the header also holds buttons, which cannot sit inside one): a click anywhere on the header does the same
            '<span class="tree-branch-title" role="button" tabindex="0" aria-expanded="' + isExpanded + '">' + (isExpanded ? '▾' : '▸') + ' ' + escapeHtml(title) + '</span>' +
            '<span class="tree-branch-actions">' + renderNavToolsHtml(category, branchKey, title) + (showAddButton ? ('<button type="button" class="tree-branch-add-btn" data-action="open-create-top-level-form" data-category="' + escapeHtml(category) + '" aria-label="Add an element to ' + escapeHtml(title) + '">+ Add</button>') : '') +
            '</span>' +
          '</div>';
  if (isExpanded) {
    html += '<div class="tree-branch-body"' + (elements && elements.length ? ' role="tree" aria-label="' + escapeHtml(title) + '"' : '') + '>';
    if (!elements || elements.length === 0) {
      html += '<div class="tree-empty">' + (showAddButton ? 'No elements yet — use "+ Add" above to create one.' : 'No elements.') + '</div>';
    } else {
      for (const el of sortedForNav(elements)) {
        html += renderTreeNodeHtml(el, 1);
      }
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

/**
 * The Applications/Environments element tree, no wrapper — shared by the
 * Elements and Diagram perspectives' left panel. `showAddButton` is false
 * for Diagram: its left panel is pure navigation (DEC — Diagram has no
 * center surface to land a newly-created element on, only Elements does).
 */
function renderElementsNavHtml(showAddButton) {
  const appElements = (AppState.workspace && AppState.workspace.application && AppState.workspace.application.elements) || [];
  const techElements = (AppState.workspace && AppState.workspace.technology && AppState.workspace.technology.elements) || [];
  // one tab stop for both trees: the row the user was on, else the selected one, else the first
  const visible = [];
  const collect = (record) => { visible.push(recordKey(record)); if (AppState.expanded.has(recordKey(record))) sortedForNav(record.children).forEach(collect); };
  if (treeExpandedApplications) sortedForNav(appElements).forEach(collect);
  if (treeExpandedEnvironments) sortedForNav(techElements).forEach(collect);
  const selected = elementSelection();
  resolveNavActive(visible, selected.kind === 'element' ? nodeKey(selected.key, selected.layer) : null);
  navTabStopGiven = false;
  const facet = anyDiagramShown() ? currentDiagramFacet() : null;
  const note = facet
    ? '<div class="nav-facet-note">Greyed: nothing to draw through “' + escapeHtml(facet.name) + '”. <button type="button" data-action="clear-facet">Clear facet</button></div>'
    : '';
  treeComparison = comparisonForTrees();
  try {
    return note + renderPlateauTreeHtml() + renderDuplicateReferencesHtml() + renderUnreadManifestsHtml(false) +
           renderTreeBranchHtml('applications', 'Applications', 'application', appElements, treeExpandedApplications, showAddButton) +
           renderTreeBranchHtml('environments', 'Environments', 'technology', techElements, treeExpandedEnvironments, showAddButton);
  } finally {
    treeComparison = null;
  }
}

/**
 * Unfold all / Fold all for a tree of a navigation: every branch of one layer's tree, never what the map draws. The Elements
 * navigation has one pair in the header of each of its two trees (`branch` says which header folds with it); the Map one, a single pair.
 */
function renderNavToolsHtml(layer, branch, name) {
  const icon = (d) => '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const scope = ' data-layer="' + layer + '"' + (branch ? ' data-branch="' + branch + '"' : '');
  return '<span class="nav-tools">' +
    '<button type="button" class="map-scope-btn" data-action="nav-unfold-all"' + scope + ' title="Unfold every branch of the tree" aria-label="Unfold every branch of ' + (name || 'the tree') + '">' + icon('M4 3.5l4 3 4-3M4 9.5l4 3 4-3') + '</button>' +
    '<button type="button" class="map-scope-btn" data-action="nav-fold-all"' + scope + ' title="Fold every branch of the tree" aria-label="Fold every branch of ' + (name || 'the tree') + '">' + icon('M4 6.5l4-3 4 3M4 12.5l4-3 4 3') + '</button>' +
    '</span>';
}

/** Every element of a layer that has children: what "Unfold all" opens. */
function referencesWithChildren(layer) {
  const found = [];
  for (const record of AppState.index[layer].values()) {
    if (Array.isArray(record.children) && record.children.length) found.push(record.reference);
  }
  return found;
}

/** A message of `duplicateReferenceMessage` as HTML: the reference and the files in `<code>`. */
function duplicateMessageHtml(message) {
  return escapeHtml(message).replace(/`([^`]*)`/g, '<code>$1</code>');
}

/**
 * A reference declared twice is never chosen between: it is told here (Elements and Files), on the files that declare it,
 * and the diagrams are not drawn while it lasts (`mountDiagramIfNeeded`). The command line fails on the same references.
 * Nothing is blocked otherwise: the editor still opens, edits and saves, so that the duplicate can be fixed in it.
 */
function renderDuplicateReferencesHtml() {
  const duplicates = AppState.duplicateReferences || [];
  if (!duplicates.length) return '';
  return '<div class="nav-duplicate-note" role="alert"><strong>' + duplicatesCountText(duplicates) + ' declared more than once.</strong> ' +
    'The command line refuses to load the workspace until each is declared once.' +
    (elementDuplicates().length ? ' The diagrams are not drawn meanwhile.' : '') +
    '<ul>' + duplicates.map((d) => '<li>' + duplicateMessageHtml(d.message) + '</li>').join('') + '</ul></div>';
}

function duplicatesCountText(duplicates) {
  return duplicates.length === 1 ? 'One reference, view or story is' : duplicates.length + ' references, views or stories are';
}

/**
 * The mistakes of the tree of plateaus (the command line refuses the workspace until each is fixed) and what is odd about it (the command line
 * warns). Nothing is blocked: the editor opens, edits and saves, so that the mistake can be fixed in it. Nothing at all for a workspace that
 * writes no layered plateau.
 */
function renderPlateauTreeHtml() {
  const model = AppState.plateauTree;
  if (!model) return '';
  // a view and a story that say `plateau:` are told even when nothing else uses plateaus: the key names none, and the command line warns of it
  if (!model.layered) return model.warnings.length ? '<div class="nav-facet-note nav-plateau-warnings" role="status"><ul>' + model.warnings.map((w) => '<li>' + duplicateMessageHtml(w) + '</li>').join('') + '</ul></div>' : '';
  let html = '';
  const problems = model.problems.concat(model.redeclared);
  if (problems.length) {
    html += '<div class="nav-duplicate-note" role="alert"><strong>' + (problems.length === 1 ? 'One mistake in the plateaus.' : problems.length + ' mistakes in the plateaus.') + '</strong> ' +
      'The command line refuses to load the workspace until they are fixed.' +
      '<ul>' + problems.map((p) => '<li>' + duplicateMessageHtml(p) + '</li>').join('') + '</ul></div>';
  }
  if (model.warnings.length) {
    html += '<div class="nav-facet-note nav-plateau-warnings" role="status"><ul>' + model.warnings.map((w) => '<li>' + duplicateMessageHtml(w) + '</li>').join('') + '</ul></div>';
  }
  return html;
}

/** The duplicates that are references of elements: the model has no single answer, so nothing is drawn from it. */
function elementDuplicates() {
  return (AppState.duplicateReferences || []).filter((d) => d.layer === 'application' || d.layer === 'technology');
}

/** The duplicates a file takes part in (its relPath is one of their sources). */
function duplicatesOfFile(relPath) {
  return (AppState.duplicateReferences || []).filter((d) => d.sources.includes(relPath));
}

/**
 * The files the CLI reads as manifests and the editor does not (TOML, JSON): what they declare is missing from the trees and
 * the diagrams, and nothing else says so. `list`: name them (Files), else only count them (Elements).
 */
function renderUnreadManifestsHtml(list) {
  const files = AppState.unreadManifestFiles || [];
  if (!files.length) return '';
  const text = files.length + (files.length === 1 ? ' manifest file is' : ' manifest files are') + ' not read by the editor, which reads YAML only: what ' +
    (files.length === 1 ? 'it declares is' : 'they declare is') + ' missing here, and relationships to it show as dangling.';
  return '<div class="nav-facet-note nav-unread-note" role="status">' + escapeHtml(text) +
    (list ? '<ul>' + files.map((relPath) => '<li class="file-relpath">' + escapeHtml(relPath) + '</li>').join('') + '</ul>' : ' See Files.') + '</div>';
}

const FILES_NO_PLATEAU_GROUP = 'none';

/** The group of the Files page a file is in. */
function filesGroupOf(mf) {
  const plateau = filePlateauOf(mf);
  return plateau === null ? FILES_NO_PLATEAU_GROUP : 'plateau:' + plateau;
}

/** Whether the Files page groups its files: the workspace has plateaus (a manifest of kind Plateau, or a header that says `plateau:`). Else the list is flat, as it always was. */
function filesAreGrouped() {
  return !!(AppState.plateauTree && AppState.plateauTree.layered);
}

/** The groups of the files, in the order of the plateaus (the root first, then each plateau under the one it overrides), the ones the tree does not know after them, and no plateau last. Empty groups are left out. */
function filesGroups(files) {
  const byKey = new Map();
  for (const mf of files) {
    const key = filesGroupOf(mf);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(mf);
  }
  const tree = AppState.plateauTree;
  const known = tree ? tree.ids.map((id) => 'plateau:' + id) : [];
  const unknown = Array.from(byKey.keys()).filter((key) => key !== FILES_NO_PLATEAU_GROUP && !known.includes(key)).sort(compareUnits);
  return known.concat(unknown, [FILES_NO_PLATEAU_GROUP]).filter((key) => byKey.has(key)).map((key) => ({ key, files: byKey.get(key) }));
}

/** The group of the open file is unfolded the first time it is open there (a file opened from the list, an address, a link), so that the list never loses it; a fold the author makes after that is kept. */
function unfoldGroupOfOpenFile() {
  const selection = AppState.selection;
  if (!filesAreGrouped() || selection.kind !== 'file') return;
  const mf = AppState.manifestFiles.find((f) => f.relPath === selection.key);
  if (!mf) return;
  const seen = selection.key + '\0' + filesGroupOf(mf);
  if (seen === filesSelectionSeen) return;
  filesSelectionSeen = seen;
  filesFolded.delete(filesGroupOf(mf));
}

/**
 * What is odd about where a manifest sits: its plateau disagrees with the name of a folder it is in, when that name is the id of another plateau (the folders of the layered
 * Brightcart are named after their plateau; a file moved from one to the other with its header left alone is read as the plateau its header says, not the folder's). The
 * deepest such folder counts. Null when the file agrees, when no folder is named like a plateau, or without layers. Only a warning: the folder does not matter to the tools.
 */
function filePlateauFolderWarning(mf) {
  const tree = AppState.plateauTree;
  const plateau = filePlateauOf(mf);
  if (!tree || !tree.layered || plateau === null) return null;
  const folders = mf.relPath.split('/').slice(0, -1);
  for (let i = folders.length - 1; i >= 0; i--) {
    if (!tree.nodes.has(folders[i])) continue;
    if (folders[i] === plateau) return null;
    const how = manifestKindName(mf.header.kind) === 'plateau' ? 'declares the plateau `' + plateau + '`'
      : headerPlateau(mf.header) === null ? 'has no `plateau` key in its header, so it belongs to `' + plateau + '`'
      : 'says `plateau: ' + plateau + '` in its header';
    return '`' + mf.relPath + '` ' + how + ', but it sits in the folder `' + folders[i] + '`, which is the name of another plateau';
  }
  return null;
}

/** One row of the Files list: the file, and what is odd about it. */
function renderFileRowHtml(mf) {
  const active = (AppState.selection.kind === 'file' && AppState.selection.key === mf.relPath) ? ' active' : '';
  const duplicates = duplicatesOfFile(mf.relPath);
  const errorClass = mf.error || duplicates.length ? ' has-error' : '';
  const warning = filesAreGrouped() ? filePlateauFolderWarning(mf) : null;
  return '<div class="nav-row file-row' + active + errorClass + '" role="button" tabindex="0"' + (active ? ' aria-current="true"' : '') + ' data-action="select-file" data-relpath="' + escapeHtml(mf.relPath) + '">' +
           '<span class="file-relpath">' + escapeHtml(mf.relPath) + '</span>' +
           (warning ? '<span class="warning-badge" title="' + escapeHtml(warning) + '">folder</span>' : '') +
           (mf.dirty ? '<span class="modified-badge" title="Unsaved changes">modified</span>' : '') +
           (mf.error ? '<span class="error-badge" title="' + escapeHtml(mf.error) + '">error</span>' : '') +
           (duplicates.length ? '<span class="error-badge" title="' + escapeHtml(duplicates.map((d) => d.message).join('\n')) + '">duplicate</span>' : '') +
         '</div>';
}

/** One group of the Files list: its heading (the plateau, its name, how many files), which folds it, and its rows. */
function renderFilesGroupHtml(group) {
  const folded = filesFolded.has(group.key);
  const none = group.key === FILES_NO_PLATEAU_GROUP;
  const id = none ? null : group.key.slice('plateau:'.length);
  const node = id !== null && AppState.plateauTree ? AppState.plateauTree.nodes.get(id) : null;
  const title = none ? 'No plateau' : id;
  const name = node && node.name ? node.name : '';
  const hint = none ? 'Files that belong to no plateau' : 'Files of the plateau `' + id + '`';
  const count = group.files.length + (group.files.length === 1 ? ' file' : ' files');
  // what a folded group would show on its rows, so that a fold never hides a mistake or an unsaved file
  const hidden = !folded ? '' :
    (group.files.some((mf) => mf.error || duplicatesOfFile(mf.relPath).length) ? '<span class="error-badge" title="A file of this group has an error">error</span>' : '') +
    (group.files.some((mf) => mf.dirty) ? '<span class="modified-badge" title="A file of this group has unsaved changes">modified</span>' : '');
  let html = '<div class="files-group" data-files-group="' + escapeHtml(group.key) + '"' + (id !== null ? ' data-plateau-of="' + escapeHtml(id) + '"' : '') + '>';
  html += '<div class="tree-branch-header" data-action="toggle-files-group" data-branch="files:' + escapeHtml(group.key) + '" data-group="' + escapeHtml(group.key) + '">' +
            '<span class="tree-branch-title" role="button" tabindex="0" aria-expanded="' + !folded + '" title="' + escapeHtml(hint) + '">' + (folded ? '▸' : '▾') + ' ' + escapeHtml(title) +
              (name ? ' <span class="files-group-name">' + escapeHtml(name) + '</span>' : '') + '</span>' +
            '<span class="files-group-count">' + hidden + count + '</span>' +
          '</div>';
  if (!folded) html += '<div class="tree-branch-body">' + group.files.map(renderFileRowHtml).join('') + '</div>';
  return html + '</div>';
}

/** Unfold all / Fold all for the groups of the Files list. */
function renderFilesToolsHtml() {
  const icon = (d) => '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '<button type="button" class="map-scope-btn" data-action="files-unfold-all" title="Unfold every group of files" aria-label="Unfold every group of files">' + icon('M4 3.5l4 3 4-3M4 9.5l4 3 4-3') + '</button>' +
    '<button type="button" class="map-scope-btn" data-action="files-fold-all" title="Fold every group of files" aria-label="Fold every group of files">' + icon('M4 6.5l4-3 4 3M4 12.5l4-3 4 3') + '</button>';
}

/** The manifest files list, no wrapper — the Files perspective's left panel. Every file is listed; with plateaus they are in a group per plateau (see `filesFolded`). */
function renderFilesNavHtml() {
  const grouped = filesAreGrouped();
  let html = '<div class="nav-section">';
  html += renderNavHeaderHtml('Files', grouped ? renderFilesToolsHtml() : '');
  if (grouped) {
    unfoldGroupOfOpenFile();
    const misplaced = AppState.manifestFiles.filter((mf) => filePlateauFolderWarning(mf) !== null).length;
    if (misplaced > 0) html += '<div class="files-note" role="status">' + misplaced + (misplaced === 1 ? ' file sits' : ' files sit') + ' in the folder of another plateau.</div>';
    html += filesGroups(AppState.manifestFiles).map(renderFilesGroupHtml).join('');
  } else {
    html += AppState.manifestFiles.map(renderFileRowHtml).join('');
  }
  html += '</div>';
  return renderPlateauTreeHtml() + renderDuplicateReferencesHtml() + html + renderUnreadManifestsHtml(true);
}

/** The left panel's `<nav>` shell — one resizable panel id shared by every perspective that uses it. */
function renderLeftPanelWrapperHtml(innerHtml) {
  return '<nav id="panel-left" class="left-panel min-w-48 w-64 max-w-[40vw]" style="' + savedPanelSizeStyle('panel-left', 'width') + '">' + innerHtml + '</nav>';
}

