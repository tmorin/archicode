// ---- Stereotypes and styles ----
// The `styles` of the workspace give a stereotype its look (`by-tags` and `by-qualifiers`: the key is the stereotype, as
// in the PlantUML the command line generates). What a box is drawn with comes from the kernel (`item.stereotypes`).

/** The CSS colour names as `name:rrggbb`, from a browser's own list (`grey` is read as `gray`). */
const CSS_COLOR_TABLE =
  'aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 ' +
  'black:000000 blanchedalmond:ffebcd blue:0000ff blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 ' +
  'chartreuse:7fff00 chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc crimson:dc143c cyan:00ffff ' +
  'darkblue:00008b darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkkhaki:bdb76b ' +
  'darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a ' +
  'darkseagreen:8fbc8f darkslateblue:483d8b darkslategray:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 ' +
  'deeppink:ff1493 deepskyblue:00bfff dimgray:696969 dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 ' +
  'forestgreen:228b22 fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 gray:808080 ' +
  'green:008000 greenyellow:adff2f honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ivory:fffff0 ' +
  'khaki:f0e68c lavender:e6e6fa lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 ' +
  'lightcoral:f08080 lightcyan:e0ffff lightgoldenrodyellow:fafad2 lightgray:d3d3d3 lightgreen:90ee90 ' +
  'lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa lightskyblue:87cefa lightslategray:778899 ' +
  'lightsteelblue:b0c4de lightyellow:ffffe0 lime:00ff00 limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 ' +
  'mediumaquamarine:66cdaa mediumblue:0000cd mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 ' +
  'mediumslateblue:7b68ee mediumspringgreen:00fa9a mediumturquoise:48d1cc mediumvioletred:c71585 ' +
  'midnightblue:191970 mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead navy:000080 ' +
  'oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 orchid:da70d6 palegoldenrod:eee8aa ' +
  'palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 peru:cd853f ' +
  'pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f ' +
  'royalblue:4169e1 saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee ' +
  'sienna:a0522d silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd slategray:708090 snow:fffafa springgreen:00ff7f ' +
  'steelblue:4682b4 tan:d2b48c teal:008080 thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 ' +
  'white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32 ' +
  '';
let cssColorByName = null;

/** A colour of the workspace as {r, g, b, a} (a is 0 for `transparent`, else 1): `#rgb`, `#rrggbb`, `rgb(r, g, b)` or a CSS name (also after a `#`, as PlantUML reads it). Anything else is null: it is ignored, never written into the page. */
function parseCssColor(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase().replace(/grey/g, 'gray');
  let match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (match) {
    const hex = match[1].length === 3 ? match[1].replace(/./g, '$&$&') : match[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    };
  }
  match = /^rgb\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*\)$/.exec(text);
  if (match) {
    const [r, g, b] = [match[1], match[2], match[3]].map(Number);
    return r <= 255 && g <= 255 && b <= 255 ? { r, g, b, a: 1 } : null;
  }
  const name = text.replace(/^#/, '');
  if (name === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (!cssColorByName) {
    cssColorByName = Object.create(null);
    for (const entry of CSS_COLOR_TABLE.split(' ')) {
      if (entry) cssColorByName[entry.slice(0, entry.indexOf(':'))] = entry.slice(entry.indexOf(':') + 1);
    }
  }
  const hex = cssColorByName[name];
  return hex
    ? { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 }
    : null;
}

/** A parsed colour as CSS: `#rrggbb`, or `transparent`. */
function cssColorOf(color) {
  if (color.a === 0) return 'transparent';
  return '#' + [color.r, color.g, color.b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** WCAG 2 contrast ratio of two parsed colours, from 1 to 21. */
function contrastRatio(a, b) {
  const luminance = (c) => {
    const [r, g, bl] = [c.r, c.g, c.b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** The least contrast between a text and its fill that is still comfortable to read (WCAG AA). */
const STYLE_MIN_CONTRAST = 4.5;
const STYLE_TEXT_DARK = { r: 0, g: 0, b: 0, a: 1 };
const STYLE_TEXT_LIGHT = { r: 255, g: 255, b: 255, a: 1 };

/**
 * The colour of a text on a fill, whatever the theme of the page: the author's `font-color` when it reads well on the
 * fill, otherwise the better of black and white. The fill is the author's own colour in every theme, so the text
 * is what adapts.
 */
function readableTextColor(fill, preferred) {
  if (preferred && preferred.a !== 0 && contrastRatio(preferred, fill) >= STYLE_MIN_CONTRAST) return preferred;
  return contrastRatio(STYLE_TEXT_DARK, fill) >= contrastRatio(STYLE_TEXT_LIGHT, fill)
    ? STYLE_TEXT_DARK
    : STYLE_TEXT_LIGHT;
}

/**
 * The outline of a box that has a fill and no `line-color` of its own: the fill, darker, same hue (each channel scaled by
 * this factor, so the proportions of the colour, hence its hue, are kept). Without it the outline would be the theme's
 * border, which is lost on the fill (light theme: grey on grey), and a box inside a box of the same fill would vanish
 * into it. 0.6 was chosen by looking at the page in both themes: at 0.8 the line of `lightgray` on `lightgray` is a
 * whisper, at 0.4 it turns into a heavy black frame around every system; 0.6 reads as a firm edge without shouting.
 */
const STYLE_OUTLINE_DARKEN = 0.6;
/** A fill this dark (relative luminance below this) has no room to go darker and still be seen against itself (black on black is nothing, navy on navy a shadow): its outline is lightened instead, by the same factor towards white. */
const STYLE_OUTLINE_DARK_FILL = 0.05;

/** The outline derived from a fill (a parsed, opaque colour): darker, same hue; lighter for a fill too dark to darken. */
function derivedOutlineOf(fill) {
  const linear = [fill.r, fill.g, fill.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const channel = (v) =>
    Math.round(
      luminance < STYLE_OUTLINE_DARK_FILL ? v + (255 - v) * (1 - STYLE_OUTLINE_DARKEN) : v * STYLE_OUTLINE_DARKEN
    );
  return { r: channel(fill.r), g: channel(fill.g), b: channel(fill.b), a: 1 };
}

const STYLE_KEYS = [
  'background-color',
  'line-color',
  'line-style',
  'line-gap',
  'line-thickness',
  'round-corner',
  'font-color',
  'font-style',
  'shadowing'
];

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** The properties of a style that are whole numbers (`Style` of the command line: `int`). */
const STYLE_WHOLE_NUMBER_KEYS = ['line-style', 'line-gap', 'line-thickness', 'round-corner'];

/**
 * What the command line reads of the property `key` of a style: a whole number is any YAML number, and a number with a dot or an exponent is cut to its whole part
 * (`line-gap: 0x1F` is 31, `round-corner: 8.0` is 8, `1.5` is 1), where the page holds the text of a number it prints another way and draws only digits (issue #136). Anything else is as written.
 */
function styleValueAsRead(entry, key) {
  const value = entry[key];
  if (!STYLE_WHOLE_NUMBER_KEYS.includes(key)) return value;
  const plain = plainNumberOf(entry, key);
  if (plain !== undefined && plain.kind !== 'malformed') {
    const whole = plain.kind === 'int' ? Number(plain.big) : Math.trunc(plain.value);
    return Number.isFinite(whole) ? whole : value;
  }
  return typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value) ? Math.trunc(value) : value;
}

/** The style the workspace gives a stereotype, or null when `styles` does not mention it (a key with no property is a style with none). `by-tags` overrides `by-qualifiers` for the same key. */
function stereotypeStyleOf(name) {
  const styles = AppState.workspace && AppState.workspace.styles;
  if (!isPlainObject(styles)) return null;
  let declared = false;
  const merged = {};
  for (const kind of ['by-qualifiers', 'by-tags']) {
    const map = styles[kind];
    if (!isPlainObject(map) || !Object.prototype.hasOwnProperty.call(map, name)) continue;
    declared = true;
    const entry = map[name];
    if (!isPlainObject(entry)) continue;
    for (const key of STYLE_KEYS) {
      if (
        Object.prototype.hasOwnProperty.call(entry, key) &&
        entry[key] !== null &&
        entry[key] !== undefined &&
        String(entry[key]).trim() !== ''
      )
        merged[key] = styleValueAsRead(entry, key);
    }
  }
  return declared ? merged : null;
}

/** A whole number of a style (`3`, or `"3"`), 0 to `max`; null for anything else. */
function styleWholeNumber(value, max) {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d{1,4}$/.test(value.trim())
        ? Number(value)
        : NaN;
  return Number.isInteger(n) && n >= 0 ? Math.min(n, max) : null;
}

/**
 * What the editor draws of a style. `vars` are CSS custom properties read by the stylesheet (and by the export), with
 * the usual look as the fallback; `rx` is the corner radius of the box (PlantUML draws a `round-corner` of N as a
 * radius of N / 2); `shadow` is a drop shadow. Only parsed values come out: nothing the author wrote is passed on as is.
 */
function styleLookOf(style) {
  const vars = {};
  let rx = null;
  const source = style || {};
  const fill = parseCssColor(source['background-color']);
  if (fill) vars['--st-fill'] = cssColorOf(fill);
  const stroke = parseCssColor(source['line-color']);
  // the outline: the author's `line-color` always wins; with a fill and none, it is derived from the fill, and as opaque as a chosen one
  // (the faded outline of a compound box is the fallback of a box with no colour at all, not of one the workspace painted)
  if (stroke) {
    vars['--st-stroke'] = cssColorOf(stroke);
    vars['--st-stroke-opacity'] = '1';
  } else if (fill && fill.a !== 0) {
    vars['--st-stroke'] = cssColorOf(derivedOutlineOf(fill));
    vars['--st-stroke-opacity'] = '1';
  }
  const thickness = styleWholeNumber(source['line-thickness'], 20);
  if (thickness !== null) vars['--st-width'] = thickness + 'px';
  const dash = styleWholeNumber(source['line-style'], 50);
  // a dash and its gap, as PlantUML's `LineStyle: <dash>-<gap>`; without `line-gap` the gap is as long as the dash. The gap means nothing without a dash.
  const gap = styleWholeNumber(source['line-gap'], 50);
  if (dash !== null) vars['--st-dash'] = dash > 0 ? dash + ' ' + (gap !== null ? gap : dash) : 'none';
  const round = styleWholeNumber(source['round-corner'], 100);
  if (round !== null) rx = round / 2;
  // the text: against the fill the author chose; without a fill the box is the theme's and so is its text
  if (fill && fill.a !== 0)
    vars['--st-text'] = cssColorOf(readableTextColor(fill, parseCssColor(source['font-color'])));
  const fontStyle = typeof source['font-style'] === 'string' ? source['font-style'].toLowerCase().split(/[\s,;]+/) : [];
  if (fontStyle.includes('bold')) vars['--st-weight'] = '700';
  else if (fontStyle.includes('plain') || fontStyle.includes('normal')) vars['--st-weight'] = '400';
  if (fontStyle.includes('italic')) vars['--st-fstyle'] = 'italic';
  const shadow = source.shadowing === true || String(source.shadowing).toLowerCase() === 'true';
  return { vars, rx, shadow, empty: !Object.keys(vars).length && rx === null && !shadow };
}

/** The styled stereotypes of a list (the ones `styles` mentions), in the order of the list. */
function styledStereotypesOf(names) {
  return (Array.isArray(names) ? names : []).filter((name) => stereotypeStyleOf(name) !== null);
}
