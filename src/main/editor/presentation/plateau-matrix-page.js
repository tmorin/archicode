// ---- The Reading view of a path of plateaus: where each element came from and went, in one table ----
// The page Plateaus draws, under its list, a table for the path from the root to the plateau a reader chose: a column per plateau and a Span column, a row per lineage of an element
// (followed through `replaces`), the rows grouped by layer. The rows are made by `plateauMatrixOf` (model/plateau-matrix.js) from what the editor knows: the elements of each plateau
// (`layerModelOf`) and the kernel's comparison of each pair of neighbours and of the first with the last (`comparisonStateOf`). Nothing here writes the workspace.

/** The plateaus of the path that ends at `id`, from the root down, as ids. Empty when `id` is not in the tree. */
function plateauMatrixPathOf(id) {
  const tree = AppState.plateauTree;
  if (!tree || !tree.nodes.has(id)) return [];
  return plateauChain(tree, id).map((node) => node.id);
}

/**
 * The plateau the reading ends at, or null. A reading that cannot stand (no plateau tree, a workspace with one plateau, blocked layers, a plateau that is no longer in the tree, the root,
 * or a plateau that cannot be drawn) is let go: the state is cleared and the page shows the list alone.
 */
function plateauReadingPath() {
  const path = plateauReading.path;
  if (path === null) return null;
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  const standing =
    !!layers &&
    !!AppState.workspace &&
    !!tree &&
    tree.layered &&
    !layers.blocked &&
    tree.nodes.has(path) &&
    tree.nodes.get(path).parent !== null &&
    (!loadedKernel || !layerModelBroken(path)); // until the kernel is loaded no plateau can be drawn: the reading waits, it is not let go
  if (!standing) {
    plateauReading = { path: null, all: false };
    return null;
  }
  return path;
}

/** Is a reading chosen that still waits for the kernel? (`settlePlateausPanel` loads it and draws the page again.) */
function plateauMatrixIsPending() {
  return plateauReadingPath() !== null && !loadedKernel;
}

/** The elements a plateau holds, as the rule reads them. */
function plateauMatrixPresenceOf(id) {
  const model = layerModelOf(id, AppState.workspace.settings);
  const out = [];
  for (const layer of ['application', 'technology']) {
    for (const element of model.index[layer].values())
      out.push({ layer, reference: element.reference, kind: element.kind, name: element.name });
  }
  return out;
}

/** The element rows of the comparison of `id` with `against`, or `{ pending }`, or `{ problems, pair }`. The wording toggle of the editor is not read: the table is the one of `diff`. */
function plateauMatrixPairNow(id, against, memo) {
  const state = comparisonStateOf(drawingOfPlateaus(id, against, { hideWording: false }), memo);
  if (!state) return { problems: ['The two plateaus cannot be compared.'], pair: [against, id] };
  if (state.pending) return { pending: true };
  if (state.problems) return { problems: state.problems, pair: [against, id] };
  return { rows: state.full.changes.filter((row) => row.thing === 'element') };
}

/**
 * The reading now: null when no path is chosen, `{ pending: true }` while the kernel is not loaded, `{ problems, pair }` when a pair cannot be drawn or compared, else the matrix of
 * `plateauMatrixOf` with the ids of the path: `{ ids, columns, rows, unchanged }`. One comparison per pair of neighbours and one for the Span from three plateaus on; the answers are
 * kept by the comparison memo of the story scene and by nothing else.
 */
function plateauMatrixNow() {
  const path = plateauReadingPath();
  if (path === null) return null;
  const ids = plateauMatrixPathOf(path);
  if (!loadedKernel) return { pending: true };
  const memo = sceneComparisonMemo();
  const steps = [];
  for (let i = 1; i < ids.length; i++) {
    const step = plateauMatrixPairNow(ids[i], ids[i - 1], memo);
    if (step.pending || step.problems) return step;
    steps.push(step.rows);
  }
  let span = null;
  if (ids.length > 2) {
    const whole = plateauMatrixPairNow(ids[ids.length - 1], ids[0], memo);
    if (whole.pending || whole.problems) return whole;
    span = whole.rows;
  }
  const matrix = plateauMatrixOf(
    ids.map((id) => ({ id })),
    ids.map(plateauMatrixPresenceOf),
    steps,
    span
  );
  return Object.assign({ ids }, matrix);
}

/** The states of a cell that are changes (the buttons); the others are `absent` and `present`. */
const MATRIX_CELL_CHANGES = ['new', 'changed', 'removed', 'moved', 'split', 'merged'];

/** The glyph of a state of a cell: the one of the Changes panel for a change, `-` for an element the plateau does not hold, `=` for one that did not change. Nothing while the words are not known. */
function matrixGlyphOf(state) {
  if (state === 'absent') return '-';
  if (state === 'present') return '=';
  return CHANGE_STATES.includes(state) ? CHANGE_GLYPHS[state] : '';
}

/** What a cell says: its glyph and its word, then where it comes from when it replaces something. A glyph never stands alone. */
function matrixCellContentHtml(cell) {
  const glyph = matrixGlyphOf(cell.state);
  return (
    (glyph ? '<span class="matrix-glyph" aria-hidden="true">' + escapeHtml(glyph) + '</span> ' : '') +
    '<span class="matrix-word">' +
    escapeHtml(cell.state) +
    '</span>' +
    (cell.from && cell.from.length
      ? ' <span class="matrix-from">from ' +
        cell.from.map((ref) => '<code>' + escapeHtml(ref) + '</code>').join(', ') +
        '</span>'
      : '')
  );
}

/**
 * One cell of a row. A cell that says a change is a button that draws the pair of its column and opens the Changes panel on the element; `present` and `absent` are plain text, and so
 * is every cell of the first column (it compares with nothing). `column` is the index of the plateau, or `span`; `reference` the element the Changes panel lists.
 */
function matrixCellHtml(row, cell, column, reference, pair) {
  const clickable = MATRIX_CELL_CHANGES.includes(cell.state) && column !== 0 && reference !== null;
  const cls = 'matrix-cell matrix-' + cell.state + (column === 'span' ? ' matrix-span' : '');
  if (!clickable) return '<td class="' + cls + '">' + matrixCellContentHtml(cell) + '</td>';
  return (
    '<td class="' +
    cls +
    '"><button type="button" class="matrix-cell-button" data-action="matrix-cell" data-column="' +
    column +
    '" data-layer="' +
    escapeHtml(row.layer) +
    '" data-reference="' +
    escapeHtml(reference) +
    '" aria-label="' +
    escapeHtml(reference + ', ' + cell.state + ', ' + pair[0] + ' to ' + pair[1]) +
    '" title="Draw ' +
    escapeHtml(pair[1]) +
    ' compared with ' +
    escapeHtml(pair[0]) +
    ' and open the change in the Changes panel">' +
    matrixCellContentHtml(cell) +
    '</button></td>'
  );
}

/** The reference the Changes panel lists for a cell: the element of the plateau the cell is in, or, for a `removed` cell, the one it was in the plateau before. */
function matrixCellReference(row, column) {
  if (column === 'span') {
    const last = row.cells[row.cells.length - 1];
    return row.span && row.span.state === 'removed' ? row.cells[0].reference : last.reference;
  }
  const cell = row.cells[column];
  if (cell.reference !== null) return cell.reference;
  return column > 0 ? row.cells[column - 1].reference : null;
}

function matrixRowHtml(row, ids) {
  const cells = row.cells.map((cell, i) =>
    matrixCellHtml(row, cell, i, matrixCellReference(row, i), [ids[i - 1], ids[i]])
  );
  if (row.span) {
    const last = ids.length - 1;
    cells.push(matrixCellHtml(row, row.span, 'span', matrixCellReference(row, 'span'), [ids[0], ids[last]]));
  } else if (ids.length > 2) {
    cells.push('<td class="matrix-cell matrix-span matrix-empty"></td>');
  }
  return (
    '<tr class="matrix-row"><th scope="row" class="matrix-ref" title="' +
    escapeHtml((row.kind || '') + (row.name ? ' ' + row.name : '')) +
    '"><code>' +
    escapeHtml(row.reference) +
    '</code>' +
    (row.name ? ' <span class="matrix-name">' + escapeHtml(row.name) + '</span>' : '') +
    '</th>' +
    cells.join('') +
    '</tr>'
  );
}

/** The table of a matrix: the head (the plateaus, then Span), and a group of rows per layer under its own caption row. */
function matrixTableHtml(matrix) {
  const ids = matrix.ids;
  const all = plateauReading.all;
  const shown = matrix.rows.filter((row) => all || row.changes);
  const width = 1 + ids.length + (ids.length > 2 ? 1 : 0);
  const head =
    '<thead><tr><th scope="col" class="matrix-ref">Element</th>' +
    ids
      .map((id) => {
        const title = plateauTitle(layerPlateauModel(id));
        return (
          '<th scope="col">' +
          escapeHtml(title) +
          (title !== id ? ' <code class="timeline-id">' + escapeHtml(id) + '</code>' : '') +
          '</th>'
        );
      })
      .join('') +
    (ids.length > 2 ? '<th scope="col" class="matrix-span">Span</th>' : '') +
    '</tr></thead>';
  const groups = [];
  for (const row of shown) {
    const last = groups[groups.length - 1];
    if (last && last.layer === row.layer) last.rows.push(row);
    else groups.push({ layer: row.layer, rows: [row] });
  }
  const body = groups
    .map(
      (group) =>
        '<tbody data-layer="' +
        escapeHtml(group.layer) +
        '"><tr class="matrix-layer"><th scope="rowgroup" colspan="' +
        width +
        '">' +
        escapeHtml(group.layer.charAt(0).toUpperCase() + group.layer.slice(1)) +
        '</th></tr>' +
        group.rows.map((row) => matrixRowHtml(row, ids)).join('') +
        '</tbody>'
    )
    .join('');
  return '<div class="matrix-scroll"><table class="matrix">' + head + body + '</table></div>';
}

/**
 * The Reading block under the list of the plateaus: empty while no path is chosen. A path the kernel has not answered for says so; a pair that cannot be drawn or compared is
 * told with its sentences and the table is not drawn.
 */
function renderPlateauMatrixHtml() {
  const path = plateauReadingPath();
  if (path === null) return '';
  const ids = plateauMatrixPathOf(path);
  const head =
    '<div class="matrix-head"><h3>Reading <code>' +
    escapeHtml(ids.join(', ')) +
    '</code></h3><button type="button" data-action="matrix-close">Close reading</button></div>';
  const now = plateauMatrixNow();
  let body;
  if (now.pending) body = '<p class="timeline-status" role="status">Reading the plateaus…</p>';
  else if (now.problems)
    body =
      '<div class="matrix-problems" role="alert"><p>The path cannot be read: ' +
      escapeHtml(now.pair[0]) +
      ' and ' +
      escapeHtml(now.pair[1]) +
      ' are not compared.</p>' +
      now.problems.map((sentence) => '<p>' + escapeHtml(sentence) + '</p>').join('') +
      '</div>';
  else {
    const changes = now.rows.length - now.unchanged;
    body =
      '<div class="matrix-tools"><button type="button" data-action="matrix-rows" aria-pressed="' +
      !plateauReading.all +
      '">Changes only</button><span class="muted">' +
      changes +
      (changes === 1 ? ' change' : ' changes') +
      ' in ' +
      now.rows.length +
      (now.rows.length === 1 ? ' lineage' : ' lineages') +
      ' · ' +
      now.unchanged +
      ' unchanged</span></div>' +
      matrixTableHtml(now);
  }
  return '<section class="matrix-block" aria-label="Reading of the path">' + head + body + '</section>';
}

/** Read the path that ends at `id`; the same button again closes the reading. */
function openPlateauMatrix(id) {
  if (plateauReading.path === id) return closePlateauMatrix();
  const tree = AppState.plateauTree;
  if (!tree || !tree.nodes.has(id) || tree.nodes.get(id).parent === null) return;
  plateauReading = { path: id, all: false };
  requestRedraw();
}

function closePlateauMatrix() {
  plateauReading = { path: null, all: false };
  requestRedraw();
}

/** Unfold (`all` true) or fold the lineages with no change. */
function setMatrixRows(all) {
  if (plateauReading.path === null) return;
  plateauReading = { path: plateauReading.path, all: !!all };
  requestRedraw();
}

/**
 * A click on a cell: draw the plateau of its column compared with the plateau on its left (the first plateau for the Span), then select the element in the Changes panel.
 * `column`: the index of the plateau in the path, or `span`.
 */
function openMatrixCell(column, layer, reference) {
  const path = plateauReadingPath();
  if (path === null) return false;
  const ids = plateauMatrixPathOf(path);
  const index = column === 'span' ? ids.length - 1 : Number(column);
  const against = column === 'span' ? ids[0] : ids[index - 1];
  if (!(index > 0 && index < ids.length) || against === undefined) return false;
  const parent = AppState.plateauTree.nodes.get(ids[index]).parent;
  drawPlateau(ids[index], { compare: parent === against ? 'past' : 'other:' + against });
  const state = comparisonState();
  const row =
    state && state.changes
      ? orderedChangeRows(state).find((r) => r.thing === 'element' && r.layer === layer && r.reference === reference)
      : null;
  if (row) goToChange(row);
  return true;
}
