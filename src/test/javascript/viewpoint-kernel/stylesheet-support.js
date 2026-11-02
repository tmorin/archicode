'use strict';
// The tests of the page that read the stylesheet as text match one rule per line (`selector { a: b; c: d; }`, a media query
// opening on its own line). style.css is formatted by Prettier, which spreads a rule over several lines, so these tests read
// the page through compactStyle: the <style> of the page with every rule put back on one line, the comments and the order of
// the rules kept. The page on disk is not touched.

/** The text of a block up to its closing brace, from the position after the opening one; `end` is the index after the brace. */
function blockEnd(css, start) {
  let depth = 1;
  let index = start;
  while (index < css.length && depth > 0) {
    const char = css[index];
    if (char === '/' && css[index + 1] === '*') {
      index = css.indexOf('*/', index + 2);
      index = index < 0 ? css.length : index + 2;
      continue;
    }
    if (char === '"' || char === "'") {
      index += 1;
      while (index < css.length && css[index] !== char) index += css[index] === '\\' ? 2 : 1;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    }
    index += 1;
  }
  return index;
}

/** The declarations of a leaf rule: whitespace collapsed, each with its `;`. */
function declarationsOf(body) {
  const parts = [];
  let current = '';
  let parens = 0;
  let quote = null;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote !== null) {
      current += char;
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
      current += char;
    } else if (char === '(') {
      parens += 1;
      current += char;
    } else if (char === ')') {
      parens -= 1;
      current += char;
    } else if (char === ';' && parens === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part !== '')
    .map((part) => part + ';');
}

function compactRules(css, depth) {
  const pad = '  '.repeat(depth);
  const lines = [];
  let index = 0;
  while (index < css.length) {
    if (/\s/.test(css[index])) {
      index += 1;
    } else if (css[index] === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2);
      const stop = end < 0 ? css.length : end + 2;
      lines.push(pad + css.slice(index, stop));
      index = stop;
    } else {
      const open = css.indexOf('{', index);
      if (open < 0) break;
      const prelude = css.slice(index, open).replace(/\s+/g, ' ').trim();
      const end = blockEnd(css, open + 1);
      const body = css.slice(open + 1, end - 1);
      if (/^@(media|supports|container|layer)\b/.test(prelude)) {
        lines.push(pad + prelude + ' {', ...compactRules(body, depth + 1), pad + '}');
      } else {
        const declarations = declarationsOf(body);
        if (declarations.filter((one) => one.startsWith('--')).length > 1) {
          // a block of custom properties (the colours of a theme) stays one per line, as the audit of the themes reads it
          lines.push(pad + prelude + ' {', ...declarations.map((one) => pad + '  ' + one), pad + '}');
        } else {
          lines.push(pad + prelude + (declarations.length === 0 ? ' { }' : ' { ' + declarations.join(' ') + ' }'));
        }
      }
      index = end;
    }
  }
  return lines;
}

/** The text of a stylesheet with each rule on one line. */
function compactCss(css) {
  return compactRules(css, 1).join('\n');
}

/** The page with the content of its <style> compact; everything else is the page as it is. */
function compactStyle(html) {
  const open = html.indexOf('<style>') + '<style>'.length;
  const close = html.indexOf('</style>');
  return html.slice(0, open) + '\n' + compactCss(html.slice(open, close)) + '\n' + html.slice(close);
}

module.exports = { compactCss, compactStyle };
