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

/**
 * Whether the key to a comparison, under the diagram, is open (wave 018, run 0130, #132). Folded, it is one row with the sample, the glyph, the word and the count of each state; open, it also says
 * how each line is drawn, capped at about 30 % of the diagram area, with its own scroll. View state only: kept while the editor stays open on the folder, not an input of any diagram or
 * cache, not in the address, not in the workspace; no `modelsChanged()`.
 */
let diagramKeyOpen = false;

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

// ---- Diagram: scale, scroll, highlight, keyboard, export ----

/** Below this the captions of the diagram stop being readable (the smallest one is 11px). */
const DIAGRAM_MIN_READABLE_SCALE = 0.8;
/** Room kept around the drawing, in pixels of the canvas. */
const DIAGRAM_MARGIN = 24;

/** The largest scale, at most 1 (a diagram is never enlarged), at which the whole drawing is in the view. */
function diagramFitScale(view, drawing) {
  const w = Math.max(1, view.width - 2 * DIAGRAM_MARGIN);
  const h = Math.max(1, view.height - 2 * DIAGRAM_MARGIN);
  return Math.max(0.1, Math.min(1, w / drawing.width, h / drawing.height));
}

/** How a diagram opens: the whole of it when that is readable, else a readable part of it. */
function diagramAutoScale(view, drawing) {
  return Math.max(DIAGRAM_MIN_READABLE_SCALE, diagramFitScale(view, drawing));
}

/**
 * The point of the drawing to put in the middle of the view. On an axis where the drawing fits, the drawing is
 * centered (never a blank half for an element at one end). Where it does not, the element is centered but the view
 * never goes past the drawing's edges; an element larger than the view is anchored by its start, so that its title
 * shows. `focal` is {x, y, w, h}, the center and the size of the element's box, in the drawing's pixels. With no focal
 * element (the map with nothing selected), a drawing that does not fit is centered across and shown from its top.
 */
function diagramFrameCenter(view, drawing, focal, scale) {
  const axis = (viewSize, drawingSize, center, size, fromStart) => {
    const span = viewSize / scale;
    const margin = DIAGRAM_MARGIN / scale;
    if (drawingSize + 2 * margin <= span) return drawingSize / 2;
    let target = center === null ? (fromStart ? 0 : drawingSize / 2) : center;
    if (size !== null && size * scale > viewSize - 2 * DIAGRAM_MARGIN) target = center - size / 2 - margin + span / 2;
    return Math.min(Math.max(target, span / 2 - margin), drawingSize - span / 2 + margin);
  };
  return {
    x: axis(view.width, drawing.width, focal ? focal.x : null, focal ? focal.w : null),
    y: axis(view.height, drawing.height, focal ? focal.y : null, focal ? focal.h : null, true)
  };
}

/** The part of the canvas the drawing is framed in: the toolbar floats over the bottom, so that strip does not count. */
function diagramViewSize(canvas) {
  const tools = canvas.parentElement && canvas.parentElement.querySelector('.diagram-tools');
  const covered = tools ? tools.offsetHeight + 16 : 0;
  return { width: canvas.clientWidth, height: Math.max(1, canvas.clientHeight - covered) };
}

/** The scale actually applied: 'auto' and 'fit' are worked out for the canvas as it is now. */
function resolveDiagramScale(canvas) {
  if (typeof diagramScale === 'number') return diagramScale;
  if (!diagramScene || !diagramScene.hasSvg) return 1;
  const view = diagramViewSize(canvas);
  const drawing = { width: diagramScene.width, height: diagramScene.height };
  // Center is a readable size, with or without an element to put in the middle (the map with nothing selected has none):
  // only Fit shows the whole drawing, however small
  return diagramScale === 'fit' ? diagramFitScale(view, drawing) : diagramAutoScale(view, drawing);
}

/** The user took over the framing (zoom, drag, wheel): keep what is on screen as the manual view. */
function takeOverDiagramFraming(canvas) {
  if (typeof diagramScale === 'number') return;
  const wasFit = diagramScale === 'fit';
  diagramScale = resolveDiagramScale(canvas);
  if (wasFit) diagramFramingChanged(); // the framing is no longer Fit
}

function applyDiagramScale() {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas || !diagramScene) return 1;
  const scale = resolveDiagramScale(canvas);
  const svg = canvas.querySelector('svg');
  if (svg) {
    svg.setAttribute('width', String(Math.round(diagramScene.width * scale)));
    svg.setAttribute('height', String(Math.round(diagramScene.height * scale)));
  }
  applyDiagramPan(canvas);
  const label = document.getElementById('diagram-zoom-label');
  if (label) { label.textContent = Math.round(scale * 100) + '%'; label.setAttribute('aria-label', 'Actual size (now ' + Math.round(scale * 100) + '%)'); }
  const fit = document.getElementById('diagram-fit-button');
  if (fit) fit.setAttribute('aria-pressed', String(diagramScale === 'fit'));
  const center = document.getElementById('diagram-center-button');
  if (center) center.setAttribute('data-lit', String(diagramScale === 'auto')); // an action that is lit while its framing holds, not a toggle
  // the opening view stops at a readable size: say what is left out, and how to see it
  const hint = document.getElementById('diagram-hint');
  if (hint) {
    const whole = diagramScene.hasSvg && diagramScale === 'auto'
      ? diagramFitScale(diagramViewSize(canvas), { width: diagramScene.width, height: diagramScene.height })
      : 1;
    hint.textContent = whole < DIAGRAM_MIN_READABLE_SCALE - 0.005 && scale > whole + 0.005 ? 'Part of the diagram is out of view: Fit shows all of it (' + Math.round(whole * 100) + '%).' : '';
  }
  return scale;
}

/** Put the drawing where the framing says, in the canvas as it is now. */
function applyDiagramPan(canvas) {
  const svg = canvas && canvas.querySelector('svg');
  if (!svg) return;
  const scale = resolveDiagramScale(canvas);
  if (typeof diagramScale !== 'number' && diagramScene) {
    const view = diagramViewSize(canvas);
    const drawing = { width: diagramScene.width, height: diagramScene.height };
    diagramCenter = diagramFrameCenter(view, drawing, diagramScale === 'auto' ? diagramScene.focal : null, scale);
  }
  const x = canvas.clientWidth / 2 - diagramCenter.x * scale;
  const y = diagramViewSize(canvas).height / 2 - diagramCenter.y * scale;
  svg.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
}

/** Move the view by (dx, dy) canvas pixels: the drawing follows. */
function moveDiagramBy(canvas, dx, dy) {
  applyDiagramPan(canvas); // the framing that is on screen is where the move starts
  takeOverDiagramFraming(canvas);
  const scale = resolveDiagramScale(canvas);
  diagramCenter = { x: diagramCenter.x - dx / scale, y: diagramCenter.y - dy / scale };
  applyDiagramPan(canvas);
}

/** Change the scale, keeping the point under (clientX, clientY) — by default the middle of the canvas — where it is. */
function setDiagramScale(next, clientX, clientY) {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas || !diagramScene || !diagramScene.hasSvg) return;
  if (next === 'fit' || next === 'auto') {
    diagramScale = next;
    applyDiagramScale();
    diagramFramingChanged();
    return;
  }
  applyDiagramPan(canvas);
  const before = resolveDiagramScale(canvas);
  const rect = canvas.getBoundingClientRect();
  // the pointer's offset from the middle of the canvas
  const ox = clientX === undefined ? 0 : clientX - rect.left - rect.width / 2;
  const oy = clientY === undefined ? 0 : clientY - rect.top - diagramViewSize(canvas).height / 2;
  diagramScale = next;
  const after = applyDiagramScale();
  diagramCenter = { x: diagramCenter.x + ox / before - ox / after, y: diagramCenter.y + oy / before - oy / after };
  applyDiagramPan(canvas);
  diagramFramingChanged();
}

/** One step along DIAGRAM_SCALES from the scale on screen. */
function diagramScaleStep(direction) {
  const canvas = document.getElementById('diagram-canvas');
  const current = canvas ? resolveDiagramScale(canvas) : 1;
  const steps = DIAGRAM_SCALES.slice();
  if (direction > 0) return steps.find((s) => s > current + 0.01) || steps[steps.length - 1];
  return steps.reverse().find((s) => s < current - 0.01) || steps[steps.length - 1];
}

/** Back to how the diagram opens: the element in the middle, at a readable size. */
function resetDiagramView() {
  diagramScale = 'auto';
  applyDiagramScale();
  diagramFramingChanged();
}

/** Pan so that a box is inside the canvas (keyboard focus can land on a box that is out of sight). */
function revealDiagramNode(node) {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas || !node) return;
  const box = (node.querySelector('.dg-box, .dg-header') || node).getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const view = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + diagramViewSize(canvas).height };
  const margin = 24;
  let dx = 0;
  let dy = 0;
  if (box.left < view.left + margin) dx = view.left + margin - box.left;
  else if (box.right > view.right - margin) dx = view.right - margin - box.right;
  if (box.top < view.top + margin) dy = view.top + margin - box.top;
  else if (box.bottom > view.bottom - margin) dy = view.bottom - margin - box.bottom;
  if (dx || dy) moveDiagramBy(canvas, dx, dy);
}

/** What identifies the box (or fold button) of the diagram that `el` is, to find it again once the drawing is rebuilt; null for anything else. */
function diagramFocusTargetOf(el) {
  const part = el && el.closest ? el.closest('#diagram-canvas .dg-node, #diagram-canvas .dg-fold, #diagram-canvas .dg-link') : null;
  if (part && part.classList.contains('dg-link')) return diagramLinkKeyOf(part);
  return part ? { fold: part.classList.contains('dg-fold'), id: part.getAttribute('data-id') } : null;
}

/** The box of the diagram a fold button belongs to (they are siblings in the drawing). */
function diagramNodeOf(el) {
  const node = el && el.closest ? el.closest('.dg-node') : null;
  if (node) return node;
  const fold = el && el.closest ? el.closest('.dg-fold') : null;
  if (!fold) return null;
  const id = fold.getAttribute('data-id');
  return Array.from(document.querySelectorAll('#diagram-canvas .dg-node')).find((n) => n.getAttribute('data-id') === id) || null;
}

/** What tells a link of the drawing from the others: its pair of boxes and, when it has a twin, its position among them (`data-nth`, else null). */
function diagramLinkKeyOf(link) {
  return { link: true, from: link.getAttribute('data-from'), to: link.getAttribute('data-to'), nth: diagramLinkNth(link) };
}

/** The position (`data-nth`) of a link among the links of its pair, as text; null for a link that has no twin. */
function diagramLinkNth(link) {
  const nth = link.getAttribute('data-nth');
  return nth === null || nth === undefined ? null : nth;
}

/** The link of the drawing that `key` (see `diagramLinkKeyOf`) names; with a twin that is gone, the first link of the pair; else null. */
function findDiagramLink(links, key) {
  const ofPair = links.filter((el) => el.getAttribute('data-from') === key.from && el.getAttribute('data-to') === key.to);
  return ofPair.find((el) => diagramLinkNth(el) === key.nth) || ofPair[0] || null;
}

/**
 * The links of a diagram are one tab stop (roving tabindex): `tabindex="0"` on one of them, `-1` on the others, and the arrow
 * keys move among them (`handleDiagramKeydown`). The stop is where the focus last rested in the group; this is that link's
 * key, or null (nothing remembered yet, or the selection came from elsewhere, an address).
 */
let diagramLinkStop = null;

/**
 * After the drawing is on screen: exactly one link is the tab stop. The one the focus last rested on if the drawing still has it,
 * else the first link of the selected pair, else the first link drawn; what is kept is what was chosen, so it is never a link the
 * drawing lacks. A drawing with no link has no stop.
 */
function syncLinkTabStop(canvas) {
  if (!canvas || !canvas.querySelectorAll) return;
  const links = Array.from(canvas.querySelectorAll('.dg-link'));
  if (!links.length) { diagramLinkStop = null; return; }
  const sel = diagramSelection();
  const remembered = diagramLinkStop ? findDiagramLink(links, diagramLinkStop) : null;
  const selected = sel.kind === 'link' ? links.find((el) => el.getAttribute('data-from') === sel.from && el.getAttribute('data-to') === sel.to) : null;
  setLinkTabStop(links, remembered || selected || links[0]);
}

/**
 * The boxes of a diagram are one tab stop too (roving tabindex): `tabindex="0"` on one of them, `-1` on the others, the arrow keys move between them
 * (`handleDiagramKeydown`) and the stop follows the focus. This is the id of the box where the focus last rested, or null. A ghost box keeps its own stop.
 */
let diagramNodeStop = null;

/** After the drawing is on screen: the box the focus last rested on if the drawing still has it, else the selected one, else the focal one, else the first. */
function syncNodeTabStop(canvas) {
  if (!canvas || !canvas.querySelectorAll) return;
  const nodes = Array.from(canvas.querySelectorAll('.dg-node')).filter((el) => !el.classList.contains('dg-ghost'));
  if (!nodes.length) { diagramNodeStop = null; return; }
  const remembered = diagramNodeStop ? nodes.find((el) => el.getAttribute('data-id') === diagramNodeStop) : null;
  const named = (cls) => nodes.find((el) => el.classList.contains(cls));
  setNodeTabStop(nodes, remembered || named('dg-selected') || named('dg-focal') || nodes[0]);
}

/** `stop` is the one box of `nodes` that Tab reaches; its id is remembered. */
function setNodeTabStop(nodes, stop) {
  for (const el of nodes) el.setAttribute('tabindex', el === stop ? '0' : '-1');
  diagramNodeStop = stop.getAttribute('data-id');
}

/** `stop` is the one link of `links` that Tab reaches; its key is remembered. */
function setLinkTabStop(links, stop) {
  for (const el of links) el.setAttribute('tabindex', el === stop ? '0' : '-1');
  diagramLinkStop = diagramLinkKeyOf(stop);
}

/** Arrow keys, Home and End on a focused link: the link to go to in the order of the drawing (no wrap-around), or null. */
function diagramLinkTarget(links, current, key) {
  const index = links.indexOf(current);
  if (index < 0) return null;
  if (key === 'Home') return links[0];
  if (key === 'End') return links[links.length - 1];
  const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
  return links[Math.min(links.length - 1, Math.max(0, index + step))];
}

/**
 * After the drawing was rebuilt: the focus goes back to the same box (or fold button, else the box it belonged to, else
 * the canvas), unless the user has meanwhile gone elsewhere.
 */
function restoreDiagramFocus(canvas) {
  const wanted = pendingDiagramFocus;
  pendingDiagramFocus = null;
  if (!wanted || !canvas.querySelectorAll) return;
  const active = document.activeElement;
  if (active && active !== document.body && !(canvas.contains && canvas.contains(active))) return;
  const find = (selector) => Array.from(canvas.querySelectorAll(selector)).find((el) => el.getAttribute('data-id') === wanted.id);
  const link = wanted.link ? findDiagramLink(Array.from(canvas.querySelectorAll('.dg-link')), wanted) : null;
  const target = link || (wanted.link ? null : ((wanted.fold ? find('.dg-fold') : null) || find('.dg-node'))) || canvas;
  if (target.focus) target.focus({ preventScroll: true });
}

/** Put a computed diagram on screen: markup, status, scale, then the scroll position. */
function showDiagramScene(scene) {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas) return;
  // on the map, "the element" is the one selected: Center puts it in the middle, Fit shows everything
  if (canvas.hasAttribute('data-map')) {
    const sel = AppState.selection;
    const pickedRemoved = removedInspectionOf(sel, 'map'); // a removed box that was clicked is the element Center puts in the middle
    scene.focal = pickedRemoved && scene.boxes && scene.boxes[pickedRemoved.reference] ? scene.boxes[pickedRemoved.reference] : sel.kind === 'element' && scene.boxes && scene.boxes[sel.key] ? scene.boxes[sel.key] : null;
    // scenes that say nothing about what they draw (an error) leave the selection alone and the check for the next one
    if (scene.drawnIds) {
      const selectionIsDrawn = sel.kind === 'element' && (sel.layer === 'application' && mapLayer() === 'technology' ? !!scene.drawnApps && scene.drawnApps.has(sel.key) : scene.drawnIds.has(sel.key));
      if (mapSelectionCheck && sel.kind === 'element' && !selectionIsDrawn) {
        AppState.selection = { kind: 'none', key: null, mode: 'view' };
        syncHashFromState();
        document.querySelectorAll('.element-header-subject, [data-action="open-as-diagram"]').forEach((el) => el.remove());
        if (comparisonPanelOn()) refreshRightPanel(); else removeInspectionPanel(); // a comparison keeps its Changes panel
      }
      mapSelectionCheck = false;
    }
  }
  diagramScene = scene;
  document.querySelectorAll('[data-action="diagram-export"]').forEach((button) => { button.disabled = !scene.hasSvg; }); // nothing to download from a message
  canvas.innerHTML = scene.html;
  const status = document.getElementById('diagram-status');
  if (status) { status.textContent = scene.status; status.title = scene.status; }
  const legend = document.getElementById('diagram-legend');
  if (legend) legend.innerHTML = scene.legend;
  syncDiagramKey();
  applyDiagramScale();
  // the same diagram, whichever perspective shows it, keeps the view the user chose; another one opens framed on its element
  if (scene.viewKey !== diagramShownView && typeof diagramScale === 'number') diagramScale = 'auto';
  applyDiagramScale();
  diagramShownView = scene.viewKey;
  reconcileLinkSelection();
  if (rightPanelPending && comparisonPanelOn() && !(comparisonState() || {}).pending) refreshRightPanel(); // the kernel is loaded now: the list of the changes fills the panel
  markMapSelection();
  markLinkSelection();
  syncLinkTabStop(canvas);
  syncNodeTabStop(canvas);
  revealSelectedLink(canvas);
  markMapScope();
  markInspection();
  restoreDiagramFocus(canvas);
  if (diagramResizeObserver) diagramResizeObserver.disconnect();
  if (typeof ResizeObserver === 'function') {
    diagramResizeObserver = new ResizeObserver(() => applyDiagramScale());
    diagramResizeObserver.observe(canvas);
  }
}

/** On the map and on the page of a view, the element selected by a click on a box is outlined. (The tree of the map selects nothing: it only folds and unfolds.) */
function markMapSelection() {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas || !(canvas.hasAttribute('data-map') || canvas.getAttribute('data-host') === 'library')) return;
  canvas.querySelectorAll('.dg-selected').forEach((el) => el.classList.remove('dg-selected'));
  const sel = diagramSelection();
  const removed = removedInspectionOf(sel, canvas.getAttribute('data-host') === 'library' ? 'library' : 'map'); // a removed box that was clicked
  if (removed) {
    const box = Array.from(canvas.querySelectorAll('.dg-node')).find((el) => el.getAttribute('data-ref') === removed.reference && el.getAttribute('data-layer') === removed.layer);
    if (box) box.classList.add('dg-selected');
    return;
  }
  if (sel.kind !== 'element') return;
  // the Map's boxes are the elements themselves (id = reference); on the page of a view a box can be an element hosted by another (id differs): its reference and layer say which
  const onPage = canvas.getAttribute('data-host') === 'library';
  const deployed = !onPage && sel.layer === 'application' && mapLayer() === 'technology'; // a deployed application of the Map of the technology layer: told by its reference and its layer
  // an application deployed on several nodes is several boxes of one reference: all of them are the selection
  const nodes = Array.from(canvas.querySelectorAll('.dg-node')).filter((el) => onPage || deployed
    ? el.getAttribute('data-ref') === sel.key && (!sel.layer || el.getAttribute('data-layer') === sel.layer)
    : el.getAttribute('data-id') === sel.key);
  nodes.forEach((node) => node.classList.add('dg-selected'));
}

/** Dim everything but a box (or a link) and what it is linked to — for pointer hover and keyboard focus. */
function highlightDiagram(target) {
  const svg = document.querySelector('#diagram-canvas svg');
  if (!svg) return;
  svg.querySelectorAll('.dg-on').forEach((el) => el.classList.remove('dg-on'));
  if (!target) { svg.classList.remove('dg-dim'); return; }
  const ids = new Set();
  const lit = (el) => { el.classList.add('dg-on'); ids.add(el.getAttribute('data-from')); ids.add(el.getAttribute('data-to')); };
  if (target.classList.contains('dg-link')) {
    const from = target.getAttribute('data-from');
    const to = target.getAttribute('data-to');
    svg.querySelectorAll('.dg-link, .dg-label').forEach((el) => { if (el.getAttribute('data-from') === from && el.getAttribute('data-to') === to) lit(el); });
  } else {
    const id = target.getAttribute('data-id');
    ids.add(id);
    svg.querySelectorAll('.dg-link, .dg-label').forEach((el) => { if (el.getAttribute('data-from') === id || el.getAttribute('data-to') === id) lit(el); });
  }
  svg.querySelectorAll('.dg-node, .dg-fold').forEach((el) => { if (ids.has(el.getAttribute('data-id'))) el.classList.add('dg-on'); });
  svg.classList.add('dg-dim');
}

function handleDiagramPointerOver(e) {
  const inCanvas = e.target.closest && e.target.closest('#diagram-canvas');
  if (!inCanvas) return;
  highlightDiagram(e.target.closest('.dg-node, .dg-fold, .dg-link'));
}

/** The pointer left the canvas: the dimming goes (unless a box has the keyboard focus, which keeps its own). */
function handleDiagramPointerOut(e) {
  const canvas = e.target.closest && e.target.closest('#diagram-canvas');
  if (!canvas) return;
  const into = e.relatedTarget;
  if (into && canvas.contains && canvas.contains(into)) return;
  const focused = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.dg-node, .dg-fold, .dg-link') : null;
  highlightDiagram(focused && canvas.contains(focused) ? focused : null);
}

function handleDiagramFocus(e) {
  if (!(e.target.closest && e.target.closest('#diagram-canvas'))) return;
  const node = e.type === 'focusin' ? e.target.closest('.dg-node, .dg-fold, .dg-link') : null;
  highlightDiagram(node);
  if (node) revealDiagramNode(node);
  // the stop of the links goes where their focus is (a click, an arrow key, Tab coming back, the focus given back after a redraw)
  if (node && node.classList.contains('dg-link')) setLinkTabStop(Array.from(document.querySelectorAll('#diagram-canvas .dg-link')), node);
  if (node && node.classList.contains('dg-node') && !node.classList.contains('dg-ghost')) setNodeTabStop(Array.from(document.querySelectorAll('#diagram-canvas .dg-node')).filter((el) => !el.classList.contains('dg-ghost')), node);
}

/**
 * The wheel moves the diagram (shift, or a sideways wheel, moves it left and right); ctrl/⌘ + wheel zooms around the
 * pointer. Nothing scrolls: the canvas is a free surface.
 */
function handleAppWheel(e) {
  const canvas = e.target.closest && e.target.closest('#diagram-canvas');
  // no drawing (the plain list shown when the layout engine could not load, a message): the wheel scrolls it as usual
  if (!canvas || !canvas.querySelector('svg')) return;
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    setDiagramScale(diagramScaleStep(e.deltaY < 0 ? 1 : -1), e.clientX, e.clientY);
    return;
  }
  const unit = e.deltaMode === 1 ? 16 : 1;
  const sideways = e.shiftKey && !e.deltaX;
  moveDiagramBy(document.getElementById('diagram-canvas'), -(sideways ? e.deltaY : e.deltaX) * unit, -(sideways ? 0 : e.deltaY) * unit);
}

/** The canvas never scrolls (a focused box can make the browser try); the drawing moves with `diagramCenter` instead. */
function keepDiagramCanvasStill(e) {
  if (e.target && e.target.id === 'diagram-canvas') { e.target.scrollLeft = 0; e.target.scrollTop = 0; }
}

/** Drag the diagram with the mouse; a drag is never taken for a click on the box it started on. */
function startDiagramPan(e) {
  const canvas = e.target.closest('#diagram-canvas');
  if (!canvas || e.button !== 0) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const start = { x: startX, y: startY, center: { x: diagramCenter.x, y: diagramCenter.y } };
  let moved = false;
  let taken = false;
  const onMove = (m) => {
    const dx = m.clientX - startX;
    const dy = m.clientY - startY;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    moved = true;
    canvas.classList.add('panning');
    if (!taken) { applyDiagramPan(canvas); takeOverDiagramFraming(canvas); start.center = { x: diagramCenter.x, y: diagramCenter.y }; taken = true; }
    const scale = resolveDiagramScale(canvas);
    diagramCenter = { x: start.center.x - dx / scale, y: start.center.y - dy / scale };
    applyDiagramPan(canvas);
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    canvas.classList.remove('panning');
    if (moved) {
      diagramPanned = true;
      setTimeout(() => { diagramPanned = false; }, 0);
    }
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}

/** The box next to `from` in an arrow key's direction, or null. */
function diagramNeighbor(from, key) {
  const anchor = (el) => (el.querySelector('.dg-box, .dg-header') || el).getBoundingClientRect();
  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const origin = center(anchor(from));
  let best = null;
  for (const el of document.querySelectorAll('#diagram-canvas .dg-node')) {
    if (el === from) continue;
    const group = el.querySelector('.dg-group');
    if (group) { // a box that encloses the one the arrow starts from is not "next to" it
      const g = group.getBoundingClientRect();
      if (origin.x >= g.left && origin.x <= g.right && origin.y >= g.top && origin.y <= g.bottom) continue;
    }
    const c = center(anchor(el));
    const dx = c.x - origin.x;
    const dy = c.y - origin.y;
    const along = key === 'ArrowRight' ? dx : key === 'ArrowLeft' ? -dx : key === 'ArrowDown' ? dy : -dy;
    const across = (key === 'ArrowRight' || key === 'ArrowLeft') ? dy : dx;
    if (along <= 1 || Math.abs(across) > along * 2) continue;
    const score = along + 2 * Math.abs(across);
    if (!best || score < best.score) best = { el, score };
  }
  return best ? best.el : null;
}

/** Keyboard on the diagram: arrows move between boxes, Enter opens, + - 0 F zoom. */
function handleDiagramKeydown(e) {
  if (!(e.target.closest && e.target.closest('.diagram-stage')) || e.ctrlKey || e.metaKey || e.altKey) return;
  const canvas = document.getElementById('diagram-canvas');
  if (e.key === 'Enter' || e.key === ' ') {
    const actionable = e.target.closest('[data-action]');
    if (actionable && e.target.closest('#diagram-canvas') && actionable.tagName.toLowerCase() === 'g') {
      e.preventDefault();
      actionable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    return;
  }
  // on a link the arrow keys, Home and End move among the links (they are one tab stop); on a box they move between boxes
  const onLink = e.target.closest('.dg-link');
  if (onLink && canvas && (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End')) {
    e.preventDefault();
    const next = diagramLinkTarget(Array.from(canvas.querySelectorAll('.dg-link')), onLink, e.key);
    if (next && next !== onLink) next.focus({ preventScroll: true }); // the focus handler pans to it and moves the stop
    return;
  }
  if (e.key.startsWith('Arrow')) {
    const current = diagramNodeOf(e.target);
    const next = current ? diagramNeighbor(current, e.key) : canvas && canvas.querySelector('.dg-focal, .dg-node');
    if (next) {
      e.preventDefault();
      next.focus({ preventScroll: true }); // the focus handler pans to it
    }
    return;
  }
  if (e.key === '+' || e.key === '=') { e.preventDefault(); setDiagramScale(diagramScaleStep(1)); }
  else if (e.key === '-') { e.preventDefault(); setDiagramScale(diagramScaleStep(-1)); }
  else if (e.key === '0') { e.preventDefault(); setDiagramScale(1); }
  else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setDiagramScale('fit'); }
  else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); resetDiagramView(); }
  else if ((e.key === 'm' || e.key === 'M') && !diagramMaximized && (anyDiagramShown() || libraryDiagramShown())) { e.preventDefault(); toggleDiagramMaximized(); }
  else if (e.key === 'Escape' && diagramMaximized && (anyDiagramShown() || libraryDiagramShown())) { e.preventDefault(); toggleDiagramMaximized(); } // the maximized state is that of the diagram on screen (it is parked with the host)
  else if (e.key === 'Escape' && AppState.selection.kind === 'link' && anyDiagramShown()) { e.preventDefault(); dropLinkSelection(); render(); }
  else if (e.key === 'Escape' && libraryDiagramShown() && libraryPickFor(selectedViewId).selection) { e.preventDefault(); closeLibrarySelection(); }
}

/** The styles of the diagram with real colors, for an SVG that must look right outside this page. */
function diagramExportCss() {
  const style = getComputedStyle(document.documentElement);
  const c = (name) => style.getPropertyValue(name).trim();
  return '.dg-box{fill:' + c('--bg') + ';stroke:' + c('--border') + ';stroke-width:1.25}' +
    '.dg-stack{fill:' + c('--panel-bg') + '}' +
    '.dg-group{fill:none;stroke:' + c('--muted') + ';stroke-opacity:.55;stroke-width:1.5}' +
    // what the workspace styled: the --st-* variables stay inline on the boxes, these rules read them (the colours of the theme are the fallbacks)
    '.dg-styled>.dg-box{fill:var(--st-fill,' + c('--bg') + ');stroke:var(--st-stroke,' + c('--border') + ');stroke-width:var(--st-width,1.25px);stroke-dasharray:var(--st-dash,none)}' +
    '.dg-styled>.dg-stack{fill:var(--st-fill,' + c('--panel-bg') + ')}' +
    '.dg-styled>.dg-group{fill:var(--st-fill,none);stroke:var(--st-stroke,' + c('--muted') + ');stroke-opacity:var(--st-stroke-opacity,.55);stroke-width:var(--st-width,1.5px);stroke-dasharray:var(--st-dash,none)}' +
    '.dg-shadow>.dg-box,.dg-shadow>.dg-group{filter:drop-shadow(2px 2px 2px rgba(0,0,0,.4))}' +
    '.dg-focal .dg-box,.dg-focal .dg-group{stroke:' + c('--accent') + ';stroke-width:2.5}' +
    '.dg-ghost .dg-box{stroke:' + c('--danger') + ';stroke-dasharray:5 4}' +
    '.dg-title{fill:' + c('--fg') + ';font:600 14px sans-serif}.dg-sub{fill:' + c('--muted') + ';font:12px sans-serif}.dg-desc{fill:' + c('--muted') + ';font:11px sans-serif}' +
    '.dg-styled .dg-title{fill:var(--st-text,' + c('--fg') + ');font-weight:var(--st-weight,600);font-style:var(--st-fstyle,normal)}' +
    '.dg-styled .dg-sub,.dg-styled .dg-desc{fill:var(--st-text,' + c('--muted') + ');font-weight:var(--st-weight,400);font-style:var(--st-fstyle,normal)}' +
    '.dg-over-fill .dg-title,.dg-over-fill .dg-sub{fill:var(--ov-text)}' +
    '.dg-badge rect{fill:var(--st-fill,' + c('--panel-bg') + ');stroke:var(--st-stroke,' + c('--border') + ');stroke-width:1}.dg-badge text{fill:var(--st-text,' + c('--fg') + ');font:600 10.5px sans-serif}' +
    '.dg-edge{fill:none;stroke:' + c('--muted') + ';stroke-width:1.4}.dg-aggregated{stroke-dasharray:7 4}' +
    '.dg-ghost-edge{stroke:' + c('--danger') + ';stroke-dasharray:3 4}' +
    // the comparison of two plateaus. The colours of the states in the theme of the page (the boxes carry var(--chg-*) in their --st-* variables), the tint, the strike, the lines of the links
    'svg{--chg-new:' + c('--chg-new') + ';--chg-changed:' + c('--chg-changed') + ';--chg-removed:' + c('--chg-removed') + ';--chg-removed-text:' + c('--chg-removed-text') + ';--chg-contains:' + c('--chg-contains') + '}' +
    'svg{--chg-moved:' + c('--chg-moved') + ';--chg-split:' + c('--chg-split') + ';--chg-merged:' + c('--chg-merged') + '}' + // the three states of identity (wave 009), for the boxes that carry them
    '.dg-tint{fill:var(--st-tint,none);fill-opacity:.16;stroke:none}.dg-compound .dg-tint{fill-opacity:.08}' +
    '.dg-struck{text-decoration:line-through}.dg-glyph{font-weight:700}.dg-label .dg-glyph{font-size:14px}' +
    '.dg-edge.dg-chg-new{stroke:' + c('--chg-new') + ';stroke-width:3;stroke-dasharray:none}' +
    '.dg-edge.dg-chg-changed{stroke:' + c('--chg-changed') + ';stroke-width:2;stroke-dasharray:2 3}' +
    '.dg-edge.dg-chg-removed{stroke:' + c('--chg-removed') + ';stroke-width:1.6;stroke-dasharray:7 4}' +
    '.dg-arrowhead.dg-chg-new{fill:' + c('--chg-new') + '}.dg-arrowhead.dg-chg-changed{fill:' + c('--chg-changed') + '}.dg-arrowhead.dg-chg-removed{fill:' + c('--chg-removed') + '}' +
    '.dg-arrowhead{fill:' + c('--muted') + '}' +
    '.dg-node.dg-context{opacity:.55}' +
    '.dg-label{fill:' + c('--fg') + ';font:11px sans-serif;paint-order:stroke;stroke:' + c('--panel-bg') + ';stroke-width:4px;stroke-linejoin:round}' +
    '.dg-header,.dg-hit,.dg-hit-edge{fill:none;stroke:none}.dg-fold{display:none}';
}

/** The diagram on screen as a self-contained SVG document (what the SVG file holds, and what the PNG is drawn from); null when nothing is drawn. */
function diagramExportDocument() {
  const canvas = document.getElementById('diagram-canvas');
  const svg = canvas && canvas.querySelector('svg');
  if (!svg || !diagramScene) return null;
  const clone = svg.cloneNode(true);
  // the page pans the drawing with an inline transform, which would push it out of the image: the file is the drawing itself
  clone.removeAttribute('style');
  clone.setAttribute('width', String(diagramScene.width));
  clone.setAttribute('height', String(diagramScene.height));
  clone.setAttribute('viewBox', '-4 -4 ' + diagramScene.width + ' ' + diagramScene.height);
  clone.classList.remove('dg-dim');
  clone.querySelectorAll('.dg-fold').forEach((el) => el.remove());
  clone.querySelectorAll('.dg-on').forEach((el) => el.classList.remove('dg-on'));
  for (const el of clone.querySelectorAll('[tabindex],[data-action]')) { el.removeAttribute('tabindex'); el.removeAttribute('data-action'); }
  for (const el of clone.querySelectorAll('[aria-pressed]')) el.removeAttribute('aria-pressed');
  for (const el of clone.querySelectorAll('.dg-links')) { el.removeAttribute('role'); el.removeAttribute('aria-label'); } // it describes keys of the page
  for (const el of clone.querySelectorAll('.dg-link-selected')) el.classList.remove('dg-link-selected');
  const ns = 'http://www.w3.org/2000/svg';
  const style = document.createElementNS(ns, 'style');
  style.textContent = diagramExportCss();
  const background = document.createElementNS(ns, 'rect');
  background.setAttribute('x', '-4');
  background.setAttribute('y', '-4');
  background.setAttribute('width', String(diagramScene.width));
  background.setAttribute('height', String(diagramScene.height));
  background.setAttribute('fill', getComputedStyle(document.documentElement).getPropertyValue('--panel-bg').trim() || '#ffffff');
  clone.insertBefore(background, clone.firstChild);
  clone.insertBefore(style, clone.firstChild);
  return {
    xml: '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone),
    width: diagramScene.width,
    height: diagramScene.height,
    name: (canvas.getAttribute('data-ref') || canvas.getAttribute('data-view') || 'diagram').replace(/[^\w.-]+/g, '_') + '-' + (diagramShownView ? diagramShownView.split('|')[1] : 'diagram')
  };
}

function downloadDiagramFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download the diagram as a self-contained SVG. */
function exportDiagramSvg() {
  const exported = diagramExportDocument();
  if (exported) downloadDiagramFile(new Blob([exported.xml], { type: 'image/svg+xml' }), exported.name + '.svg');
}

/** A PNG is drawn at twice the size of the diagram, less when that would pass this many pixels on its longest side (a browser refuses a canvas much bigger). */
const DIAGRAM_PNG_MAX_SIDE = 8000;

/** Download the diagram as a PNG: the SVG of the export, drawn on a canvas. */
async function exportDiagramPng() {
  const exported = diagramExportDocument();
  if (!exported) return;
  try {
    const scale = Math.min(2, DIAGRAM_PNG_MAX_SIDE / Math.max(exported.width, exported.height, 1));
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('the browser could not draw the diagram'));
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(exported.xml);
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(exported.width * scale));
    canvas.height = Math.max(1, Math.round(exported.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('the image is too big for the browser');
    downloadDiagramFile(blob, exported.name + '.png');
  } catch (e) {
    console.error('PNG export failed', e);
    alert('The PNG could not be made: ' + (e && e.message ? e.message : String(e)) + '. The SVG download does not have this limit.');
  }
}

/**
 * The pair of boxes joined by a link becomes the selection (with the element of the diagram it was made on, in Elements).
 * `nth`: which of the links of the pair was clicked, when there are several (`data-nth`); the selection keeps the
 * relationships of that link (`via`, their keys), not the position, which a redraw may change: the panel marks them.
 */
function selectLink(from, to, layer, nth) {
  const canvas = document.getElementById('diagram-canvas');
  const focal = mapIsShown() || !canvas ? null : canvas.getAttribute('data-ref');
  AppState.selection = linkSelectionFor(from, to, layer, nth, focal);
}

/** The selection a click on a link makes (the drawing on screen says which relationships the link stands for); `focal`: the element of an Elements diagram. */
function linkSelectionFor(from, to, layer, nth, focal) {
  const sel = { kind: 'link', key: from + ' -> ' + to, from, to, layer: layer || 'application', mode: 'view' };
  if (focal) sel.focal = focal;
  const pair = inspectionLinkFor(sel);
  if (pair && pair.links.length > 1 && Number.isInteger(nth) && pair.links[nth]) sel.via = relationshipsOfLink(pair.links[nth], pair).map(relationshipKeyOf);
  return sel;
}

/** Moving to another element or viewpoint is a step the browser's Back button should be able to undo. */
function pushDiagramHistory() {
  if (currentPerspective === 'elements' || mapIsShown()) history.pushState(null, '', location.href);
}

// ---- Diagram: the perspective's markup and the computation behind it ----

/**
 * The canvas, its tools and the status line; `mountDiagramIfNeeded` fills the canvas once render() has put it in the page.
 * `host` is only given by the page of a view in the Library ({ view, isMap, hideUnlinked, shows }, see `libraryDiagramRecipe`): its
 * canvas names the view, its tools show what that page draws and offer no folding (a Map view's open boxes are part of the view).
 */
function renderDiagramCanvasHtml(record, overlayHtml, host) {
  // no record: the map of the whole layer (the workspace for the application layer)
  const subject = host ? 'the view ' + escapeHtml(viewLabel(host.view)) : record ? escapeHtml(record.name || record.id) : mapLayer() === 'technology' ? 'the technology layer' : 'the workspace';
  const canvasAttributes = host
    ? ' data-host="library" data-view="' + escapeHtml(host.view.id) + '" tabindex="0" aria-label="Diagram of ' + subject + '. Arrow keys move between boxes, Enter selects one, plus and minus zoom."'
    : (record ? '' : ' data-map="true"') + ' tabindex="0" aria-label="' + (record ? 'Diagram' : 'Map') + ' of ' + subject +
      '. Arrow keys move between boxes, Enter opens one, plus and minus zoom." data-ref="' + (record ? escapeHtml(record.reference) : '') + '"';
  const hideUnlinked = host ? host.hideUnlinked : diagramHideUnlinked;
  return '<div class="diagram-stage">' + (overlayHtml || '') + '<div class="diagram-canvas" id="diagram-canvas"' + canvasAttributes + '><span class="muted">Computing the diagram…</span></div>' +
    '<div class="diagram-tools" role="toolbar" aria-label="Diagram tools">' +
      // folding is for exploring: the three viewpoints of an element are drawn as the CLI draws them
      (record || host ? '' : '<span class="button-group" role="group" aria-label="Fold the boxes">' +
          '<button type="button" data-action="fold-all" title="Fold every box that contains others and close the ones that were opened">Fold all</button>' +
          '<button type="button" data-action="unfold-all" title="Unfold every folded box and open the boxes that hide children (one more level each time)">Unfold all</button></span>') +
      '<button type="button" data-action="toggle-hide-unlinked" aria-pressed="' + hideUnlinked + '" title="Leave out the boxes that no link reaches, such as the children a facet left without any relationship">Hide unlinked</button>' +
      // wave 015 (run 0097, W-9, #98): what the diagram draws of a comparison is the diagram's choice, not the band's; only while a plateau is compared
      (layerCompareOther() ? '<span class="button-group changes-switch" role="group" aria-label="What the diagram draws of the comparison">' +
        '<button type="button" data-action="set-changes-only" data-value="0" aria-pressed="' + !AppState.changesOnly + '" title="Draw the whole plateau, with what changed marked">Everything</button>' +
        '<button type="button" data-action="set-changes-only" data-value="1" aria-pressed="' + AppState.changesOnly + '" title="Draw only what is new, changed or removed, with the boxes around it and the ends of the changed links (drawn faded) to place it">Changes only</button></span>' : '') +
      renderMapPartsToolHtml(record, host) +
      '<span class="diagram-tools-sep" aria-hidden="true"></span>' +
      renderDiagramShowGroupHtml(host ? host.isMap : !record, host ? host.shows : undefined) +
      '<span class="diagram-tools-sep" aria-hidden="true"></span>' +
      '<span class="button-group" role="group" aria-label="Zoom">' +
        '<button type="button" data-action="diagram-zoom" data-dir="out" aria-label="Zoom out" title="Zoom out (−)">−</button>' +
        '<button type="button" id="diagram-zoom-label" data-action="diagram-zoom" data-dir="reset" aria-label="Actual size" title="Actual size (0)">100%</button>' +
        '<button type="button" data-action="diagram-zoom" data-dir="in" aria-label="Zoom in" title="Zoom in (+)">+</button></span>' +
      '<button type="button" id="diagram-center-button" data-action="diagram-recenter" data-lit="' + (diagramScale === 'auto') + '" title="Back to how the diagram opens: this element in the middle, at a readable size (C). Lit while the diagram is framed that way.">Center</button>' +
      '<button type="button" id="diagram-fit-button" data-action="diagram-zoom" data-dir="fit" aria-pressed="' + (diagramScale === 'fit') + '" title="Fit the whole diagram in the panel (F)">Fit</button>' +
    '</div></div>' +
    // under the drawing: what it is (its status), the hint, and the key to the lines
    '<div class="diagram-status"><span id="diagram-status" role="status"></span><span id="diagram-hint"></span><span id="diagram-legend" class="dg-legend"></span></div>';
}

/**
 * Download the diagram: two buttons set side by side, one click each, rather than a menu to open for two choices. Off
 * until a drawing is on screen (`showDiagramScene` turns them on).
 */
function renderDiagramDownloadHtml() {
  const icon = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><path d="M8 2v8M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const tool = (format, title) => '<button type="button" class="download-button" data-action="diagram-export" data-format="' + format + '" disabled aria-label="Download as ' + format.toUpperCase() + '" title="' + escapeHtml(title) + '">' +
    icon + '<span>' + format.toUpperCase() + '</span></button>';
  return '<span class="button-group" role="group" aria-label="Download the diagram">' +
    tool('png', 'Download the diagram as a PNG image, twice the size it has on screen') +
    tool('svg', 'Download the diagram as a self-contained SVG file') +
  '</span>';
}

/**
 * The two toggles of the Map of the technology layer (issue #107): the applications deployed on the nodes and the relationships, each drawn or left out. Only there: the Map of the
 * application layer and the diagrams of an element have neither. On the page of a saved view they edit the view, as the texts do.
 */
function renderMapPartsToolHtml(record, host) {
  const parts = host ? (host.isMap && host.layer === 'technology' ? host.parts : null) : (!record && mapLayer() === 'technology' ? mapPartsShown() : null);
  if (!parts) return '';
  const tool = (name, label, title) => '<button type="button" data-action="toggle-map-part" data-part="' + name + '" aria-pressed="' + parts[name] + '" title="' + escapeHtml(title) + '">' + label + '</button>';
  return '<span class="button-group" role="group" aria-label="What the map draws">' +
    tool('applications', 'Applications', 'Draw the applications deployed on the nodes, as boxes inside the nodes that are open') +
    tool('relationships', 'Relationships', 'Draw the links: the relationships that environments and nodes declare, and the dependencies between environments that the deployed applications give') +
  '</span>';
}

/** The texts the diagram draws, each one a button that is lit while it is shown. */
function renderDiagramShowGroupHtml(isMap, drawn) {
  const shows = drawn || diagramShows(isMap); // `drawn`: what the page of a view in the Library draws
  const tool = (name, label, title) => '<button type="button" data-action="toggle-show" data-show="' + name + '" aria-pressed="' + shows[name] + '" title="' + escapeHtml(title) + '">' + label + '</button>';
  return '<span class="button-group" role="group" aria-label="Show">' +
    tool('labels', 'Labels', 'The caption of each link: its label, and its qualifiers in brackets') +
    tool('qualifiers', 'Qualifiers', 'The qualifiers of each element, after its kind') +
    tool('descriptions', 'Descriptions', 'The description of each element that does not contain others, up to ' + DIAGRAM_DESCRIPTION_LINES + ' lines (all of it with Wrap)') +
    tool('wrap', 'Wrap', 'Break long names, qualifiers and descriptions over several lines instead of cutting them with an ellipsis (a box that contains others still cuts its kind), and show the whole of a long link label (otherwise cut after four lines)') +
  '</span>';
}

/**
 * What the toolbar's "Fold all" / "Unfold all" act on: the boxes that contain others (except the focal one and the
 * ones around it, which the kernel never folds) and the boxes that hide children of the model.
 */
function diagramFoldTargets(result, focalReference) {
  const parents = new Set(result.items.map((item) => item.parent).filter(Boolean));
  const foldable = result.items
    .filter((item) => parents.has(item.id) && item.id !== focalReference && !focalReference.startsWith(item.id + '.'))
    .map((item) => item.id);
  const expandable = result.items.filter((item) => item.expandable).map((item) => item.id);
  return { foldable, expandable };
}

/**
 * Issue #37. The two caches that follow (`diagramCache`, `treeQuietCache`) are keyed on the version of the models (`modelVersion`, bumped by `modelsChanged()`)
 * and on the small parts that vary, never on the kernel input: that input carries every element of the model (the union of the two plateaus with a comparison
 * on), and serialising it, or walking the index to fingerprint it, cost a render in proportion to the model for an answer that had not changed.
 * What a key holds is whatever else a drawing or a quiet set is made from: the facet as the kernel reads it, `changesOnly`, `hideWording`, the plateau
 * compared with, the text of an empty relationship, the styles. The entry also keeps the two indexes it was made from, and is used only while they are the
 * ones now (a net under a replacement of a model that forgot `modelsChanged()`, as `comparisonCache` has).
 */
function modelsNow() {
  return { index: AppState.index, baselineIndex: AppState.baseline ? AppState.baseline.index : null };
}

function modelsAreThoseOf(entry) {
  return entry.index === AppState.index && entry.baselineIndex === (AppState.baseline ? AppState.baseline.index : null);
}

/** The part of a cache key that tells which models a kernel input is made from and with what knobs; `comparison` is `comparisonState()`. */
function modelsKey(comparison, facet) {
  return [
    modelVersion,
    facet ? JSON.stringify(toKernelFacet(facet)) : '',
    comparison && comparison.layers ? 'vs:' + AppState.baseline.plateau.id + (comparison.future ? ':future' : '') + ':' + AppState.changesOnly + ':' + AppState.hideWording : '',
    AppState.workspace.settings.relationships.defaultSyntheticLabel
  ].join('~');
}

/** The key of the drawing `recipe` asks for (see `mountDiagramIfNeeded`): the models and the knobs of the kernel input, then what is drawn from its answer. */
function diagramCacheKey(recipe, comparison, viewKey) {
  const { isMap, reference, viewpoint, facet, mapState, shows, hideUnlinked } = recipe;
  const layer = isMap ? (recipe.layer === 'technology' ? 'technology' : 'application') : (recipe.layer || layerOfReference(reference) || 'technology'); // as `buildKernelInput` settles it
  return [
    modelsKey(comparison, facet), viewpoint, layer, reference,
    isMap ? JSON.stringify([mapState.opened, mapState.pinned, mapState.hidden]) : '',
    // issue #107: what a Map of the technology layer draws besides its elements is part of what is drawn
    isMap && layer === 'technology' ? JSON.stringify([recipePartsOf(recipe).applications, recipePartsOf(recipe).relationships]) : '',
    hideUnlinked, JSON.stringify(shows), JSON.stringify(AppState.workspace.styles || null), viewKey
  ].join('|');
}

let treeQuietCache = null;

/**
 * The references whose diagram has nothing to draw through the facet, in the viewpoint now selected (what a click on
 * the element would show). The kernel answers for a whole layer in one call (`quiet`, issue #81: one `compute` per element cost 420 ms on the 82 elements of
 * the largest plateau of the Brightcart fixture, in proportion to the model): the kernel input of the layer goes in once, with the elements to ask about
 * and the viewpoint each one is drawn in, so at most two calls however many elements there are. Cached until the model, the facet or the viewpoint changes.
 */
function quietReferencesThroughFacet(kernel, facet) {
  // issue #37: found in the cache from the version of the models and the knobs, before any kernel input is built
  const viewpointKey = mapIsShown() || elementTab === 'details' ? 'overview' : elementTab;
  const key = viewpointKey + '|' + modelsKey(comparisonState(), facet);
  if (treeQuietCache && treeQuietCache.key === key && modelsAreThoseOf(treeQuietCache)) return treeQuietCache.quiet;
  const models = modelsNow();
  const quiet = new Set();
  for (const layer of ['application', 'technology']) {
    const first = AppState.index[layer].keys().next().value;
    if (first === undefined) continue;
    const focals = [];
    for (const [reference, record] of AppState.index[layer]) {
      const viewpoint = mapIsShown() || elementTab === 'details' || (elementTab === 'detailed' && LEAF_KINDS.includes(record.kind)) ? 'overview' : elementTab;
      focals.push({ reference, viewpoint });
    }
    const input = buildKernelInput('overview', first, { layer, facet }).input;
    delete input.focal;
    input.focals = focals;
    const out = kernel.quiet(input);
    // an error through a facet: the facet removes the elements (or fails for all of them, as `compute` does for each)
    if (out.error) { if (facet) focals.forEach((focal) => quiet.add(focal.reference)); }
    else out.quiet.forEach((reference) => quiet.add(reference));
  }
  treeQuietCache = Object.assign({ key, quiet }, models);
  return quiet;
}

/**
 * In the Diagram perspective, with a facet picked, dims the elements of the tree that the facet leaves with nothing to
 * draw — so the elements worth clicking stand out. Applied on the DOM after the render, like the diagram itself.
 */
async function markTreeThroughFacet() {
  const rows = Array.from(document.querySelectorAll('.tree-node-row[data-ref]'));
  // the map has no element of its own to be quiet: its tree says what is on the map (.off-map), not what the facet empties
  const facet = anyDiagramShown() && !mapIsShown() ? currentDiagramFacet() : null;
  if (!facet) { rows.forEach((row) => { row.classList.remove('quiet'); row.removeAttribute('title'); }); return; }
  try {
    const kernel = await loadViewpointKernel();
    if (currentDiagramFacet() !== facet || mapIsShown()) return; // a newer render took over
    const quiet = quietReferencesThroughFacet(kernel, facet);
    document.querySelectorAll('.tree-node-row[data-ref]').forEach((row) => {
      const isQuiet = quiet.has(row.getAttribute('data-ref'));
      row.classList.toggle('quiet', isQuiet);
      if (isQuiet) row.title = 'Facet “' + facet.name + '” leaves nothing to draw for this element.';
      else row.removeAttribute('title');
    });
  } catch (e) {
    console.error('Marking the tree through the facet failed', e);
  }
}

/**
 * What a diagram draws, and nothing else the pipeline needs to decide: the one argument of `mountDiagramIfNeeded`. A host builds
 * it from the state it owns and the pipeline never reads that state itself, so a host cannot disturb another one:
 *   host      'main' (the Map and the diagrams of Elements, which read the page's state) or 'library' (the page of a view);
 *   view      the saved view, for 'library';
 *   isMap, reference, record   the map of the workspace, or the element drawn (`record` is its model);
 *   layer     the layer of the element (undefined: `layerOfReference` picks it, as the Map and Elements always did);
 *   viewpoint 'map', or the viewpoint actually drawn; facet: the facet of the settings, or null;
 *   mapState  { opened, pinned, hidden } of a map, else null;
 *   hideUnlinked, shows   whether the boxes no link reaches are left out; the texts drawn (the four, as booleans).
 */
function mainDiagramRecipe(canvas) {
  const isMap = canvas.hasAttribute('data-map');
  const reference = isMap ? '' : canvas.getAttribute('data-ref');
  const record = isMap ? null : findElementRecord(reference);
  if (!isMap && !record) return null;
  return {
    host: 'main', view: null, isMap, reference, record, layer: isMap ? mapLayer() : undefined,
    // the diagram of the Elements perspective is always the overview of the element, whatever the Diagram perspective shows
    viewpoint: isMap ? 'map' : effectiveDiagramViewpoint(record),
    facet: currentDiagramFacet(),
    mapState: isMap ? currentMapState() : null,
    parts: isMap ? mapPartsShown() : null,
    hideUnlinked: diagramHideUnlinked,
    shows: diagramShows(isMap)
  };
}

/**
 * What is selected on the page of a view in the Library: a box (an element) or a link of its diagram, read in the panel on the right. It
 * is the page's own, with the shapes of the Map's selection so that the same panels render it, and it is never `AppState.selection`:
 * a click on this page selects here and leaves the Map, Elements, their tree and the address as they are. One view at a time (another
 * view starts with nothing selected); kept while the reader is on the Map and comes back to the same view.
 */
let libraryPick = { view: null, selection: null };

function libraryPickFor(viewId) {
  if (libraryPick.view !== viewId) libraryPick = { view: viewId, selection: null };
  return libraryPick;
}

const NO_SELECTION = Object.freeze({ kind: 'none', key: null, mode: 'view' });

/** The selection of the diagram on screen: the page's own on the page of a view in the Library, else the one of the Map and Elements. */
function diagramSelection() {
  if (currentPerspective !== 'library') return AppState.selection;
  return (libraryTab === 'views' && libraryPickFor(selectedViewId).selection) || NO_SELECTION;
}

/** The parts a recipe says the Map draws: both when it says nothing. */
function recipePartsOf(recipe) {
  return recipe.parts || { applications: true, relationships: true };
}

/** What a saved Map view draws besides its elements: both parts unless its properties say `false` (the Map of the application layer has neither, so both are drawn there). */
function mapPartsOf(view) {
  const properties = isPlainObject(view.properties) ? view.properties : {};
  const parts = {};
  for (const part of MAP_PARTS) parts[part] = viewLayerOf(view) !== 'technology' || properties[part] !== false;
  return parts;
}

/** The recipe of a saved view, or null when it cannot be drawn (`viewProblem`). Reads the view and the model, and nothing else: an edit of the view is an edit of the entry. */
function libraryDiagramRecipe(view) {
  if (!view || viewProblem(view)) return null;
  return viewDiagramRecipe(view, AppState.index, 'library');
}

/**
 * The recipe of a view (or of a step that carries its own recipe) that can be drawn in the model `index`: the pins, the open and hidden boxes it names that the model has, the
 * facet, the texts and the parts of a map, as the view says them. `host` is the place that draws it (`library`, `story`). Reads the view, the settings and `index`, nothing else.
 */
function viewDiagramRecipe(view, index, host) {
  const properties = isPlainObject(view.properties) ? view.properties : {};
  const isMap = view.viewpoint === 'map';
  const layer = viewLayerOf(view);
  const facet = typeof properties.facet === 'string' ? AppState.workspace.settings.facets.customs.find((candidate) => candidate.name === properties.facet) || null : null;
  const shows = shownTextsOf(view);
  const recipe = {
    host, view, isMap, reference: '', record: null, layer, viewpoint: 'map', facet, mapState: null, parts: isMap ? mapPartsOf(view) : null,
    hideUnlinked: properties['hide-unlinked'] === true,
    shows
  };
  if (isMap) {
    const known = (list) => stringList(list).filter((reference) => index[layer].has(reference));
    recipe.mapState = { opened: known(properties.opened), pinned: known(properties.pinned), hidden: known(properties.hidden) };
  } else {
    recipe.reference = properties.element;
    recipe.record = index[layer].get(properties.element);
    recipe.viewpoint = leafSafeViewpoint(view.viewpoint, recipe.record);
  }
  return recipe;
}

/** The recipe of the diagram in `canvas`, from the host that wrote it; null when there is nothing to draw (the element is gone). */
function diagramRecipeOf(canvas) {
  if (canvas.getAttribute('data-host') === 'library') return libraryDiagramRecipe(findSavedView(canvas.getAttribute('data-view')));
  return mainDiagramRecipe(canvas);
}

/**
 * Called at the end of every render(): when the Diagram canvas is on screen, compute its viewpoint and draw it.
 * The computation is asynchronous (WebAssembly instantiation, ELK), so `diagramSeq` drops the answer of any request
 * that a newer render superseded, and an identical request is served from `diagramCache` without a flash.
 * What to draw comes from the recipe of the host that wrote the canvas (`diagramRecipeOf`), never from the page's state.
 */
function mountDiagramIfNeeded() {
  // every call supersedes the layouts still being computed, also when there is nothing to draw now: a layout started on
  // the map must not end (and be cached) after the user has left it
  const seq = ++diagramSeq;
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas) { diagramScene = null; pendingDiagramFocus = null; return; }
  const recipe = diagramRecipeOf(canvas);
  if (!recipe) return;
  const { isMap, reference, viewpoint, facet, mapState } = recipe;
  const readonly = recipe.host === 'library'; // the page of a view only shows the drawing
  // run 0039: a comparison needs the kernel before the input can be built (the union is its answer): load it, then draw again
  if ((comparisonState() || {}).pending) {
    loadViewpointKernel().then(
      () => { if (seq === diagramSeq) mountDiagramIfNeeded(); },
      (e) => { if (seq === diagramSeq) showDiagramScene(buildDiagramScene('kernel-error', '<div class="error-panel">The diagram could not be computed: ' + escapeHtml(e && e.message ? e.message : String(e)) + '</div>', '', '', { width: 0, height: 0 }, null)); }
    );
    return;
  }
  // issue #37: the key is the version of the models and the small parts that vary, so a render that finds its drawing in `diagramCache` builds no kernel input
  // and serialises no model. The input is built below, only when the drawing is to be computed.
  const viewKey = [isMap ? 'map' : reference, viewpoint, facet ? facet.name : '', isMap ? mapState.pinned.join(',') : ''].concat(isMap && recipe.layer === 'technology' ? ['technology'] : [], readonly ? ['view:' + recipe.view.id] : []).join('|');
  const comparison = comparisonState();
  const key = diagramCacheKey(recipe, comparison, viewKey);
  const nothing = nothingDrawnScene(viewKey, comparison);
  if (nothing) {
    showDiagramScene(nothing);
    return;
  }
  if (diagramCache && diagramCache.key === key && modelsAreThoseOf(diagramCache)) {
    showDiagramScene(Object.assign({}, diagramCache.scene));
    return;
  }
  const { input } = buildKernelInput(viewpoint, reference, isMap ? { facet, layer: recipe.layer, opened: mapState.opened, pinned: mapState.pinned, applications: recipePartsOf(recipe).applications, relationships: recipePartsOf(recipe).relationships } : { facet, layer: recipe.layer });
  if (isMap) input.hidden = mapState.hidden;
  const models = modelsNow(); // taken before the drawing is computed: an edit that lands while it is being laid out makes the entry stale, not fresh
  (async () => {
    try {
      const [kernel, elk] = await Promise.all([loadViewpointKernel(), loadElk()]);
      const { scene, cacheable } = await computeDiagramScene(recipe, input, comparison, null, kernel, elk, viewKey, readonly);
      if (seq !== diagramSeq) return;
      if (!cacheable) { showDiagramScene(scene); return; } // a message (an error, a facet that removes the element) is shown, not kept
      diagramCache = Object.assign({ key, scene }, models);
      showDiagramScene(Object.assign({}, scene));
    } catch (e) {
      console.error('Diagram failed', e);
      if (seq === diagramSeq) {
        showDiagramScene(buildDiagramScene(viewKey, '<div class="error-panel">The diagram could not be computed: ' + escapeHtml(e && e.message ? e.message : String(e)) + '</div>', '', '', { width: 0, height: 0 }, null));
      }
    }
  })();
}

/**
 * The scene of a recipe: what `showDiagramScene` puts on screen, computed from a kernel input and nothing else (wave 021, run 0152, #153: the editor's `mountDiagramIfNeeded` and the
 * story player draw through this one function). `input` is the kernel's input (`buildKernelInput`, with the lists of a map), `comparison` the comparison it was made with (or null),
 * `source` what the drawing reads of the model beside the input: null for the editor's own (`AppState.index` and the comparison on screen), else the `{ index, baselineIndex, comparison,
 * changesOnly }` of a step (`storyStepScene`). It reads no selection, writes no global and no `AppState`, and touches no cache or page. Returns `{ scene, cacheable }`: `cacheable` is
 * false for a message (an error, a facet that removes the element), which the editor shows and does not keep.
 */
async function computeDiagramScene(recipe, input, comparison, source, kernel, elk, viewKey, readonly) {
  const { isMap, reference, record, viewpoint, facet, shows, hideUnlinked } = recipe;
  const result = isMap && facet ? computeMapThroughFacet(kernel, input) : kernel.compute(input);
  if (result.error) {
    const removed = !isMap && facet && facetRemovesElement(kernel, viewpoint, reference, recipe.layer, result.error, source);
    return {
      scene: buildDiagramScene(viewKey, removed
        ? '<div class="muted diagram-empty">Nothing to show: facet “' + escapeHtml(facet.name) + '” removes this element.' + (readonly ? '' : ' <button type="button" data-action="clear-facet">Show it without the facet</button>') + '</div>'
        : '<div class="error-panel">' + escapeHtml(result.error) + '</div>', '', '', { width: 0, height: 0 }, null),
      cacheable: false
    };
  }
  if (comparison && comparison.layers) tellRemovedItems(result, comparison, input.layer, source);
  const ghosts = buildDiagramGhosts(result, isMap ? null : reference, input.layer, source);
  let drawn = { items: result.items.concat(ghosts.items), links: result.links.concat(ghosts.links) };
  let shownResult = result;
  let hiddenCount = 0;
  if (hideUnlinked) {
    const kept = hideUnlinkedItems(drawn.items, drawn.links, isMap ? input.pinned : reference);
    hiddenCount = kept.hidden;
    drawn = { items: kept.items, links: kept.links };
    const ids = new Set(kept.items.map((item) => item.id));
    shownResult = Object.assign({}, result, { items: result.items.filter((item) => ids.has(item.id)), links: result.links.filter((link) => ids.has(link.from) && ids.has(link.to)) });
  }
  let status = diagramStatusText(viewpoint, reference, facet, shownResult, ghosts, input.layer);
  if (hiddenCount) status += ' ' + hiddenCount + ' unlinked ' + (hiddenCount === 1 ? 'box' : 'boxes') + ' hidden.';
  // the styled stereotypes of the boxes on screen, each once, in the order they are met
  const drawnStereotypes = [];
  for (const item of drawn.items) for (const name of (item.ghost || !Array.isArray(item.stereotypes) ? [] : item.stereotypes)) if (!drawnStereotypes.includes(name)) drawnStereotypes.push(name);
  const legend = diagramLegendHtml(ghosts.items.length > 0, drawnStereotypes) + (comparison && comparison.layers ? diagramComparisonLegendHtml(comparison, comparisonCountsOf(shownResult, isMap ? null : reference)) : '');
  let scene;
  if (!elk) {
    scene = buildDiagramScene(viewKey, renderDiagramFallbackHtml(drawn, input.layer, readonly, source), status, '', { width: 0, height: 0 }, null);
    scene.drawnIds = new Set(drawn.items.filter((item) => !item.ghost).map((item) => item.id));
  } else if (isMap && !drawn.items.length) {
    scene = buildDiagramScene(viewKey, '<div class="muted diagram-empty">Nothing to show: the map has no ' + (input.layer === 'technology' ? 'technology' : 'application') + ' element' +
      (input.hidden.length ? ' left once the hidden ones are out' + (readonly ? '.' : ': show some again with their eye, or with the chips above the map.') : ' yet.') + '</div>', status, '', { width: 0, height: 0 }, null);
    scene.drawnIds = new Set();
  } else if (!isMap && diagramHasNothingToDraw(drawn)) {
    const hint = viewpoint === 'overview' && !LEAF_KINDS.includes(record.kind) ? (readonly ? ' (the deep viewpoint includes what is inside it)' : ' (try Deep to include what is inside it)') : '';
    scene = buildDiagramScene(viewKey, diagramEmptyHtml(kernel, viewpoint, reference, facet, hint, { readonly, layer: recipe.layer, source }), status, '', { width: 0, height: 0 }, null);
  } else {
    // the Map starts without captions on its links (they take most of its room): the tooltip says what a link stands for
    const drawing = renderDiagramSvg(await elk.layout(buildElkGraph(drawn, { captions: shows.labels, qualifiers: shows.qualifiers, descriptions: shows.descriptions, wrap: shows.wrap, itemLayer: recipe.layer, source })), drawn, reference, { map: isMap, layer: input.layer, opened: isMap ? input.opened : [], pinned: isMap ? input.pinned : [], show: shows, readonly, itemLayer: recipe.layer, source });
    scene = buildDiagramScene(viewKey, drawing.html, status, legend, drawing, drawing.focal);
    scene.boxes = drawing.boxes;
    scene.links = drawing.links;
    scene.drawnIds = new Set(Object.keys(drawing.boxes));
  }
  // the applications deployed on the nodes that the Map of the technology layer draws are elements of the other layer: a box has their reference, not their id (issue #107)
  if (isMap) scene.drawnApps = new Set(drawn.items.filter((item) => !item.ghost && item.id !== item.reference).map((item) => item.reference));
  if (isMap && !readonly) Object.assign(scene, diagramFoldTargets(shownResult, reference));
  return { scene, cacheable: true };
}

/**
 * The scene that says nothing is drawn, or null: a reference declared more than once (a model that has no single answer is not drawn from), or two plateaus that cannot be compared
 * (a reference twice in the baseline, a pair the kernel refuses). `comparison` is the comparison the drawing is made with. Both are mistakes of the workspace, not of the view.
 */
function nothingDrawnScene(viewKey, comparison) {
  const duplicates = elementDuplicates();
  if (duplicates.length) {
    return buildDiagramScene(viewKey, '<div class="error-panel" role="alert"><strong>Nothing is drawn: ' +
      (duplicates.length === 1 ? 'a reference is' : duplicates.length + ' references are') + ' declared more than once.</strong><ul>' +
      duplicates.map((d) => '<li>' + duplicateMessageHtml(d.message) + '</li>').join('') + '</ul></div>', '', '', { width: 0, height: 0 }, null);
  }
  if (comparison && comparison.problems) {
    return buildDiagramScene(viewKey, '<div class="error-panel" role="alert"><strong>Nothing is drawn: ' + escapeHtml(comparison.problems[0]) + '</strong>' +
      (comparison.problems.length > 1 ? '<ul>' + comparison.problems.slice(1).map((m) => '<li>' + duplicateMessageHtml(m) + '</li>').join('') + '</ul>' : '') + '</div>', '', '', { width: 0, height: 0 }, null);
  }
  return null;
}

/** The center of Elements on a diagram tab: the header (tabs, facet, Maximize) and the diagram of the selected element. */
function renderElementDiagramHtml(record) {
  return '<div class="diagram-view">' + renderStoryBarHtml() +
    renderElementHeaderHtml(renderElementTitleHtml(record),
      renderDiagramHeaderActionsHtml(renderShowOnMapButtonHtml(record))) +
    renderDiagramCanvasHtml(record) + '</div>';
}

/** Elements → Map: the same element, in the whole layer it lives in (the page Applications, or the page Environments for an element of the technology layer). */
function renderShowOnMapButtonHtml(record) {
  const layer = record.layer === 'technology' ? 'technology' : 'application';
  if (!AppState.index[layer].has(record.reference)) return '';
  return '<button type="button" class="with-icon" data-action="show-on-map" data-ref="' + escapeHtml(record.reference) + '" data-layer="' + layer + '" aria-label="Show on map" title="Draw the map of the ' + (layer === 'technology' ? 'technology layer' : 'workspace') + ' keeping only what touches this element">' +
    controlIconHtml(CONTROL_ICON_PATHS.map) + '<span class="control-label">Show on map</span></button>';
}

/** The title of a page that draws a Map, by the layer it draws. */
const MAP_PAGE_TITLES = { application: 'Applications', technology: 'Environments' };

/**
 * Map perspective — the whole layer from its roots down, whatever is selected: the element tree on the left says
 * what the map is about (pin) and what it leaves out (hide); picking an element finds it on the map, and clicking a
 * box selects it. The selected element is read in the panel on the right (nothing is rendered while nothing is selected,
 * or when maximized); its relationships are on its Details, one click away. Two pages are a Map: Applications (the application layer)
 * and Environments (the technology layer, wave 015, run 0099); `mapLayer()` tells which one is on screen.
 */
function renderMapPerspectiveHtml() {
  const sel = AppState.selection;
  const record = sel.kind === 'element' ? findElementRecord(sel.key, sel.layer) : null;
  return {
    left: diagramMaximized ? null : renderLeftPanelWrapperHtml(renderMapScopeHtml()),
    center: '<div class="diagram-view">' + renderStoryBarHtml() +
      renderElementHeaderHtml('<h2>' + MAP_PAGE_TITLES[mapLayer()] + '</h2>' + (record ? '<span class="element-header-subject" title="Selected on the map">' + escapeHtml(record.name || record.id) + '</span>' : ''),
        renderDiagramHeaderActionsHtml(renderOpenAsDiagramButtonHtml(record))) +
      renderDiagramCanvasHtml(null, renderMapChipsHtml()) + '</div>',
    right: renderInspectionHtml(true),
    bottom: null
  };
}

/** Map → Diagram: the selected element, on its own. */
function renderOpenAsDiagramButtonHtml(record) {
  if (!record) return '';
  return '<button type="button" class="with-icon" data-action="open-as-diagram" data-ref="' + escapeHtml(record.reference) + '" data-layer="' + escapeHtml(record.layer || 'application') + '" aria-label="Open in Elements" title="Open this element in Elements, on its diagram: its relationships, on their own">' +
    controlIconHtml(CONTROL_ICON_PATHS.elements) + '<span class="control-label">Open in Elements</span></button>';
}

/** The elements of the layer the Map draws, each with what the map does with it: Pin keeps only what touches it, Hide leaves it out. */
function renderMapScopeHtml() {
  const layer = mapLayer();
  const roots = (AppState.workspace && AppState.workspace[layer] && AppState.workspace[layer].elements) || [];
  const visible = [];
  const collect = (record) => { visible.push(nodeKey(record.reference, layer)); if (AppState.expanded.has(nodeKey(record.reference, layer))) sortedForNav(record.children).forEach(collect); };
  sortedForNav(roots).forEach(collect);
  // one tab stop for the whole tree: the row the user was on, or the first one
  resolveNavActive(visible);
  navTabStopGiven = false;
  let html = '<div class="nav-section map-scope">' + renderNavHeaderHtml(MAP_PAGE_TITLES[layer], renderNavToolsHtml(layer)) +
             '<div class="map-scope-hint" id="map-scope-hint">Pin (P) keeps only what touches an element. The eye (H) leaves it out. Greyed rows are not on the map.</div>';
  treeComparison = comparisonForTrees();
  try {
    html += roots.length
      ? '<div role="tree" aria-label="' + (layer === 'technology' ? 'Technology' : 'Application') + ' elements of the map" aria-describedby="map-scope-hint">' + sortedForNav(roots).map((r) => renderMapScopeNodeHtml(r, 1)).join('') + '</div>'
      : '<div class="tree-empty">No elements.</div>';
  } finally {
    treeComparison = null;
  }
  return html + '</div>';
}

/** Is the element on the map as it is drawn now: as a box, or inside a box that is folded? Null while no drawing says (computing, fallback). */
function mapElementIsOnMap(reference, layer) {
  const boxes = diagramScene && diagramScene.boxes;
  if (!boxes || !String(diagramScene.viewKey).startsWith('map|')) return null; // a drawing of the map only
  if (layer === 'application' && mapLayer() === 'technology') return diagramScene.drawnApps ? diagramScene.drawnApps.has(reference) : null; // a deployed application: not known while the drawing is a fallback
  const folded = diagramScene.expandable || [];
  if (Object.prototype.hasOwnProperty.call(boxes, reference)) return true;
  for (let ref = String(reference); ref.includes('.');) {
    ref = ref.slice(0, ref.lastIndexOf('.'));
    if (Object.prototype.hasOwnProperty.call(boxes, ref)) return folded.includes(ref); // an open box draws what it shows: the rest is out
  }
  return false;
}

/** What a screen reader hears for a row of the tree of the map: the name, then the state the colours and the icons show. */
function mapScopeRowLabel(name, pinned, hidden, offMap, stereotypes, change) {
  return name + (stereotypes ? ', ' + stereotypes : '') + (pinned ? ', pinned' : '') + (hidden ? ', hidden' : '') + (offMap && !hidden ? ', not on the map' : '') + (change ? ', ' + CHANGE_WORDS[change].word : '');
}

/** Grey the rows of the elements the map does not draw (a pin, a hidden element or "Hide unlinked" left them out); applied after each drawing. */
function markMapScope() {
  document.querySelectorAll('.map-scope-row').forEach((row) => {
    const onMap = mapElementIsOnMap(nodeKeyReference(row.getAttribute('data-node')));
    const offMap = onMap === false;
    const pinned = row.classList.contains('pinned');
    const hidden = row.classList.contains('left-out');
    row.classList.toggle('off-map', offMap && !hidden);
    if (offMap && !hidden) row.title = 'Not on the map right now'; else row.removeAttribute('title');
    row.setAttribute('aria-label', mapScopeRowLabel(row.getAttribute('data-name'), pinned, hidden, offMap, row.getAttribute('data-stereotypes'), row.getAttribute('data-change')));
  });
}

/** A short form of the kind for the tree of the map, where every pixel of the row is wanted by the name. */
const MAP_KIND_ABBREVIATIONS = { person: 'PRS', system: 'SYS', solution: 'SOL', container: 'CTN', component: 'CMP', environment: 'ENV', node: 'NOD' };

/** The short form of a kind for the rows of both trees (the full kind is in the tooltip). */
function kindAbbreviation(kind) {
  const k = String(kind);
  return MAP_KIND_ABBREVIATIONS[k] || k.slice(0, 3).toUpperCase();
}

/** Pin and Hide on the rows of the tree of the map: two small icons, 14px, each drawing the state the element is in (outline: not, filled / crossed: yes). */
const MAP_PIN_PATH = 'M9.5 1.5l5 5-1.6.6-2.3 2.3.2 3-1.3 1.3-2.5-2.5L3 14.2 1.8 13l3.7-3.9L3 6.6 4.3 5.3l3 .2L9.6 3.2z';
const MAP_ICON_OPEN = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">';
const MAP_PIN_ICON = MAP_ICON_OPEN + '<path d="' + MAP_PIN_PATH + '" fill="currentColor"/></svg>'; // pinned
const MAP_UNPINNED_ICON = MAP_ICON_OPEN + '<path d="' + MAP_PIN_PATH + '" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const MAP_EYE = '<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="1.9" fill="currentColor"/>';
const MAP_VISIBLE_ICON = MAP_ICON_OPEN + MAP_EYE + '</svg>';
const MAP_HIDE_ICON = MAP_ICON_OPEN + MAP_EYE + '<path d="M2.5 13.5l11-11" stroke="currentColor" stroke-width="1.6"/></svg>'; // hidden

function renderMapScopeNodeHtml(record, level) {
  const reference = record.reference;
  const hasChildren = Array.isArray(record.children) && record.children.length > 0;
  const layer = mapLayer(); // a map draws one layer
  const map = mapStateOf(layer);
  const key = nodeKey(reference, layer);
  const isExpanded = AppState.expanded.has(key);
  const pinned = map.pinned.includes(reference);
  const hidden = map.hidden.some((h) => reference === h || reference.startsWith(h + '.'));
  const hiddenItself = map.hidden.includes(reference);
  const encloses = map.pinned.some((p) => p === reference || p.startsWith(reference + '.'));
  const offMap = mapElementIsOnMap(reference) === false && !hidden;
  const label = (record.name !== undefined && record.name !== null && record.name !== '') ? record.name : record.id;
  const ref = escapeHtml(reference);
  const kind = String(record.kind);
  const abbreviation = kindAbbreviation(kind);
  const groupId = treeGroupId('map-scope-group-', record.layer || layer, reference);
  const styled = styledStereotypesOf(stereotypesOfRecord(record));
  const change = treeChangeOf(record); // a comparison: the glyph after the name (run 0040)
  // a row folds or unfolds its branch, nothing more: the tree of the map selects no element
  let html = '<div class="tree-node"><div class="tree-node-row map-scope-row' + (pinned ? ' pinned' : '') + (hidden ? ' left-out' : '') + (offMap ? ' off-map' : '') + (hasChildren ? ' foldable' : '') + '"' +
             ' role="treeitem" style="--level:' + level + '" aria-level="' + level + '"' + (hasChildren ? ' aria-expanded="' + isExpanded + '"' + (isExpanded ? ' aria-owns="' + groupId + '"' : '') : '') +
             ' tabindex="' + navTabIndex(key) + '" data-node="' + escapeHtml(key) + '" data-name="' + escapeHtml(label) + '"' + (styled.length ? ' data-stereotypes="' + escapeHtml(styled.join(', ')) + '"' : '') + (change ? ' data-change="' + change + '"' : '') +
             ' aria-label="' + escapeHtml(mapScopeRowLabel(label, pinned, hidden, offMap, styled.join(', '), change)) + '"' + (offMap ? ' title="Not on the map right now"' : '') +
             (hasChildren ? ' data-action="toggle-element" data-ref="' + ref + '" data-layer="' + layer + '"' : '') + '>';
  html += hasChildren
    ? '<span class="tree-toggle" aria-hidden="true">' + (isExpanded ? '▾' : '▸') + '</span>'
    : '<span class="tree-toggle tree-toggle-empty" aria-hidden="true">▸</span>';
  html += '<span class="tree-node-kind" title="' + escapeHtml(kind) + '">' + escapeHtml(abbreviation) + '</span>' +
          '<span class="tree-node-label" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>' + treeChangeMarkHtml(change) + stereotypeBadgesHtml(styled);
  // what the map does with the element is visible without hovering; the buttons themselves appear on hover, focus and the active row
  if (pinned) html += '<span class="map-scope-mark" title="Pinned" aria-hidden="true">' + MAP_PIN_ICON + '</span>';
  // Pin is always the last button, at the same place under the mouse: Hide comes before it, and is not drawn at all when it cannot be used
  // (a pinned element, or one around a pinned element, is not hidden), so that pinning or unpinning never moves the button to click next.
  // The buttons are for the pointer and the finger: the keyboard has the row itself (arrows, P and H), so they are not tab stops.
  const canHide = !pinned && !encloses;
  html += '<span class="map-scope-actions">' +
    (canHide || hiddenItself
      ? '<button type="button" tabindex="-1" class="map-scope-btn" data-action="map-hide" data-ref="' + ref + '" aria-pressed="' + hiddenItself + '" aria-label="' + (hiddenItself ? 'Show ' : 'Hide ') + escapeHtml(label) +
        '" title="' + (hiddenItself ? 'Bring this element back on the map' : 'Leave this element and what is inside it out of the map') + ' (H)">' + (hiddenItself ? MAP_HIDE_ICON : MAP_VISIBLE_ICON) + '</button>'
      : '') +
    '<button type="button" tabindex="-1" class="map-scope-btn" data-action="map-pin" data-ref="' + ref + '" aria-pressed="' + pinned + '" aria-label="' + (pinned ? 'Unpin ' : 'Pin ') + escapeHtml(label) +
      '" title="' + (pinned ? 'Stop keeping only what touches this element' : hiddenItself ? 'Keep only what touches this element (it comes back on the map)' : 'Keep only what touches this element') + ' (P)">' + (pinned ? MAP_PIN_ICON : MAP_UNPINNED_ICON) + '</button>' +
    '</span></div>';
  if (hasChildren && isExpanded) html += '<div class="tree-node-children" role="group" id="' + groupId + '">' + sortedForNav(record.children).map((child) => renderMapScopeNodeHtml(child, level + 1)).join('') + '</div>';
  return html + '</div>';
}

/** The rows of the tree of the map that can be reached now, top to bottom. */
function navRows() {
  return Array.from(document.querySelectorAll('.tree-node-row[role="treeitem"]'));
}

/** Move the single tab stop of the navigation to a row, and focus it. */
function focusNavRow(row) {
  if (!row) return;
  navRows().forEach((other) => other.setAttribute('tabindex', other === row ? '0' : '-1'));
  navActiveKey = row.getAttribute('data-node');
  row.focus();
}

/**
 * Keyboard on the tree of the map (the pattern of a tree view): up and down move, right unfolds or goes to the first child,
 * left folds or goes to the parent, Enter and Space fold or unfold, Home and End jump, P pins and H hides.
 */
/**
 * Enter and Space on the controls that are not native buttons (a file of the Files list, the title of a branch of the
 * tree): they do what a click on them does, through the delegated click handler.
 */
function handleActivateKeydown(e) {
  if ((e.key !== 'Enter' && e.key !== ' ') || e.ctrlKey || e.metaKey || e.altKey) return;
  const control = e.target.closest && e.target.closest('.nav-row[role="button"], .tree-branch-title[role="button"]');
  if (!control || e.target !== control) return;
  e.preventDefault();
  control.click();
}

/** How to find a non-native control again once render() has rebuilt the page: its selector, and the attribute that tells its twins apart. */
function plainControlFocusOf(el) {
  const control = el && el.closest ? el.closest('.nav-row[role="button"], .tree-branch-title[role="button"]') : null;
  if (!control) return null;
  if (control.hasAttribute('data-story')) return { selector: '.nav-row[role="button"]', attribute: 'data-story', value: control.getAttribute('data-story') };
  if (control.classList.contains('nav-row')) return { selector: '.nav-row[role="button"]', attribute: 'data-relpath', value: control.getAttribute('data-relpath') };
  const header = control.closest('.tree-branch-header');
  return { selector: '.tree-branch-title[role="button"]', attribute: 'data-branch', value: header ? header.getAttribute('data-branch') : null, parent: '.tree-branch-header' };
}

function handleNavKeydown(e) {
  const row = e.target.closest && e.target.closest('.tree-node-row[role="treeitem"]');
  if (!row || e.target !== row || e.ctrlKey || e.metaKey || e.altKey) return;
  const rows = navRows();
  const index = rows.indexOf(row);
  const foldable = row.hasAttribute('aria-expanded');
  const expanded = row.getAttribute('aria-expanded') === 'true';
  const toggle = () => { navActiveKey = row.getAttribute('data-node'); toggleExpandedKey(row.getAttribute('data-node')); render(); };
  switch (e.key) {
    case 'ArrowDown': focusNavRow(rows[index + 1]); break;
    case 'ArrowUp': focusNavRow(rows[index - 1]); break;
    case 'Home': focusNavRow(rows[0]); break;
    case 'End': focusNavRow(rows[rows.length - 1]); break;
    case 'ArrowRight':
      if (foldable && !expanded) toggle();
      else if (foldable) focusNavRow(rows[index + 1]);
      break;
    case 'ArrowLeft':
      if (foldable && expanded) toggle();
      else {
        const parent = row.closest('.tree-node-children');
        focusNavRow(parent && parent.parentElement.querySelector(':scope > .tree-node-row'));
      }
      break;
    case 'Enter': case ' ':
      // on the map a row only folds; in Elements it selects the element (the arrows fold)
      if (row.classList.contains('map-scope-row')) { if (foldable) toggle(); }
      else { navActiveKey = row.getAttribute('data-node'); row.click(); }
      break;
    case 'p': case 'P': {
      navActiveKey = row.getAttribute('data-node');
      const button = row.querySelector('[data-action="map-pin"]');
      if (button) button.click();
      break;
    }
    case 'h': case 'H': {
      navActiveKey = row.getAttribute('data-node');
      const button = row.querySelector('[data-action="map-hide"]');
      if (button) button.click();
      break;
    }
    default: return;
  }
  e.preventDefault();
}

/** The pinned and the hidden elements of the map, each removable. */
function renderMapChipsHtml() {
  const map = mapStateOf();
  if (!map.pinned.length && !map.hidden.length) return '';
  const chip = (reference, kind) => {
    const record = AppState.index[mapLayer()].get(reference);
    if (!record) return '';
    return '<span class="map-chip map-chip-' + kind + '"><span>' + (kind === 'pin' ? 'Pinned' : 'Hidden') + ': ' + escapeHtml(record.name || record.id) + '</span>' +
      '<button type="button" data-action="map-' + (kind === 'pin' ? 'unpin' : 'unhide') + '" data-ref="' + escapeHtml(reference) + '" aria-label="' +
      (kind === 'pin' ? 'Unpin ' : 'Show again ') + escapeHtml(record.name || record.id) + '" title="' + (kind === 'pin' ? 'Unpin' : 'Show again') + '">×</button></span>';
  };
  const clear = map.pinned.length + map.hidden.length > 2
    ? '<button type="button" class="map-chips-clear" data-action="map-clear" title="Show the whole map again: nothing pinned, nothing hidden">Clear all</button>' : '';
  return '<div class="map-chips">' + map.pinned.map((r) => chip(r, 'pin')).join('') + map.hidden.map((r) => chip(r, 'hide')).join('') + clear + '</div>';
}

/**
 * Settings perspective — the workspace settings form, standalone (there
 * is only one settings page, so unlike every other region it doesn't
 * depend on `AppState.selection` at all). Left/right/bottom are all
 * hidden — no sub-navigation exists yet (a natural later addition, not
 * invented now).
 */
function renderSettingsPerspectiveHtml() {
  return { left: null, center: renderSettingsViewHtml(), right: null, bottom: null };
}

