// The rules that decide the boxes of the Workspace menu and of the top bar (wave 028, run 0205, #182; TDD DEC-1 to DEC-3, IMP-3, review F-10).
// The node suite has no DOM, so this reads src/main/editor/style.css and asserts three declarations by property name inside the rule found
// by selector. It is the cheap guard that fails when a declaration is removed; src/test/e2e/workspace-menu.spec.js is the proof that they work.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '..', '..', 'main', 'editor', 'style.css'), 'utf8');

// the text between the braces opened at `open` (the index of the `{`), nested blocks included
function blockAt(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error('unbalanced braces in style.css');
}

// every body of a rule whose selector list holds exactly `selector`, in `text` (at any depth)
function ruleBodies(text, selector) {
  const bodies = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const selectors = match[1]
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(',')
      .map((s) => s.trim());
    if (selectors.includes(selector)) bodies.push(match[2]);
  }
  return bodies;
}

function declaration(bodies, property) {
  for (const body of bodies) {
    const found = body.split(';').find((d) => d.split(':')[0].trim() === property);
    if (found) return found.slice(found.indexOf(':') + 1).trim();
  }
  return undefined;
}

test('a Workspace menu item is as high as its content: its rule says height: auto', () => {
  const value = declaration(ruleBodies(CSS, '.workspace-menu .workspace-item'), 'height');
  assert.equal(
    value,
    'auto',
    'the rule `.workspace-menu .workspace-item` must declare `height: auto` (the global `.top-panel button { height: 2rem }` otherwise clips the label and the note of an item)'
  );
});

test('the right-hand group of the top bar wraps: .top-actions says flex-wrap: wrap', () => {
  const value = declaration(ruleBodies(CSS, '.top-actions'), 'flex-wrap');
  assert.equal(
    value,
    'wrap',
    'the rule `.top-actions` must declare `flex-wrap: wrap` (it is nowrap today and the bar is 572 px wide at 360 px)'
  );
});

test('under 40rem the menu is anchored to the bar: .workspace-wrap is position: static in the narrow block', () => {
  const open = CSS.indexOf('@media (max-width: 40rem) {');
  assert.notEqual(open, -1, 'the narrow block `@media (max-width: 40rem)` exists');
  const narrow = blockAt(CSS, CSS.indexOf('{', open));
  assert.equal(
    declaration(ruleBodies(narrow, '.workspace-wrap'), 'position'),
    'static',
    'the narrow block must declare `.workspace-wrap { position: static }` so that the menu is placed from the bar, not from a button that wraps'
  );
  assert.equal(
    declaration(ruleBodies(narrow, '.top-panel'), 'position'),
    'relative',
    'the narrow block must declare `.top-panel { position: relative }`'
  );
});
