'use strict';
// The two functions of the editor page as they were before run 0202 (wave 027, W-2, layout.columns), copied from the commit that precedes the run
// (git show cc58851:src/main/editor/presentation/diagram-layout.js and diagram-page.js, bodies unchanged). The tests of diagram-columns-*.test.js run them inside the
// page next to the new ones: with no `layout` anywhere the new function must give exactly what the old gave (REQ-3, REQ-7, TG-3). Not a test: `node --test` does not run it.
const BUILD_ELK_GRAPH = `function buildElkGraph(result, options) {
  const captions = !options || options.captions !== false;
  const show = {
    qualifiers: !!(options && options.qualifiers),
    descriptions: !!(options && options.descriptions),
    wrap: !!(options && options.wrap)
  };
  const ids = new Set(result.items.map((item) => item.id));
  const childrenOf = new Map();
  const roots = [];
  for (const item of result.items) {
    const parent = item.parent && ids.has(item.parent) ? item.parent : null;
    if (parent === null) {
      roots.push(item);
      continue;
    }
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push(item);
  }
  const toNode = (item) => {
    const text = diagramItemText(item, show, options && options.itemLayer, undefined, options && options.source);
    // a comparison turned the other way flips \`new\` and \`removed\`: their pills take the room of the wider one in the layout, so that no box changes size
    // (and nothing moves) when the same pair is drawn from the other plateau
    const roomBadges =
      text.state === 'new' ? text.badges.map((name) => (name === 'new' ? 'removed' : name)) : text.badges;
    const kids = childrenOf.get(item.id) || [];
    if (kids.length) {
      const minWidth =
        Math.max(
          diagramTextWidth(text.title, 14),
          diagramTextWidth(diagramTruncate(text.sub, DIAGRAM_HEADER_SUB_CHARS), 12)
        ) +
        60 +
        (roomBadges.length ? diagramBadgeRow(roomBadges, Infinity).width : 0);
      return {
        id: item.id,
        children: kids.map(toNode),
        layoutOptions: {
          'elk.padding': '[top=44,left=14,bottom=14,right=14]',
          'elk.nodeSize.constraints': 'MINIMUM_SIZE',
          // ELK's layered algorithm lays out left to right and turns the result for DOWN: this minimum is read as (height, width).
          // Written as (width, height) it made every box at least minWidth high, mostly empty space under its children.
          'elk.nodeSize.minimum': '(0, ' + minWidth + ')'
        }
      };
    }
    let width = Math.max(
      150,
      Math.min(280, Math.max(diagramTextWidth(text.title, 14), diagramTextWidth(text.sub, 12)) + 36)
    );
    if (show.descriptions && text.description) width = Math.max(width, 240); // room for a description to read
    if (roomBadges.length) width = Math.max(width, Math.min(280, diagramBadgeRow(roomBadges, Infinity).width + 20)); // room for the badges
    return { id: item.id, width, height: diagramLeafLayout(text, width, show).height };
  };
  const edges = [];
  result.links.forEach((link, index) => {
    if (link.secondary || !ids.has(link.from) || !ids.has(link.to)) return;
    const caption = diagramLinkText(link);
    const mark = diagramLinkMark(link);
    const edge = { id: 'e' + index, sources: [link.from], targets: [link.to] };
    if ((caption && captions) || mark) {
      const label = diagramLabelLayout(link, show.wrap, !captions);
      edge.labels = [
        {
          text: (mark ? mark + (captions && caption ? ' ' : '') : '') + (captions ? caption : ''),
          width: label.width,
          height: label.height
        }
      ];
    }
    edges.push(edge);
  });
  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      // top to bottom: what comes in above, what goes out below. Left to right made overviews 5 times wider than high
      // (edge captions sit in every gap), which almost never fits a panel.
      'elk.direction': 'DOWN',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '28',
      'elk.layered.spacing.nodeNodeBetweenLayers': '56',
      'elk.spacing.edgeNode': '20'
    },
    children: roots.map(toNode),
    edges
  };
}`;

const DIAGRAM_CACHE_KEY = `function diagramCacheKey(recipe, comparison, viewKey) {
  const { isMap, reference, viewpoint, facet, mapState, shows, hideUnlinked } = recipe;
  const layer = isMap
    ? recipe.layer === 'technology'
      ? 'technology'
      : 'application'
    : recipe.layer || layerOfReference(reference) || 'technology'; // as \`buildKernelInput\` settles it
  return [
    modelsKey(comparison, facet),
    viewpoint,
    layer,
    reference,
    isMap ? JSON.stringify([mapState.opened, mapState.pinned, mapState.hidden]) : '',
    // wave 026 run 0199: the relationships a Map is narrowed to; the key is the one it always was when there are none
    isMap && mapState.links && mapState.links.length ? JSON.stringify(canonicalLinkEntries(mapState.links)) : '',
    // wave 026 run 0200: the relationships drawn heavy; a map without one keeps the key it had
    isMap && mapState.highlight && mapState.highlight.length
      ? 'highlight:' + JSON.stringify(canonicalLinkEntries(mapState.highlight))
      : '',
    // issue #107: what a Map of the technology layer draws besides its elements is part of what is drawn
    isMap && layer === 'technology'
      ? JSON.stringify([recipePartsOf(recipe).applications, recipePartsOf(recipe).relationships])
      : '',
    hideUnlinked,
    JSON.stringify(shows),
    JSON.stringify(AppState.workspace.styles || null),
    viewKey
  ].join('|');
}`;

module.exports = { BUILD_ELK_GRAPH, DIAGRAM_CACHE_KEY };
