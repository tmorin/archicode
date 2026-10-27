// =====================================================================
// YAML serializer — the parser's inverse (TDD-0009 DEC-7, CTR-3).
//
// Hand-written, mirroring the parser's own small-function style: given a
// plain JS value (built by parseYaml, then possibly edited in place by a
// form commit), regenerate YAML that `parseYaml` — and the Java side's
// reader — read back as the very same value (ASM-2: relies on JS object key
// insertion order). Every string that YAML would read as something else
// (an indicator first, `: ` or ` #` inside, null/true/yes/number/date look-
// alikes, blanks around, control characters) is double-quoted; empty
// collections are the flow forms `[]` and `{}` (an empty `key:` would be a
// null, which the Java side rejects for lists).
// =====================================================================

/** True if `value` would need its own nested block (non-empty object/array). */
function isYamlComplexValue(value) {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(value).length > 0;
}

/** `[]` or `{}` for an empty array / object, else null. */
function yamlEmptyCollection(value) {
  if (value === null || typeof value !== 'object') return null;
  if (Array.isArray(value)) return value.length === 0 ? '[]' : null;
  return Object.keys(value).length === 0 ? '{}' : null;
}

/** True if a string would be read as something else (or corrupt a line) if emitted unquoted. */
function yamlStringNeedsQuoting(str) {
  if (str === '') return true;
  if (/^[ \t]|[ \t]$/.test(str)) return true;
  if (/[\u0000-\u001f\u007f\u0085\u2028\u2029\ufeff]/.test(str)) return true; // newlines, tabs, control characters
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(str)) return true; // starts with an indicator
  if (/:([ \t]|$)/.test(str) || /[ \t]#/.test(str)) return true; // `: ` and a trailing `:` make a mapping, ` #` a comment
  if (/^\.\.\.|^---/.test(str)) return true;
  if (/^(null|true|false|yes|no|on|off)$/i.test(str) || str === '~' || str === '=' || str === '<<') return true;
  if (/^[-+]?(\d[\d_,]*(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(str)) return true; // numbers
  if (/^[-+]?\.(inf|nan)$/i.test(str) || /^[-+]?0[xob][0-9a-f_]+$/i.test(str)) return true;
  if (/^[-+]?\d[\d_]*(:[0-5]?\d)+(\.\d*)?$/.test(str)) return true; // base 60 numbers
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(str)) return true; // dates
  return false;
}

/** Escape a string's body for double-quoted emission (exact inverse of unescapeYamlDoubleQuoted). */
function escapeYamlDoubleQuoted(str) {
  return String(str).replace(/[\\"\u0000-\u001f\u007f\u0085\u2028\u2029\ufeff]/g, (ch) => {
    switch (ch) {
      case '\\': return '\\\\';
      case '"': return '\\"';
      case '\n': return '\\n';
      case '\t': return '\\t';
      case '\r': return '\\r';
      default: return '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
    }
  });
}

/** A string as a YAML token: plain when YAML reads it back as the same string, double-quoted otherwise. */
function serializeYamlString(str) {
  return yamlStringNeedsQuoting(str) ? '"' + escapeYamlDoubleQuoted(str) + '"' : str;
}

/** Serialize one scalar JS value into its inline YAML token (DEC-7's scalar rules). */
function serializeYamlScalarToken(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '.nan';
    if (!Number.isFinite(value)) return value > 0 ? '.inf' : '-.inf';
    return String(value);
  }
  return serializeYamlString(String(value));
}

/** A mapping key as a YAML token (keys go through the same quoting as values). */
function serializeYamlKey(key) {
  return serializeYamlString(String(key));
}

/** The inline token of a value that has no block of its own: `[]`, `{}` or a scalar. */
function serializeYamlInline(value) {
  return yamlEmptyCollection(value) || serializeYamlScalarToken(value);
}

/**
 * Recursively serialize a plain JS value (object/array/scalar) into the
 * YAML text `parseYaml` can re-parse (DEC-7). `indent` is the
 * column at which this value's own lines (for an object/array) start;
 * for a scalar (or an empty collection, `[]` / `{}`), `indent` is unused
 * (the result is the inline token the caller places after its own `key: `
 * or `- `).
 */
function serializeYamlValue(value, indent) {
  const ind = ' '.repeat(indent);
  const empty = yamlEmptyCollection(value);
  if (empty) return empty;

  if (Array.isArray(value)) {
    const lines = [];
    for (const item of value) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item) && !yamlEmptyCollection(item)) {
        const keys = yamlKeysOf(item);
        // restCol: the column the continuation keys of a sequence-of-maps item
        // align to (exactly one space after the dash, as emitted below).
        const restCol = indent + 2;
        for (let k = 0; k < keys.length; k++) {
          const key = keys[k];
          const val = item[key];
          const prefix = (k === 0) ? (ind + '- ') : ' '.repeat(restCol);
          if (isYamlComplexValue(val)) {
            lines.push(prefix + serializeYamlKey(key) + ':');
            lines.push(serializeYamlValue(val, restCol + 2));
          } else {
            lines.push(prefix + serializeYamlKey(key) + ': ' + serializeYamlInline(val));
          }
        }
      } else if (isYamlComplexValue(item)) {
        // A nested (non-empty) sequence: a block under a bare dash.
        lines.push(ind + '-');
        lines.push(serializeYamlValue(item, indent + 2));
      } else {
        lines.push(ind + '- ' + serializeYamlInline(item));
      }
    }
    return lines.join('\n');
  }

  if (value !== null && typeof value === 'object') {
    const lines = [];
    for (const key of yamlKeysOf(value)) {
      const val = value[key];
      if (isYamlComplexValue(val)) {
        lines.push(ind + serializeYamlKey(key) + ':');
        lines.push(serializeYamlValue(val, indent + 2));
      } else {
        lines.push(ind + serializeYamlKey(key) + ': ' + serializeYamlInline(val));
      }
    }
    return lines.join('\n');
  }

  return serializeYamlScalarToken(value);
}

/**
 * Serialize a manifest file's full text from its parsed `header`/`content`
 * nodes (DEC-7, CTR-3) — the shape every real `.custom` manifest has:
 * top-level `header:` then `content:` blocks.
 */
function serializeManifestFile(header, content) {
  return serializeYamlValue({ header: header, content: content }, 0);
}

