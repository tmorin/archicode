// ---- The matrix of a path of plateaus: the lineages of its elements ----

/** The states of a cell that say a change (`PlateauMatrix.CHANGES`); the others are `absent` and `present`. */
const MATRIX_CHANGE_STATES = new Set(['new', 'changed', 'removed', 'moved', 'split', 'merged']);

const matrixKey = (layer, reference) => layer + '\0' + reference;

/** The state of a cell: the word the comparison gives the element, `present` when it gives none (or `none`). */
function matrixStateOf(change) {
  return !change || !change.change || change.change === 'none' ? 'present' : change.change;
}

/** The order of the layers of the rows: application, technology, then any other by name. */
function matrixLayerRank(layer) {
  return layer === 'application' ? 0 : layer === 'technology' ? 1 : 2;
}

/** The order of two references by Unicode code point (the Java `compareCodePoints`), which is not the order of UTF-16 units for a character above the BMP. */
function matrixCompareCodePoints(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  const n = Math.min(left.length, right.length);
  for (let i = 0; i < n; i++) {
    const x = left[i].codePointAt(0);
    const y = right[i].codePointAt(0);
    if (x !== y) return x < y ? -1 : 1;
  }
  return left.length - right.length;
}

/**
 * The rows of one lineage traced back from its terminal element: one cell per column, and the Span (`PlateauMatrix.trace`).
 * `terminal` is the column of the element, `first` where the trace stops (a split origin or a new element stops it, a merge too).
 */
function matrixTrace(columns, nodes, changes, predecessors, spanChanges, hasSpan, terminal, terminalKey) {
  const n = columns.length;
  const keys = new Array(n).fill(null);
  keys[terminal] = terminalKey;
  let first = terminal;
  while (first > 0) {
    const before = predecessors[first].get(keys[first]);
    if (before.length !== 1) break;
    keys[first - 1] = before[0];
    first--;
  }
  const cells = [];
  for (let i = 0; i < n; i++) {
    const plateau = columns[i].id;
    if (keys[i] !== null) {
      const change = i === 0 ? null : changes[i - 1].get(keys[i]) || null;
      cells.push({
        plateau,
        state: matrixStateOf(change),
        reference: nodes[i].get(keys[i]).reference,
        from: change ? change.replaces || [] : [],
        natures: change ? change.natures || [] : []
      });
    } else {
      cells.push({
        plateau,
        state: i > 0 && keys[i - 1] !== null ? 'removed' : 'absent',
        reference: null,
        from: [],
        natures: []
      });
    }
  }
  let span = null;
  if (hasSpan) {
    if (terminal === n - 1) {
      const change = spanChanges.get(terminalKey) || null;
      span = {
        state: matrixStateOf(change),
        from: change ? change.replaces || [] : [],
        natures: change ? change.natures || [] : []
      };
    } else if (first === 0) {
      span = { state: 'removed', from: [], natures: [] };
    }
    // else: a transient, born after the first plateau and gone before the last, has no Span
  }
  const node = nodes[terminal].get(terminalKey);
  const changed =
    cells.some((cell) => MATRIX_CHANGE_STATES.has(cell.state)) ||
    (span !== null && MATRIX_CHANGE_STATES.has(span.state));
  return {
    layer: node.layer,
    reference: node.reference,
    kind: node.kind,
    name: node.name,
    cells,
    span,
    changes: changed,
    column: terminal
  };
}

/**
 * The elements of a path of plateaus as lineages, a row per lineage and a cell per plateau (`PlateauMatrix.of`, ported statement for statement; the oracle is
 * `src/test/resources/brightcart/matrix-cases.json`). `columns`: the plateaus, oldest first (`{ id, ... }`), two at least; `presence`: for each column the elements it holds,
 * `{ layer, reference, kind, name }`; `steps`: for each column but the first, the element rows (`{ layer, reference, change, replaces?, natures? }`) of its comparison with the column
 * on its left; `span`: the same for the first column with the last, required from three plateaus and null with two. Returns `{ columns, rows, unchanged }`: every lineage, sorted
 * by layer, reference (code point) and first column, each with `changes` (false for a row where nothing changed), and `unchanged`, how many of them have no change. It writes
 * nothing and returns state words only.
 */
function plateauMatrixOf(columns, presence, steps, span) {
  const n = columns.length;
  if (n < 2 || presence.length !== n || steps.length !== n - 1 || n > 2 !== (span !== null && span !== undefined))
    throw new Error(
      'a matrix is made of two plateaus or more, their elements, one comparison per step and, from three plateaus, a span'
    );
  const indexed = (rows) => new Map(rows.map((row) => [matrixKey(row.layer, row.reference), row]));
  const nodes = presence.map((column) => {
    const byKey = new Map();
    for (const node of column) byKey.set(matrixKey(node.layer, node.reference), node);
    return new Map(Array.from(byKey).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
  });
  const changes = steps.map(indexed);
  const spanChanges = span ? indexed(span) : new Map();
  // predecessors[i]: key of a node of column i -> the keys of the nodes of column i-1 it stands on
  const predecessors = [new Map()];
  const named = columns.map(() => new Set());
  for (let i = 1; i < n; i++) {
    const here = new Map();
    for (const node of nodes[i].values()) {
      const replaces = new Set();
      const change = changes[i - 1].get(matrixKey(node.layer, node.reference));
      if (change) {
        for (const reference of change.replaces || []) {
          const key = matrixKey(node.layer, reference);
          if (nodes[i - 1].has(key)) replaces.add(key);
        }
      }
      if (replaces.size === 0 && nodes[i - 1].has(matrixKey(node.layer, node.reference)))
        replaces.add(matrixKey(node.layer, node.reference));
      here.set(matrixKey(node.layer, node.reference), Array.from(replaces));
      for (const key of replaces) named[i - 1].add(key);
    }
    predecessors.push(here);
  }
  const built = [];
  for (let i = 0; i < n; i++) {
    for (const key of nodes[i].keys()) {
      if (!named[i].has(key))
        built.push(matrixTrace(columns, nodes, changes, predecessors, spanChanges, !!span, i, key));
    }
  }
  built.sort(
    (a, b) =>
      matrixLayerRank(a.layer) - matrixLayerRank(b.layer) ||
      (a.layer < b.layer ? -1 : a.layer > b.layer ? 1 : 0) ||
      matrixCompareCodePoints(a.reference, b.reference) ||
      a.column - b.column
  );
  const rows = built.map(({ column, ...row }) => row);
  return { columns: columns.slice(), rows, unchanged: rows.filter((row) => !row.changes).length };
}
