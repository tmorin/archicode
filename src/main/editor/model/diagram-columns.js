// Wave 027, run 0202 (W-2, issue #178, DEC-1 and DEC-2): `layout.columns`, the number of boxes per row a diagram aims at.
// This part is the one place that knows the order of the four levels (the toolbar of the diagram on screen, then the saved view's
// `properties.layout`, then `settings.views.properties.<viewpoint>.layout`, then none) and what an invalid value is.
const DIAGRAM_COLUMNS_MAX = 20;
const DIAGRAM_COLUMNS_CHOICES = [1, 2, 3, 4, 5, 6, 8, 12];

/** The sentence for a `layout` value that is not `{columns: 1..20}`, or null when it is valid or not set. `where` is the place, told first. */
function columnsProblem(layout, where) {
  if (layout === undefined || layout === null) return null;
  const lead = where + (String(where).startsWith('the view') ? ' has an invalid `layout`: ' : ' is invalid: ');
  if (!isPlainObject(layout)) {
    return lead + '`layout` is a mapping with the key `columns` (found `' + JSON.stringify(layout) + '`)';
  }
  const other = Object.keys(layout).find((key) => key !== 'columns');
  if (other !== undefined) {
    return lead + '`layout` is a mapping with the key `columns` (found the key `' + other + '`)';
  }
  const columns = layout.columns;
  if (columns === undefined || columns === null) return null;
  if (typeof columns === 'number' && Number.isInteger(columns) && columns >= 1 && columns <= DIAGRAM_COLUMNS_MAX) {
    return null;
  }
  return (
    lead +
    '`columns` must be a whole number from 1 to ' +
    DIAGRAM_COLUMNS_MAX +
    ' (found `' +
    JSON.stringify(columns) +
    '`)'
  );
}

/** `{ columns, from, problem }`: the first level that is set decides, valid or not; an invalid one is `columns: null` and its sentence. */
function resolveDiagramColumns({ toolbar, view, settings, viewpoint } = {}) {
  const none = { columns: null, from: null, problem: null };
  if (toolbar !== undefined && toolbar !== null) return { columns: toolbar, from: 'toolbar', problem: null };
  const viewLayout = view && view.properties ? view.properties.layout : null;
  const levels = [
    { from: 'view', layout: viewLayout, where: 'the view `' + (view && view.id) + '`' },
    {
      from: 'workspace',
      layout:
        settings && settings.views && settings.views.properties
          ? (settings.views.properties[viewpoint] || {}).layout
          : null,
      where: '`settings.views.properties.' + viewpoint + '.layout`'
    }
  ];
  for (const level of levels) {
    const layout = level.layout;
    if (layout === undefined || layout === null) continue;
    const problem = columnsProblem(layout, level.where);
    if (problem) return { columns: null, from: null, problem };
    if (layout.columns === undefined || layout.columns === null) continue;
    return { columns: layout.columns, from: level.from, problem: null };
  }
  return none;
}

/** The valid `layout.columns` a view says itself, or null: what the Columns list of its page and of its form show as the choice. */
function ownColumnsOf(view) {
  const layout = view && isPlainObject(view.properties) ? view.properties.layout : null;
  if (columnsProblem(layout, 'the view') !== null || !isPlainObject(layout)) return null;
  return typeof layout.columns === 'number' ? layout.columns : null;
}
