'use strict';
// The reader of the stylesheet of the editor page for the tests: the <style> of the page parsed into rules, and lookups by selector.
// A test asserts on a computed value (`sheet.decl(selector, property, at)`), on presence (`sheet.has`), or on source order (`sheet.order`),
// never on the layout of the text. Specificity is not computed: an order assertion says in its title that the two rules weigh the same.

const styleOf = (html) =>
  html.slice(html.indexOf('<style>') + '<style>'.length, html.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');

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
      if (/^@(media|container|supports|layer|scope|starting-style|keyframes|-webkit-keyframes)\b/.test(head))
        rules.push(...rulesOf(body, at.concat(head)));
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
    if (text && colon > 0)
      out.push([
        text.slice(0, colon).trim(),
        text
          .slice(colon + 1)
          .replace(/!important\s*$/, '')
          .trim()
      ]);
  };
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) {
      push(k);
      start = k + 1;
    }
  }
  push(body.length);
  return out;
}

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

/** Whether the at-rules `around` (outermost first) are exactly the heads asked for in `at`, each asked head being a substring of its own. */
const sameAt = (around, at) =>
  around.length === at.length && at.every((wanted, i) => normalize(around[i]).includes(normalize(wanted)));

const describe = (selector, at) =>
  JSON.stringify(selector) + (at.length === 0 ? ' at the top level' : ' inside ' + JSON.stringify(at));

const memo = new Map();

/** The sheet of a page: `rule`, `decl`, `has` and `order`, over the rules of its <style> in source order. */
function loadStylesheet(html) {
  if (memo.has(html)) return memo.get(html);
  const rules = rulesOf(styleOf(html)).map((one, index) => ({ ...one, index, selector: normalize(one.selector) }));
  const matches = (selector, at) => rules.filter((one) => one.selector === normalize(selector) && sameAt(one.at, at));
  const near = (selector) => {
    const wanted = normalize(selector);
    const found = rules.filter((one) => one.selector.includes(wanted) || wanted.includes(one.selector));
    return found.length === 0
      ? 'no rule has a selector near it'
      : 'near matches: ' +
          found.map((one) => JSON.stringify(one.selector) + ' at ' + JSON.stringify(one.at)).join(', ');
  };
  const one = (selector, at) => {
    const found = matches(selector, at);
    if (found.length !== 1)
      throw new Error(
        'expected exactly one rule for ' + describe(selector, at) + ', found ' + found.length + '; ' + near(selector)
      );
    return found[0];
  };
  const sheet = {
    /** The declarations `[property, value]` of the one rule with this selector inside exactly these at-rules; throws on zero or several. */
    rule: (selector, at = []) => declarationsOf(one(selector, at).body),
    /** The value of the last declaration of `property` in that rule, undefined when it has none. */
    decl: (selector, property, at = []) => {
      const found = declarationsOf(one(selector, at).body).filter(([name]) => name === property);
      return found.length === 0 ? undefined : found[found.length - 1][1];
    },
    /** Whether at least one rule has this selector inside exactly these at-rules. */
    has: (selector, at = []) => matches(selector, at).length > 0,
    /** Whether the rule `a` comes before the rule `b` in the source; each is `selector` or `[selector, at]`. */
    order: (a, b) => {
      const [selectorA, atA = []] = Array.isArray(a) ? a : [a];
      const [selectorB, atB = []] = Array.isArray(b) ? b : [b];
      return one(selectorA, atA).index < one(selectorB, atB).index;
    }
  };
  memo.set(html, sheet);
  return sheet;
}

module.exports = { styleOf, rulesOf, declarationsOf, loadStylesheet };
