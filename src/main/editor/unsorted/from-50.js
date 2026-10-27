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

