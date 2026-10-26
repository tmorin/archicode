#!/usr/bin/env node
// Checks of the editor page's main script (wave 024, run 0183, step 5.2a; design: run 0182, this run's DEC-4).
//
// The main script is the first bare <script> of the assembled page. It is parsed with acorn and analysed with
// eslint-scope. A declaration is a top-level function, class, const, let or statement; a name is an identifier it
// declares; a reference is a reference that scope analysis resolves to a variable of the global scope (a local that
// shadows a top-level name is not one). A pair (A, B) is a declaration A that names a declaration B of another part;
// it is upward when B is in a higher layer than A.
//
// Usage: node scripts/check-editor.mjs [--layers | --list | --cut <file> | --write-names | --statements <rev>] [--root <dir>]
//   --layers       the four checks, in this order, stopping at the first that fails: the names equal names.json, the
//                  Java names (java-names.json), the load order, and the ratchet (`upward pairs: N (max M)`)
//   --list         the upward pairs by name, grouped by layers, then for each part the names other parts use
//   --cut <file>   three counts of a cut table (format of editor-cut.json); exit 2 on a page the table is not for
//   --write-names  write src/main/editor/names.json from the assembled page
//   --statements <rev>
//                  the assembled page is the page of the commit <rev> up to the order and the files of the top-level
//                  declarations: the multisets of declarations (each with the comment lines directly above it and a
//                  comment after it on its last line) equal, the multisets of all comments equal, everything outside
//                  the main script byte-equal, and the load-order check holds (see `loadOrderProblems`)
//   --root <dir>   work on the tree at <dir> instead of the repository
//
// Every failure is one line on the error output and exit 1 (exit 2 for --cut on another page).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as acorn from 'acorn';
import * as eslintScope from 'eslint-scope';
import { assemble, mapOf } from './build-editor.mjs';

const EDITOR_DIR = 'src/main/editor';
const UNSORTED = 'unsorted';
const PAGE_PATH = 'src/main/resources/editor-webapp/standalone.html';

class EditorCheckError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

function fail(message, code = 1) {
  throw new EditorCheckError(message, code);
}

function namesOf(pattern, out) {
  if (pattern.type === 'Identifier') out.push(pattern.name);
  else if (pattern.type === 'ObjectPattern') pattern.properties.forEach((p) => namesOf(p.value || p.argument, out));
  else if (pattern.type === 'ArrayPattern') pattern.elements.forEach((p) => p && namesOf(p, out));
  else if (pattern.type === 'AssignmentPattern') namesOf(pattern.left, out);
  else if (pattern.type === 'RestElement') namesOf(pattern.argument, out);
  return out;
}

/**
 * Parses the main script of a page and works out who names whom.
 * Returns { code, tagLine, ast, decls, edges }: `decls[i]` is { names, kind, start, end } with lines of the page, and
 * `edges[i]` is the set of the indexes of the declarations that declaration i names (not itself).
 */
export function analyse(html) {
  const match = /<script>\n([\s\S]*?)<\/script>/.exec(html);
  if (!match) fail('the page has no bare <script> element');
  const tagLine = html.slice(0, match.index).split('\n').length; // the line of <script>; the code starts on the next one
  const code = match[1];
  let ast;
  const comments = [];
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      locations: true,
      ranges: true,
      sourceType: 'script',
      onComment: comments
    });
  } catch (error) {
    return fail(`the main script cannot be parsed: ${error.message}`);
  }
  const startOf = (node) => node.loc.start.line + tagLine;
  const endOf = (node) => node.loc.end.line + tagLine;

  const decls = [];
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration')
      decls.push({ names: [st.id.name], kind: 'function', start: startOf(st), end: endOf(st) });
    else if (st.type === 'VariableDeclaration')
      for (const d of st.declarations)
        decls.push({ names: namesOf(d.id, []), kind: st.kind, start: startOf(st), end: endOf(st) });
    else decls.push({ names: [], kind: 'statement', start: startOf(st), end: endOf(st) });
  }
  const ownerOfLine = (line) => decls.findIndex((d) => d.start <= line && line <= d.end);
  const declOfName = new Map();
  decls.forEach((d, i) => d.names.forEach((n) => declOfName.set(n, i)));

  const scopes = eslintScope.analyze(ast, { ecmaVersion: 2024, sourceType: 'script' });
  const edges = decls.map(() => new Set());
  for (const v of scopes.globalScope.variables) {
    if (!declOfName.has(v.name)) continue;
    const target = declOfName.get(v.name);
    for (const r of v.references) {
      const from = ownerOfLine(r.identifier.loc.start.line + tagLine);
      if (from >= 0 && from !== target) edges[from].add(target);
    }
  }
  return { code, tagLine, ast, decls, edges, comments };
}

/** The distinct top-level names, sorted, and the number of statements that declare no name. */
export function topLevelNames(analysis) {
  const names = new Set(analysis.decls.flatMap((d) => d.names));
  const unnamed = analysis.decls.filter((d) => d.names.length === 0).length;
  return { names: [...names].sort(), unnamed };
}

/**
 * Counts the upward pairs. `partOf(i)` gives the part of declaration i as an object { layerN } (the same object for
 * the same part) or null when the declaration is outside every part; `ignoreName` leaves out the pairs whose target
 * declares that name. Returns { upward, pairs: [{ from, to }], byLayers, named }.
 */
export function countUpward(analysis, partOf, layers, ignoreName = null) {
  const pairs = [];
  const byLayers = {};
  const named = new Map();
  analysis.edges.forEach((targets, from) => {
    const a = partOf(from);
    if (!a) return;
    for (const to of targets) {
      const b = partOf(to);
      if (!b || a === b || b.layerN <= a.layerN) continue;
      if (ignoreName && analysis.decls[to].names.includes(ignoreName)) continue;
      pairs.push({ from, to });
      const lk = `${layers[a.layerN]} to ${layers[b.layerN]}`;
      byLayers[lk] = (byLayers[lk] || 0) + 1;
      const key = analysis.decls[to].names[0] || 'statement';
      named.set(key, (named.get(key) || 0) + 1);
    }
  });
  return { upward: pairs.length, pairs, byLayers, named };
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return fail(`${label} cannot be read: ${error.message}`);
  }
}

/** Evaluates a cut table against a page. Returns the three counts and the detail of the second. */
export function cutCounts(html, cut) {
  const analysis = analyse(html);
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
  const partOf = (withRelocation) => (i) =>
    withRelocation && analysis.decls[i].names.some((n) => relocated.has(n))
      ? uiState
      : (parts[partOfLine(analysis.decls[i].start)] ?? null);
  const asCut = countUpward(analysis, partOf(false), cut.layers);
  const moved = countUpward(analysis, partOf(true), cut.layers);
  const noRender = countUpward(analysis, partOf(true), cut.layers, 'render');
  return { asCut, moved, noRender, relocated: relocated.size };
}

function layersOf(root) {
  const config = readJson(join(root, EDITOR_DIR, 'layers.json'), 'layers.json');
  const layers = config.layers;
  const layerOfFile = new Map((config.parts ?? []).map((p) => [p.file, p.layer]));
  return { layers, layerOfFile };
}

/** The part of each declaration of the assembled page: { file, layer, layerN }, or null outside every part. */
function partsOfAssembled(root, analysis) {
  const { layers, layerOfFile } = layersOf(root);
  const ranges = mapOf(root).parts.map((p) => {
    const layer = layerOfFile.get(p.file);
    return {
      file: p.file,
      layer,
      layerN: layer === UNSORTED ? -1 : layers.indexOf(layer),
      first: p.first,
      last: p.last
    };
  });
  const cache = new Map();
  const partOf = (i) => {
    const start = analysis.decls[i].start;
    if (!cache.has(i)) cache.set(i, ranges.find((r) => r.first <= start && start <= r.last) ?? null);
    return cache.get(i);
  };
  return { layers, partOf };
}

function listPairs(root) {
  const { text } = assemble(root);
  const analysis = analyse(text);
  const { layers, partOf } = partsOfAssembled(root, analysis);
  // `unsorted` parts are left out on both sides.
  const sorted = (i) => {
    const part = partOf(i);
    return part && part.layerN >= 0 ? part : null;
  };
  const { upward, pairs, byLayers } = countUpward(analysis, sorted, layers);
  const label = (i) => analysis.decls[i].names[0] || `statement at line ${analysis.decls[i].start}`;
  const lines = [`upward pairs: ${upward}`];
  const grouped = new Map();
  for (const { from, to } of pairs) {
    const key = `${layers[partOf(from).layerN]} to ${layers[partOf(to).layerN]}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(`${label(from)} names ${label(to)}`);
  }
  for (const key of Object.keys(byLayers).sort()) {
    lines.push(`${key}: ${byLayers[key]}`);
    for (const pair of grouped.get(key).sort()) lines.push(`  ${pair}`);
  }
  const used = new Map();
  analysis.edges.forEach((targets, from) => {
    const a = partOf(from);
    for (const to of targets) {
      const b = partOf(to);
      if (!a || !b || a === b) continue;
      if (!used.has(b.file)) used.set(b.file, new Set());
      used.get(b.file).add(label(to));
    }
  });
  for (const file of [...used.keys()].sort())
    lines.push(`${file}: used by other parts: ${[...used.get(file)].sort().join(', ')}`);
  return lines;
}

function cutLines(root, cutPath) {
  const cut = readJson(resolve(cutPath), `the cut table ${cutPath}`);
  const html = readFileSync(join(root, cut.page), 'utf8');
  const sha = createHash('sha256').update(html).digest('hex');
  if (!sha.startsWith(cut.sha256Prefix))
    fail(
      `the cut table is for the page whose sha256 starts with ${cut.sha256Prefix}, not ${sha.slice(0, cut.sha256Prefix.length)} (--cut holds for one page only)`,
      2
    );
  const { asCut, moved, noRender, relocated } = cutCounts(html, cut);
  return [
    `upward pairs, parts as cut: ${asCut.upward}`,
    `upward pairs, after ${relocated} variables move to ${cut.relocate.to}: ${moved.upward}`,
    `upward pairs, after the redraw goes through a notification (no pair names render): ${noRender.upward}`
  ];
}

function writeNames(root) {
  const { text } = assemble(root);
  const { names, unnamed } = topLevelNames(analyse(text));
  const target = join(root, EDITOR_DIR, 'names.json');
  const json = `${JSON.stringify({ names, unnamed }, null, 2)}\n`;
  writeFileSync(target, json);
  return [`names.json: ${names.length} names, ${unnamed} unnamed statements`];
}

// ---------------------------------------------------------------------------------------------------------------
// The load-order check (wave 024, run 0183, step 5.2b; this run's DEC-4).
//
// A top-level `let`, `const`, `class` or `var` (an "ordered" declaration) cannot be read before its declaration has
// run. A function declaration is hoisted and always satisfied. For every top-level declaration that is not a function
// declaration (a "root"), the check collects the names the root reads while the script loads:
//   - exact for variables: every reference that scope analysis resolves to a top-level variable, outside any function
//     body, in the root itself;
//   - over-approximated for calls: a reference to a top-level function, class, or a variable initialised with a
//     function (a "callable"), in the root or in the code of a callable already pulled in, pulls in the whole code of
//     that callable (every nested function included), transitively. Nothing is pulled in for the code that only runs
//     later: a function that is stored (a variable's initialiser, an assignment, a property, an array element, a
//     method) at the root's own level, and an argument of a call to addEventListener, removeEventListener,
//     setTimeout, setInterval, requestAnimationFrame, requestIdleCallback, queueMicrotask, then, catch or finally
//     (a listener registered by name is still read where it is registered, but its body does not run there).
// Every ordered name the collected code reads must be declared in an earlier declaration than the root (a declarator
// of the same statement counts as its own declaration, in order). A read of the root's own name in its initialiser
// is a mistake, except for `var` (`var a = a || {}`) and a read inside the root's own binding pattern.

const DEFERRING_CALLS = new Set([
  'addEventListener',
  'removeEventListener',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'requestIdleCallback',
  'queueMicrotask',
  'then',
  'catch',
  'finally'
]);
const FUNCTIONS = new Set(['FunctionExpression', 'ArrowFunctionExpression', 'FunctionDeclaration']);

function calleeName(callee) {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier')
    return callee.property.name;
  return null;
}

/** True when `node` is an argument of a call that registers it for later. */
function isDeferredArgument(node, parent) {
  return (
    parent?.type === 'CallExpression' &&
    parent.arguments.includes(node) &&
    DEFERRING_CALLS.has(calleeName(parent.callee))
  );
}

/** True when a function at that position is kept, not run, by its parent. */
function isStored(parent) {
  return [
    'VariableDeclarator',
    'AssignmentExpression',
    'Property',
    'MethodDefinition',
    'PropertyDefinition',
    'ArrayExpression'
  ].includes(parent?.type);
}

const SKIPPED_KEYS = new Set(['type', 'loc', 'range', 'start', 'end']);

function childrenOf(node) {
  const out = [];
  for (const key of Object.keys(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    const value = node[key];
    if (Array.isArray(value)) value.forEach((v) => v && typeof v.type === 'string' && out.push([key, v]));
    else if (value && typeof value.type === 'string') out.push([key, value]);
  }
  return out;
}

/**
 * The reads of top-level variables made by the code of `node` when it runs. `expanded` is true for code that runs
 * because something called it. Returns [{ name, offset, expandable }].
 */
function readsOf(node, parent, expanded, refAt, out) {
  if (node.type === 'Identifier') {
    const name = refAt.get(node.range[0]);
    if (name !== undefined) out.push({ name, offset: node.range[0], expandable: !isDeferredArgument(node, parent) });
    return out;
  }
  if (FUNCTIONS.has(node.type)) {
    if (isDeferredArgument(node, parent)) return out;
    if (!expanded && isStored(parent)) return out;
    expanded = true;
  } else if (!expanded && node.type === 'MethodDefinition') {
    if (node.computed) readsOf(node.key, node, expanded, refAt, out);
    return out;
  } else if (!expanded && node.type === 'PropertyDefinition') {
    if (node.computed) readsOf(node.key, node, expanded, refAt, out);
    if (node.static && node.value) readsOf(node.value, node, expanded, refAt, out);
    return out;
  }
  for (const [, child] of childrenOf(node)) readsOf(child, node, expanded, refAt, out);
  return out;
}

/** The units of the top level, in the order of `analysis.decls`: { node, kind, id? } with `kind` as in `decls`. */
function unitsOf(ast) {
  const units = [];
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') units.push({ node: st, kind: 'function' });
    else if (st.type === 'ClassDeclaration') units.push({ node: st, kind: 'class' });
    else if (st.type === 'VariableDeclaration') for (const d of st.declarations) units.push({ node: d, kind: st.kind });
    else units.push({ node: st, kind: 'statement' });
  }
  return units;
}

/**
 * The load-order mistakes of an analysed page, one sentence each, in the order of the page (see the rule above).
 */
export function loadOrderProblems(analysis) {
  const { ast, decls } = analysis;
  const units = unitsOf(ast);
  if (units.length !== decls.length) fail('internal error: the units of the script do not match its declarations');
  const scopes = eslintScope.analyze(ast, { ecmaVersion: 2024, sourceType: 'script' });
  const refAt = new Map();
  for (const v of scopes.globalScope.variables)
    for (const r of v.references) if (!r.init) refAt.set(r.identifier.range[0], v.name);

  const firstUnit = new Map(); // name -> index of the first declaration of it
  decls.forEach((d, i) => d.names.forEach((n) => firstUnit.has(n) || firstUnit.set(n, i)));
  const isCallable = (u) =>
    u.kind === 'function' ||
    u.kind === 'class' ||
    (u.node.type === 'VariableDeclarator' &&
      u.node.init &&
      (FUNCTIONS.has(u.node.init.type) || u.node.init.type === 'ClassExpression'));
  const bodyReads = new Map(); // callable index -> its reads when called
  const readsWhenCalled = (i) => {
    if (!bodyReads.has(i)) {
      const u = units[i];
      const node = u.node.type === 'VariableDeclarator' ? u.node.init : u.node;
      bodyReads.set(i, readsOf(node, u.node, true, refAt, []));
    }
    return bodyReads.get(i);
  };
  const label = (i) => decls[i].names[0] || `statement at line ${decls[i].start}`;
  const problems = [];
  units.forEach((root, r) => {
    if (root.kind === 'function') return;
    const direct = readsOf(root.node, null, false, refAt, []);
    const seen = new Set();
    const queue = direct.map((read) => ({ read, via: null }));
    const reported = new Set();
    for (let q = 0; q < queue.length; q++) {
      const { read, via } = queue[q];
      const target = firstUnit.get(read.name);
      if (target === undefined) continue;
      const unit = units[target];
      if (unit.kind !== 'function') {
        let bad = target >= r;
        if (target === r && via === null) {
          const insidePattern =
            unit.node.id && read.offset >= unit.node.id.range[0] && read.offset < unit.node.id.range[1];
          if (insidePattern || unit.kind === 'var') bad = false;
        }
        if (bad && !reported.has(read.name)) {
          reported.add(read.name);
          const how = via === null ? 'reads' : `reads, through \`${via}\`,`;
          const where =
            target === r ? 'in its own initialiser' : `before its declaration at line ${decls[target].start}`;
          problems.push(
            `load order: \`${label(r)}\` (line ${decls[r].start}) ${how} \`${read.name}\` at load time ${where}`
          );
        }
      }
      if (read.expandable && isCallable(unit) && !seen.has(target)) {
        seen.add(target);
        for (const inner of readsWhenCalled(target)) queue.push({ read: inner, via: via ?? label(target) });
      }
    }
  });
  return problems;
}

// ---------------------------------------------------------------------------------------------------------------
// --statements <rev>

/** Each top-level statement as the text that identifies it: its comments directly above it and after it. */
function statementTexts(analysis) {
  const { code, ast } = analysis;
  const comments = analysis.comments;
  const lineStart = (offset) => code.lastIndexOf('\n', offset - 1) + 1;
  const ownLine = (c) => code.slice(lineStart(c.start), c.start).trim() === '';
  return ast.body.map((st, i) => {
    let first = st.start;
    let expected = st.loc.start.line;
    for (;;) {
      const c = comments.find((x) => x.end <= first && x.loc.end.line === expected - 1 && ownLine(x));
      if (!c) break;
      first = c.start;
      expected = c.loc.start.line;
    }
    let last = st.end;
    const next = ast.body[i + 1];
    if (!next || next.loc.start.line > st.loc.end.line) {
      const t = comments.find((x) => x.start >= st.end && x.loc.start.line === st.loc.end.line);
      if (t) last = t.end;
    }
    return { text: code.slice(first, last), line: st.loc.start.line + analysis.tagLine };
  });
}

function multiset(items) {
  const m = new Map();
  for (const item of items)
    m.set(item.text, { count: (m.get(item.text)?.count ?? 0) + 1, line: m.get(item.text)?.line ?? item.line });
  return m;
}

/** The entries of `a` that `b` has fewer of, as [text, line]. */
function surplus(a, b) {
  const out = [];
  for (const [text, { count, line }] of a) if (count > (b.get(text)?.count ?? 0)) out.push([text, line]);
  return out;
}

const excerpt = (text) => {
  const line = text.split('\n').find((l) => l.trim() !== '' && !l.trim().startsWith('//')) ?? text.split('\n')[0];
  return line.trim().length > 70 ? `${line.trim().slice(0, 67)}...` : line.trim();
};

function firstDifferingLine(a, b) {
  const x = a.split('\n');
  const y = b.split('\n');
  for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return i + 1;
  return 0;
}

/**
 * The reasons why `next` is not `base` with its top-level declarations moved (see --statements), one sentence each.
 * `describeLine(line)` names where a line of `next` comes from (optional).
 */
export function statementProblems(base, next, rev = 'the base', describeLine = () => '') {
  const problems = [];
  const a = analyse(base);
  const b = analyse(next);
  const outside = (html, an) => {
    const match = /<script>\n([\s\S]*?)<\/script>/.exec(html);
    return [html.slice(0, match.index), html.slice(match.index + match[0].length), an];
  };
  const [baseHead, baseTail] = outside(base, a);
  const [nextHead, nextTail] = outside(next, b);
  if (baseHead !== nextHead) {
    const line = firstDifferingLine(baseHead, nextHead);
    problems.push(`outside the main script: the page differs from \`${rev}\` at line ${line}${describeLine(line)}`);
  }
  if (baseTail !== nextTail) {
    const offset = next.length - nextTail.length;
    const line = next.slice(0, offset).split('\n').length - 1 + firstDifferingLine(baseTail, nextTail);
    problems.push(`outside the main script: the page differs from \`${rev}\` at line ${line}${describeLine(line)}`);
  }
  const before = multiset(statementTexts(a));
  const after = multiset(statementTexts(b));
  const lost = surplus(before, after);
  const gained = surplus(after, before);
  if (lost.length || gained.length) {
    const parts = [];
    if (lost.length) parts.push(`first only in \`${rev}\`: \`${excerpt(lost[0][0])}\` (line ${lost[0][1]})`);
    if (gained.length)
      parts.push(
        `first only in the assembly: \`${excerpt(gained[0][0])}\` (line ${gained[0][1]}${describeLine(gained[0][1])})`
      );
    problems.push(
      `the top-level declarations differ: ${lost.length} only in \`${rev}\`, ${gained.length} only in the assembly; ${parts.join('; ')}`
    );
  }
  const commentsOf = (an) =>
    an.comments.map((c) => ({ text: `${c.type}:${c.value}`, line: c.loc.start.line + an.tagLine }));
  const lostComments = surplus(multiset(commentsOf(a)), multiset(commentsOf(b)));
  const gainedComments = surplus(multiset(commentsOf(b)), multiset(commentsOf(a)));
  if (lostComments.length || gainedComments.length) {
    const first = lostComments[0] ?? gainedComments[0];
    problems.push(
      `the comments differ: ${lostComments.length} only in \`${rev}\`, ${gainedComments.length} only in the assembly; first ${lostComments.length ? `only in \`${rev}\`` : 'only in the assembly'}: \`${excerpt(first[0].replace(/^[A-Za-z]+:/, ''))}\` (line ${first[1]})`
    );
  }
  return [...problems, ...loadOrderProblems(b)];
}

function statementsLines(root, rev) {
  if (rev.startsWith('-')) fail(`\`${rev}\` is not a revision`);
  let base;
  try {
    base = execFileSync('git', ['show', `${rev}:${PAGE_PATH}`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 1 << 28,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return fail(`cannot read ${PAGE_PATH} at \`${rev}\` (unknown revision or no such file)`);
  }
  const { text, origins } = assemble(root);
  const describeLine = (line) =>
    origins[line - 1] ? `, produced by ${origins[line - 1].file}:${origins[line - 1].line}` : '';
  const problems = statementProblems(base, text, rev, describeLine);
  if (problems.length) return fail(problems.join('\n'));
  return [`the assembly has the declarations and the comments of the page of ${rev}, and its load order holds`];
}

// ---------------------------------------------------------------------------------------------------------------
// --layers (this run's DEC-4 and DEC-5): the four checks of the committed lists.

const REQUIRED_KEYS = new Set(['layers', 'parts', 'ratchet']);

/** The layers.json of the tree, refused when it holds an unknown key, a part outside its layer or no ratchet. */
function layersConfig(root) {
  const config = readJson(join(root, EDITOR_DIR, 'layers.json'), 'layers.json');
  for (const key of Object.keys(config))
    if (!REQUIRED_KEYS.has(key))
      fail(`${EDITOR_DIR}/layers.json: unknown key \`${key}\` (known: layers, parts, ratchet)`);
  const max = config.ratchet?.max;
  if (!Number.isInteger(max) || max < 0)
    fail(`${EDITOR_DIR}/layers.json: \`ratchet.max\` must be a whole number, 0 or more`);
  for (const part of config.parts ?? []) {
    if (part.layer !== UNSORTED && !config.layers.includes(part.layer))
      fail(
        `${EDITOR_DIR}/layers.json: the part \`${part.file}\` is in the layer \`${part.layer}\`, which is not one of the layers`
      );
    if (part.file.split('/')[0] !== part.layer)
      fail(
        `${EDITOR_DIR}/layers.json: the part \`${part.file}\` must be in a folder named like its layer \`${part.layer}\``
      );
  }
  return config;
}

function namesProblem(root, analysis) {
  const expected = readJson(join(root, EDITOR_DIR, 'names.json'), 'names.json');
  const { names, unnamed } = topLevelNames(analysis);
  const have = new Set(names);
  const want = new Set(expected.names);
  const added = names.filter((n) => !want.has(n));
  const removed = expected.names.filter((n) => !have.has(n));
  if (!added.length && !removed.length && unnamed === expected.unnamed) return null;
  const parts = [];
  if (added.length) parts.push(`added: ${added.join(', ')}`);
  if (removed.length) parts.push(`removed: ${removed.join(', ')}`);
  if (unnamed !== expected.unnamed)
    parts.push(`statements without a name: ${unnamed}, names.json says ${expected.unnamed}`);
  return `the top-level names differ from ${EDITOR_DIR}/names.json (${parts.join('; ')}); if intended, run \`node scripts/check-editor.mjs --write-names\` and commit names.json`;
}

function javaFiles(root, folder, out = []) {
  let entries;
  try {
    entries = readdirSync(join(root, folder), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) javaFiles(root, path, out);
    else if (entry.name.endsWith('.java')) out.push(path);
  }
  return out;
}

function javaNamesProblems(root, analysis) {
  const list = readJson(join(root, EDITOR_DIR, 'java-names.json'), 'java-names.json');
  const topLevel = new Set(topLevelNames(analysis).names);
  const problems = [];
  const listed = new Set(list.pathOnly ?? []);
  const text = new Map();
  const read = (file) => {
    if (!text.has(file)) {
      try {
        text.set(file, readFileSync(join(root, file), 'utf8'));
      } catch {
        text.set(file, null);
      }
    }
    return text.get(file);
  };
  for (const [name, files] of Object.entries(list.names ?? {})) {
    if (!topLevel.has(name))
      problems.push(
        `java-names.json lists \`${name}\`, which is not a top-level name of the page (a Java file names it)`
      );
    const word = new RegExp(`(?<![A-Za-z0-9_$])${name.replace(/\$/g, '\\$')}(?![A-Za-z0-9_$])`);
    for (const file of files) {
      listed.add(file);
      const content = read(file);
      if (content === null) problems.push(`java-names.json lists \`${file}\` for \`${name}\`, which does not exist`);
      else if (!word.test(content))
        problems.push(`java-names.json lists \`${file}\` for \`${name}\`, which it no longer names`);
    }
  }
  for (const file of list.pathOnly ?? []) {
    const content = read(file);
    if (content === null) problems.push(`java-names.json lists \`${file}\` in pathOnly, which does not exist`);
    else if (!content.includes('standalone.html'))
      problems.push(`java-names.json lists \`${file}\` in pathOnly, which no longer contains \`standalone.html\``);
  }
  for (const file of [...javaFiles(root, 'src/main/java'), ...javaFiles(root, 'src/test/java')])
    if (!listed.has(file) && read(file).includes('standalone.html'))
      problems.push(
        `${file} names \`standalone.html\` and is not in java-names.json: add the page functions it names to \`names\`, or the file to \`pathOnly\` when it names the path only`
      );
  return problems;
}

function layersLines(root) {
  const config = layersConfig(root);
  const { text } = assemble(root);
  const analysis = analyse(text);
  const lines = [];
  const names = namesProblem(root, analysis);
  if (names) fail(names);
  lines.push(`names: ${topLevelNames(analysis).names.length} top-level names equal names.json`);
  const java = javaNamesProblems(root, analysis);
  if (java.length) fail(java.join('\n'));
  lines.push('java names: every name is a top-level name, named by its files, and no other Java file names the page');
  const order = loadOrderProblems(analysis);
  if (order.length) fail(order.join('\n'));
  lines.push('load order: holds');
  const { layers, partOf } = partsOfAssembled(root, analysis);
  const sorted = (i) => {
    const part = partOf(i);
    return part && part.layerN >= 0 ? part : null;
  };
  const { upward } = countUpward(analysis, sorted, layers);
  const max = config.ratchet.max;
  if (upward > max)
    fail(
      `upward pairs: ${upward} (max ${max}): a declaration names a declaration of a higher layer; remove the pair (\`node scripts/check-editor.mjs --list\` shows them) or, if it is intended, say why and raise ratchet.max in ${EDITOR_DIR}/layers.json`
    );
  lines.push(`upward pairs: ${upward} (max ${max})`);
  return lines;
}

function parse(argv) {
  const options = { root: resolve(dirname(fileURLToPath(import.meta.url)), '..'), mode: null };
  const setMode = (mode) => {
    if (options.mode) fail(`only one mode at a time: \`${options.mode}\` and \`${mode}\``);
    options.mode = mode;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => argv[++i] ?? fail(`${arg} needs a value`);
    if (arg === '--layers') setMode('layers');
    else if (arg === '--list') setMode('list');
    else if (arg === '--cut') {
      setMode('cut');
      options.cut = value();
    } else if (arg === '--statements') {
      setMode('statements');
      options.rev = value();
    } else if (arg === '--write-names') setMode('write-names');
    else if (arg === '--root') options.root = resolve(value());
    else fail(`unknown option \`${arg}\``);
  }
  if (!options.mode) fail('no mode: use --layers, --list, --cut <file>, --statements <rev> or --write-names');
  return options;
}

export function run(argv) {
  const options = parse(argv);
  switch (options.mode) {
    case 'layers':
      return layersLines(options.root);
    case 'list':
      return listPairs(options.root);
    case 'cut':
      return cutLines(options.root, options.cut);
    case 'statements':
      return statementsLines(options.root, options.rev);
    default:
      return writeNames(options.root);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    for (const line of run(process.argv.slice(2))) console.log(line);
  } catch (error) {
    if (!(error instanceof EditorCheckError) && error.constructor.name !== 'EditorBuildError') throw error;
    console.error(error.message);
    process.exitCode = error.code ?? 1;
  }
}
