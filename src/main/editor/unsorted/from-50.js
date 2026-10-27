// ---- The states of a comparison (run 0039, wave 009). The kernel puts the state of a box last in its stereotypes (`new`, `changed`, `removed`, the three
// states of identity `moved`, `split`, `merged`, or `contains-changes` for a box that did not change and holds something that did); these are the glyph,
// the words and the default look of each. The glyphs and the words are the ones of the command line (`ChangeMarks.java`). ----

// The lists below hold no word of the page's own (contract 5, issue #34): the kernel says the seven words once (its `states` entry point) and `adoptKernelStates`
// fills these arrays, in place, when the module is loaded, so that they are empty until then (a comparison, which is what reads them, needs the kernel too). What the
// page keeps is the look of each word (the tables below), not the list; `sibling-candidates.test.js` fails when a word of the kernel has no glyph, words or look here.

/** What a relationship can be: a relationship is never moved, split or merged (the kernel refuses the words for it). */
const RELATIONSHIP_STATES = [];
/** The states of identity of an element (wave 009): it replaces one element of the other plateau (`moved`), is one of several that replace one (`split`), or replaces several (`merged`). */
const IDENTITY_STATES = [];
/** Every state an element of the union can have besides `contains-changes` (which is the marker of a box above a change, not a change). Anything that lists the states reads this. */
const CHANGE_STATES = [];
/** Every word that names a state an element can be drawn with: the ones above and the marker of a box above a change. A hand-written word of this list is told when the comparison does not give it to the element (`stateWordHintsOf`). */
const STATE_WORDS = [];

/** Puts the words that the kernel said (`{ relationship, identity, container, states }`) in the four lists above, in place. */
function adoptKernelStates(said) {
  const fill = (list, words) => { list.length = 0; list.push(...words); };
  fill(RELATIONSHIP_STATES, said.relationship);
  fill(IDENTITY_STATES, said.identity);
  fill(CHANGE_STATES, said.relationship.concat(said.identity));
  fill(STATE_WORDS, said.states);
}
const CHANGE_GLYPHS = { new: '+', changed: '~', removed: '\u2212', moved: '\u2192', split: '\u22D4', merged: '\u2295', 'contains-changes': '\u00B1' };
/** What the key says of each state, in a few words that do not rest on colour: the line of its box, the line of its link. */
const CHANGE_WORDS = {
  new: { word: 'new', box: 'thick solid outline', link: 'thick solid line' },
  changed: { word: 'changed', box: 'dotted outline', link: 'dotted line' },
  removed: { word: 'removed', box: 'long dashes with narrow gaps, grey outline, struck title', link: 'dashed grey line' },
  moved: { word: 'moved', box: 'long dashes, wide gaps', link: '' },
  split: { word: 'split', box: 'medium dashes', link: '' },
  merged: { word: 'merged', box: 'short dashes, far apart', link: '' },
  'contains-changes': { word: 'contains changes', box: 'thin dashed outline', link: '' }
};

/**
 * The default look of a state, as the --st-* variables a styled box carries. The colours are theme variables (--chg-*), so that the page and
 * the export follow the theme. `own` (the CSS property of `styles` that overrides each variable): an entry of the workspace with the same
 * name as the state wins, property by property. The fill of the author is never replaced: the tint is laid over it.
 */
const CHANGE_DEFAULT_LOOK = {
  new: { '--st-stroke': 'var(--chg-new)', '--st-width': '3px', '--st-dash': 'none', '--st-tint': 'var(--chg-new)' },
  changed: { '--st-stroke': 'var(--chg-changed)', '--st-width': '2px', '--st-dash': '2 3', '--st-tint': 'var(--chg-changed)' },
  removed: { '--st-stroke': 'var(--chg-removed)', '--st-width': '2px', '--st-dash': '16 3', '--st-tint': 'var(--chg-removed)', '--st-text': 'var(--chg-removed-text)' },
  // a dash and a gap for every state of the box, the pair the command line draws (PlantUML's `LineStyle: <dash>-<gap>`; a dash and a dot is a pattern it cannot draw),
  // and no pair is another's: `removed` 16 3, `moved` 12 12, `split` 8 8, `merged` 3 9 (run 0057, issue 55; `split` was `6 6` since run 0054, issue 42, the CLI's then).
  // `moved` was `14 4` here, the pair of the command line is `12 12`: next to the `16 3` of `removed` the two long dashes were too much alike.
  moved: { '--st-stroke': 'var(--chg-moved)', '--st-width': '2px', '--st-dash': '12 12', '--st-tint': 'var(--chg-moved)' },
  split: { '--st-stroke': 'var(--chg-split)', '--st-width': '2px', '--st-dash': '8 8', '--st-tint': 'var(--chg-split)' },
  merged: { '--st-stroke': 'var(--chg-merged)', '--st-width': '2px', '--st-dash': '3 9', '--st-tint': 'var(--chg-merged)' },
  'contains-changes': { '--st-stroke': 'var(--chg-contains)', '--st-width': '1px', '--st-dash': '4 3' }
};

/** The state a box of the drawing says: its own change, or `contains-changes` for an unchanged box that holds a change; null for any other (a ghost, a plain drawing). */
function changeStateOfItem(item) {
  if (!item || item.ghost) return null;
  if (CHANGE_STATES.includes(item.change)) return item.change;
  // the kernel says it computed the state (contract 5); the word in the stereotypes may be the author's, on a box that holds nothing (issue #34)
  if (item.change === 'none' && item.contains_changes === true) return 'contains-changes';
  return null;
}

/** The default variables of a state, minus the ones the entry `own` of the workspace (same name) already gives. */
function changeDefaultVars(state, own) {
  const style = own || {};
  const given = {
    '--st-stroke': !!parseCssColor(style['line-color']),
    '--st-width': styleWholeNumber(style['line-thickness'], 20) !== null,
    '--st-dash': styleWholeNumber(style['line-style'], 50) !== null,
    '--st-tint': !!parseCssColor(style['background-color']),
    '--st-text': !!parseCssColor(style['font-color'])
  };
  const vars = {};
  for (const key of Object.keys(CHANGE_DEFAULT_LOOK[state])) if (!given[key]) vars[key] = CHANGE_DEFAULT_LOOK[state][key];
  if ('--st-stroke' in vars) vars['--st-stroke-opacity'] = '1'; // a line of a state is not the faded outline of a plain compound box
  return vars;
}

/**
 * The look of a box drawn with these stereotypes: the style of each styled one, a later stereotype overriding an earlier one property by property.
 * `state` (a comparison): the state the box says; its default look (a line, a tint) comes after the styles of the other stereotypes, which it
 * overrides as a later stereotype does, and under the entry of the workspace named like it, which is read as for any stereotype. The word of
 * the state is then one of the badges even when the workspace did not style it.
 */
function stereotypeLookOf(names, state) {
  const styled = styledStereotypesOf(names);
  const merged = {};
  for (const name of styled) Object.assign(merged, stereotypeStyleOf(name));
  const look = styleLookOf(merged);
  if (!state) return Object.assign(look, { styled });
  const vars = Object.assign({}, look.vars, changeDefaultVars(state, stereotypeStyleOf(state)));
  const shown = (Array.isArray(names) ? names : []).filter((name) => styled.includes(name) || name === state);
  return Object.assign({}, look, { vars, empty: false, styled: shown });
}

/** The custom properties of a badge: the look of its own stereotype only (`initial` where it says nothing, so that it does not take the one of the box it sits in). */
function stereotypeBadgeVarsOf(name) {
  // the word of a state the workspace did not style: a line in the colour of the state, the fill and the text those of the page
  if (stereotypeStyleOf(name) === null && Object.prototype.hasOwnProperty.call(CHANGE_DEFAULT_LOOK, name)) {
    return { '--st-fill': 'initial', '--st-stroke': CHANGE_DEFAULT_LOOK[name]['--st-stroke'], '--st-text': 'initial' };
  }
  const vars = styleLookOf(stereotypeStyleOf(name)).vars;
  const own = {};
  for (const key of ['--st-fill', '--st-stroke', '--st-text']) own[key] = key in vars ? vars[key] : 'initial';
  return own;
}

/** Custom properties as the text of a `style` attribute (every value is one this file generated). */
function styleVarsText(vars) {
  return Object.keys(vars).map((key) => key + ':' + vars[key]).join(';');
}

/** The stereotypes of an element as the kernel tells them (the qualifiers, then the words of `rendering-stereotypes`, once each): the trees have no view to ask, so this mirrors the kernel and a test compares the two. */
function stereotypesOfRecord(record) {
  const out = [];
  const add = (stereotype) => { if (stereotype && !out.includes(stereotype)) out.push(stereotype); };
  kernelStringsOf(record.qualifiers).forEach(add);
  const tags = kernelTagsOf(record.tags);
  if (Object.prototype.hasOwnProperty.call(tags, 'rendering-stereotypes')) tags['rendering-stereotypes'].split(/\s+/).forEach(add);
  return out;
}

/** The text badges of the styled stereotypes in a tree row or a legend: the name is the carrier, the colours only repeat the style. */
function stereotypeBadgesHtml(names) {
  return styledStereotypesOf(names).map((name) =>
    '<span class="stereotype-badge" style="' + escapeHtml(styleVarsText(stereotypeBadgeVarsOf(name))) + '" title="Stereotype: ' + escapeHtml(name) + '">' + escapeHtml(name) + '</span>').join('');
}

/** What a diagram box says about its element. `show` (qualifiers) puts the qualifiers of the element in the line of its kind, as the command line does. */
function diagramItemText(item, show, layer, focalReference, source) {
  if (item.ghost) {
    return {
      title: item.reference,
      name: item.reference,
      sub: '[unknown element]',
      description: '',
      tooltip: 'There is no element “' + item.reference + '”, but “' + item.owner + '” has a relationship to it. Click to open “' + item.owner + '” and fix it.',
      badges: [],
      look: styleLookOf(null)
    };
  }
  // `layer` (the page of a view names it; the Map and Elements leave it out and keep letting the selection decide): the box of the
  // diagram's own layer is the one whose id is its reference, the others are the applications hosted on it
  // a removed element is not in the plateau drawn: the comparison told what it was (`tellRemovedItems`)
  const record = item.removed
    ? { id: item.removed.id, name: item.removed.name, kind: item.removed.kind, description: item.removed.description, qualifiers: item.removed.qualifiers }
    : source ? recordIn(source.index, item.reference, layer ? (item.id === item.reference ? layer : 'application') : undefined)
    : findElementRecord(item.reference, layer ? (item.id === item.reference ? layer : 'application') : undefined);
  const hidden = item.collapsed ? ' · ' + item.hidden + ' hidden' : '';
  const qualifiers = record && Array.isArray(record.qualifiers) ? record.qualifiers.filter((q) => typeof q === 'string' && q) : [];
  const description = record && record.description ? String(record.description).replace(/\s+/g, ' ').trim() : '';
  // what the kernel says the box is drawn with, and what the workspace styled of it
  const stereotypes = Array.isArray(item.stereotypes) ? item.stereotypes : [];
  // a comparison: the glyph in the title, the default look, the word as a badge. A box kept only to place the changes (`only_changes`, run 0040) says nothing of itself: it is faded.
  // The focal box is the exception: it is the element the diagram is about, always kept, never faded, and drawn as it is without the filter (with its `contains-changes` marker)
  const focal = !!focalReference && item.reference === focalReference && item.id === item.reference;
  const context = item.context === true && !focal;
  const state = context ? null : changeStateOfItem(item);
  const look = stereotypeLookOf(stereotypes, state);
  const name = record ? (record.name || record.id) : item.reference;
  // with the future the plateau drawn is the base: the plateau compared with is the next one, and what a moved, split or merged box replaces is in the plateau drawn
  const future = source ? !!(source.comparison && source.comparison.future) : layerCompareIsFuture();
  const withThat = future ? 'the plateau that overrides the one drawn' : 'the plateau it is compared with';
  const ofBase = future ? 'the plateau drawn' : 'the plateau it is compared with';
  const says = state === null ? '' : '\n' + CHANGE_WORDS[state].word.charAt(0).toUpperCase() + CHANGE_WORDS[state].word.slice(1) + ': ' + (
    state === 'new' ? (future ? 'this element is only in ' + withThat + ', not in the one drawn.' : 'this element is not in the plateau it is compared with.') :
    state === 'removed' ? (future ? 'this element is not in ' + withThat + '.' : 'this element is only in the plateau it is compared with, not in the one drawn.') :
    state === 'changed' ? 'it differs from ' + withThat + (Array.isArray(item.natures) && item.natures.length ? ' (' + item.natures.join(', ') + ')' : '') + '.' :
    state === 'moved' ? 'it replaces ' + (item.replaces || []).join(', ') + ' of ' + ofBase + (Array.isArray(item.natures) && item.natures.length ? ' and differs from it (' + item.natures.join(', ') + ')' : '') + '.' :
    state === 'split' ? 'it is one of several elements that replace ' + (item.replaces || []).join(', ') + ' of ' + ofBase + '.' :
    state === 'merged' ? 'it replaces several elements of ' + ofBase + ' (' + (item.replaces || []).join(', ') + ').' :
    'it did not change by itself, but something inside it did.') + (item.replacedBy ? '\nThis element is replaced by ' + item.replacedBy.join(', ') + '; it is drawn because something that was inside it is removed.' : '');
  return {
    badges: look.styled,
    look,
    state,
    name,
    title: state === null ? name : CHANGE_GLYPHS[state] + ' ' + name + identitySuffix(item, state),
    suffix: state === null ? '' : identitySuffix(item, state),
    sub: (record ? '[' + record.kind + (show && show.qualifiers && qualifiers.length ? ': ' + qualifiers.join(', ') : '') + ']' : '') + hidden,
    description,
    tooltip: item.reference + (qualifiers.length ? ' [' + qualifiers.join(', ') + ']' : '') + (record && record.description ? ' — ' + record.description : '') +
      (look.styled.length ? '\nStereotypes: ' + stereotypes.join(', ') : '') + says + (context ? '\nContext: shown to place the changes around it; it did not change itself.' : ''),
    context
  };
}

/** Where a box came from, after its title, as the views of the command line say it: `(from shop.till)` for what a box replaces, `(replaced by a, b)` for the place of what it replaced. */
function identitySuffix(item, state) {
  if (IDENTITY_STATES.includes(state) && item.replaces && item.replaces.length) return ' (from ' + item.replaces.join(', ') + ')';
  if (state === 'removed' && item.replacedBy && item.replacedBy.length) return ' (replaced by ' + item.replacedBy.join(', ') + ')';
  return '';
}

/** The lines of a title as SVG text: the glyph of a state in bold, the title of a removed box struck (the glyph stays clear of the strike). Without a state: the text, as it always was. */
function diagramTitleHtml(line, text) {
  if (!text.state) return escapeHtml(line);
  const glyph = CHANGE_GLYPHS[text.state];
  const lead = line.startsWith(glyph + ' ');
  const rest = lead ? line.slice(glyph.length + 1) : line;
  const struck = (part) => (part === '' ? '' : '<tspan class="dg-struck">' + escapeHtml(part) + '</tspan>');
  let body;
  if (text.state !== 'removed') body = escapeHtml(rest);
  else if (text.suffix && text.suffix.includes(rest.trim())) body = escapeHtml(rest); // a line of a long title that is wholly the place-of note (`(replaced by ...)`): the name above it is struck, the note is not
  else if (text.suffix && rest.includes(' (replaced by ')) body = struck(rest.slice(0, rest.indexOf(' (replaced by '))) + escapeHtml(rest.slice(rest.indexOf(' (replaced by ')));
  else body = struck(rest);
  return lead ? '<tspan class="dg-glyph">' + escapeHtml(glyph) + '</tspan> ' + body : body;
}

/**
 * Whether a thing of the comparison is only in the plateau compared with, not in the one drawn: the model of the page has no record of it, so its box is drawn from the
 * union and a click shows what the other plateau says of it, read-only. With the past these are the removed elements; with the future (the plateau drawn is the base)
 * they are the ones the plateau compared with adds, whatever their state (new, or the new place of a moved, split or merged one).
 */
function elementIsOnlyInTheOtherPlateau(layer, reference, change, source) {
  if (source) {
    if (!(source.comparison && source.comparison.future)) return change === 'removed';
    const other = source.baselineIndex;
    return !!other && !!other[layer] && other[layer].has(String(reference)) && !(source.index[layer] && source.index[layer].has(String(reference)));
  }
  if (!layerCompareIsFuture()) return change === 'removed';
  return !!AppState.baseline && AppState.baseline.index[layer] && AppState.baseline.index[layer].has(String(reference)) && !(AppState.index[layer] && AppState.index[layer].has(String(reference)));
}

/** The side of the comparison that is the base / the target: the plateau drawn is the target, but with the future. */
function baseSideIndex() {
  return layerCompareIsFuture() ? AppState.index : AppState.baseline.index;
}

function targetSideIndex() {
  return layerCompareIsFuture() ? AppState.baseline.index : AppState.index;
}

/**
 * A comparison is on: the boxes the kernel calls removed are elements of the baseline, not of the plateau drawn. Tell each what it was (name, kind,
 * description, qualifiers) from the union, so that it is drawn like the others and a click on it can say more. `layer`: the layer of the drawing.
 * Wave 009: the answer of `compute` does not say what a box replaces, the union does. A moved, split or merged box is told what it replaces
 * (`item.replaces`), and a removed box that is only the place of what was replaced is told what replaced it (`item.replacedBy`), for the title.
 */
function tellRemovedItems(result, comparison, layer, source) {
  for (const item of result.items) {
    const itemLayer = item.id === item.reference ? layer : 'application';
    const onlyThere = elementIsOnlyInTheOtherPlateau(itemLayer, item.reference, item.change, source);
    if (item.change !== 'removed' && !IDENTITY_STATES.includes(item.change) && !onlyThere) continue;
    const element = comparison.records.get(itemLayer + '|' + item.reference);
    if (!element) continue;
    if (Array.isArray(element.replaces) && element.replaces.length && IDENTITY_STATES.includes(item.change)) item.replaces = element.replaces.slice();
    if (Array.isArray(element.replaced_by) && element.replaced_by.length && item.change === 'removed') item.replacedBy = element.replaced_by.slice();
    if (!onlyThere) continue;
    item.removed = {
      layer: itemLayer,
      id: String(item.reference).split('.').pop(),
      name: element.name,
      kind: element.kind,
      description: element.description,
      qualifiers: Array.isArray(element.qualifiers) ? element.qualifiers : [],
      relationships: Array.isArray(element.relationships) ? element.relationships : []
    };
  }
}

/** How many boxes and links of each state a drawing shows (what the key tells next to each state): `{ new: { boxes, links }, ... }`; the marker has no link. */
function comparisonCountsOf(drawn, focalReference) {
  const counts = {};
  for (const state of RELATIONSHIP_STATES.concat('contains-changes')) counts[state] = { boxes: 0, links: 0 };
  let context = 0;
  for (const item of drawn.items) {
    // Changes only (run 0040): a box kept only to place the changes is faded and has no state (the focal box is never faded and keeps its state: it is not context)
    if (item.context === true && !item.ghost && !(item.reference === focalReference && item.id === item.reference)) { context++; continue; }
    const state = changeStateOfItem(item);
    if (state && !counts[state]) counts[state] = { boxes: 0 }; // moved, split, merged (wave 009): only when the drawing has one, so that the counts of every other drawing are what they were; a relationship is never one of them
    if (state) counts[state].boxes++;
  }
  for (const link of drawn.links) if (!link.secondary && RELATIONSHIP_STATES.includes(link.change)) counts[link.change].links++;
  if (context) counts.context = { boxes: context }; // only when there is some: a drawing that keeps everything has none
  return counts;
}

/** Longest line of a box that contains others (its name and its kind share the line of its header): past it the kind is cut. */
const DIAGRAM_HEADER_SUB_CHARS = 48;
/** Room left on each side of a description, in pixels. It is written from the left: a paragraph is easier to read that way than centered. */
const DIAGRAM_DESCRIPTION_PADDING = 10;
/** A description shown without "Wrap" stops after this many lines. */
const DIAGRAM_DESCRIPTION_LINES = 3;

let diagramMeasureContext;

/**
 * The width in pixels of a text in the font of the diagram, measured by the browser (a canvas draws with the font the
 * SVG does); an estimate where there is no canvas. Boxes are laid out from it, so it has to be near what is drawn.
 */
function diagramMeasureText(text, size, weight) {
  if (diagramMeasureContext === undefined) {
    try { diagramMeasureContext = document.createElement('canvas').getContext('2d') || null; } catch (e) { diagramMeasureContext = null; }
  }
  if (diagramMeasureContext) {
    let family = 'sans-serif';
    try { family = getComputedStyle(document.body).fontFamily || family; } catch (e) { /* the default family */ }
    diagramMeasureContext.font = (weight || 400) + ' ' + size + 'px ' + family;
    return diagramMeasureContext.measureText(String(text)).width;
  }
  return String(text).length * size * 0.55;
}

/**
 * Cuts a text into lines no wider than `max`, at the spaces (a word wider than a line is cut). `measure` gives the
 * width of a line (default: its number of characters). With `maxLines`, what does not fit is replaced by an ellipsis
 * on the last line.
 */
function diagramWrapText(text, max, maxLines, measure) {
  const width = measure || ((line) => line.length);
  const lines = [];
  let line = '';
  for (let word of String(text).split(/\s+/).filter(Boolean)) {
    while (width(word) > max && word.length > 1) {
      if (line) { lines.push(line); line = ''; }
      const chars = Array.from(word); // cut by code points, never between the two halves of a surrogate pair
      let cut = 1;
      while (cut < chars.length && width(chars.slice(0, cut + 1).join('')) <= max) cut++;
      lines.push(chars.slice(0, cut).join(''));
      word = chars.slice(cut).join('');
    }
    if (!line) line = word;
    else if (width(line + ' ' + word) <= max) line += ' ' + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (maxLines && lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = Array.from(kept[maxLines - 1]);
    while (last.length > 1 && width(last.join('') + '…') > max) last.pop();
    kept[maxLines - 1] = last.join('') + '…';
    return kept;
  }
  return lines;
}

/** The badges of the styled stereotypes of a box: pills 16px high, 10.5px bold text, with 7px at each side; a name is cut at 16 characters. */
const DIAGRAM_BADGE_HEIGHT = 16;
const DIAGRAM_BADGE_GAP = 4;
const DIAGRAM_BADGE_PADDING = 7;
const DIAGRAM_BADGE_NAME_CHARS = 16;

function diagramBadgePill(label, name) {
  return { name, label, width: Math.ceil(diagramMeasureText(label, 10.5, 600)) + 2 * DIAGRAM_BADGE_PADDING };
}

function diagramBadgeRowWidth(pills) {
  return pills.reduce((sum, pill) => sum + pill.width, 0) + Math.max(0, pills.length - 1) * DIAGRAM_BADGE_GAP;
}

/** The row of pills for these stereotype names in `maxWidth` pixels; the ones that do not fit are replaced by a "+N" pill (the tooltip of the box lists them all). The layout and the drawing both ask for it. */
function diagramBadgeRow(names, maxWidth) {
  const pills = names.map((name) => diagramBadgePill(diagramTruncate(name, DIAGRAM_BADGE_NAME_CHARS), name));
  if (diagramBadgeRowWidth(pills) <= maxWidth) return { pills, width: diagramBadgeRowWidth(pills) };
  let shown = pills;
  for (let kept = pills.length - 1; kept >= 0; kept--) {
    shown = pills.slice(0, kept).concat(diagramBadgePill('+' + (pills.length - kept), null));
    if (diagramBadgeRowWidth(shown) <= maxWidth) break;
  }
  return { pills: shown, width: diagramBadgeRowWidth(shown) };
}

/** The pills of a row as SVG, from `x` at height `y`; each one is drawn with the style of its own stereotype. */
function diagramBadgesSvg(row, x, y) {
  let cursor = x;
  let svg = '';
  for (const pill of row.pills) {
    const style = pill.name === null ? '' : ' style="' + escapeHtml(styleVarsText(stereotypeBadgeVarsOf(pill.name))) + '"';
    svg += '<g class="dg-badge' + (pill.name === null ? ' dg-badge-more' : '') + '"' + style + ' aria-hidden="true">' +
      '<rect x="' + cursor + '" y="' + y + '" width="' + pill.width + '" height="' + DIAGRAM_BADGE_HEIGHT + '" rx="' + DIAGRAM_BADGE_HEIGHT / 2 + '"/>' +
      '<text x="' + (cursor + pill.width / 2) + '" y="' + (y + 11.5) + '" text-anchor="middle">' + escapeHtml(pill.label) + '</text></g>';
    cursor += pill.width + DIAGRAM_BADGE_GAP;
  }
  return svg;
}

/** The classes and the style attribute a styled box carries (nothing for a box whose stereotypes style nothing). */
function diagramLookAttributes(look) {
  const vars = styleVarsText(look.vars);
  return { classes: (look.empty ? '' : ' dg-styled') + (look.shadow ? ' dg-shadow' : ''), style: vars ? ' style="' + escapeHtml(vars) + '"' : '' };
}

/**
 * The lines of a box without children and where they sit: the name, the kind (with the qualifiers), then the
 * description. Without "Wrap" a line that is too long is cut with an ellipsis; with it, the box gets taller instead.
 * The layout asks for the height, the drawing for the positions: one function, so that they agree.
 */
function diagramLeafLayout(text, width, show) {
  const wrap = !!(show && show.wrap);
  const titleChars = Math.max(8, Math.floor((width - 20) / 8));
  const subChars = Math.max(8, Math.floor((width - 20) / 7));
  const descWidth = width - 2 * DIAGRAM_DESCRIPTION_PADDING;
  const titleLines = wrap ? diagramWrapText(text.title, titleChars) : [diagramTruncate(text.title, titleChars)];
  let subLines = text.sub ? (wrap ? diagramWrapText(text.sub, subChars) : [diagramTruncate(text.sub, subChars)]) : [''];
  if (!subLines.length) subLines = [''];
  const descLines = show && show.descriptions && text.description ? diagramWrapText(text.description, descWidth, wrap ? 0 : DIAGRAM_DESCRIPTION_LINES, (line) => diagramMeasureText(line, 11)) : [];
  if (!titleLines.length) titleLines.push('');
  const titleY = titleLines.map((line, i) => 25 + i * 18);
  const subY = subLines.map((line, i) => titleY[titleY.length - 1] + 19 + i * 16);
  const descY = descLines.map((line, i) => subY[subY.length - 1] + 18 + i * 14);
  let height = descLines.length ? descY[descY.length - 1] + 12 : subY[subY.length - 1] + 14;
  // the badges of the styled stereotypes: a row under the text, the box grows by what it needs
  const badgeRow = text.badges && text.badges.length ? diagramBadgeRow(text.badges, width - 16) : null;
  const badgeY = height - 4;
  if (badgeRow) height = badgeY + DIAGRAM_BADGE_HEIGHT + 10;
  return { titleLines, titleY, subLines, subY, descLines, descY, height, badgeRow, badgeY };
}

/**
 * The caption of a link, broken into lines (soft wrap, always on: a long caption read as one line runs over the boxes and
 * the links next to it). A line is at most DIAGRAM_LABEL_MAX_WIDTH px wide at 11px, cut at the spaces; a word wider than a
 * line is cut with an ellipsis, as a name is. The qualifiers (`[https]`) stay in one piece as far as possible: they
 * share the last line of the label when they fit, or take a line (or two) of their own; they are cut only past two lines
 * without Wrap, or when a single word of them is wider than a line (its closing bracket is kept). Without "Wrap" the caption has at most
 * DIAGRAM_LABEL_LINES lines (the end of the label is replaced by an ellipsis, the tooltip of the link has it whole); with it
 * nothing is cut. The layout asks for the size, the drawing for the lines: one function, so that they agree.
 */
const DIAGRAM_LABEL_MAX_WIDTH = 220;
const DIAGRAM_LABEL_LINES = 4;
const DIAGRAM_LABEL_LINE_HEIGHT = 13;
const DIAGRAM_LABEL_PADDING = 10;

function diagramLabelLayout(link, wrap, markOnly) {
  const measure = (line) => diagramMeasureText(line, 11);
  const max = DIAGRAM_LABEL_MAX_WIDTH;
  const cap = wrap ? 0 : DIAGRAM_LABEL_LINES;
  // a word wider than a line is cut with an ellipsis (by code points), not spread over several lines; `tail` is what a cut
  // word that ends with it keeps (the closing bracket of the qualifiers)
  const fit = (text, tail = '') => String(text).split(/\s+/).filter(Boolean).map((word) => {
    if (measure(word) <= max) return word;
    const keep = tail && word.endsWith(tail) ? tail : '';
    const cut = Array.from(keep ? word.slice(0, -keep.length) : word);
    while (cut.length > 1 && measure(cut.join('') + '…' + keep) > max) cut.pop();
    return cut.join('') + '…' + keep;
  }).join(' ');
  // a comparison: the glyph of the state of the link opens its caption (it stands alone when the captions are off: the glyph is how the state is told)
  const mark = diagramLinkMark(link);
  const worded = !markOnly && link.label && link.label.trim() ? fit(link.label) : '';
  const labelText = mark ? (worded ? mark + ' ' + worded : mark) : worded;
  const qualifiers = markOnly ? [] : Array.from(link.qualifiers || []);
  const qualifierLines = qualifiers.length ? diagramWrapText(fit('[' + qualifiers.join(', ') + ']', ']'), max, cap ? 2 : 0, measure) : [];
  let lines = labelText ? diagramWrapText(labelText, max, cap, measure) : [];
  if (qualifierLines.length === 1 && lines.length && measure(lines[lines.length - 1] + ' ' + qualifierLines[0]) <= max) {
    lines[lines.length - 1] += ' ' + qualifierLines[0];
  } else if (qualifierLines.length) {
    // the qualifiers take their own lines, and the label gives way to them rather than the other way round
    if (cap && lines.length + qualifierLines.length > cap) lines = diagramWrapText(labelText, max, Math.max(1, cap - qualifierLines.length), measure);
    lines = lines.concat(qualifierLines);
  }
  const width = Math.ceil(Math.max(0, ...lines.map(measure)));
  return { lines, width: width + DIAGRAM_LABEL_PADDING, height: lines.length * DIAGRAM_LABEL_LINE_HEIGHT + 2 };
}

/** The glyph of the state of a link of a comparison (`+`, `~`, `−`), or '' for a link that did not change or a drawing that compares nothing. */
function diagramLinkMark(link) {
  return RELATIONSHIP_STATES.includes(link.change) ? CHANGE_GLYPHS[link.change] : '';
}

/** What a link stands for, for its tooltip: each declared relationship, and a note when it groups several. */
function diagramLinkTitle(link, itemById, layer, source) {
  const name = (id) => { const item = itemById.get(id); return item ? diagramItemText(item, undefined, layer, undefined, source).name : id; };
  const caption = diagramLinkText(link);
  const lines = [name(link.from) + ' → ' + name(link.to) + (caption ? ' : ' + caption : '')];
  if (diagramLinkMark(link)) lines.push(CHANGE_GLYPHS[link.change] + ' ' + CHANGE_WORDS[link.change].word + (link.synthetic ? ' (as a group: see the relationships below)' : ''));
  const rels = link.relationships || [];
  if (link.synthetic && rels.length) {
    lines.push(rels.length + (rels.length === 1 ? ' relationship is' : ' relationships are') + ' grouped here:');
    for (const rel of rels.slice(0, 8)) {
      lines.push('  ' + rel.from + ' → ' + rel.destination + (rel.label ? ' : ' + rel.label : '') + (rel.qualifiers && rel.qualifiers.length ? ' [' + rel.qualifiers.join(', ') + ']' : ''));
    }
    if (rels.length > 8) lines.push('  … and ' + (rels.length - 8) + ' more');
  }
  return lines.join('\n');
}

/**
 * The relationships of the elements the view is about that point at nothing: each becomes a dashed red "unknown
 * element" box next to its owner, so it can be seen and fixed instead of silently missing. The kernel never sees them.
 */
function buildDiagramGhosts(result, focalReference, layer, source) {
  const map = (source ? source.index : AppState.index)[layer];
  const ghosts = { items: [], links: [], total: 0 };
  for (const item of result.items) {
    if (item.id !== item.reference) continue; // an application box inside a technology node
    if (focalReference !== null && item.reference !== focalReference && !item.reference.startsWith(focalReference + '.')) continue;
    const record = map.get(item.reference);
    if (!record) continue;
    for (const rel of record.relationships) {
      if (rel.resolved) continue;
      ghosts.total++;
      const id = 'ghost:' + item.id + '>' + rel.destination;
      // two relationships of one element to the same unknown destination: one box, two edges (never two boxes of one id)
      const known = ghosts.items.some((ghost) => ghost.id === id);
      if (!known && ghosts.items.length >= DIAGRAM_MAX_GHOSTS) continue;
      if (!known) ghosts.items.push({ id, reference: rel.destination, parent: null, ghost: true, owner: item.reference, collapsed: false, hidden: 0 });
      ghosts.links.push({ from: item.id, to: id, label: rel.rawLabel, qualifiers: rel.qualifiers || [], tags: rel.tags || {}, synthetic: false, secondary: false, ghost: true, relationships: [] });
    }
  }
  return ghosts;
}

/**
 * The ELK graph for a kernel result: items nest by `parent` (a box that contains others becomes a compound node),
 * links become edges between any two boxes (`INCLUDE_CHILDREN` lets an edge cross box borders). Links the kernel
 * flags `secondary` are left out: ArchiCode's PlantUML renderer never draws them either.
 */
function buildElkGraph(result, options) {
  const captions = !options || options.captions !== false;
  const show = { qualifiers: !!(options && options.qualifiers), descriptions: !!(options && options.descriptions), wrap: !!(options && options.wrap) };
  const ids = new Set(result.items.map((item) => item.id));
  const childrenOf = new Map();
  const roots = [];
  for (const item of result.items) {
    const parent = item.parent && ids.has(item.parent) ? item.parent : null;
    if (parent === null) { roots.push(item); continue; }
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push(item);
  }
  const toNode = (item) => {
    const text = diagramItemText(item, show, options && options.itemLayer, undefined, options && options.source);
    // a comparison turned the other way flips `new` and `removed`: their pills take the room of the wider one in the layout, so that no box changes size
    // (and nothing moves) when the same pair is drawn from the other plateau
    const roomBadges = text.state === 'new' ? text.badges.map((name) => (name === 'new' ? 'removed' : name)) : text.badges;
    const kids = childrenOf.get(item.id) || [];
    if (kids.length) {
      const minWidth = Math.max(diagramTextWidth(text.title, 14), diagramTextWidth(diagramTruncate(text.sub, DIAGRAM_HEADER_SUB_CHARS), 12)) + 60 +
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
    let width = Math.max(150, Math.min(280, Math.max(diagramTextWidth(text.title, 14), diagramTextWidth(text.sub, 12)) + 36));
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
      edge.labels = [{ text: (mark ? mark + (captions && caption ? ' ' : '') : '') + (captions ? caption : ''), width: label.width, height: label.height }];
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
}

/**
 * Draw an ELK layout as SVG. Every box is a link to its element (a dashed red one opens the element that points at
 * nothing), the focal one is outlined in the accent color, a box that contains others has a fold button, and every
 * link says what it stands for in its tooltip. Returns the markup plus where the focal box is.
 */
function renderDiagramSvg(layout, result, focalReference, options) {
  // what the drawing is for is decided when it is asked for, not when it ends (the user may have left the map meanwhile)
  const isMap = options && options.map !== undefined ? options.map : mapIsShown();
  const openedByUser = new Set(options && options.opened ? options.opened : (isMap ? currentMapOpened() : []));
  const pinnedOnMap = options && options.pinned ? options.pinned : (isMap ? mapStateOf().pinned : []);
  const show = options && options.show ? options.show : {};
  // the page of a view in the Library offers no way to change what it draws: nothing folds, a box that points at nothing is not a way
  // to its owner's form; a box and a link still select (on that page, in its panel: `handleAppClick` decides where)
  const readonly = !!(options && options.readonly);
  // every box of a drawing belongs to the layer it was computed for: a link must say it, two layers can share a reference
  const layerAttribute = options && options.layer ? ' data-layer="' + escapeHtml(options.layer) + '"' : '';
  const itemById = new Map(result.items.map((item) => [item.id, item]));
  const origin = new Map([['root', { x: 0, y: 0 }]]);
  const boxes = [];
  const walk = (node, ox, oy, depth, parentId) => {
    const x = ox + (node.x || 0);
    const y = oy + (node.y || 0);
    origin.set(node.id, { x, y });
    if (node.id !== 'root') boxes.push({ node, x, y, depth, parentId, compound: !!(node.children && node.children.length) });
    (node.children || []).forEach((child) => walk(child, x, y, depth + 1, node.id));
  };
  walk(layout, 0, 0, 0, 'root');
  // the fill actually drawn behind a box: its own when the workspace gave it one, else the one of the box around it (a compound box
  // without a fill lets the one behind it show). A title is read against that fill, not against the theme.
  const fillBehind = new Map();

  let focal = null;
  const boxesById = {};
  // the map only (the viewpoints of an element are not folded): one button, two meanings — open a box that hides children, close an open one.
  // It is a sibling of the box, not inside it: a button nested in a link is not valid ARIA, and Enter on one must not act as the other.
  const foldButton = (item, text, x, y, overText) => {
    const mode = item.expandable ? 'expand' : 'close';
    const verb = { expand: 'Expand', close: 'Close' }[mode];
    const glyph = mode === 'expand' ? 'M-2.5,-4.5 L2.5,0 L-2.5,4.5' : 'M-4.5,-2.5 L0,2.5 L4.5,-2.5';
    // the chevron is drawn in the colour the text of the box takes, so that it reads on the fill of a styled box
    const textColor = overText || (text.look && text.look.vars['--st-text']);
    return '<g class="dg-fold"' + (textColor ? ' style="--st-text:' + textColor + '"' : '') + ' data-action="toggle-fold" data-mode="' + mode + '" data-id="' + escapeHtml(item.id) + '" tabindex="0" role="button" aria-label="' +
      escapeHtml(verb + ' ' + text.name) + '"><title>' + verb + '</title>' +
      // a button that looks like one (the chevron alone was too small to hit), with a hit area larger than what is drawn
      '<rect class="dg-hit" x="' + (x - 3) + '" y="' + (y - 3) + '" width="30" height="30"/>' +
      '<rect class="dg-fold-bg" x="' + (x + 2) + '" y="' + (y + 2) + '" width="20" height="20" rx="5"/>' +
      '<path class="dg-fold-glyph" transform="translate(' + (x + 12) + ',' + (y + 12) + ')" d="' + glyph + '"/></g>';
  };

  let compounds = '';
  let leaves = '';
  // the boxes are one tab stop (roving tabindex, `syncNodeTabStop` moves it): the focal box, else the first one drawn, until the page says otherwise.
  // A box that points at nothing (a ghost) is not part of it: it keeps its own stop.
  const stopId = (() => {
    const drawn = boxes.filter((box) => itemById.get(box.node.id) && !itemById.get(box.node.id).ghost);
    const focalBox = drawn.find((box) => itemById.get(box.node.id).reference === focalReference && box.node.id === itemById.get(box.node.id).reference);
    const first = drawn.slice().sort((a, b) => a.depth - b.depth).find((box) => box.compound) || drawn.slice().sort((a, b) => a.depth - b.depth)[0]; // the first in the markup: the boxes that contain others come first
    return focalBox ? focalBox.node.id : first ? first.node.id : null;
  })();
  for (const box of boxes.sort((a, b) => a.depth - b.depth)) {
    const item = itemById.get(box.node.id);
    if (!item) continue;
    const text = diagramItemText(item, show, options && options.itemLayer, focalReference, options && options.source);
    const ownFill = parseCssColor(text.look.vars['--st-fill']);
    const behind = ownFill && ownFill.a !== 0 ? ownFill : (fillBehind.get(box.parentId) || null);
    fillBehind.set(box.node.id, behind);
    // a compound box with no fill of its own, inside one that has: its title and sub-title take the better of black and white on that fill
    const overFill = box.compound && !(ownFill && ownFill.a !== 0) && behind ? cssColorOf(readableTextColor(behind, null)) : null;
    const { x, y } = box;
    const w = box.node.width;
    const h = box.node.height;
    const isFocal = !item.ghost && item.reference === focalReference && item.id === item.reference;
    if (isFocal) focal = { x: x + w / 2 + 4, y: y + h / 2 + 4, w, h };
    if (!item.ghost) boxesById[item.id] = { x: x + w / 2 + 4, y: y + h / 2 + 4, w, h };
    const inert = readonly && item.ghost;
    // a removed box is no element of the plateau drawn: a click shows what the other plateau had, read-only (`select-removed`), and goes nowhere
    const action = inert ? '' : item.ghost
      ? ' data-action="fix-dangling" data-ref="' + escapeHtml(item.owner) + '"'
      : item.removed
        ? ' data-action="select-removed" data-ref="' + escapeHtml(item.reference) + '" data-layer="' + escapeHtml(item.removed.layer) + '"'
        : ' data-action="goto-element" data-ref="' + escapeHtml(item.reference) + '"' + (isMap && options && options.layer && item.id !== item.reference ? ' data-layer="application"' : layerAttribute); // on the Map of the technology layer, a deployed application is an element of the other layer (issue #107)
    const common = ' data-id="' + escapeHtml(item.id) + '"' + action + ' tabindex="' + (item.ghost || item.id === stopId ? '0' : '-1') + '" role="' + (inert ? 'img' : 'link') + '" aria-label="' + escapeHtml(text.name + ' ' + text.sub + (text.badges.length ? ', ' + text.badges.join(', ') : '') + (text.context ? ', context' : '')) + '"';
    if (box.compound) {
      // Close is offered when it changes something: the user opened this box, and nothing pinned inside it keeps it open
      // (the kernel opens what encloses a pin), nor the focal element (a box around it cannot be folded)
      const closable = isMap && !readonly && !item.ghost && openedByUser.has(item.id) && !pinnedOnMap.some((pin) => pin.startsWith(item.reference + '.')) &&
        !(focalReference && focalReference.startsWith(item.reference + '.'));
      const look = diagramLookAttributes(text.look);
      const lookStyle = overFill ? ' style="' + escapeHtml(styleVarsText(Object.assign({}, text.look.vars, { '--ov-text': overFill }))) + '"' : look.style;
      const badgeRow = text.badges.length ? diagramBadgeRow(text.badges, Math.floor((w - 48) / 2)) : null; // right-aligned in the header
      const groupRx = text.look.rx === null ? 8 : text.look.rx;
      compounds += '<g class="dg-node dg-compound' + (isFocal ? ' dg-focal' : '') + (text.context ? ' dg-context' : '') + look.classes + (text.state ? ' dg-chg-' + text.state : '') + (overFill ? ' dg-over-fill' : '') + '"' + lookStyle + common + '><title>' + escapeHtml(text.tooltip) + '</title>' +
        '<rect class="dg-group" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + groupRx + '"/>' +
        (text.look.vars['--st-tint'] ? '<rect class="dg-tint" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + groupRx + '"/>' : '') +
        '<rect class="dg-header" x="' + x + '" y="' + y + '" width="' + w + '" height="36"/>' +
        '<text class="dg-title" x="' + (x + 34) + '" y="' + (y + 22) + '">' + diagramTitleHtml(diagramTruncate(text.title, Math.max(8, Math.floor((w - 48 - (badgeRow ? badgeRow.width : 0)) / 8))), text) +
        ' <tspan class="dg-sub">' + escapeHtml(diagramTruncate(text.sub, DIAGRAM_HEADER_SUB_CHARS)) + '</tspan></text>' +
        (badgeRow ? diagramBadgesSvg(badgeRow, x + w - 8 - badgeRow.width, y + 10) : '') + '</g>' +
        (closable ? foldButton(Object.assign({}, item, { expandable: false }), text, x + 6, y + 6, overFill) : '');
    } else {
      const folded = item.collapsed;
      // a box the kernel says opening would change (and only that: a button that does nothing is not drawn)
      const expandable = isMap && !readonly && !item.ghost && item.expandable;
      const lines = diagramLeafLayout(text, w, show);
      const linesAt = (cls, anchorLines, ys, html) => anchorLines.map((line, i) =>
        '<text class="' + cls + '" x="' + (x + w / 2) + '" y="' + (y + ys[i]) + '" text-anchor="middle">' + (html ? html(line) : escapeHtml(line)) + '</text>').join('');
      const look = diagramLookAttributes(text.look);
      const rx = text.look.rx === null ? 6 : text.look.rx;
      leaves += '<g class="dg-node dg-leaf' + (isFocal ? ' dg-focal' : '') + (text.context ? ' dg-context' : '') + (item.ghost ? ' dg-ghost' : '') + (folded ? ' dg-folded' : '') + look.classes + (text.state ? ' dg-chg-' + text.state : '') + '"' + look.style + common + '><title>' + escapeHtml(text.tooltip) + '</title>' +
        (folded ? '<rect class="dg-box dg-stack" x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + w + '" height="' + h + '" rx="' + rx + '"/>' : '') +
        '<rect class="dg-box" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '"/>' +
        (text.look.vars['--st-tint'] ? '<rect class="dg-tint" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '"/>' : '') +
        linesAt('dg-title', lines.titleLines, lines.titleY, (line) => diagramTitleHtml(line, text)) + linesAt('dg-sub', lines.subLines, lines.subY) +
        lines.descLines.map((line, i) => '<text class="dg-desc" x="' + (x + DIAGRAM_DESCRIPTION_PADDING) + '" y="' + (y + lines.descY[i]) + '">' + escapeHtml(line) + '</text>').join('') +
        (lines.badgeRow ? diagramBadgesSvg(lines.badgeRow, x + (w - lines.badgeRow.width) / 2, y + lines.badgeY) : '') + '</g>' +
        (expandable ? foldButton(item, text, x + 2, y + 2) : '');
    }
  }

  // what a click on a link selects is the pair of boxes it joins: this is what the drawing drew, for the inspection panel
  const pairs = new Map();
  const endOf = (id) => {
    const item = itemById.get(id);
    const text = item ? diagramItemText(item, undefined, options && options.itemLayer, undefined, options && options.source) : { title: id, sub: '' };
    return { id, reference: item ? item.reference : id, title: text.name === undefined ? text.title : text.name, sub: text.sub, ghost: !!(item && item.ghost), collapsed: !!(item && item.collapsed), hidden: item && item.hidden ? item.hidden : 0 };
  };
  // the links drawn between the same two boxes, in order: the ones of a pair of several say which of them they are (`data-nth`)
  const drawnPerPair = new Map();
  for (const edge of layout.edges || []) {
    const link = edge.sections && edge.sections[0] ? result.links[parseInt(edge.id.slice(1), 10)] : null;
    if (link) drawnPerPair.set(link.from + '\u0000' + link.to, (drawnPerPair.get(link.from + '\u0000' + link.to) || 0) + 1);
  }
  let edges = '';
  let labels = '';
  const statesUsed = new Set(); // the states of the links drawn: an arrowhead in the colour of each is defined for them only
  const markOnly = !!(options && options.show && options.show.labels === false); // the captions are off: a changed link still carries its glyph
  for (const edge of layout.edges || []) {
    const section = edge.sections && edge.sections[0];
    if (!section) continue;
    const o = origin.get(edge.container || 'root') || origin.get('root');
    const points = [section.startPoint].concat(section.bendPoints || [], [section.endPoint]);
    const link = result.links[parseInt(edge.id.slice(1), 10)];
    const d = points.map((p, i) => (i ? 'L' : 'M') + (o.x + p.x) + ',' + (o.y + p.y)).join(' ');
    const ends = ' data-from="' + escapeHtml(link.from) + '" data-to="' + escapeHtml(link.to) + '"';
    const pairKey = link.from + '\u0000' + link.to;
    if (!pairs.has(pairKey)) pairs.set(pairKey, { from: link.from, to: link.to, fromEnd: endOf(link.from), toEnd: endOf(link.to), links: [] });
    const nth = pairs.get(pairKey).links.push(link) - 1;
    const caption = diagramLinkText(link);
    const state = RELATIONSHIP_STATES.includes(link.change) ? link.change : null; // a comparison: the link says what happened to it
    if (state) statesUsed.add(state);
    const select = ends + (drawnPerPair.get(pairKey) > 1 ? ' data-nth="' + nth + '"' : '') + layerAttribute + ' data-action="select-link"';
    // the links are one tab stop (roving tabindex, `syncLinkTabStop` moves it): the first one until the page says otherwise
    edges += '<g class="dg-link"' + select + ' tabindex="' + (edges ? '-1' : '0') + '" role="button" aria-pressed="false" aria-label="' +
      escapeHtml('Link from ' + pairs.get(pairKey).fromEnd.title + ' to ' + pairs.get(pairKey).toEnd.title + (caption ? ': ' + caption : '') + (state ? ', ' + CHANGE_WORDS[state].word : '')) + '"><title>' + escapeHtml(diagramLinkTitle(link, itemById, options && options.itemLayer, options && options.source)) + '</title>' +
      '<path class="dg-hit-edge" d="' + d + '"/>' +
      '<path class="dg-edge' + (link.synthetic ? ' dg-aggregated' : '') + (link.ghost ? ' dg-ghost-edge' : '') + (state ? ' dg-chg-' + state : '') + '" marker-end="url(#' + (state ? 'dg-arrow-' + state : 'dg-arrow') + ')" d="' + d + '"/></g>';
    const label = edge.labels && edge.labels[0];
    if (label) {
      // one line: as it always was. Several: one <tspan> per line under the same <text> (one click target, centred on the link),
      // the first baseline where the single line sat, and the tooltip of the link on the whole of it
      const lines = diagramLabelLayout(link, !!(options && options.show && options.show.wrap), markOnly).lines;
      const cx = o.x + label.x + label.width / 2;
      const top = o.y + label.y + DIAGRAM_LABEL_LINE_HEIGHT - 1;
      // the glyph of a changed link opens its first line, in bold
      const mark = diagramLinkMark(link);
      const lineHtml = (line, first) => (mark && first && line.startsWith(mark) ? '<tspan class="dg-glyph">' + escapeHtml(mark) + '</tspan>' + escapeHtml(line.slice(mark.length)) : escapeHtml(line));
      labels += '<text class="dg-label"' + select + ' text-anchor="middle" x="' + cx + '" y="' + top + '">' +
        (lines.length > 1
          ? '<title>' + escapeHtml(diagramLinkTitle(link, itemById, options && options.itemLayer, options && options.source)) + '</title>' +
            lines.map((line, i) => '<tspan x="' + cx + '" y="' + (top + i * DIAGRAM_LABEL_LINE_HEIGHT) + '">' + lineHtml(line, i === 0) + '</tspan>').join('')
          : lines.length ? lineHtml(lines[0], true) : escapeHtml(label.text)) + '</text>';
    }
  }

  const width = Math.ceil(layout.width || 0) + 8;
  const height = Math.ceil(layout.height || 0) + 8;
  const html = '<svg xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Diagram" viewBox="-4 -4 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">' +
    '<defs><marker id="dg-arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path class="dg-arrowhead" d="M0,0 L10,4 L0,8 z"/></marker>' +
    RELATIONSHIP_STATES.filter((state) => statesUsed.has(state)).map((state) => '<marker id="dg-arrow-' + state + '" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="11" refX="13" refY="5.5" orient="auto"><path class="dg-arrowhead dg-chg-' + state + '" d="M0,0 L14,5.5 L0,11 z"/></marker>').join('') + '</defs>' +
    compounds + (edges ? '<g class="dg-links" role="group" aria-label="Links: one tab stop, the arrow keys move between them">' + edges + '</g>' : '') + leaves + labels + '</svg>';
  return { html, width, height, focal, boxes: boxesById, links: Array.from(pairs.values()) };
}

/** No layout engine (offline): the same information as a plain, still clickable, list. */
function renderDiagramFallbackHtml(result, layer, readonly, source) {
  const itemById = new Map(result.items.map((item) => [item.id, item]));
  const nameOf = (id) => {
    const item = itemById.get(id);
    // the page of a view selects an element but sends nothing to the form of the owner of a dangling relationship
    if (readonly && !(item && !item.ghost)) return '<span class="relationship-name">' + escapeHtml(item ? diagramItemText(item, undefined, layer, undefined, source).title : id) + '</span>';
    return '<button type="button" class="relationship-link" data-action="' + (item && item.ghost ? 'fix-dangling' : 'goto-element') + '" data-ref="' +
      escapeHtml(item ? (item.ghost ? item.owner : item.reference) : id) + '"' + (layer && !(item && item.ghost) ? ' data-layer="' + escapeHtml(layer) + '"' : '') + '>' +
      escapeHtml(item ? diagramItemText(item, undefined, readonly ? layer : undefined, undefined, source).title : id) + '</button>';
  };
  const links = result.links.filter((link) => !link.secondary);
  if (!links.length) return '<span class="muted">No relationships to show.</span>';
  return '<div class="dg-list"><p class="diagram-note">The diagram layout could not be loaded (offline?). Showing the relationships as a list.</p><ul class="diagram-fallback">' +
    links.map((link) => '<li>' + nameOf(link.from) + ' &rarr; ' + nameOf(link.to) + (diagramLinkText(link) ? ' : ' + escapeHtml(diagramLinkText(link)) : '') + '</li>').join('') + '</ul></div>';
}

/** The diagram of an element fails through the facet and not without it: the facet removes the element itself (a rule that takes a whole layer away, for one). */
function facetRemovesElement(kernel, viewpoint, reference, layer, error, source) {
  // a facet the kernel refuses (the Jayway dialect, a path it cannot read, an action it does not know) removes nothing: its sentence is the error of the view (wave 019, run 0138, #137)
  if (error && /^(the facet path |unsupported facet action|invalid facet JSONPath|a facet cannot remove the whole|a facet left )/.test(error)) return false;
  const plain = kernel.compute(buildKernelInput(viewpoint, reference, { layer, source }).input);
  return !plain.error;
}

/**
 * The Map through a facet (#68): an element that is opened, pinned or hidden and that the facet removes is no longer in the model the kernel draws, and the kernel refuses a
 * list that names it (`dangling reference: x`, and `dangling`: every entry of the three lists it cannot find). The lists leave out what the facet removes (and what was inside it),
 * all at once, and the Map is drawn from the rest: two computations however many references the facet removed (#77, one more for each reference when the kernel named only the
 * first); `input` has its lists replaced. The lists of the page are not touched: without the facet the choice of the user is back. A reference that the lists do not name stays an error.
 */
function computeMapThroughFacet(kernel, input) {
  const lists = ['opened', 'pinned', 'hidden'];
  for (;;) {
    const result = kernel.compute(input);
    const named = result.error ? /^dangling reference: (.+)$/.exec(result.error) : null;
    const gone = named ? (Array.isArray(result.dangling) && result.dangling.includes(named[1]) ? result.dangling : [named[1]]) : [];
    if (!gone.some((reference) => lists.some((list) => input[list].includes(reference)))) return result;
    for (const list of lists) input[list] = input[list].filter((reference) => !gone.some((removed) => reference === removed || reference.startsWith(removed + '.')));
  }
}

/** Does the diagram of an element draw nothing but the element itself? (`drawn`: its boxes and links, the ghosts of dangling relationships included.) */
function diagramHasNothingToDraw(drawn) {
  return !drawn.links.some((link) => !link.secondary) && drawn.items.length <= 1;
}

/**
 * After a render: turns off the tabs of the header of an element whose diagram would only say "Nothing to show" — the
 * element has no relationships there, or the facet removes them all. The tab being shown stays on, with its message.
 */
async function markElementTabs() {
  const group = document.querySelector('.viewpoint-switch');
  const sel = elementSelection();
  if (!group || sel.kind !== 'element') return;
  const record = findElementRecord(sel.key);
  if (!record) return;
  const facet = currentDiagramFacet();
  try {
    const kernel = await loadViewpointKernel();
    const current = elementTab === 'details' ? 'details' : effectiveDiagramViewpoint(record);
    const empty = {};
    for (const id of ['overview', 'detailed', 'deep']) {
      if (id === current || (id === 'detailed' && LEAF_KINDS.includes(record.kind))) continue;
      const { input } = buildKernelInput(id, record.reference, { facet });
      const result = kernel.compute(input);
      if (result.error) { if (facet && facetRemovesElement(kernel, id, record.reference, undefined, result.error)) empty[id] = true; continue; }
      const ghosts = buildDiagramGhosts(result, record.reference, input.layer);
      empty[id] = diagramHasNothingToDraw({ items: result.items.concat(ghosts.items), links: result.links.concat(ghosts.links) });
    }
    const live = document.querySelector('.viewpoint-switch');
    const nowSel = elementSelection();
    if (!live || nowSel.kind !== 'element' || nowSel.key !== sel.key || currentDiagramFacet() !== facet) return; // a newer render took over
    live.querySelectorAll('button[data-tab]').forEach((button) => {
      const id = button.getAttribute('data-tab');
      if (!empty[id]) return;
      button.disabled = true;
      button.title = facet
        ? 'Nothing to show: this element has no relationships here, or facet “' + facet.name + '” removes them, or the element.'
        : 'Nothing to show: this element has no relationships here.';
    });
  } catch (e) {
    console.error('Marking the tabs of the element failed', e);
  }
}

function diagramStatusText(viewpoint, reference, facet, result, ghosts, layer) {
  const links = result.links.filter((link) => !link.secondary && !link.ghost);
  const aggregated = links.filter((link) => link.synthetic).length;
  const items = result.items.filter((item) => !item.ghost).length;
  let text = (viewpoint === 'map' ? 'Map' : DIAGRAM_VIEWPOINTS[viewpoint].label) + ' of ' + (viewpoint === 'map' ? (layer === 'technology' ? 'the technology layer' : 'the workspace') : reference) + (facet ? ' through facet “' + facet.name + '”' : '') + ' — ' +
    items + (items === 1 ? ' item, ' : ' items, ') + links.length + (links.length === 1 ? ' link' : ' links');
  if (aggregated) text += ' (' + aggregated + ' dashed: relationships grouped under an enclosing element)';
  if (ghosts.total) {
    text += '. ' + ghosts.total + (ghosts.total === 1 ? ' relationship points' : ' relationships point') + ' at an unknown element' + (ghosts.total > ghosts.items.length ? ' (' + (ghosts.total - ghosts.items.length) + ' not drawn)' : '');
  }
  return text + '.';
}

/**
 * What the canvas says when there is nothing to draw. Through a facet that is usually the facet's doing, not the
 * element's: say so, count what it removed, and offer the diagram without it.
 */
function diagramEmptyHtml(kernel, viewpoint, reference, facet, hint, options) {
  const readonly = !!(options && options.readonly); // the page of a view offers no way to change what it draws
  if (facet) {
    const plain = kernel.compute(buildKernelInput(viewpoint, reference, { layer: options && options.layer, source: options && options.source }).input);
    const removed = plain.error ? 0 : plain.links.filter((link) => !link.secondary).length;
    if (removed) {
      return '<div class="muted diagram-empty">Nothing to show: facet “' + escapeHtml(facet.name) + '” removes the ' +
        (removed === 1 ? 'link' : removed + ' links') + ' of this element' + hint + '.' +
        (readonly ? '' : ' <button type="button" data-action="clear-facet">Show it without the facet</button>') + '</div>';
    }
  }
  return '<div class="muted diagram-empty">Nothing to show: this element has no relationships' + hint + '.</div>';
}

/**
 * "Hide unlinked": a diagram without the boxes that no (drawn) link reaches. The focal box stays, and so does whatever
 * encloses a box that stays. Returns the boxes and links to draw and how many boxes were left out.
 */
function hideUnlinkedItems(items, links, focalReference) {
  const always = new Set([].concat(focalReference));
  const linked = new Set();
  for (const link of links) {
    if (link.secondary) continue;
    linked.add(link.from);
    linked.add(link.to);
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const keep = new Set();
  const keepWithEnclosing = (id) => {
    for (let item = byId.get(id); item && !keep.has(item.id); item = item.parent ? byId.get(item.parent) : null) keep.add(item.id);
  };
  for (const item of items) {
    if (linked.has(item.id) || always.has(item.id)) keepWithEnclosing(item.id);
  }
  const shown = items.filter((item) => keep.has(item.id));
  return {
    items: shown,
    links: links.filter((link) => keep.has(link.from) && keep.has(link.to)),
    hidden: items.length - shown.length
  };
}

/** Puts the state of the key on the one on screen: its class, `aria-expanded` and the cap of its height. */
function syncDiagramKey() {
  const key = typeof document !== 'undefined' ? document.getElementById('diagram-key') : null;
  if (!key) return;
  if (key.classList) key.classList.toggle('dg-key-open', diagramKeyOpen);
  const button = key.querySelector ? key.querySelector('[data-action="toggle-diagram-key"]') : null;
  if (button) button.setAttribute('aria-expanded', String(diagramKeyOpen));
  const area = key.closest ? key.closest('.diagram-status') : null;
  const holder = area && area.parentElement ? area.parentElement : null;
  if (diagramKeyOpen && holder && holder.clientHeight && key.style) key.style.setProperty('--dg-key-max', Math.max(48, Math.round(holder.clientHeight * 0.3)) + 'px');
}

/** The key to the line styles, shown under the diagram. */
function diagramLegendHtml(hasGhosts, stereotypes) {
  const sample = (cls) => '<svg width="26" height="8" aria-hidden="true"><line class="dg-edge ' + cls + '" x1="0" y1="4" x2="26" y2="4"/></svg>';
  const styled = styledStereotypesOf(stereotypes);
  return sample('') + ' direct ' + sample('dg-aggregated') + ' grouped' + (hasGhosts ? ' ' + sample('dg-ghost-edge') + ' unknown element' : '') +
    (styled.length ? ' <span class="dg-legend-stereotypes" role="group" aria-label="Stereotypes">' + stereotypeBadgesHtml(styled) + '</span>' : '');
}

/**
 * The key to the four states of a comparison: for each, a sample of its box and of its link, its glyph, its word and how its line is drawn, so that
 * it reads without colour. The samples are drawn with the same variables and classes as the boxes (the look of the workspace's own entry included).
 * Red dashed is not one of them: it is kept for what the editor already used it for.
 */
function diagramComparisonLegendHtml(comparison, counts) {
  const noun = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const how = {
    new: 'thick solid', changed: 'dotted', removed: 'long dashes, narrow gaps, struck title', 'contains-changes': 'thin dashed: something inside changed',
    moved: 'long dashes, wide gaps: replaces one element',
    split: 'medium dashes: one of several that replace one',
    merged: 'short dashes, far apart: replaces several'
  };
  // the three states of identity are in the key only when the drawing shows one, so that the key of every other drawing is what it was
  const shown = RELATIONSHIP_STATES.concat(IDENTITY_STATES.filter((state) => counts && counts[state] && counts[state].boxes > 0), 'contains-changes');
  const entries = shown.map((state) => {
    const look = stereotypeLookOf([state], state);
    const box = '<svg width="28" height="16" aria-hidden="true"><g class="dg-styled dg-chg-' + state + '" style="' + escapeHtml(styleVarsText(look.vars)) + '">' +
      '<rect class="dg-box" x="2" y="2" width="24" height="12" rx="3"/>' + (look.vars['--st-tint'] ? '<rect class="dg-tint" x="2" y="2" width="24" height="12" rx="3"/>' : '') + '</g></svg>';
    const hasLink = RELATIONSHIP_STATES.includes(state); // a relationship is never moved, split or merged: only a box has these states
    const link = hasLink ? '<svg width="26" height="8" aria-hidden="true"><line class="dg-edge dg-chg-' + state + '" x1="0" y1="4" x2="26" y2="4"/></svg>' : '';
    // what this drawing shows of the state, when it is told: boxes, and links for the states that have a line
    const count = counts ? ' <span class="dg-legend-count">' + noun(counts[state].boxes, 'box', 'boxes') + (hasLink ? ', ' + noun(counts[state].links, 'link', 'links') : '') + '</span>' : '';
    return '<span class="dg-legend-state" data-state="' + state + '">' + box + link + '<b class="dg-glyph">' + escapeHtml(CHANGE_GLYPHS[state]) + '</b> ' +
      escapeHtml(CHANGE_WORDS[state].word) + ' <span class="dg-legend-how">' + escapeHtml(how[state]) + '</span>' + count + '</span>';
  });
  // Changes only: the boxes kept to place the changes are faded and say no state; the key says so, with a sample drawn faded as they are
  if (counts && counts.context) {
    const box = '<svg width="28" height="16" aria-hidden="true"><g class="dg-node dg-context"><rect class="dg-box" x="2" y="2" width="24" height="12" rx="3"/></g></svg>';
    entries.push('<span class="dg-legend-state" data-state="context">' + box + 'context <span class="dg-legend-how">faded: shown to place the changes</span> <span class="dg-legend-count">' + noun(counts.context.boxes, 'box', 'boxes') + '</span></span>');
  }
  return ' <span class="dg-legend-compare" id="diagram-key" role="group" aria-label="Comparison">' +
    '<span class="dg-legend-title">' + escapeHtml(plateauTitle(comparison.target)) + ' compared with ' + escapeHtml(plateauTitle(comparison.base)) + ':</span> ' +
    // folded or open is view state: the markup is the same either way, `syncDiagramKey` sets the class and `aria-expanded` when the key is put on screen
    '<button type="button" class="dg-legend-toggle" data-action="toggle-diagram-key" aria-expanded="false" aria-controls="diagram-key" title="' + escapeHtml(plateauTitle(comparison.target) + ' compared with ' + plateauTitle(comparison.base)) + ': show or hide how each line is drawn">Key</button> ' +
    entries.join(' ') +
    ' <span class="dg-legend-note">Red dashed is kept for dangling references (unknown elements).</span></span>';
}

/** What `showDiagramScene` needs to put a computed diagram on screen. */
function buildDiagramScene(viewKey, html, status, legend, size, focal) {
  return { viewKey, html, status, legend, width: size.width, height: size.height, focal, hasSvg: html.startsWith('<svg') };
}

