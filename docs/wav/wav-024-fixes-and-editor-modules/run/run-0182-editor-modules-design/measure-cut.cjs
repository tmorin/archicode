'use strict';
// Reproduces the numbers of tdd-0182-editor-modules-design.md from the editor page (run 0182, wave 024, W-4).
// A throwaway measure, not a tool of the build: W-5 writes scripts/check-editor.mjs, which counts the same pairs, and
// must print the same numbers on the page of commit af1ed2d before it is trusted.
//
//   node docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/measure-cut.cjs [page.html]
//
// Run it from the root of the repository (it loads acorn and eslint-scope from node_modules, which ESLint installs).
// It reads editor-cut.json beside it: the first line of each part, its layer, and the variables that move to
// model/ui-state.js. A "declaration" is a top-level function, const, let or statement of the main script (the first
// bare <script> of the page, the one harness.js runs). A "pair" is (declaration A, declaration B) where A names B and
// they are in two parts. An upward pair is a pair whose B is in a part of a higher layer than A's.

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.join(process.cwd(), 'package.json'));
const acorn = req('acorn');
const eslintScope = req('eslint-scope');

const cut = JSON.parse(fs.readFileSync(path.join(__dirname, 'editor-cut.json'), 'utf8'));
const pagePath = process.argv[2] || cut.page;
const html = fs.readFileSync(pagePath, 'utf8');
const match = /<script>\n([\s\S]*?)<\/script>/.exec(html);
const tagLine = html.slice(0, match.index).split('\n').length; // the line of <script>; the code starts on the next one
const code = match[1];

const ast = acorn.parse(code, { ecmaVersion: 'latest', locations: true, ranges: true, sourceType: 'script' });
const html_line = (node) => node.loc.start.line + tagLine; // line of the HTML
const html_end = (node) => node.loc.end.line + tagLine;

// ---- the top-level declarations ----------------------------------------------------------------------------------
const decls = [];
const namesOf = (pattern, out) => {
  if (pattern.type === 'Identifier') out.push(pattern.name);
  else if (pattern.type === 'ObjectPattern') pattern.properties.forEach((p) => namesOf(p.value || p.argument, out));
  else if (pattern.type === 'ArrayPattern') pattern.elements.forEach((p) => p && namesOf(p, out));
  else if (pattern.type === 'AssignmentPattern') namesOf(pattern.left, out);
  else if (pattern.type === 'RestElement') namesOf(pattern.argument, out);
  return out;
};
for (const st of ast.body) {
  if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration')
    decls.push({ names: [st.id.name], kind: 'function', start: html_line(st), end: html_end(st) });
  else if (st.type === 'VariableDeclaration')
    for (const d of st.declarations)
      decls.push({ names: namesOf(d.id, []), kind: st.kind, start: html_line(st), end: html_end(st) });
  else decls.push({ names: [], kind: 'statement', start: html_line(st), end: html_end(st) });
}
const ownerOfLine = (line) => decls.findIndex((d) => d.start <= line && line <= d.end);
const declOfName = new Map();
decls.forEach((d, i) => d.names.forEach((n) => declOfName.set(n, i)));

// ---- who names whom (scope analysis, so a local variable that shadows a top-level name is not a reference) --------
const scopes = eslintScope.analyze(ast, { ecmaVersion: 2024, sourceType: 'script' });
const names = decls.map(() => new Set());
for (const v of scopes.globalScope.variables) {
  if (!declOfName.has(v.name)) continue;
  const target = declOfName.get(v.name);
  for (const r of v.references) {
    const from = ownerOfLine(r.identifier.loc.start.line + tagLine);
    if (from >= 0 && from !== target) names[from].add(target);
  }
}

// ---- the parts ------------------------------------------------------------------------------------------------------
const layerIndex = Object.fromEntries(cut.layers.map((l, i) => [l, i]));
const parts = cut.parts.map((p) => ({ ...p, layerN: layerIndex[p.layer] }));
const partOfLine = (line) => {
  let found = -1;
  parts.forEach((p, i) => {
    if (p.first <= line) found = i;
  });
  return found;
};
const relocated = new Set(cut.relocate.names);
const uiState = { file: cut.relocate.to, layerN: layerIndex[cut.relocate.layer] };
const partOfDecl = (i, withRelocation) =>
  withRelocation && decls[i].names.some((n) => relocated.has(n)) ? uiState : parts[partOfLine(decls[i].start)];

function count(withRelocation, ignoreTarget) {
  const pairs = new Map();
  const byLayers = {};
  let upward = 0;
  names.forEach((targets, from) => {
    const a = partOfDecl(from, withRelocation);
    for (const to of targets) {
      const b = partOfDecl(to, withRelocation);
      if (a === b) continue;
      if (b.layerN > a.layerN && !(ignoreTarget && decls[to].names.includes(ignoreTarget))) {
        upward++;
        const lk = cut.layers[a.layerN] + ' to ' + cut.layers[b.layerN];
        byLayers[lk] = (byLayers[lk] || 0) + 1;
        const key = decls[to].names[0] || 'statement';
        pairs.set(key, (pairs.get(key) || 0) + 1);
      }
    }
  });
  return { upward, pairs, byLayers };
}

// ---- strongly connected components of the declarations (Tarjan, iterative) -------------------------------------------
function sccSizes(drop) {
  const n = decls.length;
  const adj = names.map((s) => [...s].filter((t) => !(drop && decls[t].names.includes(drop))));
  let clock = 0;
  const index = Array(n).fill(-1);
  const low = Array(n).fill(0);
  const onStack = Array(n).fill(false);
  const stack = [];
  const sizes = [];
  for (let root = 0; root < n; root++) {
    if (index[root] >= 0) continue;
    const work = [[root, 0]];
    index[root] = low[root] = clock++;
    stack.push(root);
    onStack[root] = true;
    while (work.length) {
      const top = work[work.length - 1];
      const [u, i] = top;
      if (i < adj[u].length) {
        top[1]++;
        const w = adj[u][i];
        if (index[w] < 0) {
          index[w] = low[w] = clock++;
          stack.push(w);
          onStack[w] = true;
          work.push([w, 0]);
        } else if (onStack[w]) low[u] = Math.min(low[u], index[w]);
      } else {
        if (low[u] === index[u]) {
          let size = 0;
          let w;
          do {
            w = stack.pop();
            onStack[w] = false;
            size++;
          } while (w !== u);
          if (size > 1) sizes.push(size);
        }
        work.pop();
        if (work.length) {
          const p = work[work.length - 1][0];
          low[p] = Math.min(low[p], low[u]);
        }
      }
    }
  }
  return sizes.sort((a, b) => b - a);
}

// ---- the report ------------------------------------------------------------------------------------------------------
const kinds = {};
decls.forEach((d) => (kinds[d.kind] = (kinds[d.kind] || 0) + 1));
console.log('page', pagePath, 'script lines', code.split('\n').length - 1, 'first line of code', tagLine + 1);
console.log('declarations', decls.length, JSON.stringify(kinds), 'names', decls.flatMap((d) => d.names).length);
const lines = parts.map((p, i) => (i + 1 < parts.length ? parts[i + 1].first : tagLine + code.split('\n').length) - p.first);
console.log('parts', parts.length, 'lines', lines.reduce((a, b) => a + b, 0), 'largest', Math.max(...lines));
console.log('cycles (sizes of the groups of declarations that name each other):', sccSizes().join(', '));
console.log('  without the declaration of render:', sccSizes('render').join(', '));
const before = count(false);
const after = count(true);
const noRender = count(true, 'render');
console.log('upward pairs, parts as cut:', before.upward);
console.log('upward pairs, after', relocated.size, 'variables move to', cut.relocate.to + ':', after.upward);
console.log('upward pairs, after the redraw goes through a notification (no pair names render):', noRender.upward);
console.log('upward pairs after the move, by layers:', JSON.stringify(after.byLayers));
const named = [...after.pairs.entries()].sort((a, b) => b[1] - a[1]);
const tail = named.filter(([name]) => name !== 'render');
console.log('what the 162 pairs name:', named.length, 'names; render', after.pairs.get('render'));
console.log('what the other pairs name (name: pairs):', tail.map(([name, n]) => name + ': ' + n).join(', '));
console.log('names with one pair:', tail.filter(([, n]) => n === 1).length, 'names with 2 or more:', tail.filter(([, n]) => n > 1).length);

// ---- the calls the notification would replace (calls of the identifier, found in the syntax tree) -------------------
const callsOf = { render: {}, rebuildIndexAndRender: {}, modelsChanged: {} };
const visit = (node) => {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && callsOf[node.callee.name]) {
    const part = parts[partOfLine(node.loc.start.line + tagLine)];
    const bucket = callsOf[node.callee.name];
    bucket[part.layer] = (bucket[part.layer] || 0) + 1;
  }
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach(visit);
    else if (child && typeof child.type === 'string') visit(child);
  }
};
visit(ast);
for (const [name, bucket] of Object.entries(callsOf))
  console.log('calls of ' + name + '():', Object.values(bucket).reduce((a, b) => a + b, 0), JSON.stringify(bucket));
