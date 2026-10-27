'use strict';

/*
 * ArchiCode standalone editor — data engine (run-0008, task-001).
 *
 * This file implements the "data engine" half of PRD-0008 / TDD-0008:
 * the hand-written YAML parser (DEC-2/CON-5), the folder-pick + IndexedDB
 * persistence flow (DEC-3/DEC-4/CON-3/CON-4/CTR-2), workspace+manifest
 * loading (FR-4/FR-5), and the header.kind prefix mapping + recursive
 * element indexing + relationship resolution (DEC-5/ASM-3/ASM-4/FR-6/FR-7).
 *
 * The rendering here is a TEMPORARY diagnostic view only — task-002 (a
 * later, separate dispatch) replaces it with the real three-panel
 * read-only shell (DEC-1/DEC-6/DEC-7/DEC-8). Everything below is
 * organized so that later task can reuse AppState, parseYaml, buildIndex,
 * resolveRelationships, loadWorkspace, openFolder/reopenFolder/closeFolder
 * directly.
 */

// =====================================================================
// YAML parser (TDD DEC-2, CON-5; PRD TC-2)
//
// Hand-written recursive-descent parser over the YAML the manifests use:
// indentation-based block mappings and sequences (a sequence may sit at the
// same indent as its parent key), plain, single- and double-quoted scalars
// (folded over several lines, `\n` `\t` `\r` `\uXXXX`... escapes), literal
// and folded block scalars (`|`, `>` with `-`/`+` and an indentation
// indicator), flow sequences and mappings (`[a, "b"]`, `{a: b}`, nested, on
// several lines), `#` comments and the YAML 1.1 booleans (true/false/yes/no/
// on/off), like the Java side's reader does. Anchors, aliases and tags are read
// the way the Java side reads them: an alias is a copy of the node it points at,
// a tag qualifies a scalar (`!!str 12` is the text `12`) and says nothing about
// a collection (see `readYamlProperties`); the save writes them back as they
// were written (see `openYamlDecorations`). Complex keys, an anchor or a tag on
// a key, directives and several documents in one file are NOT supported:
// like anything else the parser cannot read, they throw a `YamlParseError`
// (carrying `.line`) instead of being skipped, so a file is never read as a
// truncated model and written back from it.
// =====================================================================

/** The error thrown for anything the parser cannot read: names the (1-based) line, and carries it in `line`. */
function yamlError(message, lineIndex) {
  const e = new Error('YAML error at line ' + (lineIndex + 1) + ': ' + message);
  e.name = 'YamlParseError';
  e.line = lineIndex + 1;
  return e;
}

/**
 * JavaScript lists the keys that look like array indexes (`10`, `2`) first and in ascending order, whatever order they were
 * set in: a tag key `10` would move to the top of its mapping on save. A mapping that has such a key therefore carries, in a
 * hidden symbol, the order its keys were written in; `yamlKeysOf` is the order to read and write them in.
 */
const YAML_KEY_ORDER = Symbol('yamlKeyOrder');
function isArrayIndexKey(key) {
  return /^(0|[1-9][0-9]*)$/.test(key) && Number(key) < 4294967295;
}

/** The keys of a mapping in the order they were written in (insertion order for a mapping that has no array-index key). */
function yamlKeysOf(map) {
  const keys = Object.keys(map);
  const order = map[YAML_KEY_ORDER];
  if (!order) return keys;
  const present = new Set(keys);
  const ordered = order.filter((key) => present.has(key));
  const known = new Set(ordered);
  return ordered.concat(keys.filter((key) => !known.has(key)));
}

/** Set a key of a mapping; `__proto__` is kept as an ordinary own key instead of changing the prototype. */
function setYamlKey(map, key, value) {
  let order = map[YAML_KEY_ORDER];
  if (!order && isArrayIndexKey(key)) {
    order = Object.keys(map).filter((k) => k !== key);
    Object.defineProperty(map, YAML_KEY_ORDER, { value: order, writable: true, enumerable: false, configurable: true });
  }
  if (order && !Object.prototype.hasOwnProperty.call(map, key)) {
    const stale = order.indexOf(key);
    if (stale !== -1) order.splice(stale, 1);
    order.push(key);
  }
  if (key === '__proto__') {
    Object.defineProperty(map, key, { value, writable: true, enumerable: true, configurable: true });
  } else {
    map[key] = value;
  }
  notePlainNumber(map, key, value);
}

/** Add an item to a list read by the parser, noting a plain scalar that is a YAML 1.1 number (see `notePlainNumber`). */
function pushYamlItem(arr, value) {
  arr.push(value);
  notePlainNumber(arr, arr.length - 1, value);
}

function isYamlWs(ch) {
  return ch === ' ' || ch === '\t';
}

function yamlLineBlank(line) {
  return /^[ \t]*$/.test(line);
}

/** True if `#` at `i` starts a comment: at the start of the line, or after whitespace (YAML's rule, and the emitter's). */
function isYamlCommentAt(line, i) {
  return line[i] === '#' && (i === 0 || isYamlWs(line[i - 1]));
}

/** True if `line` has a block-sequence item at `col` (`-` followed by a blank or the end of the line). */
function isYamlSeqItem(line, col) {
  return line[col] === '-' && (col + 1 >= line.length || isYamlWs(line[col + 1]));
}

const YAML_SIMPLE_ESCAPES = {
  0: '\0',
  a: '\x07',
  b: '\b',
  t: '\t',
  '\t': '\t',
  n: '\n',
  v: '\v',
  f: '\f',
  r: '\r',
  e: '\x1b',
  ' ': ' ',
  '"': '"',
  '/': '/',
  '\\': '\\',
  N: '\u0085',
  _: '\u00a0',
  L: '\u2028',
  P: '\u2029'
};

/** Read the escape sequence starting at `line[i]` (a backslash): `{ text, next }`. */
function readYamlEscape(line, i, lineIndex) {
  const c = line[i + 1];
  if (Object.prototype.hasOwnProperty.call(YAML_SIMPLE_ESCAPES, c))
    return { text: YAML_SIMPLE_ESCAPES[c], next: i + 2 };
  const digits = c === 'x' ? 2 : c === 'u' ? 4 : c === 'U' ? 8 : 0;
  if (digits > 0) {
    const hex = line.slice(i + 2, i + 2 + digits);
    const code = parseInt(hex, 16);
    if (hex.length !== digits || !/^[0-9a-fA-F]+$/.test(hex) || code > 0x10ffff) {
      throw yamlError('invalid escape sequence \\' + c + hex, lineIndex);
    }
    return { text: String.fromCodePoint(code), next: i + 2 + digits };
  }
  throw yamlError('unknown escape sequence \\' + (c === undefined ? '' : c), lineIndex);
}

/** Unescape the body of a single-line double-quoted scalar. */
function unescapeYamlDoubleQuoted(body, lineIndex) {
  let out = '';
  let i = 0;
  while (i < body.length) {
    if (body[i] === '\\') {
      const esc = readYamlEscape(body, i, lineIndex || 0);
      out += esc.text;
      i = esc.next;
    } else {
      out += body[i++];
    }
  }
  return out;
}

/**
 * Where a key starts at `col` of `line`: `{ key, end }` (`end` just after the colon) when the text is `key:` followed by
 * a blank or the end of the line, `null` otherwise. The key is plain, `'single'` or `"double"` quoted (on that line).
 */
function scanYamlKey(line, col, lineIndex) {
  const c = line[col];
  if (c === undefined) return null;
  if (c === '"' || c === "'") {
    let j = col + 1;
    let close = -1;
    while (j < line.length) {
      if (c === '"' && line[j] === '\\') {
        j += 2;
        continue;
      }
      if (line[j] === c) {
        if (c === "'" && line[j + 1] === "'") {
          j += 2;
          continue;
        }
        close = j;
        break;
      }
      j++;
    }
    if (close === -1) return null;
    let k = close + 1;
    while (k < line.length && isYamlWs(line[k])) k++;
    if (line[k] !== ':' || !(k + 1 >= line.length || isYamlWs(line[k + 1]))) return null;
    const body = line.slice(col + 1, close);
    return { key: c === '"' ? unescapeYamlDoubleQuoted(body, lineIndex) : body.replace(/''/g, "'"), end: k + 1 };
  }
  if ('[{&*!|>'.indexOf(c) !== -1 || (c === '?' && (col + 1 >= line.length || isYamlWs(line[col + 1])))) return null;
  for (let i = col; i < line.length; i++) {
    if (line[i] === ':' && (i + 1 >= line.length || isYamlWs(line[i + 1]))) {
      const key = line.slice(col, i).replace(/[ \t]+$/, '');
      return key === '' ? null : { key, end: i + 1 };
    }
    if (i > col && isYamlCommentAt(line, i)) return null;
  }
  return null;
}

/** Index (in `line`) where the value starting at `i` ends, the comment that follows it excluded. */
function yamlCommentIndex(line, i) {
  const n = line.length;
  const c = line[i];
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < n) {
      if (c === '"' && line[j] === '\\') {
        j += 2;
        continue;
      }
      if (line[j] === c) {
        if (c === "'" && line[j + 1] === "'") {
          j += 2;
          continue;
        }
        j++;
        break;
      }
      j++;
    }
    for (i = j; i < n; i++) if (isYamlCommentAt(line, i)) return i;
    return n;
  }
  if (c === '[' || c === '{') {
    // a flow collection: a quote opens a quoted scalar only where a value may start
    let prev = '';
    for (let j = i; j < n; j++) {
      const ch = line[j];
      if ((ch === '"' || ch === "'") && (prev === '' || '[{,:'.indexOf(prev) !== -1)) {
        let k = j + 1;
        while (k < n) {
          if (ch === '"' && line[k] === '\\') {
            k += 2;
            continue;
          }
          if (line[k] === ch) {
            if (ch === "'" && line[k + 1] === "'") {
              k += 2;
              continue;
            }
            break;
          }
          k++;
        }
        if (k >= n) return n; // the quoted text goes on over the next lines
        j = k;
        prev = ch;
        continue;
      }
      if (isYamlCommentAt(line, j)) return j;
      if (!isYamlWs(ch)) prev = ch;
    }
    return n;
  }
  for (let j = i; j < n; j++) if (isYamlCommentAt(line, j)) return j;
  return n;
}

/**
 * Strip a trailing `#` comment from a single line. A `#` starts a comment only at the start of the line or after
 * whitespace, and never inside a quoted scalar: a quote opens one only where a value starts (after `key:`, `- `, `[`,
 * `{`, `,`), so an apostrophe inside a plain scalar (`it's # a comment`) does not hide the comment, and an escaped
 * quote inside a double-quoted scalar (`"say \"hi # there"`) does not end the quoted text.
 */
function stripYamlComment(line) {
  const n = line.length;
  let i = 0;
  for (;;) {
    while (i < n && isYamlWs(line[i])) i++;
    if (i >= n) return line;
    if (line[i] === '#') return line.slice(0, i);
    if (isYamlSeqItem(line, i)) {
      i++;
      continue;
    }
    break;
  }
  const key = scanYamlKey(line, i, 0);
  if (key) {
    i = key.end;
    while (i < n && isYamlWs(line[i])) i++;
    if (i >= n) return line;
    if (line[i] === '#') return line.slice(0, i);
  }
  return line.slice(0, yamlCommentIndex(line, i));
}

/**
 * Set while `parseYamlAsModel` reads the header a second time: a plain scalar that YAML 1.1 reads as a boolean (`yes`, `On`, `FALSE`) or as a number (`010`, `0x1F`, `5.0`, `0`) is then
 * the text as written. The command line reads the fields of a header (`kind`, `version`, `parent`, `plateau`) as the text they are written as (issues #85 and #103); the rest of a
 * manifest is read as the value, as it does.
 */
let yamlKeepWords = false;

/**
 * Set while `parseYamlAsModel` reads a manifest: a plain scalar that YAML 1.1 reads as a number is the value the command line's reader gives its content (issue #103). The command
 * line reads the content of a manifest again as JSON text, so a number is a number there: `id: 010` is the reference `8`, `0x1F` is `31`, `1_000` is `1000`. A number that JavaScript
 * would print another way than Java (`5.0`, `1e3` are `5.0` and `1000.0` there; an integer beyond 2^53) is the text Java prints. `.archicode.yaml` is read by the plain `parseYaml`:
 * the command line hands a text field the text as written there (`name: 010` is `010`) and a number to a field that is one, so the page keeps the text and knows the scalar was a number
 * (`plainNumberOf`).
 */
let yamlModelNumbers = false;

/** The last plain scalar read as a number whose value is not a JS number: `notePlainNumber` takes it to the collection that holds the value. */
let yamlPlainNumberSeen = null;

/**
 * Set while `parseManifestText` reads a manifest: a scalar the command line's reader refuses (`.inf`, `!!int 09`, a `!!binary` that is not base64) does not stop the reading, it is
 * held as the text it was written as and marked (`kind: 'malformed'`, with the sentence), and `manifestProblem` says it where the command line would meet it (issue #136): the
 * content of a manifest is decoded whole when the reader gets to it, the header is read key by key, so `foo: .inf` under an unknown key of the header is the unknown key.
 */
let yamlDeferMalformed = false;

/** Set while the plain scalar that follows a tag is read: the tag says what it is, so it is not looked at as a number first (`!!int .inf` is a text for the command line). */
let yamlRawScalars = false;

/** Set while `patchYamlText` saves `.archicode.yaml`: `parseYamlAsModel` reads as the plain `parseYaml` does (the numbers as written; see `yamlModelNumbers`). */
let yamlPlainReading = false;

/** The plain scalars of a collection that YAML 1.1 reads as numbers and the page holds as text, by key (hidden, like `YAML_KEY_ORDER`). */
const YAML_PLAIN_NUMBERS = Symbol('yamlPlainNumbers');

/** Java's `Double.toString`: what the command line makes of a number with a dot or an exponent when it is a text (`5.0`, `1000.0`, `1.0E22`, `1.0E-4`). */
function javaDoubleText(d) {
  if (Number.isNaN(d)) return 'NaN';
  if (!Number.isFinite(d)) return d > 0 ? 'Infinity' : '-Infinity';
  if (Object.is(d, -0)) return '-0.0';
  if (d === 0) return '0.0';
  const sign = d < 0 ? '-' : '';
  let parts = Math.abs(d).toExponential().split('e');
  // one digit is enough to tell the number, but Java then takes the closest of the numbers with two (`4.9E-324` for the smallest one, where JavaScript prints `5e-324`)
  if (parts[0].length === 1) {
    const two = Math.abs(d).toExponential(1).split('e');
    if (two[0][2] !== '0') parts = two;
  }
  const digits = parts[0].replace('.', '');
  const exp = Number(parts[1]);
  if (exp >= -3 && exp < 7) {
    if (exp >= 0) {
      const whole = digits.length > exp + 1 ? digits.slice(0, exp + 1) : digits.padEnd(exp + 1, '0');
      return sign + whole + '.' + (digits.length > exp + 1 ? digits.slice(exp + 1) : '0');
    }
    return sign + '0.' + '0'.repeat(-exp - 1) + digits;
  }
  return sign + digits[0] + '.' + (digits.length > 1 ? digits.slice(1) : '0') + 'E' + exp;
}

/**
 * What the command line's reader (Jackson over SnakeYAML) makes of a plain scalar, when it makes a number of it (issue #103, found by trying every spelling of up to five characters):
 * `{ kind: 'int', big, javaText }` for `0`, a decimal (`12`, `+5`, `-3`), an octal (`010`, which is `8`; `09` is no octal and stays a text), a hexadecimal (`0x1F`), a binary (`0b11`) or any of
 * them with `_` in the digits (`1_000`); `{ kind: 'float', value, javaText }` for a number with a dot or an exponent (`.5`, `1.`, `5.0`, `1e3`, `1.5E+3`, `1_0.5`); `{ kind: 'malformed' }` for
 * what the reader refuses (`.inf`, `-.nan`, `._`); null for a text.
 */
function yamlOneDotOneNumber(text) {
  if (!/^[-+.0-9]/.test(text)) return null;
  const negative = text[0] === '-';
  const unsigned = /^[-+]/.test(text) ? text.slice(1) : text;
  const bare = unsigned.replace(/_/g, '');
  let big = null;
  if (/^(0|[1-9][0-9_]*)$/.test(unsigned)) big = BigInt(bare);
  else if (/^0[0-7_]*[0-7][0-7_]*$/.test(unsigned)) big = BigInt('0o' + bare.slice(1));
  else if (/^0x[0-9a-fA-F_]*[0-9a-fA-F][0-9a-fA-F_]*$/.test(unsigned)) big = BigInt(bare);
  else if (/^0b[01_]*[01][01_]*$/.test(unsigned)) big = BigInt(bare);
  if (big !== null) {
    if (negative) big = -big;
    return { kind: 'int', big, javaText: big.toString() };
  }
  const dotted = /^([0-9][0-9_]*)?\.([0-9_]*)([eE][-+]?[0-9]+)?$/.exec(unsigned);
  if (dotted) {
    const mantissa = (dotted[1] || '') + dotted[2];
    if (!/[0-9]/.test(mantissa)) return /_/.test(mantissa) ? { kind: 'malformed' } : null;
  } else if (!/^[0-9][0-9_]*[eE][-+]?[0-9]+$/.test(unsigned)) {
    return /^\.(inf|Inf|INF)$/.test(unsigned) || /^\.(nan|NaN|NAN)$/.test(text) ? { kind: 'malformed' } : null; // a sign does not make `.nan` a number
  }
  const value = Number(bare) * (negative ? -1 : 1);
  return { kind: 'float', value, javaText: javaDoubleText(value) };
}

/** The error for a scalar the command line's reader refuses (`.inf`, `!!int 09`): its sentence, without the place (`at \`content\`` is added for a manifest, as the command line does). */
function yamlRefusedScalar(message) {
  const e = new Error(message);
  e.name = 'YamlMalformedNumber';
  return e;
}

function yamlMalformedNumber(text) {
  return yamlRefusedScalar("Malformed numeric value '" + text + "'");
}

/**
 * A scalar the reader refuses: an error, or, while a manifest is read (`yamlDeferMalformed`), the text it was written as with a mark that `manifestProblem` reads, so that the sentence
 * comes at the place the command line would say it (issue #136). A number it cannot read (`.inf`, `!!float x`) is refused when a value is asked of it, so not under a key that is
 * not taken; a tagged integer and a binary text (`eager`) are refused when the reader gets to the token, wherever it stands.
 */
function refuseYamlScalar(message, text, eager) {
  if (!yamlDeferMalformed) throw yamlRefusedScalar(message);
  yamlPlainNumberSeen = {
    value: text,
    number: { kind: 'malformed', big: null, value: null, source: text, message, eager: eager === true }
  };
  return text;
}

/** What a scalar that is a number is in the model: the number itself when the page can hold it as the command line prints it, else the text (see `resolveYamlPlain`). */
function yamlNumberValue(number, text) {
  let value = text;
  if (!yamlKeepWords && yamlModelNumbers) {
    if (number.kind === 'int') {
      value =
        number.big >= -9007199254740991n && number.big <= 9007199254740991n ? Number(number.big) : number.javaText;
    } else {
      value =
        Number.isFinite(number.value) && !Number.isInteger(number.value) && String(number.value) === number.javaText
          ? number.value
          : number.javaText;
    }
  } else if (
    !yamlKeepWords &&
    ((number.kind === 'int' && /^-?\d+$/.test(text)) || /^-?\d+\.\d+$/.test(text)) &&
    String(Number(text)) === text
  ) {
    value = Number(text); // (a number tagged `!!float` that is written as a whole number stays a float: the text, marked)
  }
  if (typeof value === 'string')
    yamlPlainNumberSeen = {
      value,
      number: {
        kind: number.kind,
        big: number.kind === 'int' ? number.big : null,
        value: number.kind === 'float' ? number.value : null,
        source: text
      }
    };
  return value;
}

/**
 * Resolve a plain (unquoted) scalar into its JS value: null (`null`/`~`/empty), a boolean (true/false/yes/no/on/off,
 * as the Java side reads them), a number, else the text itself. In the plain reading a number is only turned into a JS number when the text
 * is exactly what `String(number)` gives back (so `01234`, `1.50`, `2.0`, `-0` and integers beyond 2^53 stay the text
 * they were and are written back unchanged); in a manifest (`yamlModelNumbers`) every YAML 1.1 number is the number the command line reads
 * (`010` is `8`), or the text Java prints for it when JavaScript cannot hold it as that text. `wordsOnly`: only the null and the booleans are looked at.
 * `yamlRawScalars`: the scalar follows a tag, which says what it is (`applyYamlTag`): it is the text.
 */
function resolveYamlPlain(text, wordsOnly) {
  if (yamlRawScalars && !wordsOnly) return text;
  if (text === '' || text === '~' || /^(null|Null|NULL)$/.test(text)) return null;
  if (/^(true|True|TRUE|yes|Yes|YES|on|On|ON)$/.test(text)) return yamlKeepWords ? text : true;
  if (/^(false|False|FALSE|no|No|NO|off|Off|OFF)$/.test(text)) return yamlKeepWords ? text : false;
  if (wordsOnly) return text;
  const number = yamlOneDotOneNumber(text);
  if (number === null) return text;
  if (number.kind === 'malformed') return refuseYamlScalar(yamlMalformedNumber(text).message, text);
  return yamlNumberValue(number, text);
}

/** Record, for the collection that now holds `value` under `key`, that it was a plain scalar read as a number (the text the page holds is not one a quoted scalar can be told from). */
function notePlainNumber(container, key, value) {
  const seen = yamlPlainNumberSeen;
  yamlPlainNumberSeen = null;
  if (seen === null || typeof value !== 'string' || seen.value !== value) return;
  let marks = container[YAML_PLAIN_NUMBERS];
  if (!marks) {
    marks = Object.create(null);
    Object.defineProperty(container, YAML_PLAIN_NUMBERS, {
      value: marks,
      writable: true,
      enumerable: false,
      configurable: true
    });
  }
  marks[key] = { value, number: seen.number };
}

/** What `container[key]` was written as when it is a text only because the page holds a YAML 1.1 number so (`{ kind, big, value, source }`), else undefined. */
function plainNumberOf(container, key) {
  const marks = container !== null && typeof container === 'object' ? container[YAML_PLAIN_NUMBERS] : undefined;
  const mark = marks ? marks[key] : undefined;
  return mark !== undefined && container[key] === mark.value ? mark.number : undefined;
}

// The functions below read through a cursor `p` = { lines, i, col }: the lines of the document, and the position of
// the next character to read.

/** Move to the next content: skip the blanks, comments and line ends. False at the end of the document. */
function skipYamlToContent(p) {
  for (;;) {
    if (p.i >= p.lines.length) return false;
    const line = p.lines[p.i];
    let c = p.col;
    while (c < line.length && isYamlWs(line[c])) c++;
    if (c >= line.length || isYamlCommentAt(line, c)) {
      p.i++;
      p.col = 0;
      continue;
    }
    if (p.col === 0 && line.slice(0, c).indexOf('\t') !== -1)
      throw yamlError('tabs cannot be used for indentation', p.i);
    p.col = c;
    return true;
  }
}

/** The rest of the line must be blank or a comment. */
function expectYamlEol(p) {
  const line = p.lines[p.i];
  let c = p.col;
  while (c < line.length && isYamlWs(line[c])) c++;
  if (c < line.length && !isYamlCommentAt(line, c)) {
    throw yamlError('unexpected text "' + line.slice(c, c + 30) + '" after the value', p.i);
  }
  p.col = line.length;
}

function leadingYamlWs(line) {
  let c = 0;
  while (c < line.length && isYamlWs(line[c])) c++;
  return c;
}

/** Read a single- or double-quoted scalar (possibly folded over several lines) starting at the cursor. */
function readYamlQuoted(p, quote) {
  const startLine = p.i;
  let line = p.lines[p.i];
  let i = p.col + 1;
  let out = '';
  let keep = 0; // the part of `out` that is content (escapes) and is not trimmed when a line is folded
  const nextLine = (blanksAsNewlines, trim) => {
    if (trim) {
      let end = out.length;
      while (end > keep && isYamlWs(out[end - 1])) end--;
      out = out.slice(0, end);
    }
    let blanks = 0;
    let j = p.i + 1;
    while (j < p.lines.length && yamlLineBlank(p.lines[j])) {
      blanks++;
      j++;
    }
    if (j >= p.lines.length) throw yamlError('the quoted text starting here is never closed', startLine);
    out += blanksAsNewlines ? (blanks === 0 ? ' ' : '\n'.repeat(blanks)) : '\n'.repeat(blanks);
    keep = out.length;
    p.i = j;
    line = p.lines[j];
    i = leadingYamlWs(line);
  };
  for (;;) {
    if (i >= line.length) {
      nextLine(true, true);
      continue;
    }
    const c = line[i];
    if (quote === '"') {
      if (c === '"') {
        p.col = i + 1;
        return out;
      }
      if (c === '\\') {
        if (i + 1 >= line.length) {
          nextLine(false, false);
          continue;
        } // an escaped line break
        const esc = readYamlEscape(line, i, p.i);
        out += esc.text;
        keep = out.length;
        i = esc.next;
        continue;
      }
    } else if (c === "'") {
      if (line[i + 1] === "'") {
        out += "'";
        keep = out.length;
        i += 2;
        continue;
      }
      p.col = i + 1;
      return out;
    }
    out += c;
    i++;
  }
}

/** Read a plain scalar in block context (maybe folded over several lines more indented than `parentIndent`). */
function readYamlPlainBlock(p, parentIndent) {
  const lines = p.lines;
  const first = lines[p.i];
  if (isYamlSeqItem(first, p.col)) throw yamlError('a sequence entry is not allowed here', p.i);
  const cut = (line, from) => {
    for (let k = from + 1; k < line.length; k++)
      if (isYamlCommentAt(line, k)) return line.slice(from, k).replace(/[ \t]+$/, '');
    return line.slice(from).replace(/[ \t]+$/, '');
  };
  const check = (text, lineIndex) => {
    if (/:([ \t]|$)/.test(text))
      throw yamlError('a mapping value is not allowed here: "' + text.slice(0, 40) + '"', lineIndex);
  };
  let out = cut(first, p.col);
  check(out, p.i);
  let blanks = 0;
  let last = p.i;
  for (let j = p.i + 1; j < lines.length; j++) {
    const l = lines[j];
    if (yamlLineBlank(l)) {
      blanks++;
      continue;
    }
    const ind = leadingYamlWs(l);
    if (ind <= parentIndent || l[ind] === '#') break;
    const body = cut(l, ind);
    check(body, j);
    out += (blanks === 0 ? ' ' : '\n'.repeat(blanks)) + body;
    blanks = 0;
    last = j;
  }
  p.i = last;
  p.col = lines[last].length;
  p.plain = out;
  try {
    return resolveYamlPlain(out);
  } catch (e) {
    if (e.name === 'YamlMalformedNumber') e.line = p.i + 1;
    throw e;
  }
}

/** Read a literal (`|`) or folded (`>`) block scalar whose header is at the cursor. */
function parseYamlBlockScalar(p, parentIndent) {
  const lines = p.lines;
  const header = lines[p.i].slice(p.col);
  const m = /^([|>])(?:([1-9])([+-])?|([+-])([1-9])?)?(?:[ \t]+#.*)?[ \t]*$/.exec(header);
  if (!m) throw yamlError('invalid block scalar header "' + header.slice(0, 30) + '"', p.i);
  const folded = m[1] === '>';
  const chomp = m[3] || m[4] || '';
  const explicit = m[2] || m[5];
  let j = p.i + 1;
  const base = parentIndent < 0 ? 0 : parentIndent;
  let contentIndent = null;
  if (explicit) {
    contentIndent = base + Number(explicit);
  } else {
    let k = j;
    while (k < lines.length && yamlLineBlank(lines[k])) k++;
    if (k < lines.length) {
      const ind = leadingYamlWs(lines[k]);
      if (ind > parentIndent) contentIndent = ind;
    }
  }
  const content = [];
  if (contentIndent !== null) {
    for (; j < lines.length; j++) {
      const l = lines[j];
      if (yamlLineBlank(l) && l.length <= contentIndent) {
        content.push('');
        continue;
      }
      if (leadingYamlWs(l) < contentIndent) break;
      content.push(l.slice(contentIndent));
    }
  } else {
    while (j < lines.length && yamlLineBlank(lines[j])) {
      content.push('');
      j++;
    }
  }
  p.i = j;
  p.col = 0;
  let trailing = 0;
  while (content.length > 0 && content[content.length - 1] === '') {
    content.pop();
    trailing++;
  }
  if (content.length === 0) return chomp === '+' ? '\n'.repeat(trailing) : '';
  let body;
  if (!folded) {
    body = content.join('\n');
  } else {
    body = '';
    let blanks = 0;
    let prev = null;
    let prevMore = false;
    for (const l of content) {
      if (l === '') {
        blanks++;
        continue;
      }
      const more = isYamlWs(l[0]);
      if (prev === null) body += '\n'.repeat(blanks);
      else if (!prevMore && !more) body += blanks === 0 ? ' ' : '\n'.repeat(blanks);
      else body += '\n'.repeat(blanks + 1);
      body += l;
      prev = l;
      prevMore = more;
      blanks = 0;
    }
  }
  if (chomp === '-') return body;
  return body + '\n' + (chomp === '+' ? '\n'.repeat(trailing) : '');
}

/**
 * Skip the blanks, line ends and comments inside a flow collection (which may span lines). When the cursor has a `comments` list, each comment skipped is added to it
 * (see `openFlowLists`): `{ text, gap, before, after }`, `before` the number of values read so far, `after` the index of the value it trails (it sits on the line where that
 * value ends, with nothing but `,` and closing brackets between them) or -1 when it stands on its own, above the value that follows.
 */
function skipYamlFlowSpace(p, startLine) {
  for (;;) {
    if (p.i >= p.lines.length) throw yamlError('the flow collection starting here is never closed', startLine);
    const line = p.lines[p.i];
    while (p.col < line.length && isYamlWs(line[p.col])) p.col++;
    if (p.col >= line.length || isYamlCommentAt(line, p.col)) {
      if (p.comments && p.col < line.length) {
        const last = p.leaves && p.leaves.length > 0 ? p.leaves[p.leaves.length - 1] : null;
        const trails =
          last !== null &&
          last.line === p.i &&
          line.slice(0, p.col).trim() !== '' &&
          line.slice(last.col, p.col).replace(/[\s,\]}]/g, '') === '';
        p.comments.push({
          text: line.slice(p.col),
          gap: line.slice(0, p.col).match(/[ \t]*$/)[0],
          before: p.leaves ? p.leaves.length : 0,
          after: trails ? p.leaves.length - 1 : -1
        });
      }
      p.i++;
      p.col = 0;
      continue;
    }
    return;
  }
}

/** A plain scalar inside a flow collection: `{ text }`, ending at `,` `]` `}` or a `:` that separates a key. */
function readYamlFlowPlain(p, startLine) {
  let out = '';
  let pending = '';
  for (;;) {
    const line = p.lines[p.i];
    if (p.col >= line.length) {
      let blanks = 0;
      let j = p.i + 1;
      while (j < p.lines.length && yamlLineBlank(p.lines[j])) {
        blanks++;
        j++;
      }
      if (j >= p.lines.length) throw yamlError('the flow collection starting here is never closed', startLine);
      const next = p.lines[j];
      const ind = leadingYamlWs(next);
      if (isYamlCommentAt(next, ind)) break;
      pending = blanks === 0 ? ' ' : '\n'.repeat(blanks);
      p.i = j;
      p.col = ind;
      continue;
    }
    const c = line[p.col];
    const after = line[p.col + 1];
    if (',[]{}'.indexOf(c) !== -1) break;
    if (c === ':' && (after === undefined || isYamlWs(after) || ',[]{}'.indexOf(after) !== -1)) break;
    if (isYamlCommentAt(line, p.col)) break;
    if (isYamlWs(c)) {
      pending += c;
    } else {
      out += pending + c;
      pending = '';
    }
    p.col++;
  }
  return { text: out };
}

/**
 * One node of a flow collection: a collection or a scalar (`{ value, text, scalar }`). When the cursor has a `leaves` list, the way each value is written is added to it,
 * in the order the emitter writes them (a scalar, an empty collection or a missing value counts, a key does not): `{ quote, word, line, col }`, `quote` is `'"'`, `"'"` or
 * `''`, `word` the text of a plain scalar and `line`, `col` where the value ends (see `openFlowLists`). A cursor with a `keys` list gets the keys, in the order they are
 * read: `{ key, written }`, `written` the key as it stands in the text when it is quoted. The reading itself is the same with or without them.
 */
function parseYamlFlowNode(p, startLine) {
  const node = parseYamlFlowNodeRead(p, startLine);
  if (p.notes && node.ast === undefined) node.ast = { type: 'unsupported' };
  return node;
}

/**
 * `parseYamlFlowNode` itself. When the cursor has `notes` (the save, see `openYamlDecorations`), each node it gives also carries `ast`, how it is written: `{ type: 'seq', items }`,
 * `{ type: 'map', entries: [{ key, value }] }` (`key` the key as written, null when it is not on one line), `{ type: 'scalar', raw, value }` (`raw` the token as written, null when
 * it goes over several lines), `{ type: 'alias', name }` or `{ type: 'unsupported' }`, with `props` (the anchor and the tag as written) when it has them; and `p.flowDecorated`
 * is set when an anchor, an alias or a tag is met. The reading itself is the same with or without them.
 */
function parseYamlFlowNodeRead(p, startLine) {
  const note = (quote, word) => {
    if (p.leaves) p.leaves.push({ quote, word: word === undefined ? null : word, line: p.i, col: p.col });
  };
  const forget = () => {
    if (p.leaves) p.leaves.pop();
  }; // the scalar just read was a key
  const keyed = (text, from, to) => {
    // the key spans `from` to `to`
    if (!p.keys) return;
    const quote = p.lines[from.i][from.col];
    p.keys.push({
      key: text,
      written: (quote === '"' || quote === "'") && from.i === to.i ? p.lines[from.i].slice(from.col, to.col) : null
    });
  };
  skipYamlFlowSpace(p, startLine);
  const line = p.lines[p.i];
  const c = line[p.col];
  // the token as written, when it is on one line (see `parseYamlFlowNode`)
  const rawFrom = (from) => (from.i === p.i ? p.lines[p.i].slice(from.col, p.col) : null);
  if (c === '[') {
    p.col++;
    const arr = [];
    const items = [];
    let pairs = false;
    for (;;) {
      skipYamlFlowSpace(p, startLine);
      if (p.lines[p.i][p.col] === ']') {
        p.col++;
        if (arr.length === 0) note('');
        return { value: arr, scalar: false, ast: pairs ? { type: 'unsupported' } : { type: 'seq', items } };
      }
      const at = { i: p.i, col: p.col };
      const item = parseYamlFlowNode(p, startLine);
      const read = { i: p.i, col: p.col };
      skipYamlFlowSpace(p, startLine);
      if (item.scalar && p.lines[p.i][p.col] === ':') {
        // a single pair inside a sequence: `[a: b]`
        forget();
        p.col++;
        const pair = {};
        keyed(item.text, at, read);
        setYamlKey(pair, item.text, parseYamlFlowPairValue(p, startLine));
        pushYamlItem(arr, pair);
        pairs = true; // not a layout the save writes as a block
      } else {
        pushYamlItem(arr, item.value);
        items.push(item.ast);
      }
      skipYamlFlowSpace(p, startLine);
      const d = p.lines[p.i][p.col];
      if (d === ',') {
        p.col++;
        continue;
      }
      if (d === ']') {
        p.col++;
        return { value: arr, scalar: false, ast: pairs ? { type: 'unsupported' } : { type: 'seq', items } };
      }
      throw yamlError('expected "," or "]" in the flow sequence', p.i);
    }
  }
  if (c === '{') {
    p.col++;
    const map = {};
    const entries = [];
    let keyProps = false;
    for (;;) {
      skipYamlFlowSpace(p, startLine);
      if (p.lines[p.i][p.col] === '}') {
        p.col++;
        if (Object.keys(map).length === 0) note('');
        return { value: map, scalar: false, ast: keyProps ? { type: 'unsupported' } : { type: 'map', entries } };
      }
      const at = { i: p.i, col: p.col };
      const keyNode = parseYamlFlowNode(p, startLine);
      if (!keyNode.scalar) throw yamlError('a collection cannot be a key of a flow mapping', p.i);
      forget();
      keyed(keyNode.text, at, { i: p.i, col: p.col });
      if (keyNode.ast && keyNode.ast.props) keyProps = true; // an anchor or a tag on a key: the save does not write it (it is read here, in brackets, and refused in a block)
      skipYamlFlowSpace(p, startLine);
      let value = null;
      p.pairAst = { type: 'scalar', raw: '', value: null };
      if (p.lines[p.i][p.col] === ':') {
        p.col++;
        value = parseYamlFlowPairValue(p, startLine);
      } else {
        note('');
      }
      if (p.notes)
        entries.push({ key: keyNode.ast && keyNode.ast.type === 'scalar' ? keyNode.ast.raw : null, value: p.pairAst });
      setYamlKey(map, keyNode.text, value);
      skipYamlFlowSpace(p, startLine);
      const d = p.lines[p.i][p.col];
      if (d === ',') {
        p.col++;
        continue;
      }
      if (d === '}') {
        p.col++;
        return { value: map, scalar: false, ast: keyProps ? { type: 'unsupported' } : { type: 'map', entries } };
      }
      throw yamlError('expected "," or "}" in the flow mapping', p.i);
    }
  }
  if (c === '"' || c === "'") {
    const from = { i: p.i, col: p.col };
    const text = readYamlQuoted(p, c);
    note(c);
    return { value: text, text, scalar: true, ast: { type: 'scalar', raw: rawFrom(from), value: text } };
  }
  if (c === '*') {
    if (p.notes) p.flowDecorated = true; // the save follows an anchor, an alias or a tag inside brackets by writing the collection as a block first (see `openDecoratedFlows`)
    const from = p.col;
    const value = readYamlAlias(p);
    return { value, scalar: false, ast: { type: 'alias', name: p.lines[p.i].slice(from + 1, p.col) } };
  }
  if (c === '&' || c === '!') {
    if (p.notes) p.flowDecorated = true;
    const props = readYamlProperties(p);
    const tokens = p.lines[p.i].slice(props.from, props.end);
    skipYamlFlowSpace(p, startLine);
    const raw = yamlRawScalars;
    const first = p.lines[p.i][p.col];
    yamlRawScalars =
      props.tag !== null && props.tag !== '!' && first !== undefined && '[{"\'*&!|>,]}'.indexOf(first) === -1;
    let node;
    try {
      node = parseYamlFlowNode(p, startLine);
    } finally {
      yamlRawScalars = raw;
    }
    const value = adoptYamlProperties(p, props, node.value, node.scalar ? node.text : '', p.i);
    const ast =
      node.ast && node.ast.type !== 'alias' && node.ast.type !== 'unsupported'
        ? Object.assign({}, node.ast, { props: tokens })
        : { type: 'unsupported' };
    if (ast.type === 'scalar') ast.value = value;
    return { value, text: node.text, scalar: node.scalar, ast };
  }
  if (',]}|>'.indexOf(c) !== -1) throw yamlError('unexpected "' + c + '" in a flow collection', p.i);
  const from = { i: p.i, col: p.col };
  const plain = readYamlFlowPlain(p, startLine);
  if (plain.text === '') throw yamlError('unexpected "' + (p.lines[p.i][p.col] || '') + '" in a flow collection', p.i);
  note('', plain.text);
  try {
    const value = resolveYamlPlain(plain.text);
    const written = p.lines[from.i].slice(from.col, from.col + plain.text.length) === plain.text ? plain.text : null; // on one line (the cursor may be on the next one, at a `]`)
    return { value, text: plain.text, scalar: true, ast: { type: 'scalar', raw: written, value } };
  } catch (e) {
    if (e.name === 'YamlMalformedNumber') e.line = p.i + 1;
    throw e;
  }
}

/** The value after the `:` of a pair of a flow collection (null when it is missing). With `notes`, how it is written is left in `p.pairAst` (see `parseYamlFlowNode`). */
function parseYamlFlowPairValue(p, startLine) {
  skipYamlFlowSpace(p, startLine);
  const d = p.lines[p.i][p.col];
  if (d === ',' || d === '}' || d === ']') {
    if (p.leaves) p.leaves.push({ quote: '', word: null, line: p.i, col: p.col });
    p.pairAst = { type: 'scalar', raw: '', value: null };
    return null;
  }
  const node = parseYamlFlowNode(p, startLine);
  p.pairAst = node.ast;
  return node.value;
}

/**
 * A scalar or a flow collection starting at the cursor, on a line of its own or after `key:` / `- `. `keyed` says that the line is a `key:` of a mapping, whose value may be a
 * list at the column of the key.
 */
function parseYamlInline(p, parentIndent, keyed) {
  const line = p.lines[p.i];
  const c = line[p.col];
  if (c === '|' || c === '>') return parseYamlBlockScalar(p, parentIndent);
  if (c === '*') {
    const at = p.col;
    const value = readYamlAlias(p);
    if (p.notes) p.notes.list.push({ kind: 'alias', line: p.i, from: at, to: p.col, value: cloneYamlValue(value) });
    expectYamlEol(p);
    return value;
  }
  if (c === '&' || c === '!') return parseYamlProperties(p, parentIndent, keyed);
  const held = p.notesHeld === true; // the node has an anchor or a tag: `parseYamlProperties` notes it
  p.notesHeld = false;
  const start = { i: p.i, col: p.col };
  let value;
  if (c === '"' || c === "'") {
    value = readYamlQuoted(p, c);
    p.scalarEnd = p.col; // the column after the closing quote: what follows it on the line is a comment (see `yamlScalarTail`)
    if (p.notes && !held && p.i !== start.i)
      p.notes.list.push({
        kind: 'lines',
        line: start.i,
        last: p.i,
        from: start.col,
        scalarEnd: p.col,
        value: cloneYamlValue(value)
      });
  } else if (c === '[' || c === '{') {
    const outer = p.flowDecorated;
    p.flowDecorated = false;
    if (p.notes) p.comments = [];
    let node;
    try {
      node = parseYamlFlowNode(p, p.i);
    } finally {
      const comments = p.comments;
      p.comments = undefined;
      if (p.notes && p.flowDecorated && node) {
        p.notes.list.push({
          kind: 'flow',
          line: start.i,
          from: start.col,
          last: p.i,
          to: p.col,
          ast: node.ast,
          comments: comments.map((comment) => comment.text)
        });
      }
      p.flowDecorated = outer;
    }
    value = node.value;
  } else if (c === '?' && (p.col + 1 >= line.length || isYamlWs(line[p.col + 1]))) {
    throw yamlError('complex mapping keys are not supported', p.i);
  } else {
    value = readYamlPlainBlock(p, parentIndent);
    p.scalarEnd = null; // a plain text: its comment is found on its last line (see `yamlScalarTail`)
    if (p.notes && !held && p.i !== start.i)
      p.notes.list.push({
        kind: 'lines',
        line: start.i,
        last: p.i,
        from: start.col,
        scalarEnd: null,
        value: cloneYamlValue(value)
      });
    return value;
  }
  expectYamlEol(p);
  return value;
}

/** The plain scalars read as numbers that `from` notes, noted for `to` (a copy of it). */
function copyPlainNumbers(from, to) {
  const marks = from[YAML_PLAIN_NUMBERS];
  if (marks)
    Object.defineProperty(to, YAML_PLAIN_NUMBERS, {
      value: Object.assign(Object.create(null), marks),
      writable: true,
      enumerable: false,
      configurable: true
    });
}

/** A copy of a value read by `parseYaml`, the order of the keys included: what an alias is. */
function cloneYamlValue(value) {
  if (Array.isArray(value)) {
    const copy = value.map(cloneYamlValue);
    copyPlainNumbers(value, copy);
    return copy;
  }
  if (value !== null && typeof value === 'object') {
    const copy = {};
    for (const key of yamlKeysOf(value)) setYamlKey(copy, key, cloneYamlValue(value[key]));
    copyPlainNumbers(value, copy);
    return copy;
  }
  return value;
}

/**
 * The anchor and the tag at the cursor (`&a`, `!!str`, `!local`, `!<tag:yaml.org,2002:str>`, in either order): `{ anchor, tag, from, end, to }`, `from` and `end` the columns
 * the tokens span and `to` the column of what follows them, or `null` when there is none. The cursor moves to `to`.
 */
function readYamlProperties(p) {
  const line = p.lines[p.i];
  const from = p.col;
  let anchor = null;
  let tag = null;
  let end = from;
  while (line[p.col] === '&' || line[p.col] === '!') {
    const start = p.col;
    let stop = start + 1;
    if (line[start] === '!' && line[stop] === '<') {
      stop = line.indexOf('>', stop);
      if (stop === -1) throw yamlError('a tag that is never closed', p.i);
      stop++;
    } else {
      while (stop < line.length && !isYamlWs(line[stop]) && ',[]{}'.indexOf(line[stop]) === -1) stop++;
    }
    const token = line.slice(start, stop);
    if (line[start] === '&') {
      if (token.length === 1) throw yamlError('an anchor needs a name', p.i);
      if (anchor !== null) throw yamlError('a node has only one anchor', p.i);
      anchor = token.slice(1);
    } else {
      if (tag !== null) throw yamlError('a node has only one tag', p.i);
      tag = token;
    }
    end = stop;
    p.col = stop;
    while (p.col < line.length && isYamlWs(line[p.col])) p.col++;
  }
  return anchor === null && tag === null ? null : { anchor, tag, from, end, to: p.col };
}

/** An alias at the cursor (`*name`): a copy of the node the anchor `name` was given to. The cursor moves past it. */
function readYamlAlias(p) {
  const line = p.lines[p.i];
  const from = p.col;
  let stop = from + 1;
  while (stop < line.length && !isYamlWs(line[stop]) && ',[]{}'.indexOf(line[stop]) === -1) stop++;
  const name = line.slice(from + 1, stop);
  if (name === '') throw yamlError('an alias needs a name', p.i);
  if (!p.anchors.has(name)) throw yamlError('found undefined alias `' + name + '`', p.i);
  p.col = stop;
  return cloneYamlValue(p.anchors.get(name));
}

/** The bits a digit of a radix holds, and how many digits Java's `BigInteger` reads at once (`digitsPerInt`): what the command line's reader goes by when it turns `0x...`, `0b...` and `0...` into a number. */
const JAVA_RADIX_BITS = { 2: 1, 8: 3, 16: 4 };
const JAVA_RADIX_DIGITS_PER_INT = { 2: 30, 8: 10, 16: 7 };

/** The value of one ASCII digit in a radix, or -1 (Java's `Character.digit`; the digits of other scripts that Java reads are not read here). */
function javaDigit(ch, radix) {
  const v = /^[0-9]$/.test(ch)
    ? ch.charCodeAt(0) - 48
    : /^[a-zA-Z]$/.test(ch)
      ? ch.toLowerCase().charCodeAt(0) - 87
      : -1;
  return v >= 0 && v < radix ? v : -1;
}

/** `Integer.parseInt(text, radix)` / `Long.parseLong(text, radix)` for a text that fits: a number, or the sentence Java gives. */
function javaParseRadix(text, radix) {
  let i = text[0] === '-' || text[0] === '+' ? 1 : 0;
  let ok = i < text.length;
  for (let k = i; ok && k < text.length; k++) if (javaDigit(text[k], radix) < 0) ok = false;
  if (!ok) return { message: 'For input string: "' + text + '" under radix ' + radix };
  const big = text
    .slice(i)
    .split('')
    .reduce((acc, ch) => acc * BigInt(radix) + BigInt(javaDigit(ch, radix)), 0n);
  return { big: text[0] === '-' ? -big : big };
}

/** `new BigInteger(text, radix)`: a number, or the sentence Java gives (the first group of digits that is not one: it reads them by groups, the first one the shorter). */
function javaBigInteger(text, radix) {
  const len = text.length;
  if (len === 0) return { message: 'Zero length BigInteger' };
  let cursor = 0;
  let negative = false;
  const minus = text.lastIndexOf('-');
  const plus = text.lastIndexOf('+');
  if (minus >= 0) {
    if (minus !== 0 || plus >= 0) return { message: 'Illegal embedded sign character' };
    negative = true;
    cursor = 1;
  } else if (plus >= 0) {
    if (plus !== 0) return { message: 'Illegal embedded sign character' };
    cursor = 1;
  }
  if (cursor === len) return { message: 'Zero length BigInteger' };
  while (cursor < len && javaDigit(text[cursor], radix) === 0) cursor++;
  if (cursor === len) return { big: 0n };
  const perInt = JAVA_RADIX_DIGITS_PER_INT[radix];
  let first = (len - cursor) % perInt;
  if (first === 0) first = perInt;
  let big = 0n;
  let size = first;
  while (cursor < len) {
    const group = text.slice(cursor, cursor + size);
    const parsed = javaParseRadix(group, radix);
    if (parsed.message) return parsed;
    big = big * BigInt(radix) ** BigInt(group.length) + parsed.big;
    cursor += size;
    size = perInt;
  }
  return { big: negative ? -big : big };
}

/**
 * What the command line's reader makes of a scalar tagged `!!int` (Jackson over SnakeYAML; found by trying every spelling of up to five characters, and the long ones that decide
 * between `int`, `long` and `BigInteger`): `{ kind: 'int', big, javaText }`; null when it stays the text (`1:30`, `1e3`, `abc`, `0o17`); `{ refused }` for a number it cannot read (`09` is
 * not an octal number, `0x` has no digits). A sign, then `0` and a digit or `_` is an octal number, `0x` a hexadecimal one and `0b` a binary one; otherwise only digits and `_` make a decimal
 * number. The `_` are dropped first. The digits of a script other than ASCII, which Java reads, are not.
 */
function yamlTaggedInt(body) {
  const signed = body[0] === '-' || body[0] === '+';
  const rest = signed ? body.slice(1) : body;
  const negative = body[0] === '-';
  const cleaned = rest.replace(/_/g, '');
  let radix = 0;
  if (rest[0] === '0' && rest.length > 1)
    radix = /[0-9_]/.test(rest[1]) ? 8 : /[xX]/.test(rest[1]) ? 16 : /[bB]/.test(rest[1]) ? 2 : 0;
  let big;
  if (radix !== 0) {
    const digits = cleaned.slice(radix === 8 ? 1 : 2);
    const parsed =
      digits.length * JAVA_RADIX_BITS[radix] <= 63 ? javaParseRadix(digits, radix) : javaBigInteger(digits, radix);
    if (parsed.message)
      return { refused: 'Invalid base-' + radix + " number ('" + digits + "'), problem: " + parsed.message };
    big = parsed.big;
  } else if (/^[0-9_]*$/.test(rest)) {
    if (cleaned === '') return { refused: "Invalid number ('" + body + "')" };
    big = BigInt(cleaned);
  } else {
    return null;
  }
  if (negative) big = -big;
  return { kind: 'int', big, javaText: big.toString() };
}

/**
 * What the command line's reader makes of a scalar tagged `!!float`: Java's `Double.parseDouble` of the text without its `_`, so `{ kind: 'float', value, javaText }` for `12` (`12.0`),
 * `1e3`, `5.`, `1d`, `0x1p3`, `Infinity` and `NaN` (which are the text `Infinity` and `NaN` in the content, as a number JSON cannot hold), and `{ refused }` with the sentence of the
 * reader (`Malformed numeric value 'x'`) for anything else. A hexadecimal one that is not a normal number is not rounded the way Java does.
 */
function yamlTaggedFloat(body) {
  const underscored = body.indexOf('_') !== -1 ? (body[0] === '+' ? body.slice(1) : body).replace(/_/g, '') : body; // with a `_` in it a first `+` goes too
  const cleaned = underscored.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '');
  const refused = { refused: "Malformed numeric value '" + body + "'" };
  const named = /^([-+]?)(NaN|Infinity)$/.exec(cleaned);
  if (named) {
    const value = named[2] === 'NaN' ? NaN : named[1] === '-' ? -Infinity : Infinity;
    return { kind: 'float', value, javaText: named[2] === 'NaN' ? 'NaN' : value < 0 ? '-Infinity' : 'Infinity' };
  }
  const decimal = /^([-+]?)((?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)[fFdD]?$/.exec(cleaned);
  if (decimal) {
    const value = Number(decimal[2]) * (decimal[1] === '-' ? -1 : 1);
    return { kind: 'float', value, javaText: javaDoubleText(value) };
  }
  const hex = /^([-+]?)0[xX]([0-9a-fA-F]*)\.?([0-9a-fA-F]*)[pP]([-+]?\d+)[fFdD]?$/.exec(cleaned);
  if (
    hex &&
    (hex[2] !== '' || hex[3] !== '') &&
    /^0[xX][0-9a-fA-F]*(\.[0-9a-fA-F]*)?[pP]/.test(cleaned.replace(/^[-+]/, ''))
  ) {
    // the mantissa is rounded once, to the nearest, as Java does; the power of two that scales it is exact (but for the numbers that are not normal)
    const scale = Number(hex[4]) - 4 * hex[3].length;
    const value =
      Number(BigInt('0x' + (hex[2] + hex[3] || '0'))) *
      Math.pow(2, Math.trunc(scale / 2)) *
      Math.pow(2, scale - Math.trunc(scale / 2)) *
      (hex[1] === '-' ? -1 : 1);
    return { kind: 'float', value, javaText: javaDoubleText(value) };
  }
  return refused;
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * What the command line's reader makes of a scalar tagged `!!binary`: the bytes of the base64 text, which the content then holds as the base64 text of those bytes (`aGVsbG8=` is
 * `aGVsbG8=`; a text whose last bits are not zero is written with them zero). Jackson's decoder of the MIME variant, with its sentences. `{ text }` or `{ refused }`.
 */
function yamlTaggedBinary(body) {
  const bad = (ch, index, extra) => {
    const code = ch.charCodeAt(0);
    let base;
    if (code <= 32)
      base =
        'Illegal white space character (code 0x' +
        code.toString(16) +
        ') as character #' +
        (index + 1) +
        ' of 4-char base64 unit: can only used between units';
    else if (ch === '=')
      base =
        "Unexpected padding character ('=') as character #" +
        (index + 1) +
        ' of 4-char base64 unit: padding only legal as 3rd or 4th character';
    else if (code < 32 || (code >= 127 && code < 160))
      base = 'Illegal character (code 0x' + code.toString(16) + ') in base64 content';
    else base = "Illegal character '" + ch + "' (code 0x" + code.toString(16) + ') in base64 content';
    return { refused: extra ? base + ': ' + extra : base };
  };
  const eof = {
    refused:
      "Unexpected end of base64-encoded String: base64 variant 'MIME' expects padding (one or more '=' characters) at the end. This Base64Variant might have been incorrectly configured"
  };
  const value = (ch) => BASE64_ALPHABET.indexOf(ch);
  const bytes = [];
  const len = body.length;
  let ptr = 0;
  main: while (ptr < len) {
    let ch;
    do {
      if (ptr >= len) break main;
      ch = body[ptr++];
    } while (ch.charCodeAt(0) <= 32);
    let bits = value(ch);
    if (bits < 0) return bad(ch, 0);
    let data = bits;
    if (ptr >= len) return eof;
    ch = body[ptr++];
    bits = value(ch);
    if (bits < 0) return bad(ch, 1);
    data = (data << 6) | bits;
    if (ptr >= len) return eof;
    ch = body[ptr++];
    bits = value(ch);
    if (bits < 0) {
      if (ch !== '=') return bad(ch, 2);
      if (ptr >= len) return eof;
      ch = body[ptr++];
      if (ch !== '=') return bad(ch, 3, "expected padding character '='");
      bytes.push((data >> 4) & 255);
      continue;
    }
    data = (data << 6) | bits;
    if (ptr >= len) return eof;
    ch = body[ptr++];
    bits = value(ch);
    if (bits < 0) {
      if (ch !== '=') return bad(ch, 3);
      data >>= 2;
      bytes.push((data >> 8) & 255, data & 255);
    } else {
      data = (data << 6) | bits;
      bytes.push((data >> 16) & 255, (data >> 8) & 255, data & 255);
    }
  }
  let text = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    const chunk =
      BASE64_ALPHABET[(n >> 18) & 63] +
      BASE64_ALPHABET[(n >> 12) & 63] +
      BASE64_ALPHABET[(n >> 6) & 63] +
      BASE64_ALPHABET[n & 63];
    text += i + 2 < bytes.length ? chunk : i + 1 < bytes.length ? chunk.slice(0, 3) + '=' : chunk.slice(0, 2) + '==';
  }
  return { text };
}

/**
 * What a tag makes of a scalar, the way the Java side's reader takes it: `!!str` is the text, `!!int` and `!!float` the number (`yamlTaggedInt`, `yamlTaggedFloat`: what the reader cannot
 * read is its sentence, the text when it only is no integer), `!!binary` the base64 text of its bytes (`yamlTaggedBinary`), `!!bool`
 * the boolean (or the text, when it is not a boolean word), `!!null` a null, any other tag (`!!timestamp`, `!local`) the text. A tag on a collection is left out. `text` is the
 * scalar as written.
 */
function applyYamlTag(tag, value, text) {
  if (value !== null && typeof value === 'object') return value;
  if (tag === '!') return value;
  const named = /^!!(.+)$/.exec(tag) || /^!<tag:yaml\.org,2002:(.+)>$/.exec(tag);
  const name = named ? named[1] : null;
  const body = String(text);
  if (name === 'null') return resolveYamlPlain(body, true) === null ? null : body;
  if (name === 'bool') {
    const word = resolveYamlPlain(body, true);
    return typeof word === 'boolean' ? word : body;
  }
  if (body === '') return body;
  yamlPlainNumberSeen = null;
  if (name === 'binary') {
    const decoded = yamlTaggedBinary(body);
    return decoded.refused ? refuseYamlScalar(decoded.refused, body, true) : decoded.text;
  }
  if (name === 'int' || name === 'float') {
    const number = name === 'int' ? yamlTaggedInt(body) : yamlTaggedFloat(body);
    if (number === null) return body;
    if (number.refused) return refuseYamlScalar(number.refused, body, name === 'int');
    return yamlNumberValue(number, body);
  }
  return body;
}

/** What a plain scalar reads as without a tag (no mark is left behind and nothing is refused). */
function untaggedReadingOf(text) {
  const seen = yamlPlainNumberSeen;
  const raw = yamlRawScalars;
  const deferring = yamlDeferMalformed;
  yamlRawScalars = false;
  yamlDeferMalformed = true;
  try {
    return resolveYamlPlain(text);
  } finally {
    yamlPlainNumberSeen = seen;
    yamlRawScalars = raw;
    yamlDeferMalformed = deferring;
  }
}

/** The value of a node that has an anchor and a tag: the tag applied, the anchor given to the result. */
function adoptYamlProperties(p, props, value, text, lineIndex) {
  const result = props.tag === null ? value : applyYamlTag(props.tag, value, text);
  if (props.anchor !== null) p.anchors.set(props.anchor, result);
  return result;
}

/**
 * A node that begins with an anchor or a tag, at the cursor: its value follows on the line, or below it (deeper than `parentIndent`; a list at the column of the key when
 * `keyed`). When the cursor has `notes`, it is told where the tokens are and what they changed (see `openYamlDecorations`).
 */
function parseYamlProperties(p, parentIndent, keyed) {
  const lineIndex = p.i;
  const props = readYamlProperties(p);
  const line = p.lines[p.i];
  let value;
  let text = '';
  let inline;
  if (p.col >= line.length || isYamlCommentAt(line, p.col)) {
    inline = 'below';
    p.col = line.length;
    if (!skipYamlToContent(p)) value = null;
    else if (p.col > parentIndent) value = parseYamlBlockNode(p, parentIndent);
    else if (keyed && p.col === parentIndent && isYamlSeqItem(p.lines[p.i], p.col))
      value = parseYamlSequence(p, parentIndent);
    else value = null;
  } else {
    if (line[p.col] === '*') throw yamlError('an alias cannot have an anchor or a tag', p.i);
    if (scanYamlKey(line, p.col, p.i) !== null) throw yamlError('an anchor or a tag on a key is not supported', p.i);
    const c = line[p.col];
    inline =
      c === '"' || c === "'" ? 'quoted' : c === '[' || c === '{' ? 'flow' : c === '|' || c === '>' ? 'block' : 'plain';
    p.plain = undefined;
    const raw = yamlRawScalars;
    yamlRawScalars = inline === 'plain' && props.tag !== null && props.tag !== '!';
    p.notesHeld = true;
    try {
      value = parseYamlInline(p, parentIndent, keyed);
    } finally {
      yamlRawScalars = raw;
      p.notesHeld = false;
    }
    if (value === null || typeof value !== 'object')
      text = p.plain !== undefined ? p.plain : value === null ? '' : String(value);
    // a plain scalar after a tag was read as the text (the tag says what it is): `value` is what the line reads as without the tag, which the save compares the tagged value with
    if (inline === 'plain' && props.tag !== null && props.tag !== '!') value = untaggedReadingOf(text);
  }
  const tagged = adoptYamlProperties(p, props, value, text, lineIndex);
  if (p.notes) {
    p.notes.list.push({
      kind: 'props',
      line: lineIndex,
      from: props.from,
      end: props.end,
      to: props.to,
      anchor: props.anchor,
      tag: props.tag,
      inline,
      changed: tagged !== value && (tagged === null || typeof tagged !== 'object'),
      value: tagged,
      multiline: p.i !== lineIndex && (inline === 'plain' || inline === 'quoted'),
      last: p.i,
      scalarEnd: inline === 'quoted' ? p.scalarEnd : null
    });
  }
  return tagged;
}

/** The value after the colon of a `key:` entry of the mapping at `mapIndent`. */
function parseYamlValueAfterKey(p, mapIndent) {
  const line = p.lines[p.i];
  let c = p.col;
  while (c < line.length && isYamlWs(line[c])) c++;
  if (c >= line.length || isYamlCommentAt(line, c)) {
    p.col = line.length;
    if (!skipYamlToContent(p)) return null;
    if (p.col > mapIndent) return parseYamlBlockNode(p, mapIndent);
    // a sequence may sit at the indent of its key
    if (p.col === mapIndent && isYamlSeqItem(p.lines[p.i], p.col)) return parseYamlSequence(p, mapIndent);
    return null;
  }
  p.col = c;
  return parseYamlInline(p, mapIndent, true);
}

/** The node starting at the cursor, which is at the start of a content line (its column is the indent). */
function parseYamlBlockNode(p, parentIndent) {
  const indent = p.col;
  const line = p.lines[p.i];
  if (isYamlSeqItem(line, indent)) return parseYamlSequence(p, indent);
  if (scanYamlKey(line, indent, p.i)) return parseYamlMapping(p, indent);
  return parseYamlInline(p, parentIndent);
}

/** A block mapping whose first entry starts at the cursor (column `indent`); the next ones are at that indent. */
function parseYamlMapping(p, indent) {
  const map = {};
  for (;;) {
    const line = p.lines[p.i];
    const entry = scanYamlKey(line, p.col, p.i);
    if (!entry) throw yamlError('expected a "key: value" entry, found "' + line.slice(p.col, p.col + 40) + '"', p.i);
    p.col = entry.end;
    setYamlKey(map, entry.key, parseYamlValueAfterKey(p, indent));
    if (!skipYamlToContent(p)) break;
    if (p.col < indent) break;
    if (p.col > indent) throw yamlError('unexpected indentation', p.i);
    if (isYamlSeqItem(p.lines[p.i], p.col)) break;
  }
  return map;
}

/** A block sequence whose first `-` is at the cursor (column `indent`); the next ones are at that indent. */
function parseYamlSequence(p, indent) {
  const arr = [];
  for (;;) {
    p.col += 1; // the dash
    pushYamlItem(arr, parseYamlSeqItem(p, indent));
    if (!skipYamlToContent(p)) break;
    if (p.col < indent) break;
    if (p.col > indent) throw yamlError('unexpected indentation', p.i);
    if (!isYamlSeqItem(p.lines[p.i], p.col)) break;
  }
  return arr;
}

/** The item after the dash of the sequence at `indent`. */
function parseYamlSeqItem(p, indent) {
  const line = p.lines[p.i];
  let c = p.col;
  while (c < line.length && isYamlWs(line[c])) c++;
  if (c >= line.length || isYamlCommentAt(line, c)) {
    p.col = line.length;
    if (!skipYamlToContent(p)) return null;
    return p.col > indent ? parseYamlBlockNode(p, indent) : null;
  }
  p.col = c;
  if (isYamlSeqItem(line, c)) return parseYamlSequence(p, c);
  if (scanYamlKey(line, c, p.i)) return parseYamlMapping(p, c);
  return parseYamlInline(p, indent);
}

/**
 * Parse a YAML document into a plain JS value (object, array, scalar, or null for an empty document). Throws a
 * `YamlParseError` (with the `line`) for anything it cannot read. `notes`, when given as `{ list: [], unsupported: false }`, is filled with where the anchors, the aliases and
 * the tags are, the texts that go over several lines and the flow collections that hold an anchor, an alias or a tag (see `openYamlDecorations`, `openDecoratedFlows`).
 */
function parseYaml(text, notes) {
  let src = String(text);
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  let lines = src.split(/\r\n|\r|\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop(); // the line break that ends the last line
  let seenContent = false;
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k];
    if (/^(---|\.\.\.)(?=[ \t]|$)/.test(l)) {
      if (stripYamlComment(l.slice(3)).trim() !== '')
        throw yamlError('a value after "' + l.slice(0, 3) + '" is not supported', k);
      if (l.startsWith('---') && !seenContent) {
        lines[k] = '';
        continue;
      }
      if (l.startsWith('...')) {
        for (let m = k + 1; m < lines.length; m++) {
          if (stripYamlComment(lines[m]).trim() !== '')
            throw yamlError('several documents in one file are not supported', m);
        }
        lines = lines.slice(0, k);
        break;
      }
      throw yamlError('several documents in one file are not supported', k);
    }
    if (!seenContent && stripYamlComment(l).trim() !== '') {
      if (l[0] === '%') throw yamlError('YAML directives are not supported', k);
      seenContent = true;
    }
  }
  const p = { lines, i: 0, col: 0, anchors: new Map(), notes: notes || null };
  if (!skipYamlToContent(p)) return null;
  const root = parseYamlBlockNode(p, -1);
  if (skipYamlToContent(p)) throw yamlError('unexpected content (check the indentation)', p.i);
  return root;
}
