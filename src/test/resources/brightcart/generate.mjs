#!/usr/bin/env node
// Generates Brightcart, the invented shopping fixture of docs/fixtures/brightcart-spec.md, from one description (description.mjs).
//
//   node src/test/resources/brightcart/generate.mjs
//
// It writes, next to this file (and nothing else; the three folders are emptied first, so a second run gives the same bytes):
//   layered/    the layered rendition, the source of truth: a folder per plateau, a `Kind: Plateau` manifest in each (`name`, `horizon`, `override` when the parent is not the
//               root, and the `patches`), a `plateau: <id>` header on every manifest of a plateau other than `baseline`, and a .archicode.yaml with
//               `settings.manifests.paths: ["./**"]`. The layered engine reads it (`archicode diff --plateau <id>`, `views generate --plateau <id>`, the editor draws `baseline`).
//               The folder `shared/` holds the views and the stories (ENTRIES of the description): they belong to no plateau, so they have no `plateau:` header and no folder of a plateau.
//   variants/   V1 to V14 (negative variants) and M1 to M3 (merge scenarios) as descriptions with the expected class of message, and `status`: what a tool does with it
//               today (the `runToday` field of the description). V1 to V11 are run by the tools (negative-cases.json, which is written by hand and not here, and
//               plateau-model-cases.json); V12 to V14 and M1 to M3 wait for `plateau merge`. V1 to V8 also carry what the throwaway model reported, checked here against
//               the words the description expects.
//   the document  docs/fixtures/brightcart-spec.md, when it is found at its place in the repository (`docs/fixtures/`, four folders above this one; a copy of the generator elsewhere does not touch it): the last cell of each row V1 to V14 of its table of negative
//               variants is the `runToday` of the description (the only part of the table written here), so that the document and `variants/` say the same.
//   expected/   the sizes, the two renditions in files, lines and bytes, the comparisons P1 to P6 (with the command of each and the flag that says whether
//               a tool verifies them or only the model does), the table of changes of each comparison, the notable cases N1 to N17 and, for the views and the stories of
//               `shared/`, where each can be drawn (entries.json: the plateaus that have what it names, the warnings of the command line, the steps of the stories).
//
// What the generator checks before it finishes (it exits 1 on the first difference, after printing it):
//   1. the description resolves to the sizes and the counts of the document (50, 42, 66, 82 elements; P1 to P6);
//   2. the notable cases N1 to N17 hold in the model's comparisons;
//   3. the resolver reads the layered rendition back from the files it has just written, resolves each plateau and finds exactly what the model resolved (the "same plateaus" test);
//   4. the negative variants V1 to V8 fail in the model with the words expected;
//   5. the views and the stories name only what some plateau declares, every view a step names is declared once, and the fixture holds what issue #115 asks for (a view that names an
//      element one plateau alone declares, a technology map, a story whose steps are told at the plateaus of the fork, a story whose steps name no plateau); the files read back are the description.
// The command line checks the other side (README.md): `archicode diff` on layered/ gives the counts of P1 to P5.
//
// Everything is invented; nothing comes from a real workspace.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  build,
  ORDER,
  VIEWS,
  ENTRIES,
  ENTRY_FOLDER,
  E,
  Plateau,
  WORKSPACE_SETTINGS,
  WORKSPACE_STYLES,
  COMPARISONS,
  NOTABLE,
  VARIANTS,
  MERGES,
  DOCUMENT
} from './description.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// =========================================================================================================== the model
// A port of the throwaway Python model (layers, patch operators, the rules of compare.rs). An element lives in a state under the key `layer|ref`.

class FixtureError extends Error {}
const key = (layer, ref) => layer + '|' + ref;
const parentOf = (ref) => (ref.includes('.') ? ref.slice(0, ref.lastIndexOf('.')) : null);
const clone = (x) => structuredClone(x);
const keyLayer = (k) => k.slice(0, k.indexOf('|'));
const keyRef = (k) => k.slice(k.indexOf('|') + 1);

class State {
  constructor() {
    this.el = new Map(); // key -> element
    this.history = {}; // plateau id -> Map(key -> [refs of the parent plateau it replaces])
  }
  clone() {
    const s = new State();
    s.el = clone(this.el);
    s.history = clone(this.history);
    return s;
  }
  has(layer, ref) {
    return this.el.has(key(layer, ref));
  }
  get(layer, ref) {
    return this.el.get(key(layer, ref));
  }
  subtree(layer, ref) {
    return [...this.el.keys()].filter(
      (k) => keyLayer(k) === layer && (keyRef(k) === ref || keyRef(k).startsWith(ref + '.'))
    );
  }
}

const YAML_OPERATOR = { ADD_REL: 'ADD', ADD_APP: 'ADD', SET_REL: 'SET', MERGE_WHERE: 'MERGE' };
function describeOp(op, rank) {
  return `patch ${rank} (${YAML_OPERATOR[op.operator] || op.operator}${op.target ? ' ' + op.target : ''})`;
}

/** Applies one layer: its manifests are added to the graph of its parent, then its patches change the graph, in order. */
function resolve(parentState, plateau) {
  const st = parentState ? parentState.clone() : new State();
  const rec = new Map();
  for (const e of plateau.manifests) {
    const k = key(e.layer, e.ref);
    if (st.el.has(k)) throw new FixtureError(`${plateau.id}: reference ${e.ref} declared twice`);
    st.el.set(k, clone(e));
    if (e.replaces.length) rec.set(k, [...e.replaces]);
  }
  // a parent has to exist when a manifest is loaded
  for (const e of plateau.manifests) {
    const p = parentOf(e.ref);
    if (p && !st.has(e.layer, p))
      throw new FixtureError(`${plateau.id}: the parent of ${e.ref} does not exist when its manifest is read`);
  }

  const removeRefs = (layer, refs) => {
    const gone = new Set(refs);
    for (const k of [...st.el.keys()]) if (keyLayer(k) === layer && gone.has(keyRef(k))) st.el.delete(k);
    for (const [k, e] of st.el) {
      if (keyLayer(k) === layer) e.rels = e.rels.filter((r) => !gone.has(r.dest));
      if (keyLayer(k) === 'technology') {
        if (layer === 'application') e.apps = e.apps.filter((a) => !gone.has(a));
        else e.uses = e.uses.filter((a) => !gone.has(a));
      }
    }
  };

  plateau.patches.forEach((op, index) => {
    const o = op.operator;
    const layer = op.layer || 'application';
    const tgt = op.target;
    const where = `${plateau.id}: ${describeOp(op, index + 1)}`;
    if (tgt !== undefined && !st.has(layer, tgt)) throw new FixtureError(`${where} has no match for ${tgt}`);
    if (o === 'REMOVE') {
      removeRefs(layer, st.subtree(layer, tgt).map(keyRef));
    } else if (o === 'MERGE_WHERE') {
      const hits = [...st.el]
        .filter(([k, e]) => keyLayer(k) === 'application' && e.q.includes(op.qualifier))
        .map(([, e]) => e);
      if (op.expect !== undefined && op.expect !== hits.length)
        throw new FixtureError(`${where} expects ${op.expect} matches and found ${hits.length}`);
      op.expect = hits.length; // the guard written in layered/ is the count found here: N12 below holds the number the document says (12)
      if (!hits.length) throw new FixtureError(`${where} matched nothing`);
      for (const e of hits) Object.assign(e.tags, op.value); // MERGE: the keys of the value are set, the other tags stay
    } else if (o === 'SET') {
      const e = st.get(layer, tgt);
      const { field: f, value: v } = op;
      if (f === 'id' || f === 'parent' || f === 'elements')
        throw new FixtureError(`${where}: a patch never changes the ${f} of an element`);
      if (f === 'name') e.name = v;
      else if (f === 'description') e.desc = v;
      else if (f === 'qualifiers') e.q = [...v];
      else if (f === 'tags')
        e.tags = { ...v }; // SET replaces the field (A4); MERGE is the operator that keeps the other tags
      else if (f === 'applications') e.apps = [...v];
      else throw new FixtureError('field ' + f);
    } else if (o === 'ADD_REL') {
      const r = op.rel;
      if (!st.has(layer, r[0]))
        throw new FixtureError(`${where}: relationship from ${tgt} to ${r[0]} has no destination`);
      st.get(layer, tgt).rels.push({ dest: r[0], label: r[1], q: [...(r[2] || [])] });
    } else if (o === 'SET_REL') {
      const hit = st.get(layer, tgt).rels.filter((r) => r.dest === op.dest && r.label === op.label);
      if (hit.length !== 1)
        throw new FixtureError(`${where}: relationship ${tgt} -> ${op.dest} "${op.label}" matched ${hit.length}`);
      hit[0].label = op.new_label;
    } else if (o === 'ADD_APP') {
      for (const a of op.values) {
        if (!st.has('application', a)) throw new FixtureError(`${where}: node ${tgt} lists missing application ${a}`);
        st.get('technology', tgt).apps.push(a);
      }
    } else throw new FixtureError('operator ' + o);
  });
  st.history[plateau.id] = rec;
  return st;
}

// ---- compare: the rules of compare.rs, on the union of a baseline and a target
const norm = (s) => (s || '').split(/\s+/).filter(Boolean).join(' ');
const sorted = (xs) => [...xs].sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function props(e, rewrite) {
  const tags = {};
  for (const k of Object.keys(e.tags).sort()) if (!k.startsWith('rendering-')) tags[k] = e.tags[k];
  const fix = (layer, xs) =>
    sorted(new Set(xs.map((x) => (rewrite ? rewrite(layer, x) : x)).filter((x) => x !== null)));
  return {
    kind: e.kind,
    name: e.name,
    description: norm(e.desc),
    qualifiers: sorted(new Set(e.q)),
    tags,
    applications: fix('application', e.apps),
    uses: fix('technology', e.uses)
  };
}

function effectiveReplaces(chain, ids) {
  const n = chain.length - 1;
  const out = new Map();
  for (const k of chain[n].el.keys()) {
    const layer = keyLayer(k);
    let S = new Set([keyRef(k)]);
    for (let i = n; i > 0; i--) {
      const M = chain[i].history[ids[i]] || new Map();
      const S2 = new Set();
      for (const r of S) {
        if (chain[i - 1].has(layer, r)) S2.add(r);
        for (const x of M.get(key(layer, r)) || []) S2.add(x);
      }
      S = S2;
    }
    out.set(k, S);
  }
  return out;
}

function compare(chain, ids) {
  const base = chain[0];
  const target = chain[chain.length - 1];
  const eff = effectiveReplaces(chain, ids);
  const replacers = new Map(); // key of a base element -> keys of the target elements that replace it
  for (const [k, S] of eff) {
    const layer = keyLayer(k);
    const ref = keyRef(k);
    for (const r of sorted(S)) {
      if (r === ref && base.has(layer, r)) continue;
      if (base.has(layer, r) && !target.has(layer, r)) {
        const rk = key(layer, r);
        if (!replacers.has(rk)) replacers.set(rk, []);
        replacers.get(rk).push(ref);
      }
    }
  }
  const rewrite = (layer, ref) => {
    const by = replacers.get(key(layer, ref));
    if (by === undefined) return ref;
    return by.length === 1 ? by[0] : null;
  };
  const states = new Map();
  for (const [k, e] of target.el) {
    const layer = keyLayer(k);
    const ref = keyRef(k);
    const valid = sorted([...eff.get(k)].filter((r) => r !== ref && base.has(layer, r) && !target.has(layer, r)));
    if (valid.length) {
      if (valid.length > 1 || base.has(layer, ref)) states.set(k, 'merged');
      else if (replacers.get(key(layer, valid[0])).length > 1) states.set(k, 'split');
      else states.set(k, 'moved');
    } else if (!base.has(layer, ref)) states.set(k, 'new');
    else states.set(k, same(props(base.get(layer, ref), rewrite), props(e)) ? 'none' : 'changed');
  }
  for (const k of base.el.keys()) if (!target.el.has(k) && !replacers.has(k)) states.set(k, 'removed');

  const relsOf = (state, rw) => {
    const out = [];
    for (const [k, e] of state.el) {
      const layer = keyLayer(k);
      const src = rw ? rw(layer, keyRef(k)) : keyRef(k);
      if (src === null) continue;
      for (const r of e.rels) {
        const d = rw ? rw(layer, r.dest) : r.dest;
        if (d === null) continue;
        out.push({ k: JSON.stringify([layer, src, d, r.label]), q: JSON.stringify(sorted(new Set(r.q))) });
      }
    }
    return out;
  };
  const group = (list) => {
    const g = new Map();
    for (const r of list) g.set(r.k, [...(g.get(r.k) || []), r.q].sort());
    return g;
  };
  const bset = group(relsOf(base, rewrite));
  const tset = group(relsOf(target, null));
  const relState = new Map();
  for (const k of new Set([...bset.keys(), ...tset.keys()])) {
    if (bset.has(k) && tset.has(k)) relState.set(k, same(bset.get(k), tset.get(k)) ? 'none' : 'changed');
    else relState.set(k, tset.has(k) ? 'new' : 'removed');
  }
  const pairs = new Map();
  for (const [k, s] of relState) {
    if (s !== 'removed' && s !== 'new') continue;
    const p = JSON.stringify(JSON.parse(k).slice(0, 3));
    if (!pairs.has(p)) pairs.set(p, { removed: [], new: [] });
    pairs.get(p)[s].push(k);
  }
  for (const d of pairs.values()) {
    if (d.removed.length === 1 && d.new.length === 1) {
      relState.set(d.removed[0], 'label-changed');
      relState.delete(d.new[0]);
    }
  }
  for (const [k, s] of relState) {
    if (['new', 'removed', 'changed', 'label-changed'].includes(s)) {
      const [layer, src] = JSON.parse(k);
      if (states.get(key(layer, src)) === 'none') states.set(key(layer, src), 'changed');
    }
  }
  const contains = new Set();
  for (const [k, s] of states) {
    if (s === 'none') continue;
    for (let p = parentOf(keyRef(k)); p; p = parentOf(p)) {
      const pk = key(keyLayer(k), p);
      if (states.get(pk) === 'none') contains.add(pk);
    }
  }
  for (const k of contains) states.set(k, 'contains-changes');
  return { states, relState };
}

/** The entries of the `replaces` of the target plateau that name an element the baseline does not have: the tool ignores them, with a warning. */
function ignoredReplaces(base, target, targetId) {
  let n = 0;
  for (const [k, refs] of target.history[targetId]) for (const r of refs) if (!base.has(keyLayer(k), r)) n++;
  return n;
}

function counts(c) {
  const e = { new: 0, changed: 0, removed: 0, moved: 0, split: 0, merged: 0 };
  for (const s of c.states.values()) if (s in e) e[s]++;
  const r = { new: 0, changed: 0, removed: 0 };
  for (const s of c.relState.values()) {
    if (s === 'new') r.new++;
    else if (s === 'changed' || s === 'label-changed') r.changed++;
    else if (s === 'removed') r.removed++;
  }
  return {
    elements: { new: e.new, changed: e.changed, removed: e.removed },
    replacing: { moved: e.moved, split: e.split, merged: e.merged },
    relationships: r
  };
}

/** What a layered engine would have to say about a resolved plateau: references that lead nowhere. */
function validate(st, pid) {
  const errs = [];
  for (const [k, e] of st.el) {
    const layer = keyLayer(k);
    const ref = keyRef(k);
    const p = parentOf(ref);
    if (p && !st.has(layer, p)) errs.push(`${pid}: ${ref} has no parent ${p}`);
    for (const r of e.rels) if (!st.has(layer, r.dest)) errs.push(`${pid}: dangling reference ${ref} -> ${r.dest}`);
    for (const a of e.apps)
      if (!st.has('application', a)) errs.push(`${pid}: node ${ref} lists missing application ${a}`);
    for (const u of e.uses) if (!st.has('technology', u)) errs.push(`${pid}: ${ref} uses missing ${u}`);
    if (layer === 'technology' && e.kind === 'node' && !p) errs.push(`${pid}: node ${ref} has no environment`);
  }
  const hosted = new Map();
  for (const [k, e] of st.el) {
    if (keyLayer(k) !== 'technology') continue;
    const env = keyRef(k).split('.')[0];
    for (const a of e.apps) hosted.set(env + '|' + a, [...(hosted.get(env + '|' + a) || []), keyRef(k)]);
  }
  for (const [ea, nodes] of hosted)
    if (nodes.length > 1)
      errs.push(
        `${pid}: ${ea.split('|')[1]} is hosted by ${nodes.length} nodes of ${ea.split('|')[0]}: ${nodes.join(', ')}`
      );
  return errs;
}

/** Resolves the plateaus in order; a plateau whose own resolution fails is reported and so are those that hang under it (they are not resolved). */
function runAll(P, order = ORDER) {
  const S = {};
  const messages = [];
  for (const pid of order) {
    const pl = P[pid];
    if (pl.parent && !S[pl.parent]) {
      messages.push(`${pid}: not resolved, its parent ${pl.parent} did not resolve`);
      continue;
    }
    try {
      S[pid] = resolve(pl.parent ? S[pl.parent] : null, pl);
    } catch (ex) {
      if (!(ex instanceof FixtureError)) throw ex;
      messages.push(ex.message);
      continue;
    }
    messages.push(...validate(S[pid], pid));
  }
  return { S, messages };
}

// ============================================================================================================ the emitter
// YAML written as the existing examples are: double-quoted scalars, flow lists for short lists, block maps for the rest.
const q = (s) => JSON.stringify(s);
const flow = (xs) => '[' + xs.map(q).join(', ') + ']';
const KINDS = ['person', 'system', 'container', 'component', 'node', 'environment'];
/** json.dumps of the Python model: ", " and ": " as separators. */
function pyJson(v) {
  if (Array.isArray(v)) return '[' + v.map(pyJson).join(', ') + ']';
  if (v && typeof v === 'object')
    return (
      '{' +
      Object.entries(v)
        .map(([k, x]) => q(k) + ': ' + pyJson(x))
        .join(', ') +
      '}'
    );
  return JSON.stringify(v);
}

function elementLines(e, children, indent, nested) {
  const pad = ' '.repeat(indent);
  const lines = [];
  let first = true;
  const put = (text) => {
    if (nested && first) {
      lines.push(pad.slice(0, -2) + '- ' + text);
      first = false;
    } else lines.push(pad + text);
  };
  if (nested) put('kind: ' + q(e.kind));
  put('id: ' + q(e.ref.split('.').at(-1)));
  if (e.name) put('name: ' + q(e.name));
  if (e.desc) put('description: ' + q(e.desc));
  if (e.q.length) put('qualifiers: ' + flow(e.q));
  if (Object.keys(e.tags).length) {
    put('tags:');
    for (const [k, v] of Object.entries(e.tags)) lines.push(pad + '  ' + k + ': ' + q(v));
  }
  if (e.replaces.length) {
    put('replaces:');
    for (const r of e.replaces) lines.push(pad + '  - ' + q(r));
  }
  if (e.apps.length) {
    put('applications:');
    for (const r of e.apps) lines.push(pad + '  - ' + q(r));
  }
  if (e.uses.length) {
    put('uses:');
    for (const r of e.uses) lines.push(pad + '  - ' + q(r));
  }
  if (e.rels.length) {
    put('relationships:');
    for (const r of e.rels) {
      lines.push(pad + '  - destination: ' + q(r.dest));
      lines.push(pad + '    label: ' + q(r.label));
      if (r.q.length) lines.push(pad + '    qualifiers: ' + flow(r.q));
    }
  }
  if (children.length) {
    put('elements:');
    for (const c of children) lines.push(...elementLines(c.e, c.children, indent + 4, true));
  }
  return lines;
}

function manifestText(t, headerExtra) {
  const e = t.e;
  const head = ['header:', `  kind: "archicode.morin.io/${e.kind}"`, '  version: "1"', ...headerExtra];
  return [...head, 'content:', ...elementLines(e, t.children, 2, false)].join('\n') + '\n';
}

function opYaml(op) {
  const o = op.operator;
  let items;
  if (o === 'REMOVE')
    items = [
      ['operator', 'REMOVE'],
      ['target', q(op.target)],
      ...(op.layer === 'technology' ? [['layer', 'technology']] : [])
    ];
  else if (o === 'SET') {
    items = [
      ['operator', 'SET'],
      ['target', q(op.target)]
    ];
    if (op.layer === 'technology') items.push(['layer', 'technology']);
    items.push(['field', op.field], ['value', pyJson(op.value)]);
  } else if (o === 'SET_REL') {
    items = [
      ['operator', 'SET'],
      ['target', q(op.target)],
      ['field', 'relationships'],
      ['where', `{destination: ${q(op.dest)}, label: ${q(op.label)}}`],
      ['value', `{label: ${q(op.new_label)}}`]
    ];
  } else if (o === 'ADD_REL') {
    const r = op.rel;
    const v =
      `{destination: ${q(r[0])}, label: ${q(r[1])}` + (r[2] && r[2].length ? `, qualifiers: ${flow(r[2])}` : '') + '}';
    items = [
      ['operator', 'ADD'],
      ['target', q(op.target)],
      ['field', 'relationships'],
      ['value', v]
    ];
  } else if (o === 'ADD_APP') {
    items = [
      ['operator', 'ADD'],
      ['target', q(op.target)],
      ['layer', 'technology'],
      ['field', 'applications'],
      ['value', flow(op.values)]
    ];
  } else if (o === 'MERGE_WHERE') {
    // the bulk edit: the elements that carry a qualifier get a tag. SET would replace their tags; MERGE keeps the ones they have (A4)
    items = [
      ['operator', 'MERGE'],
      ['json-path', q(`$.application..elements[?(@.qualifiers[?(@ == '${op.qualifier}')])]`)],
      ['field', op.field],
      ['value', pyJson(op.value)],
      ['expect', String(op.expect)]
    ];
  } else throw new Error('operator ' + o);
  const out = [];
  if (op.comment) out.push('  # ' + op.comment);
  items.forEach(([k, v], i) => out.push((i === 0 ? '  - ' : '    ') + k + ': ' + v));
  return out.join('\n');
}

/** `Kind: Plateau`: the id, the name and the horizon, `override` for a plateau whose parent is not the root (absent means `baseline`), then the patches. */
function plateauText(pl) {
  const head = ['header:', '  kind: "archicode.morin.io/plateau"', '  version: "1"'];
  const body = ['content:', '  id: ' + q(pl.id), '  name: ' + q(pl.name), '  horizon: ' + q(pl.horizon)];
  if (pl.parent && pl.parent !== 'baseline') body.push('  override: ' + q(pl.parent));
  if (pl.patches.length) {
    body.push('  patches:');
    for (const op of pl.patches)
      body.push(
        ...opYaml(op)
          .split('\n')
          .map((l) => '  ' + l)
      );
  }
  return [...head, ...body].join('\n') + '\n';
}

// ----- the views and the stories (ENTRIES): manifests that belong to no plateau, written in the folder ENTRY_FOLDER with no `plateau:` header
const entryFile = (e) => `${ENTRY_FOLDER}/${e.kind}.${e.id}.yaml`;

/** The content of an entry with its keys in the order the emitter writes them (the description may order them otherwise); `kind` is the manifest's, not the content's. */
function entryContent(e) {
  const props = (p) => {
    const out = {};
    for (const k of ['element', 'pinned', 'opened', 'hidden']) if (p[k] !== undefined) out[k] = p[k];
    return out;
  };
  const view = (v) => {
    const out = {};
    for (const k of ['viewpoint', 'layer']) if (v[k] !== undefined) out[k] = v[k];
    out.properties = props(v.properties);
    return out;
  };
  if (e.kind === 'view') {
    const c = { id: e.id, name: e.name, description: e.description, ...view(e) };
    return c;
  }
  const steps = e.steps.map((st) => {
    const out = st.view !== undefined ? { view: st.view } : view(st);
    out.text = st.text;
    if (st.at !== undefined) out.at = st.at;
    if (st.against !== undefined) out.against = st.against;
    return out;
  });
  return { id: e.id, name: e.name, description: e.description, steps };
}

function entryText(e) {
  const c = entryContent(e);
  const lines = ['header:', `  kind: "archicode.morin.io/${e.kind}"`, '  version: "1"', 'content:'];
  const properties = (p, pad) => {
    lines.push(pad + 'properties:');
    for (const [k, v] of Object.entries(p)) lines.push(pad + '  ' + k + ': ' + (Array.isArray(v) ? flow(v) : q(v)));
  };
  lines.push('  id: ' + q(c.id), '  name: ' + q(c.name), '  description: ' + q(c.description));
  if (e.kind === 'view') {
    lines.push('  viewpoint: ' + q(c.viewpoint), '  layer: ' + q(c.layer));
    properties(c.properties, '  ');
  } else {
    lines.push('  steps:');
    for (const st of c.steps) {
      const own = st.view === undefined;
      lines.push(own ? '    - viewpoint: ' + q(st.viewpoint) : '    - view: ' + q(st.view));
      if (own) {
        lines.push('      layer: ' + q(st.layer));
        properties(st.properties, '      ');
      }
      lines.push('      text: ' + q(st.text));
      if (st.at !== undefined) lines.push('      at: ' + q(st.at));
      if (st.against !== undefined) lines.push('      against: ' + q(st.against));
    }
  }
  return lines.join('\n') + '\n';
}

/**
 * Where each view of ENTRIES can be drawn, by the rules of the command line (`GenerateViewsCommand.canBeDrawnInPlateau`, which the editor's `viewProblem` follows): a view of an
 * element is drawn in a plateau that has the element; an entry of a map that the plateau lacks is left out, with a warning, and a map none of whose `pinned` elements is there is
 * skipped, with a warning. The sentences are those of the command line, which the Java test compares byte for byte with its error output.
 */
function viewIn(v, S, pid) {
  const layer = v.layer;
  const has = (ref) => S[pid].has(layer, ref);
  const sortedUnique = (xs) => [...new Set(xs)].sort();
  const names = (list) => list.map((n) => '`' + n + '`').join(', ');
  const file = `plantuml/${layer}/${v.id}.puml`;
  if (v.viewpoint !== 'map') {
    const element = v.properties.element;
    if (has(element)) return { drawn: true, file, warnings: [], leftOut: [] };
    return {
      drawn: false,
      file: null,
      warnings: [`skip \`${v.id}\`: it names \`${element}\`, which the plateau \`${pid}\` does not have`],
      leftOut: []
    };
  }
  const pinned = v.properties.pinned || [];
  const missing = sortedUnique(
    ['pinned', 'opened', 'hidden'].flatMap((k) => (v.properties[k] || []).filter((r) => !has(r)))
  );
  if (!missing.length) return { drawn: true, file, warnings: [], leftOut: [] };
  if (pinned.length && pinned.every((r) => missing.includes(r))) {
    return {
      drawn: false,
      file: null,
      warnings: [
        `skip \`${v.id}\`: it is pinned on ${names(sortedUnique(pinned))}, which the plateau \`${pid}\` does not have`
      ],
      leftOut: []
    };
  }
  return {
    drawn: true,
    file,
    warnings: [`the view \`${v.id}\` is drawn without ${names(missing)}, which the plateau \`${pid}\` does not have`],
    leftOut: missing
  };
}

/** The references a view names, with their layer. */
function viewNames(v) {
  return ['element', 'pinned', 'opened', 'hidden'].flatMap((k) =>
    Array.isArray(v.properties[k]) ? v.properties[k] : v.properties[k] === undefined ? [] : [v.properties[k]]
  );
}

/**
 * What the views and the stories say about the plateaus, worked out from the model (expected/entries.json), and the checks the fixture must pass (see the header, item 5).
 * Returns { facts, problems }.
 */
function entryFacts(P, S) {
  const problems = [];
  const views = ENTRIES.filter((e) => e.kind === 'view');
  const stories = ENTRIES.filter((e) => e.kind === 'story');
  const declaredAnywhere = (layer, ref) =>
    ORDER.some((pid) => P[pid].manifests.some((m) => m.layer === layer && m.ref === ref));
  const ids = new Set();
  for (const e of ENTRIES) {
    if (ids.has(e.kind + e.id)) problems.push(`the ${e.kind} ${e.id} is declared twice`);
    ids.add(e.kind + e.id);
  }
  const viewById = new Map(views.map((v) => [v.id, v]));
  const viewFacts = views.map((v) => {
    for (const n of viewNames(v))
      if (!declaredAnywhere(v.layer, n)) problems.push(`the view ${v.id} names ${n}, which no plateau declares`);
    const plateaus = {};
    for (const pid of ORDER) plateaus[pid] = viewIn(v, S, pid);
    return {
      id: v.id,
      file: entryFile(v),
      viewpoint: v.viewpoint,
      layer: v.layer,
      names: viewNames(v),
      pinned: v.properties.pinned || [],
      plateaus
    };
  });
  const storyFacts = stories.map((st) => ({
    id: st.id,
    file: entryFile(st),
    steps: st.steps.map((step, i) => {
      const where = `the story ${st.id} step ${i + 1}`;
      let view = step;
      if (step.view !== undefined) {
        view = viewById.get(step.view);
        if (!view) problems.push(`${where} names the view ${step.view}, which is not declared`);
      }
      for (const key of ['at', 'against'])
        if (step[key] !== undefined && !ORDER.includes(step[key]))
          problems.push(`${where} says ${key}: ${step[key]}, which is not a plateau`);
      if (step.at !== undefined && step.at === step.against) problems.push(`${where} compares a plateau with itself`);
      if (view)
        for (const n of viewNames(view))
          if (!declaredAnywhere(view.layer, n)) problems.push(`${where} names ${n}, which no plateau declares`);
      // a step is told at the plateau it says, else at the plateau drawn: for each plateau that can be drawn, can the step be drawn?
      const drawableAt = (pid) => (view ? viewIn(view, S, pid).drawn : false);
      const told = {};
      for (const pid of ORDER) told[pid] = drawableAt(step.at ?? pid);
      return {
        number: i + 1,
        view: step.view ?? null,
        names: view ? viewNames(view) : [],
        at: step.at ?? null,
        against: step.against ?? null,
        // `diff --plateau <at> --against <against>` is the comparison; with no `at` it is the plateau drawn, so the command depends on the reader
        comparison:
          step.against === undefined
            ? null
            : step.at === undefined
              ? `diff --plateau <the plateau drawn> --against ${step.against}`
              : `diff --plateau ${step.at} --against ${step.against}`,
        drawnWhenPlateauDrawnIs: told
      };
    })
  }));
  // what issue #115 asks the fixture to hold
  const some = (cond, what) => {
    if (!cond) problems.push(`the fixture does not hold ${what}`);
  };
  const declarers = (v) => ORDER.filter((pid) => viewIn(v, S, pid).drawn);
  some(
    views.some((v) => declarers(v).length === ORDER.length),
    'a view that every plateau can draw'
  );
  some(
    views.some((v) => v.viewpoint !== 'map' && declarers(v).length === 1),
    'a view that names an element one plateau alone declares'
  );
  some(
    views.some((v) => v.viewpoint !== 'map' && declarers(v).length > 0 && declarers(v).length < ORDER.length),
    'a view that some plateau cannot draw'
  );
  some(
    views.some((v) => v.viewpoint === 'map' && v.layer === 'technology'),
    'a saved map of the technology layer'
  );
  some(
    views.some((v) => v.viewpoint === 'map' && v.layer === 'application'),
    'a saved map of the application layer'
  );
  some(
    views.some(
      (v) => v.viewpoint === 'map' && ORDER.some((pid) => viewIn(v, S, pid).drawn && viewIn(v, S, pid).leftOut.length)
    ),
    'a map that leaves out an entry the plateau lacks'
  );
  some(
    views.some((v) => v.viewpoint === 'map' && ORDER.some((pid) => !viewIn(v, S, pid).drawn)),
    'a map that a plateau cannot draw'
  );
  some(
    stories.some((st) =>
      st.steps.some(
        (x) => (x.at === 'saas' && x.against === 'baseline') || (x.at === 'inhouse' && x.against === 'saas')
      )
    ),
    'a story with a step told at a plateau of the fork'
  );
  some(
    stories.some((st) => st.steps.some((x) => x.at === 'inhouse' && x.against === 'saas')),
    'a step that compares the two plateaus of the fork (they do not stack)'
  );
  some(
    stories.some((st) => st.steps.some((x) => x.at === 'marketplace' && x.against === 'baseline')),
    'a step compared with a plateau further up the chain'
  );
  some(
    stories.some((st) => st.steps.some((x) => x.at === undefined && x.against !== undefined)),
    'a step with `against` and no `at`'
  );
  some(
    stories.some((st) => st.steps.every((x) => x.at === undefined && x.against === undefined)),
    'a story whose steps name no plateau'
  );
  // a story whose steps name no plateau can be drawn in every plateau: it is the same story whatever plateau is drawn
  for (const st of storyFacts) {
    const own = st.steps.every((x) => x.at === null && x.against === null);
    for (const x of st.steps) {
      if (own) {
        for (const pid of ORDER)
          if (!x.drawnWhenPlateauDrawnIs[pid])
            problems.push(
              `the story ${st.id}, which names no plateau, cannot draw step ${x.number} when ${pid} is drawn`
            );
      } else if (x.at !== null && !x.drawnWhenPlateauDrawnIs[x.at]) {
        problems.push(`the story ${st.id} step ${x.number} is told at ${x.at}, which cannot draw what it names`);
      }
    }
  }
  return { facts: { folder: ENTRY_FOLDER, plateaus: ORDER, views: viewFacts, stories: storyFacts }, problems };
}

// ----- layered rendition: the manifests of each plateau grouped by file, nested by parent, a `parent` header when the parent is in another file, and a `plateau`
// header on every manifest of a plateau other than `baseline` (the plateau of a manifest is its header, whatever its folder; without one it is `baseline`)
function layeredTree(pl, file) {
  const els = pl.manifests.filter((e) => e.file === file);
  const refs = new Set(els.map((e) => key(e.layer, e.ref)));
  const roots = els.filter((e) => !refs.has(key(e.layer, parentOf(e.ref))));
  if (roots.length !== 1) throw new Error(`${file}: ${roots.length} roots in one file`);
  const node = (e) => ({ e, children: els.filter((c) => c.layer === e.layer && parentOf(c.ref) === e.ref).map(node) });
  return node(roots[0]);
}

function writeLayered(P) {
  const files = new Map();
  // The manifests are in the folders next to .archicode.yaml, and the default `manifests` folder does not exist here: say where they are, recursively.
  // The plateau of a manifest is its header; the folders only keep the files of a plateau together.
  const manifests = '  manifests:\n    paths: ["./**"]\n';
  files.set('.archicode.yaml', 'settings:\n' + WORKSPACE_SETTINGS + manifests + WORKSPACE_STYLES);
  for (const pid of ORDER) {
    const pl = P[pid];
    files.set(`${pid}/plateau.yaml`, plateauText(pl));
    for (const file of new Set(pl.manifests.map((e) => e.file))) {
      const t = layeredTree(pl, file);
      const parent = parentOf(t.e.ref);
      const extra = [
        ...(pid === 'baseline' ? [] : [`  plateau: ${q(pl.id)}`]),
        ...(parent ? [`  parent: ${q(parent)}`] : [])
      ];
      files.set(file, manifestText(t, extra));
    }
  }
  for (const e of ENTRIES) files.set(entryFile(e), entryText(e));
  return files;
}

// ================================================================================================= reading it back (the resolver)
// A reader of exactly the YAML the emitter writes: block maps and lists, double-quoted scalars, flow lists, flow maps with bare or quoted keys, `#` comments.

function stripComment(text) {
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i).trimEnd();
  }
  return text.trimEnd();
}

function parseFlow(text) {
  let i = 0;
  const skip = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  const value = () => {
    skip();
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      const s = JSON.parse(text.slice(i, j + 1));
      i = j + 1;
      return s;
    }
    if (c === '[') {
      i++;
      const out = [];
      skip();
      while (text[i] !== ']') {
        out.push(value());
        skip();
        if (text[i] === ',') i++;
        skip();
      }
      i++;
      return out;
    }
    if (c === '{') {
      i++;
      const out = {};
      skip();
      while (text[i] !== '}') {
        skip();
        const k = text[i] === '"' ? value() : text.slice(i, (i = text.indexOf(':', i))).trim();
        skip();
        if (text[i] !== ':') throw new Error('flow map: ":" expected in ' + text);
        i++;
        out[k] = value();
        skip();
        if (text[i] === ',') i++;
        skip();
      }
      i++;
      return out;
    }
    let j = i;
    while (j < text.length && !',]}'.includes(text[j])) j++;
    const s = text.slice(i, j).trim();
    i = j;
    return /^-?\d+$/.test(s) ? Number(s) : s;
  };
  const v = value();
  skip();
  if (i !== text.length) throw new Error('flow value: trailing text in ' + text);
  return v;
}

const scalar = (text) => (/^["[{]/.test(text) ? parseFlow(text) : /^-?\d+$/.test(text) ? Number(text) : text);

function parseYaml(source) {
  const lines = [];
  for (const raw of source.split('\n')) {
    const text = stripComment(raw);
    if (text.trim()) lines.push({ indent: text.length - text.trimStart().length, text: text.trim() });
  }
  let pos = 0;
  function block(indent) {
    return lines[pos].text.startsWith('- ') || lines[pos].text === '-' ? list(indent) : map(indent);
  }
  function list(indent) {
    const out = [];
    while (pos < lines.length && lines[pos].indent === indent && lines[pos].text.startsWith('- ')) {
      const rest = lines[pos].text.slice(2);
      if (/^("[^"]*"|\[.*\]|\{.*\})$/.test(rest) || !/^[\w-]+:(\s|$)/.test(rest)) {
        out.push(scalar(rest));
        pos++;
      } else {
        lines[pos] = { indent: indent + 2, text: rest }; // "- key: value" is a map whose first line sits two columns further
        out.push(map(indent + 2));
      }
    }
    return out;
  }
  function map(indent) {
    const out = {};
    while (pos < lines.length && lines[pos].indent === indent && !lines[pos].text.startsWith('- ')) {
      const m = /^([\w-]+):(?:\s+(.*))?$/.exec(lines[pos].text);
      if (!m) throw new Error('YAML: cannot read ' + JSON.stringify(lines[pos].text));
      pos++;
      if (m[2] !== undefined) out[m[1]] = scalar(m[2]);
      else if (
        pos < lines.length &&
        (lines[pos].indent > indent || (lines[pos].indent === indent && lines[pos].text.startsWith('- ')))
      )
        out[m[1]] = block(lines[pos].indent);
      else out[m[1]] = null;
    }
    return out;
  }
  return lines.length ? block(lines[0].indent) : {};
}

const LAYER_OF = {
  person: 'application',
  system: 'application',
  container: 'application',
  component: 'application',
  node: 'technology',
  environment: 'technology'
};

/** The elements of a parsed manifest, flat, in document order. */
function flatten(doc, file) {
  const out = [];
  const kind = doc.header.kind.split('/').at(-1);
  const walk = (c, parent, k) => {
    const ref = parent ? parent + '.' + c.id : c.id;
    out.push(
      E(ref, k, c.name ?? '', c.description ?? '', {
        q: c.qualifiers || [],
        tags: c.tags || {},
        rels: (c.relationships || []).map((r) => [r.destination, r.label, r.qualifiers || []]),
        apps: c.applications || [],
        uses: c.uses || [],
        replaces: c.replaces || [],
        layer: LAYER_OF[k]
      })
    );
    out.at(-1).file = file;
    for (const child of c.elements || []) walk(child, ref, child.kind);
  };
  walk(doc.content, doc.header.parent || null, kind);
  return out;
}

function opFromYaml(p) {
  const layer = p.layer === 'technology' ? { layer: 'technology' } : {};
  if (p.operator === 'REMOVE') return { operator: 'REMOVE', target: p.target, ...layer };
  if (p.operator === 'MERGE' && p['json-path'] !== undefined) {
    const m = /@ == '([^']+)'/.exec(p['json-path']);
    return { operator: 'MERGE_WHERE', qualifier: m[1], field: p.field, value: p.value, expect: p.expect };
  }
  if (p.operator === 'SET' && p.where)
    return {
      operator: 'SET_REL',
      target: p.target,
      dest: p.where.destination,
      label: p.where.label,
      new_label: p.value.label
    };
  if (p.operator === 'SET') return { operator: 'SET', target: p.target, field: p.field, value: p.value, ...layer };
  if (p.operator === 'ADD' && p.field === 'relationships')
    return {
      operator: 'ADD_REL',
      target: p.target,
      rel: [p.value.destination, p.value.label, p.value.qualifiers || []]
    };
  if (p.operator === 'ADD' && p.field === 'applications')
    return { operator: 'ADD_APP', target: p.target, values: p.value, layer: 'technology' };
  throw new Error('patch not understood: ' + JSON.stringify(p));
}

function listFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...listFiles(full).map((f) => name + '/' + f));
    else out.push(name);
  }
  return out;
}

/**
 * The layered rendition read from the disk: the plateaus with their manifests and their patches, each manifest in the plateau its header names (L0), `baseline`
 * when it names none; and, apart, the views and the stories (`entries`), which belong to no plateau. Like the tools, the generator does not look at the folder to decide; it only checks that the folder of a plateau holds the manifests that
 * name it, which is how the generator wrote them.
 */
function readLayered(dir) {
  const plateaus = {};
  for (const f of listFiles(dir)) {
    if (!f.endsWith('/plateau.yaml')) continue;
    const doc = parseYaml(fs.readFileSync(path.join(dir, f), 'utf8'));
    const c = doc.content;
    const pl = new Plateau(c.id, c.name, c.horizon, c.id === 'baseline' ? null : c.override || 'baseline', '');
    pl.patches = (c.patches || []).map(opFromYaml);
    pl.folder = f.split('/')[0];
    plateaus[c.id] = pl;
  }
  const entries = [];
  for (const f of listFiles(dir)) {
    if (f === '.archicode.yaml' || f.endsWith('/plateau.yaml')) continue;
    const doc = parseYaml(fs.readFileSync(path.join(dir, f), 'utf8'));
    const kind = doc.header.kind.split('/').at(-1);
    if (kind === 'view' || kind === 'story') {
      // a view and a story belong to no plateau: no `plateau:` header, and the folder is the one no plateau owns
      if (doc.header.plateau !== undefined)
        throw new Error(`${f}: a ${kind} belongs to no plateau and says ${doc.header.plateau}`);
      entries.push({ file: f, kind, content: doc.content });
      continue;
    }
    const folder = f.split('/')[0];
    const owner = plateaus[doc.header.plateau || 'baseline'];
    if (!owner) throw new Error(`${f}: names the plateau ${doc.header.plateau}, which has no plateau.yaml`);
    if (owner.folder !== folder)
      throw new Error(`${f}: names the plateau ${owner.id}, which is the folder ${owner.folder}`);
    for (const e of flatten(doc, dir.split('/').at(-1) + '/' + f)) owner.manifests.push(e);
  }
  return { plateaus, entries };
}

/** The comparable face of an element: what compare reads plus its replaces. Lists keep their order: the generator writes them in a fixed one. */
function face(e, replaces) {
  return JSON.stringify({ ...props(e), rels: e.rels, replaces });
}

function diffPlateau(pid, resolved, model) {
  const problems = [];
  const a = new Set(resolved.el.keys());
  const b = new Set(model.el.keys());
  for (const k of a)
    if (!b.has(k)) problems.push(`${pid}: ${keyRef(k)} is in the resolution of the files and not in the model`);
  for (const k of b)
    if (!a.has(k)) problems.push(`${pid}: ${keyRef(k)} is in the model and not in the resolution of the files`);
  for (const k of a) {
    if (!b.has(k)) continue;
    const x = face(resolved.el.get(k), resolved.history[pid].get(k) || []);
    const y = face(model.el.get(k), model.history[pid].get(k) || []);
    if (x !== y) problems.push(`${pid}: ${keyRef(k)} differs\n    files  ${x}\n    model  ${y}`);
  }
  return problems;
}

// ===================================================================================================== writing and checking
function writeTree(root, files) {
  fs.rmSync(root, { recursive: true, force: true });
  for (const [name, content] of files) {
    const full = path.join(root, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}
const json = (v) => JSON.stringify(v, null, 2) + '\n';
const failures = [];
const fail = (msg) => failures.push(msg);

function measure(files) {
  let lines = 0;
  let bytes = 0;
  for (const [name, content] of files) {
    if (name === '.archicode.yaml') continue; // the workspace is shared; the document counts the manifests
    lines += content.split('\n').length - 1;
    bytes += Buffer.byteLength(content);
  }
  return { files: [...files.keys()].filter((n) => n !== '.archicode.yaml').length, lines, bytes };
}

// The document's table of negative variants says, in its last column, what a tool does with each variant today: that cell is the `runToday` of the description, and
// it is the only part of the table written here. Returns the number of rows written, or null when the document is not at its place (a copy of this folder).
function writeRunToday(variants) {
  const spec = path.resolve(here, '../../../../docs/fixtures/brightcart-spec.md');
  if (!fs.existsSync(spec) || failures.length) return null;
  const lines = fs.readFileSync(spec, 'utf8').split('\n');
  let rows = 0;
  for (const v of variants) {
    const at = lines.reduce((found, line, i) => (line.startsWith(`| ${v.id} | `) ? found.concat(i) : found), []);
    if (at.length !== 1) {
      fail(`the document has ${at.length} rows for ${v.id} in its table of negative variants, it must have one`);
      continue;
    }
    const cells = lines[at[0]].slice(2, -2).split(' | ');
    if (cells.length !== 4) {
      fail(
        `the row of ${v.id} in the document has ${cells.length} cells, the table has four (id, change, expected, run today)`
      );
      continue;
    }
    cells[3] = v.runToday;
    lines[at[0]] = '| ' + cells.join(' | ') + ' |';
    rows++;
  }
  fs.writeFileSync(spec, lines.join('\n'));
  return rows;
}

function main() {
  if (process.argv.length > 2) {
    console.error(
      'usage: node generate.mjs (it takes no argument: it writes layered/, variants/ and expected/ next to itself)'
    );
    process.exit(2);
  }
  const P = build();
  const { S, messages } = runAll(P);
  if (messages.length) fail('the description does not resolve cleanly:\n  ' + messages.join('\n  '));

  // ---- sizes
  const sizes = {};
  for (const pid of ORDER) {
    const st = S[pid];
    const layerCount = (l) => [...st.el.keys()].filter((k) => keyLayer(k) === l).length;
    sizes[pid] = {
      application: layerCount('application'),
      technology: layerCount('technology'),
      elements: st.el.size,
      relationships: [...st.el.values()].reduce((n, e) => n + e.rels.length, 0),
      files: new Set(P[pid].manifests.map((e) => e.file)).size + 1, // the plateau.yaml counts
      declared: P[pid].manifests.length,
      patches: P[pid].patches.length,
      views: VIEWS[pid]
    };
    const want = DOCUMENT.sizes[pid];
    for (const f of Object.keys(want))
      if (f !== 'views' && sizes[pid][f] !== want[f])
        fail(`${pid}: ${f} is ${sizes[pid][f]}, the document says ${want[f]}`);
  }

  // ---- comparisons
  const comparisons = [];
  const changes = {};
  const results = {};
  for (const c of COMPARISONS) {
    const r = compare(
      c.chain.map((id) => S[id]),
      c.chain
    );
    results[c.id] = r;
    const n = counts(r);
    comparisons.push({
      id: c.id,
      comparison: c.title.replaceAll('`', ''),
      chain: c.chain,
      elements: n.elements,
      replacing: n.replacing,
      relationships: n.relationships,
      verified: c.source === 'tool' ? 'archicode diff' : 'model only',
      command: c.command, // null for P6, which only a tool that reads the last step's `replaces` alone would print: the tool has one answer for that question, listed under P4 (composed)
      // the warnings the tool prints for a `replaces` that names something the compared plateau does not have (the `replaces` of the layers between two plateaus are composed, P4)
      ignoredReplaces:
        c.ignored ?? (c.source === 'tool' ? ignoredReplaces(S[c.chain[0]], S[c.chain.at(-1)], c.chain.at(-1)) : null),
      note: c.note || null
    });
    const want = DOCUMENT.comparisons[c.id];
    if (
      !same(want, [
        n.elements.new,
        n.elements.changed,
        n.elements.removed,
        n.replacing.moved,
        n.replacing.split,
        n.replacing.merged,
        n.relationships.new,
        n.relationships.changed,
        n.relationships.removed
      ])
    ) {
      fail(`${c.id}: the model gives ${JSON.stringify(n)}, the document says ${JSON.stringify(want)}`);
    }
    changes[c.id] = {
      elements: [...r.states]
        .filter(([, s]) => s !== 'none')
        .map(([k, s]) => ({ layer: keyLayer(k), ref: keyRef(k), state: s }))
        .sort((x, y) => (x.layer + '|' + x.ref).localeCompare(y.layer + '|' + y.ref)),
      relationships: [...r.relState]
        .filter(([, s]) => s !== 'none')
        .map(([k, s]) => {
          const [layer, source, destination, label] = JSON.parse(k);
          return { layer, source, destination, label, state: s };
        })
        .sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)))
    };
  }

  // ---- notable cases
  for (const n of NOTABLE) {
    for (const c of n.checks) {
      const r = results[c.in];
      const got = c.relationship
        ? r.relState.get(JSON.stringify(['application', ...c.relationship]))
        : r.states.get(key(c.layer, c.ref));
      if (got !== c.state)
        fail(
          `${n.id}: in ${c.in} ${c.relationship ? c.relationship.join(' -> ') : c.ref} is ${got}, expected ${c.state}`
        );
    }
  }
  // N12 reads: five elements are changed by the bulk edit and nothing else
  {
    const r = results.P3;
    const tagged = [...S.marketplace.el].filter(([, e]) => e.tags.runtime === 'quarkus').map(([k]) => k);
    const changedByEdit = tagged.filter((k) => r.states.get(k) === 'changed' && !S.inhouse.el.get(k)?.tags.runtime);
    const edit = P.marketplace.patches.find((op) => op.operator === 'MERGE_WHERE');
    if (edit.expect !== 12) fail(`N12: the bulk edit matched ${edit.expect}, the guard says 12`);
    if (tagged.length !== 12) fail(`N12: ${tagged.length} elements carry the tag, expected 12`);
    const alone = changedByEdit.filter(
      (k) =>
        !P.marketplace.patches.some((op) => op.target === keyRef(k)) &&
        !P.marketplace.patches.some((op) => op.rel && op.target === keyRef(k))
    );
    if (alone.length !== 5)
      fail(
        `N12: ${alone.length} elements are changed by the bulk edit and nothing else, expected 5 (${alone.map(keyRef).join(', ')})`
      );
  }

  // ---- renditions
  const layered = writeLayered(P);
  const layeredSize = measure(layered);
  const entryCount = (kind) => ENTRIES.filter((e) => e.kind === kind).length;
  // the manifests of elements: not the plateau.yaml files, not the views and the stories
  layeredSize.manifests = layeredSize.files - ORDER.length - ENTRIES.length;
  layeredSize.plateauFiles = ORDER.length;
  layeredSize.views = entryCount('view');
  layeredSize.stories = entryCount('story');
  layeredSize.patches = ORDER.reduce((n, id) => n + P[id].patches.length, 0);
  const renditions = { layered: layeredSize };

  writeTree(path.join(here, 'layered'), layered);

  // ---- the resolver: the layered rendition read back from the committed files and resolved, against what the model resolved
  const read = readLayered(path.join(here, 'layered'));
  const fromDisk = read.plateaus;
  const resolvedSizes = {};
  const stateOf = {};
  for (const pid of ORDER) {
    const pl = fromDisk[pid];
    if (!pl) {
      fail(`resolver: the layered rendition has no plateau ${pid}`);
      continue;
    }
    if (pl.parent && !stateOf[pl.parent]) continue; // its parent did not resolve: that is already told
    try {
      stateOf[pid] = resolve(pl.parent ? stateOf[pl.parent] : null, pl);
    } catch (ex) {
      fail(`resolver: the layered rendition does not resolve ${pid}: ${ex.message}`);
      continue;
    }
    resolvedSizes[pid] = stateOf[pid].el.size;
    for (const p of diffPlateau(pid, stateOf[pid], S[pid])) fail('resolver: ' + p);
    if (resolvedSizes[pid] !== DOCUMENT.sizes[pid].elements)
      fail(
        `resolver: ${pid} resolves to ${resolvedSizes[pid]} elements, the document says ${DOCUMENT.sizes[pid].elements}`
      );
  }

  // ---- the views and the stories: what they name exists, the fixture holds what issue #115 asks for, and the files read back are the description
  const entries = entryFacts(P, S);
  for (const p of entries.problems) fail('views and stories: ' + p);
  const written = new Map(read.entries.map((x) => [x.file, x]));
  for (const e of ENTRIES) {
    const x = written.get(entryFile(e));
    if (!x) fail(`views and stories: ${entryFile(e)} was not read back`);
    else if (x.kind !== e.kind || JSON.stringify(x.content) !== JSON.stringify(entryContent(e)))
      fail(
        `views and stories: ${entryFile(e)} read back from the disk is not the description\n    files  ${JSON.stringify(x.content)}\n    model  ${JSON.stringify(entryContent(e))}`
      );
  }
  if (read.entries.length !== ENTRIES.length)
    fail(`views and stories: ${read.entries.length} read back, ${ENTRIES.length} described`);

  // ---- the variants: described, and for V1 to V8 also run in the model
  const variants = new Map();
  for (const v of VARIANTS) {
    let model = null;
    if (v.mutate) {
      const Q = build();
      v.mutate(Q);
      const run = runAll(Q, v.order || ORDER);
      model = run.messages;
      if (!model.length) fail(`${v.id}: the model finds nothing wrong, the description expects ${v.expected}`);
      for (const word of v.mentions)
        if (!model.some((m) => m.includes(word)))
          fail(`${v.id}: the model's messages do not mention "${word}":\n  ${model.join('\n  ') || '(none)'}`);
    }
    if (typeof v.runToday !== 'string' || !v.runToday.trim())
      fail(`${v.id}: no runToday (what a tool does with it today)`);
    variants.set(
      `${v.id}.json`,
      json({
        id: v.id,
        kind: 'negative variant',
        change: v.change,
        expected: v.expected,
        class: v.class,
        mentions: v.mentions,
        model,
        status: v.runToday
      })
    );
  }
  const declaredAll = P.inhouse.manifests.length + P.marketplace.manifests.length;
  if (declaredAll !== MERGES.M2.declared)
    fail(`M2: inhouse would declare ${declaredAll}, the document says ${MERGES.M2.declared}`);
  if (P.marketplace.patches.length !== MERGES.M2.foldedPatches + MERGES.M2.keptPatches)
    fail(
      `M2: ${P.marketplace.patches.length} patches, the document counts ${MERGES.M2.foldedPatches} + ${MERGES.M2.keptPatches}`
    );
  for (const [id, mg] of Object.entries(MERGES)) {
    variants.set(
      `${id}.json`,
      json({
        id,
        kind: 'merge scenario',
        ...mg,
        status: 'described; not run (the command does not exist: tmorin/archicode#65)'
      })
    );
  }

  // ---- expected/
  const expected = new Map();
  expected.set(
    'sizes.json',
    json({
      elements: 'application + technology',
      plateaus: sizes,
      source: 'computed by the generator from the description; views: counted with the current command line'
    })
  );
  expected.set('renditions.json', json(renditions));
  expected.set('comparisons.json', json(comparisons));
  expected.set('changes.json', json(changes));
  expected.set('entries.json', json(entries.facts));
  expected.set(
    'notable-cases.json',
    json(NOTABLE.map((n) => ({ id: n.id, case: n.case, where: n.where, state: n.state, why: n.why, checks: n.checks })))
  );
  expected.set(
    'README.md',
    'Computed by `generate.mjs` from the description (the model of the specification). `comparisons.json` says, for each of P1 to P6, whether `archicode diff` verifies the counts or only the model does.\n`changes.json` is the table of changes of each comparison as the model computes it (elements and relationships whose state is not `none`).\n`entries.json` says, for each view and each step of each story of `layered/shared/`, in which plateaus it can be drawn and what the command line says when it cannot.\n'
  );
  writeTree(path.join(here, 'variants'), variants);
  writeTree(path.join(here, 'expected'), expected);
  const specRows = writeRunToday(VARIANTS);

  // ---- report
  console.log('plateau      application technology elements relationships files declared patches');
  for (const pid of ORDER) {
    const s = sizes[pid];
    console.log(
      `${pid.padEnd(12)} ${String(s.application).padStart(11)} ${String(s.technology).padStart(10)} ${String(s.elements).padStart(8)} ${String(s.relationships).padStart(13)} ${String(s.files).padStart(5)} ${String(s.declared).padStart(8)} ${String(s.patches).padStart(7)}`
    );
  }
  console.log(
    'resolver     ' +
      ORDER.map((pid) => `${pid} ${resolvedSizes[pid]}`).join(', ') +
      ' elements (the layered rendition resolved from the files, compared with the model)'
  );
  console.log(
    `layered      ${layeredSize.files} files (${layeredSize.manifests} manifests of elements, ${layeredSize.plateauFiles} plateau.yaml, ${layeredSize.views} views, ${layeredSize.stories} stories; ${layeredSize.patches} patches), ${layeredSize.lines} lines, ${layeredSize.bytes} bytes`
  );
  for (const v of entries.facts.views)
    console.log(
      `view         ${v.id.padEnd(24)} drawn in ${ORDER.filter((pid) => v.plateaus[pid].drawn).join(', ') || '-'}`
    );
  for (const st of entries.facts.stories) console.log(`story        ${st.id.padEnd(24)} ${st.steps.length} steps`);
  for (const c of comparisons) {
    const e = c.elements;
    const r = c.relationships;
    console.log(
      `${c.id} ${c.comparison.padEnd(46)} +${e.new} ~${e.changed} -${e.removed}  ${c.replacing.moved} moved ${c.replacing.split} split ${c.replacing.merged} merged  relationships +${r.new} ~${r.changed} -${r.removed}  [${c.verified}]`
    );
  }
  console.log(
    `variants/    ${variants.size} descriptions; expected/ ${expected.size} files` +
      (specRows === null ? '' : `; the document: ${specRows} rows of the table of variants`)
  );
  if (failures.length) {
    console.error('\nFAILED:\n' + failures.map((f) => '  - ' + f).join('\n'));
    process.exit(1);
  }
  console.log(
    'ok: the description matches the document, and the layered rendition resolves to the model for the four plateaus'
  );
}

main();
