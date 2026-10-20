'use strict';
// Wave 016, run 0116 (#117): a static audit of the <style> of the editor page, so that no class uses a colour that is right in one theme only.
//
// The page defines its colours as variables: the light ones on bare `:root`, the dark ones twice (`@media (prefers-color-scheme: dark)` on
// `:root:not([data-theme="light"])`, and `:root[data-theme="dark"]`, which is Settings forcing the dark theme). A class is right in both themes when
// it draws only with those variables. The ways it can be right in one theme only are the ones this audit looks for:
//   - a literal colour (`#rrggbb`, `rgb(`, `hsl(`, a CSS name...) in a rule: it does not change with the theme;
//   - a `var(--x)` that nothing defines (a typo), or that bare `:root` does not define, so the light theme has no value for it;
//   - a colour variable that a dark block does not redefine while its light value would not read on the dark ground, or a dark block that
//     redefines a variable the other one does not;
//   - a rule of its own under `prefers-color-scheme` or `[data-theme`, outside the two dark blocks (a second place where the theme is decided).
// It is a static check of the text of the stylesheet. It does NOT replace looking at the page in the dark theme (#29: the dark theme was never seen on a
// real screen by this wave; what the contrast numbers below say is a computation, not an impression). Only the <style> is read: the script of the page
// that writes inline styles, and the dark highlight of the code editor (a list of literal colours in the <head>, used only when the theme is dark), are
// not covered here.
// The last tests build copies of the page in memory in which a class of wave 015 or 016 gets a literal colour, or a variable goes missing, and check
// that the audit says so: an audit that cannot fail checks nothing. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');

// ---------- the stylesheet, as a list of rules ----------

const styleOf = (html) => html.slice(html.indexOf('<style>') + '<style>'.length, html.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');

/** The rules of a stylesheet, nested at-rules (@media, @container, @supports...) flattened: `{ selector, body, at }` where `at` lists the at-rules around it, outermost first. */
function rulesOf(css, at = []) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const head = css.slice(i, open).trim();
    const body = css.slice(open + 1, j - 1);
    if (head.startsWith('@')) {
      if (/^@(media|container|supports|layer|scope|starting-style|keyframes|-webkit-keyframes)\b/.test(head)) rules.push(...rulesOf(body, at.concat(head)));
      else rules.push({ selector: head, body, at, atRule: true }); // @font-face, @property: declarations with no element to select
    } else if (head) {
      rules.push({ selector: head, body, at });
    }
    i = j;
  }
  return rules;
}

/** The declarations of a rule body, as `[property, value]`: split on the `;` that sit outside parentheses and quotes. */
function declarationsOf(body) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  const push = (end) => {
    const text = body.slice(start, end).trim();
    const colon = text.indexOf(':');
    if (text && colon > 0) out.push([text.slice(0, colon).trim(), text.slice(colon + 1).replace(/!important\s*$/, '').trim()]);
  };
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) { push(k); start = k + 1; }
  }
  push(body.length);
  return out;
}

// ---------- colours ----------

/** The CSS colour names (CSS Color 4), lower case; `transparent` and `currentcolor` are not literals of a theme and are allowed. */
const COLOR_NAMES = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan ' +
  'darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise ' +
  'darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
  'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey ' +
  'lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue ' +
  'mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple ' +
  'red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white ' +
  'whitesmoke yellow yellowgreen').split(' '));

/** The properties whose value can hold a colour (a custom property can too); other properties are not scanned for names such as `red`, which `font-family` or `list-style` could hold. */
const COLOR_PROPERTY = /^(--[\w-]+|initial-value|-webkit-text-fill-color|text-emphasis-color|mask|border-image|color|background(-color|-image)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|fill|stroke|stop-color|flood-color|lighting-color|box-shadow|text-shadow|filter|caret-color|accent-color|column-rule(-color)?|text-decoration(-color)?|scrollbar-color)$/i;

/** What a value holds that is a colour of its own, not one of the theme's: a hex, a colour function, a CSS name. Strings and url(...) are looked at no more than their text. */
function literalColoursIn(property, value) {
  // a data: URL can hold a colour (an SVG icon): its text is scanned like any other; a quoted string is not a colour
  const bare = value.replace(/url\(\s*(?!["']?data:)[^)]*\)/gi, 'url()').replace(/"[^"]*"|'[^']*'/g, (q) => (/^["']data:/i.test(q) ? q : '""'));
  const found = [];
  for (const m of bare.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) found.push(m[0]);
  // `color-mix(` is a way to mix variables, not a literal: only the functions that write a colour out of numbers
  for (const m of bare.matchAll(/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|device-cmyk)\(([^()]*)\)/gi)) found.push(m[0]);
  if (COLOR_PROPERTY.test(property)) {
    // the fallback of a var() is a value like any other: `var(--x, red)` is red when --x is not there
    for (const m of bare.replace(/var\(\s*--[\w-]+\s*,?/gi, ' ').matchAll(/(?<![\w-])([a-zA-Z]+)(?![\w-]*\()/g)) {
      if (COLOR_NAMES.has(m[1].toLowerCase())) found.push(m[1]);
    }
  }
  return found;
}

/**
 * The literals a rule may hold, each with its reason. The list is short on purpose: a new entry is a decision that a colour may not follow the theme.
 * `selector` narrows an entry to one class; an entry nothing uses is a mistake of the list (a stale reason).
 */
const BLACK_AT_SOME_OPACITY = /^rgba?\(\s*0[\s,]+0[\s,]+0\s*[,/]\s*(0?\.\d+|\d+%)\s*\)$/i; // rgba(0, 0, 0, .3) and rgb(0 0 0 / 30%) alike
const ALLOWED_LITERALS = [
  { property: /^(box-shadow|filter)$/, literal: BLACK_AT_SOME_OPACITY,
    reason: 'a shadow is black at some opacity: it darkens a light ground and is lost on a dark one, and in neither case does it say anything the border and the fill do not' },
  { property: /^background$/, selector: /^\.app-dialog-backdrop$/, literal: BLACK_AT_SOME_OPACITY,
    reason: 'the veil behind a dialog dims whichever ground there is, light or dark; it carries no text' }
];

// ---------- the audit ----------

const HEX = /^#([0-9a-f]{6})$/i;
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const x = luminance(a); const y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** Variables that are the grounds themselves, or hairlines: they are drawn on a ground, not read on it, so they have no contrast to reach. */
const NOT_READ_ON_A_GROUND = new Map([
  ['--bg', 'the ground'],
  ['--panel-bg', 'the second ground'],
  ['--border', 'a hairline between two areas and the outline of a control (1.5:1 on white, under the 3:1 that WCAG 1.4.11 asks of a control\'s boundary: a known choice of the page since its first version, not this audit\'s to change; the label and the state of a control are told by text, never by the outline alone)']
]);
/** Variables that carry text: 4.5:1 on both grounds, in both themes. The others (lines, tints, badges) carry 3:1. */
const TEXT_VARIABLES = new Set(['--fg', '--muted', '--danger', '--accent', '--chg-removed-text']); // --accent is the colour of links and brand text as well as of the lit buttons
/** A text colour and the ground it is drawn on. */
const ON_GROUND = [['--on-accent', '--accent'], ['--on-accent', '--danger'], ['--on-modified', '--modified']];

/** Variables a rule uses with no fallback, that no rule defines and that the script of the page writes on the element it draws (the colour a compound box's text is computed from its fill). Each says why. */
const SET_BY_THE_SCRIPT = new Map([
  ['--ov-text', 'the text of a compound box with no fill of its own, computed by the script from the fill of the box around it (a contrast of 4.5, not a theme colour)']
]);

const SELECTOR_LIGHT = ':root';
const SELECTOR_DARK_MEDIA = ':root:not([data-theme="light"])';
const SELECTOR_DARK_FORCED = ':root[data-theme="dark"]';
const MEDIA_DARK = '@media (prefers-color-scheme: dark)';

const customProperties = (body) => new Map(declarationsOf(body).filter(([p]) => p.startsWith('--')));

/** Every problem the stylesheet of `html` has, as sentences; none when the page draws every class in both themes. `html` is a whole page. */
function auditPage(html) {
  const problems = [];
  const css = styleOf(html);
  const script = html.slice(html.indexOf('</style>'));
  const rules = rulesOf(css);

  const light = rules.find((r) => r.selector === SELECTOR_LIGHT && r.at.length === 0);
  const darkMedia = rules.find((r) => r.selector === SELECTOR_DARK_MEDIA && r.at.join() === MEDIA_DARK);
  const darkForced = rules.find((r) => r.selector === SELECTOR_DARK_FORCED && r.at.length === 0);
  if (!light) problems.push('bare `:root` has no rule: the light theme defines no variable');
  if (!darkMedia) problems.push('the media query `' + MEDIA_DARK + '` has no rule on `' + SELECTOR_DARK_MEDIA + '`');
  if (!darkForced) problems.push('there is no rule on `' + SELECTOR_DARK_FORCED + '`');
  if (!light || !darkMedia || !darkForced) return problems;
  const isVariableBlock = (rule) => rule === light || rule === darkMedia || rule === darkForced;

  // the theme is decided in one place
  for (const rule of rules) {
    if (isVariableBlock(rule)) continue;
    if (rule.at.some((a) => /prefers-color-scheme/.test(a))) problems.push('`' + rule.selector + '` is a rule of its own under `' + rule.at.join(' ') + '`: the dark theme is told by the variables of the two dark blocks only');
    if (!rule.atRule && rule.selector !== ':root[data-theme="light"]' && /data-theme|dark|\.light(?![\w-])/i.test(rule.selector)) problems.push('`' + rule.selector + '` decides a theme outside the two dark blocks');
    if (!rule.atRule && rule.selector === ':root' ) problems.push('a second rule on bare `:root`: the light variables are in one place');
    if (!rule.atRule && /\{/.test(rule.body)) problems.push('`' + rule.selector + '` holds a nested rule: native CSS nesting is not read by this audit (write the rules flat)');
    if (rule.selector === ':root[data-theme="light"]' && declarationsOf(rule.body).some(([p]) => p !== 'color-scheme')) problems.push('`:root[data-theme="light"]` holds more than `color-scheme`: the light variables are bare `:root`\'s');
  }
  for (const [name, block] of [['the media query', darkMedia], ['the forced dark theme', darkForced]]) {
    for (const [property] of declarationsOf(block.body)) {
      if (property !== 'color-scheme' && !property.startsWith('--')) problems.push(name + ' sets `' + property + '`: a dark block holds variables only');
    }
  }

  const lightVars = customProperties(light.body);
  const mediaVars = customProperties(darkMedia.body);
  const forcedVars = customProperties(darkForced.body);

  // the two dark blocks say the same
  for (const [name, value] of mediaVars) {
    if (!forcedVars.has(name)) problems.push('`' + name + '` is redefined for the system\'s dark theme and not for the forced one');
    else if (forcedVars.get(name) !== value) problems.push('`' + name + '` is `' + value + '` for the system\'s dark theme and `' + forcedVars.get(name) + '` for the forced one');
  }
  for (const name of forcedVars.keys()) if (!mediaVars.has(name)) problems.push('`' + name + '` is redefined for the forced dark theme and not for the system\'s');
  for (const name of new Set([...mediaVars.keys(), ...forcedVars.keys()])) {
    if (!lightVars.has(name)) problems.push('`' + name + '` is defined by a dark block and not by bare `:root`: the light theme has no value for it');
  }

  // what the variables are worth, theme by theme
  const valueIn = (theme, name) => (theme === 'dark' && forcedVars.has(name) ? forcedVars.get(name) : lightVars.get(name));
  const hexIn = (theme, name) => { const m = HEX.exec(valueIn(theme, name) || ''); return m ? m[0] : null; };
  // a colour variable is written #rrggbb: a colour written another way is a colour this audit cannot read the contrast of
  const colourNames = [...lightVars].filter(([n, v]) => literalColoursIn(n, v).length > 0 || /^color-mix\(/i.test(v)).map(([n]) => n);
  for (const name of colourNames) {
    for (const [theme, vars] of [['light', lightVars], ['dark', forcedVars]]) {
      if (vars.has(name) && !HEX.test(vars.get(name))) problems.push('`' + name + '` is `' + vars.get(name) + '` in the ' + theme + ' theme: the audit reads colours written #rrggbb, and cannot check this one');
    }
  }
  const grounds = (theme) => {
    const found = ['--bg', '--panel-bg'].map((n) => hexIn(theme, n)).filter(Boolean);
    if (found.length !== 2) problems.push('the ' + theme + ' theme has no readable `--bg` and `--panel-bg`: no contrast can be computed');
    return found;
  };
  for (const name of colourNames) {
    if (NOT_READ_ON_A_GROUND.has(name) || !HEX.test(lightVars.get(name)) || (forcedVars.has(name) && !HEX.test(forcedVars.get(name)))) continue;
    const need = TEXT_VARIABLES.has(name) ? 4.5 : 3;
    if (ON_GROUND.some(([text]) => text === name)) continue; // read on its own ground, below
    const redefined = forcedVars.has(name);
    if (!redefined) {
      // not redefined: the light value has to read on the dark grounds too (a text, a line, a tint: the same bar as the dark values carry)
      for (const ground of grounds('dark')) {
        const ratio = contrast(hexIn('light', name), ground);
        if (ratio < 4.5) problems.push('`' + name + '` (' + hexIn('light', name) + ') is not redefined by the dark blocks and reads at ' + ratio.toFixed(2) + ':1 on the dark ground ' + ground + ' (4.5:1 needed to be left as it is)');
      }
    }
    for (const theme of ['light', 'dark']) {
      for (const ground of grounds(theme)) {
        const ratio = contrast(hexIn(theme, name), ground);
        if (ratio < need) problems.push('`' + name + '` (' + hexIn(theme, name) + ') reads at ' + ratio.toFixed(2) + ':1 on the ' + theme + ' ground ' + ground + ' (' + need + ':1 needed)');
      }
    }
  }
  for (const [text, ground] of ON_GROUND) {
    for (const theme of ['light', 'dark']) {
      if (!hexIn(theme, text) || !hexIn(theme, ground)) { problems.push('`' + text + '` or `' + ground + '` is not a #rrggbb colour in the ' + theme + ' theme'); continue; }
      const ratio = contrast(hexIn(theme, text), hexIn(theme, ground));
      if (ratio < 4.5) problems.push('`' + text + '` on `' + ground + '` reads at ' + ratio.toFixed(2) + ':1 in the ' + theme + ' theme (4.5:1 needed)');
    }
  }

  // every variable a rule uses is defined: on bare :root, or by a rule of its own (a local one), or with a fallback, or written by the script of the page
  const definedByRule = new Set();
  for (const rule of rules) {
    if (isVariableBlock(rule) || rule.atRule) continue;
    for (const [property] of declarationsOf(rule.body)) if (property.startsWith('--')) definedByRule.add(property);
  }
  const scriptSet = new Map([...SET_BY_THE_SCRIPT].map(([name, reason]) => [name, { reason, used: 0 }]));
  const allowed = ALLOWED_LITERALS.map((entry) => Object.assign({ used: 0 }, entry));
  for (const rule of rules) {
    if (isVariableBlock(rule)) continue;
    for (const [property, value] of declarationsOf(rule.body)) {
      if (/url\(\s*["']?data:/i.test(value)) problems.push('`' + rule.selector + '` draws with a data: URL in `' + property + '`: an image has colours of its own, the same in both themes');
      if (rule.atRule) { for (const literal of literalColoursIn(property, value)) problems.push('`' + rule.selector + '` writes the literal colour `' + literal + '` in `' + property + '`'); continue; }
      for (const m of value.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/gi)) {
        const name = m[1];
        if (scriptSet.has(name) && !lightVars.has(name) && !definedByRule.has(name)) scriptSet.get(name).used++;
        if (lightVars.has(name) || m[2] || definedByRule.has(name)) continue;
        if (scriptSet.has(name) && script.includes(name)) continue;
        problems.push('`' + rule.selector + '` uses `var(' + name + ')`, which bare `:root` does not define, nothing else sets and no fallback covers');
      }
      for (const literal of literalColoursIn(property, value)) {
        const entry = allowed.find((e) => e.property.test(property) && (!e.selector || e.selector.test(rule.selector)) && e.literal.test(literal));
        if (entry) entry.used++;
        else problems.push('`' + rule.selector + '` writes the literal colour `' + literal + '` in `' + property + '`: it is the same in both themes (draw it with a variable)');
      }
    }
  }
  scriptSet.forEach((entry, name) => { if (!entry.used) problems.push('the list of variables set by the script has an entry that no rule uses any more: `' + name + '`'); });
  allowed.forEach((entry) => { if (!entry.used) problems.push('the list of allowed literals has an entry that no rule uses any more: ' + entry.reason); });
  return problems;
}

// ---------- the audit, on the page as it is ----------

test('every class of the stylesheet draws with variables that both themes define: the audit finds nothing', () => {
  assert.deepEqual(auditPage(HTML), []);
});

test('the audit reads what it claims to: the three variable blocks, the colours and the rules', () => {
  const css = styleOf(HTML);
  const rules = rulesOf(css);
  assert.ok(rules.length > 500, 'the stylesheet is read as ' + rules.length + ' rules');
  const light = customProperties(rules.find((r) => r.selector === ':root' && r.at.length === 0).body);
  for (const name of ['--bg', '--fg', '--muted', '--border', '--accent', '--danger', '--panel-bg', '--modified', '--on-accent', '--on-modified', '--chg-new', '--chg-removed-text']) assert.ok(light.has(name), name);
  const media = customProperties(rules.find((r) => r.selector === SELECTOR_DARK_MEDIA).body);
  assert.ok(media.size >= 18, 'the dark blocks redefine the colours: ' + media.size);
  assert.ok(![...media.keys()].includes('--header-h'));
  assert.ok(rules.some((r) => r.at.some((a) => a.startsWith('@container'))), 'rules nested in @container are read');
  assert.ok(rules.some((r) => r.selector === '.band-mistakes'), 'a class of wave 015 is read');
});

test('the allowed literals are the shadows and the veil of the dialogs, and nothing else', () => {
  const found = new Map();
  for (const rule of rulesOf(styleOf(HTML))) {
    if (rule.selector.startsWith(':root') || rule.atRule) continue;
    for (const [property, value] of declarationsOf(rule.body)) {
      for (const literal of literalColoursIn(property, value)) found.set(property + ' ' + literal + ' in ' + rule.selector, true);
    }
  }
  assert.ok(found.size >= 7, 'there are shadows to allow: ' + found.size);
  for (const key of found.keys()) assert.match(key, /^(box-shadow|filter|background) rgba\(0, 0, 0, 0?\.\d+\)/, key);
  for (const entry of ALLOWED_LITERALS) assert.ok(entry.reason.length > 30, 'an allowed literal says why');
});

test('the colour literals are found in every form a rule can write them', () => {
  const holds = (property, value) => literalColoursIn(property, value).length > 0;
  for (const [property, value] of [['color', '#fff'], ['color', '#1a1a1a'], ['background', 'rgb(1, 2, 3)'], ['background', 'rgba(0,0,0,.5) none'], ['border', '1px solid red'],
    ['border-color', 'hsl(10 20% 30%)'], ['fill', 'Black'], ['box-shadow', '0 0 2px white'], ['--row-bg', 'oklch(0.5 0.1 20)'], ['background', 'color(srgb 1 0 0)'],
    ['background', 'color-mix(in srgb, var(--accent) 10%, red)'], ['color', 'var(--nope, red)'], ['color', 'var(--nope, var(--nope2, #fff))'], ['color', 'RGB(1,2,3)'], ['COLOR', 'red'], ['Background', 'RGBA(0,0,0,.5)'],
    ['background', 'url("data:image/svg+xml,<svg fill=\'white\'/>")'], ['border-bottom', '1px solid #abc'], ['outline', '2px solid LightGray']]) {
    assert.ok(holds(property, value), property + ': ' + value);
  }
  for (const [property, value] of [['color', 'var(--fg)'], ['background', 'transparent'], ['border-color', 'currentColor'], ['background', 'color-mix(in srgb, var(--accent) 10%, transparent)'],
    ['background', 'var(--st-fill, transparent)'], ['font-family', 'red, sans-serif'], ['list-style', 'disc'], ['content', '"#fff"'], ['background-image', 'url(#abc)'], ['border', '1px solid var(--border)'],
    ['stroke', 'none'], ['fill', 'var(--st-fill, var(--bg))'], ['color', 'var(--fg, currentColor)'], ['border', 'tan'.replace('tan', 'transparent')]]) {
    assert.ok(!holds(property, value), property + ': ' + value);
  }
});

// ---------- the classes of waves 015 and 016 ----------

/** The colours (variables) the rules that name `className` draw with, in any property that holds a colour. */
function variablesOfClass(html, className, within = false) {
  const names = new Set();
  // a rule is the class's own when the last compound selector of one of its selectors carries it (`.band-field select` is the select's)
  const own = new RegExp('\\.' + className + '(?![\\w-])');
  const matching = rulesOf(styleOf(html)).filter((r) => !r.atRule && r.selector.split(',').some((sel) => own.test(within ? sel : sel.trim().split(/[\s>+~]+/).pop())));
  for (const rule of matching) {
    for (const [property, value] of declarationsOf(rule.body)) {
      if (!COLOR_PROPERTY.test(property) || property.startsWith('--')) continue;
      for (const m of value.matchAll(/var\((--[\w-]+)/g)) names.add(m[1]);
    }
  }
  return { rules: matching.length, variables: [...names].sort() };
}

/**
 * The classes the editor gained in waves 015 and 016 (the band and its lists, the page Plateaus, the Changes panel and its walk, the rename dialog, the
 * Move and delete dialogs, the map-parts toolbar, the box of the story picker), each with the variables it must draw with (`null`: it lays out, or takes
 * the colours of the controls or of the text around it, and no colour is asked of it; the audit above covers every colour it may have), and where the markup that carries it is. A class that is renamed or dropped fails here, so that
 * the audit is not silently looking at a class that is gone.
 */
const CLASSES_OF_WAVES_015_AND_016 = [
  // the band: the two lists, the mistakes button, the read-only wording and the writing buttons (waves 014 to 016)
  { area: 'the band', className: 'plateau-band', variables: ['--border', '--panel-bg'] },
  { area: 'the band', className: 'band-field', variables: null },
  { area: 'the band', className: 'band-mistakes', variables: ['--danger'] },
  { area: 'the band', className: 'band-flag', variables: ['--danger'] },
  { area: 'the band', className: 'band-readonly', variables: ['--muted'] },
  { area: 'the band', className: 'band-writing', variables: null },
  { area: 'the band', className: 'band-errors', variables: null },
  // the page Plateaus
  { area: 'the page Plateaus', className: 'timeline-item', variables: ['--border', '--panel-bg', '--accent'] },
  { area: 'the page Plateaus', className: 'timeline-state', variables: ['--border'] },
  { area: 'the page Plateaus', className: 'timeline-facts', variables: ['--muted'] },
  { area: 'the page Plateaus', className: 'timeline-note', variables: ['--muted'] },
  // the Changes panel and the walk buttons (run 0103, run 0112)
  { area: 'the Changes panel', className: 'changes-panel', variables: null },
  { area: 'the Changes panel', className: 'changes-compared', variables: ['--muted'] },
  { area: 'the Changes panel', className: 'changes-count-label', variables: ['--muted'] },
  { area: 'the Changes panel', className: 'changes-reading', variables: ['--border'] },
  { area: 'the Changes panel', className: 'changes-filter', variables: ['--muted'] },
  { area: 'the walk buttons', className: 'changes-walk', variables: null },
  { area: 'the walk buttons', className: 'changes-position', variables: ['--muted'] },
  { area: 'the walk buttons', className: 'changes-detail', variables: null },
  { area: 'the Changes panel', className: 'changes-message', variables: ['--danger'] },
  // the dialogs: Move, delete a plateau, the confirmation of a layered write, the rename that names the sibling plateaus
  { area: 'the dialogs', className: 'app-dialog', variables: ['--bg', '--border', '--fg'] },
  { area: 'the dialogs', className: 'app-dialog-subject', variables: ['--muted'] },
  { area: 'the dialogs', className: 'app-dialog-error', variables: ['--danger'] },
  { area: 'the rename dialog', className: 'layer-confirm-list', variables: null },
  { area: 'the rename dialog', className: 'muted', variables: ['--muted'] },
  { area: 'the rename dialog', className: 'btn-primary', variables: ['--accent', '--on-accent'] },
  // the box of the story picker and its note
  { area: 'the story picker box', className: 'app-dialog-choice', variables: null },
  { area: 'the story picker box', className: 'app-dialog-plateaus', variables: null },
  { area: 'the story picker box', className: 'app-dialog-plateaus-note', variables: null },
  { area: 'the story picker box', className: 'settings-help', variables: ['--muted'] },
  // the map-parts toolbar: two buttons of a button group, lit with aria-pressed (the same rule as the other tools of the diagram)
  { area: 'the map-parts toolbar', className: 'button-group', variables: null },
  { area: 'the map-parts toolbar', className: 'diagram-tools', variables: ['--bg', '--border'] },
  { area: 'the map-parts toolbar', className: 'diagram-tools', variables: ['--accent', '--on-accent'], within: true }, // the lit button, `.diagram-tools button[aria-pressed="true"]`
  // the field Current plateau of Settings
  { area: 'the field Current plateau', className: 'inline-error', variables: ['--danger'] }
];

test('the classes of waves 015 and 016 are in the stylesheet, drawn with the variables they should, and are used by the page', () => {
  const script = HTML.slice(HTML.indexOf('</style>'));
  for (const { area, className, variables, within } of CLASSES_OF_WAVES_015_AND_016) {
    const found = variablesOfClass(HTML, className, !!within);
    assert.ok(found.rules > 0, area + ': no rule names `.' + className + '` any more');
    assert.ok(new RegExp('(?<![\\w-])' + className + '(?![\\w-])').test(script), area + ': the page no longer writes the class `' + className + '`');
    for (const name of variables || []) assert.ok(found.variables.includes(name), area + ': `.' + className + '` no longer draws with `' + name + '` (it draws with ' + (found.variables.join(', ') || 'no colour') + ')');
  }
  assert.ok(CLASSES_OF_WAVES_015_AND_016.length >= 30);
  for (const area of ['the band', 'the Changes panel', 'the walk buttons', 'the rename dialog', 'the map-parts toolbar', 'the story picker box']) {
    assert.ok(CLASSES_OF_WAVES_015_AND_016.some((c) => c.area === area), area);
  }
});

// ---------- the audit fails where it should: copies of the page, built in memory ----------

/** A copy of the page in which `from` is replaced by `to` in the stylesheet; the replacement has to happen exactly once, so that a change of the page cannot turn a mutation into a no-op. */
function mutated(from, to) {
  const at = HTML.indexOf(from);
  assert.ok(at > HTML.indexOf('<style>') && at < HTML.indexOf('</style>'), 'the text to change is in the stylesheet: ' + from);
  assert.equal(HTML.indexOf(from, at + 1), -1, 'the text to change is there once: ' + from);
  return HTML.slice(0, at) + to + HTML.slice(at + from.length);
}

test('a copy of the page where a class of wave 015 gets a literal colour fails the audit (the copies are built in memory, the page is not touched)', () => {
  const copies = [
    // [what is changed, the sentence the audit must say]
    ['.band-mistakes { border-color: var(--danger) !important; color: var(--danger);', '.band-mistakes { border-color: var(--danger) !important; color: #b00020;', /`\.band-mistakes` writes the literal colour `#b00020` in `color`/],
    ['.band-flag { color: var(--danger);', '.band-flag { color: red;', /`\.band-flag` writes the literal colour `red`/],
    ['.changes-position { font-size: 0.8rem; color: var(--muted); }', '.changes-position { font-size: 0.8rem; color: rgb(102, 102, 102); }', /`\.changes-position` writes the literal colour `rgb\(102, 102, 102\)`/],
    ['.changes-message { margin: 0; padding: 0.4rem 0.5rem; border: 1px solid var(--danger);', '.changes-message { margin: 0; padding: 0.4rem 0.5rem; border: 1px solid #ff0000;', /`\.changes-message` writes the literal colour `#ff0000` in `border`/],
    ['.app-dialog-error { min-height: 1.2rem; margin-top: 0.4rem; color: var(--danger);', '.app-dialog-error { min-height: 1.2rem; margin-top: 0.4rem; color: hsl(0 80% 40%);', /`\.app-dialog-error` writes the literal colour `hsl\(0 80% 40%\)`/],
    ['.timeline-item.timeline-drawn { border-color: var(--accent);', '.timeline-item.timeline-drawn { border-color: royalblue;', /`\.timeline-item\.timeline-drawn` writes the literal colour `royalblue`/]
  ];
  for (const [from, to, expected] of copies) {
    const problems = auditPage(mutated(from, to));
    assert.ok(problems.some((p) => expected.test(p)), 'the audit says so for ' + to + ': ' + JSON.stringify(problems));
    assert.equal(problems.length, 1, 'and only that: ' + JSON.stringify(problems));
  }
});

test('a copy where a variable is missing, misspelt or one-sided fails the audit', () => {
  // a typo: nothing defines it
  assert.ok(auditPage(mutated('.band-readonly { color: var(--muted); }', '.band-readonly { color: var(--mutted); }')).some((p) => /`\.band-readonly` uses `var\(--mutted\)`/.test(p)));
  // a fallback makes a variable that is not defined harmless to the audit (the fallback is what the page draws), and a literal fallback is a literal
  assert.ok(auditPage(mutated('.band-readonly { color: var(--muted); }', '.band-readonly { color: var(--mutted, #666666); }')).some((p) => /literal colour `#666666`/.test(p)));
  // a variable that only a dark block defines: the light theme has no value for it
  const onlyDark = HTML.replace('--chg-merged: #9fd3f2;\n    }\n  }', '--chg-merged: #9fd3f2;\n      --only-dark: #ffffff;\n    }\n  }');
  assert.notEqual(onlyDark, HTML);
  assert.ok(auditPage(onlyDark).some((p) => /`--only-dark` is defined by a dark block and not by bare `:root`/.test(p)));
  // a variable the forced dark theme does not redefine while the system's dark does (and the other way round)
  const noForced = mutated('    --chg-new: #3ddc97;\n    --chg-changed: #ffb454;\n    --chg-removed: #a0a0a0;\n    --chg-removed-text: #b0b0b0;\n    --chg-contains: #8db4d8;\n    --chg-moved: #56b4e9;\n    --chg-split: #e69ac4;\n    --chg-merged: #9fd3f2;\n  }',
    '    --chg-changed: #ffb454;\n    --chg-removed: #a0a0a0;\n    --chg-removed-text: #b0b0b0;\n    --chg-contains: #8db4d8;\n    --chg-moved: #56b4e9;\n    --chg-split: #e69ac4;\n    --chg-merged: #9fd3f2;\n  }');
  assert.ok(auditPage(noForced).some((p) => /`--chg-new` is redefined for the system's dark theme and not for the forced one/.test(p)), JSON.stringify(auditPage(noForced)));
  // a dark block that gives another value than the other
  const differs = HTML.replace('--danger: #ff6b6b;\n      --panel-bg', '--danger: #ff6b6c;\n      --panel-bg');
  assert.notEqual(differs, HTML);
  assert.ok(auditPage(differs).some((p) => /`--danger` is `#ff6b6c` for the system's dark theme and `#ff6b6b` for the forced one/.test(p)));
});

test('a colour that is not redefined for the dark themes, or redefined to something that does not read, fails the audit', () => {
  // `--accent` left as the light blue in both dark blocks: it still reads at 3.08:1 on the dark ground, which is under the bar of a variable left alone
  const forcedOnly = (html, name) => html.replace(new RegExp('\\n\\s*' + name + ': #[0-9a-f]{6};', 'g'), (m, offset) => (offset > html.indexOf(':root[data-theme="dark"]') || offset > html.indexOf('@media (prefers-color-scheme: dark)') ? '' : m));
  const accentLeft = forcedOnly(HTML, '--accent');
  assert.notEqual(accentLeft, HTML);
  const problems = auditPage(accentLeft);
  assert.ok(problems.some((p) => /`--accent` \(#2b6cb0\) is not redefined by the dark blocks and reads at 3\.08:1/.test(p)), JSON.stringify(problems));
  // a dark value that does not read on the dark ground
  const dim = HTML.replace(/--muted: #999999;/g, '--muted: #444444;');
  assert.ok(auditPage(dim).some((p) => /`--muted` \(#444444\) reads at [\d.]+:1 on the dark ground/.test(p)));
  // a text colour that does not read on its ground
  const onAccent = HTML.replace(/--on-accent: #10243a;/g, '--on-accent: #6cb0f0;');
  assert.ok(auditPage(onAccent).some((p) => /`--on-accent` on `--accent` reads at [\d.]+:1 in the dark theme/.test(p)));
});

test('a rule of its own under the dark media query, or a theme decided elsewhere, fails the audit', () => {
  const own = HTML.replace('  :root[data-theme="light"] { color-scheme: light; }', '  @media (prefers-color-scheme: dark) { .band-flag { color: #ff6b6b; } }\n  :root[data-theme="light"] { color-scheme: light; }');
  assert.notEqual(own, HTML);
  const problems = auditPage(own);
  assert.ok(problems.some((p) => /`\.band-flag` is a rule of its own under `@media \(prefers-color-scheme: dark\)`/.test(p)), JSON.stringify(problems));
  assert.ok(problems.some((p) => /`\.band-flag` writes the literal colour `#ff6b6b`/.test(p)), 'and the literal is told too');
  const decided = HTML.replace('  :root[data-theme="light"] { color-scheme: light; }', '  :root[data-theme="dark"] .band-flag { opacity: 0.9; }\n  :root[data-theme="light"] { color-scheme: light; }');
  assert.ok(auditPage(decided).some((p) => /`:root\[data-theme="dark"\] \.band-flag` decides a theme outside the two dark blocks/.test(p)));
});

test('a stale entry of the allowed literals fails the audit: the list is not allowed to outlive the rules', () => {
  const veilGone = mutated('background: rgba(0, 0, 0, 0.4)', 'background: var(--bg)');
  assert.ok(auditPage(veilGone).some((p) => /the list of allowed literals has an entry that no rule uses any more: the veil behind a dialog/.test(p)), JSON.stringify(auditPage(veilGone)));
  // and a veil of another colour is not the veil that is allowed
  const blue = mutated('background: rgba(0, 0, 0, 0.4)', 'background: rgba(0, 0, 80, 0.4)');
  assert.ok(auditPage(blue).some((p) => /`\.app-dialog-backdrop` writes the literal colour `rgba\(0, 0, 80, 0\.4\)`/.test(p)));
  // a shadow of another colour is not a shadow of the list either
  const tinted = mutated('box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3)', 'box-shadow: 0 8px 24px rgba(20, 20, 20, 0.3)');
  assert.ok(auditPage(tinted).some((p) => /`\.app-dialog` writes the literal colour `rgba\(20, 20, 20, 0\.3\)` in `box-shadow`/.test(p)));
});

test('the holes a review of this audit found are closed: each of these copies of the page fails it', () => {
  const css = (extra) => HTML.replace('  :root[data-theme="light"] { color-scheme: light; }', extra + '\n  :root[data-theme="light"] { color-scheme: light; }');
  const says = (html, expected) => { const problems = auditPage(html); assert.ok(problems.some((p) => expected.test(p)), String(expected) + ' in ' + JSON.stringify(problems)); };
  says(mutated('.band-readonly { color: var(--muted); }', '.band-readonly { color: var(--muted, red); }'), /`\.band-readonly` writes the literal colour `red`/);
  says(mutated('.band-readonly { color: var(--muted); }', '.band-readonly { COLOR: RGB(1, 2, 3); }'), /literal colour `RGB\(1, 2, 3\)`/);
  says(css('@keyframes pulse { from { color: #123456; } }'), /`from` writes the literal colour `#123456`/);
  says(css('@property --x { syntax: "<color>"; inherits: false; initial-value: red; }'), /`@property --x` writes the literal colour `red` in `initial-value`/);
  says(css('.a { color: var(--fg); &:hover { color: red; } }'), /`\.a` holds a nested rule/);
  says(css('@scope (.x) { .a { color: red; } }'), /`\.a` writes the literal colour `red`/);
  says(css('@starting-style { .a { color: red; } }'), /`\.a` writes the literal colour `red`/);
  says(css('.a { background: url("data:image/svg+xml,<svg/>"); }'), /`\.a` draws with a data: URL/);
  says(css(':root { --pale: #eeeeee; }'), /a second rule on bare `:root`/);
  says(css('html.dark .band-flag { opacity: 0.9; }'), /`html\.dark \.band-flag` decides a theme/);
  says(css('.a { -webkit-text-fill-color: blue; }'), /`\.a` writes the literal colour `blue`/);
  // a ground or a colour variable the audit cannot read is told, not skipped
  says(HTML.replace('--bg: #ffffff;', '--bg: rgb(255, 255, 255);'), /`--bg` is `rgb\(255, 255, 255\)` in the light theme/);
  says(HTML.replace('--bg: #ffffff;', '--bg: rgb(255, 255, 255);'), /the light theme has no readable `--bg` and `--panel-bg`/);
  says(HTML.replace('--fg: #1a1a1a;', '--fg: rgb(26, 26, 26);\n    --pale: hsl(0 0% 90%);'), /`--pale` is `hsl\(0 0% 90%\)` in the light theme/);
  // the text colour on the danger ground, and the accent read as text
  says(HTML.replace(/--on-accent: #10243a;/g, '--on-accent: #ff6b6b;'), /`--on-accent` on `--danger` reads at [\d.]+:1 in the dark theme/);
  says(HTML.replace(/--accent: #6cb0f0;/g, '--accent: #3a6a98;'), /`--accent` \(#3a6a98\) reads at [\d.]+:1 on the dark ground #1e1e1e \(4\.5:1 needed\)/);
  // a variable that only the script is said to set, and a rule that stops using it
  says(mutated('fill: var(--ov-text);', 'fill: var(--ov-texte);'), /`\.dg-over-fill \.dg-title, \.dg-over-fill \.dg-sub` uses `var\(--ov-texte\)`/);
  says(mutated('fill: var(--ov-text);', 'fill: var(--fg);'), /the list of variables set by the script has an entry that no rule uses any more: `--ov-text`/);
});
