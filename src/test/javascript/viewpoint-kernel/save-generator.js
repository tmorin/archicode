'use strict';
// A seeded generator of YAML files and of edits for the editor's line-preserving save (`patchYamlText`), and the properties a save must keep
// (wave 021, run 0154, decision T7, GitHub issues #150 and #151). Used by `save-keeps-quotes-and-comments.test.js`; not a test file itself.
//
// A case is a small tree of nodes (scalars, maps, lists) written as a file with the layouts the save claims to follow: plain, double-quoted and single-quoted values and keys,
// block scalars (`|`), block maps and lists, lists of maps, lists of lists, lists at the column of their key, collections in brackets on one line, comments above a line
// (`# a12`), after a line (`# c12`, one to three blanks before it) and blank lines between lines. Every word is unique (`w7`, `k8`), so a line can be found again after an
// edit; every comment is unique too. Then one edit is made to the tree (set a value, add or remove an item or a key, wrap a node in a list, unwrap a list, replace a
// collection by a scalar, reorder a list), the save is asked for the new value, and the result is checked:
//   model       the file reads back as the value of the edit (and as the emitter writes it, key order included);
//   quote       a scalar or a key that the edit did not change, and that is still in the value (wherever it moved to), is written with the quotes it had;
//   comment     the comment after a line is on the line of the same slot (the key, the item) when the slot is still there, and nowhere when it is gone; the comment above a line is
//               directly above the line of the slot when it is still there; no comment is written twice;
//   line        a line whose slot is still there, and whose scalar, collection in brackets or header the edit did not change, is in the result byte for byte (its indentation and a
//               leading dash aside);
//   idempotent  saving the result again, with no edit, writes the same bytes.
// A reorder is checked by `quote` and `model` only: the save sees a line that moves as a line that goes and a line that comes (the limit pinned by `save-keeps-the-brackets.test.js`).

/** A small deterministic generator (mulberry32): the same numbers on every machine. */
function prng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)]
  };
}

// ---- the tree ----------------------------------------------------------------------------------------------------------------------------------------------------
// scalar: { type: 'scalar', id, text, quote, block }; map: { type: 'map', id, slots: [slot], flow, list_column? }; list: { type: 'list', id, slots: [slot], flow, atKey }
// slot: { id, key (maps only), keyQuote, node, above: [comment], after: comment|null, gap, blank }

function generate(rand) {
  let counter = 0;
  const uid = () => ++counter;
  const comment = (prefix) => '# ' + prefix + uid() + '.';
  const slot = (node, key, flowContext) => ({
    id: uid(),
    key,
    keyQuote:
      key !== undefined && !flowContext && rand.chance(0.12)
        ? rand.pick(['"', "'"])
        : key !== undefined && flowContext && rand.chance(0.1)
          ? '"'
          : '',
    node,
    above: !flowContext && rand.chance(0.25) ? [comment('a')].concat(rand.chance(0.2) ? [comment('b')] : []) : [],
    after: null,
    gap: '  '.slice(0, 1 + rand.int(2)) + (rand.chance(0.15) ? ' ' : ''),
    blank: !flowContext && rand.chance(0.12)
  });
  const scalar = (flowContext, inList) => {
    const id = uid();
    const block = !flowContext && rand.chance(0.08); // a block scalar, as the value of a key or as an item of a list (`- |`, #154)
    const text = block ? 'w' + id + ' one\nw' + id + ' two\n' : 'w' + id;
    const quote = block ? '' : rand.pick(['', '', '"', "'"]);
    return { type: 'scalar', id, text, quote, block };
  };
  const collection = (depth, flowContext) => {
    const roll = rand.next();
    const map = roll < 0.5;
    const flow = flowContext || (depth > 0 && rand.chance(0.35));
    const size = 1 + rand.int(flow ? 3 : 4);
    const node = { type: map ? 'map' : 'list', id: uid(), slots: [], flow, atKey: !map && !flow && rand.chance(0.15) };
    for (let i = 0; i < size; i++) {
      let child;
      const deeper = depth < 3 && rand.chance(flow ? 0.3 : 0.45);
      if (deeper) child = collection(depth + 1, flow);
      else child = scalar(flow, !map);
      const s = slot(child, map ? 'k' + uid() : undefined, flow);
      if (!flow && child.type === 'scalar' && !child.block && rand.chance(0.4)) s.after = comment('c');
      node.slots.push(s);
    }
    return node;
  };
  const root = { type: 'map', id: uid(), slots: [], flow: false, atKey: false };
  const rootSize = 2 + rand.int(4);
  for (let i = 0; i < rootSize; i++) {
    const child = rand.chance(0.25) ? scalar(false) : collection(1, false);
    root.slots.push(slot(child, 'k' + uid(), false));
  }
  root.slots[0].above = rand.chance(0.3) ? [comment('t')] : [];
  // the comments after a line that opens a block, or ends a collection in brackets (not on the item that is a block map: its first key carries the line)
  const decorate = (node) => {
    for (const s of node.slots) {
      const child = s.node;
      if (child.type === 'scalar') continue;
      const mapItem = node.type === 'list' && child.type === 'map' && !child.flow && child.slots.length > 0;
      if (!mapItem && child.slots.length > 0 && rand.chance(0.45)) s.after = comment('c');
      if (!child.flow) decorate(child);
    }
  };
  decorate(root);
  // the second key of a map that is an item of a list is a block scalar (`note: |`) in nearly half of them: the key before it takes the dash line, and goes (#155, L2)
  walk(root, (node) => {
    if (node.type !== 'list') return;
    for (const s of node.slots) {
      const item = s.node;
      if (item.type !== 'map' || item.flow || item.slots.length < 2 || !rand.chance(0.45)) continue;
      const id = uid();
      item.slots[1].node = { type: 'scalar', id, text: 'w' + id + ' one\nw' + id + ' two\n', quote: '', block: true };
      item.slots[1].after = null;
    }
  });
  // the first entry of a map that is an item of a list shares the dash line: what is above it is the item's
  walk(root, (node) => {
    if (node.type === 'list')
      for (const s of node.slots)
        if (s.node.type === 'map' && !s.node.flow && s.node.slots.length > 0) {
          s.node.slots[0].above = [];
          s.node.slots[0].blank = false;
        }
  });
  return root;
}

// ---- writing ---------------------------------------------------------------------------------------------------------------------------------------------------

const keyText = (s) => (s.keyQuote === '"' ? '"' + s.key + '"' : s.keyQuote === "'" ? "'" + s.key + "'" : s.key);
const scalarToken = (n) => (n.quote === '"' ? '"' + n.text + '"' : n.quote === "'" ? "'" + n.text + "'" : n.text);

function flowText(node) {
  if (node.type === 'scalar') return scalarToken(node);
  const parts = node.slots.map((s) => (node.type === 'map' ? keyText(s) + ': ' : '') + flowText(s.node));
  return (node.type === 'map' ? '{' : '[') + parts.join(', ') + (node.type === 'map' ? '}' : ']');
}

function valueOf(node) {
  if (node.type === 'scalar') return node.text;
  if (node.type === 'list') return node.slots.map((s) => valueOf(s.node));
  const out = {};
  for (const s of node.slots) out[s.key] = valueOf(s.node);
  return out;
}

/** The text of the tree, and, for each line, the slot it belongs to (`lines[i] = { text, slot }`; comments and blank lines have none). */
function write(root) {
  const lines = [];
  const add = (text, slot, extra) => lines.push(Object.assign({ text, slot: slot || null }, extra));
  const pad = (n) => ' '.repeat(n);
  // the entries of a block list written under a key, at the column of the key or two further
  const writeMapEntries = (node, indent) => {
    for (const s of node.slots) {
      const child = s.node;
      if (s.blank) add('', null);
      for (const c of s.above) add(pad(indent) + c, null, { aboveOf: s });
      const after = s.after ? s.gap + s.after : '';
      if (child.type === 'scalar') {
        if (child.block) {
          add(pad(indent) + keyText(s) + ': |' + after, s, { kind: 'block-scalar', node: child });
          const body = child.text.split('\n').filter((l, i, all) => !(i === all.length - 1 && l === ''));
          for (const l of body) add(pad(indent + 2) + l, s, { kind: 'block-body', node: child });
        } else add(pad(indent) + keyText(s) + ': ' + scalarToken(child) + after, s, { kind: 'scalar', node: child });
      } else if (child.slots.length === 0 || child.flow) {
        add(
          pad(indent) +
            keyText(s) +
            ': ' +
            (child.slots.length === 0 ? (child.type === 'map' ? '{}' : '[]') : flowText(child)) +
            after,
          s,
          { kind: 'flow', node: child }
        );
      } else {
        add(pad(indent) + keyText(s) + ':' + after, s, { kind: 'header', node: child });
        if (child.type === 'map') writeMapEntries(child, indent + 2);
        else writeListItems(child, child.atKey ? indent : indent + 2);
      }
    }
  };
  const writeListItems = (node, indent) => {
    for (const s of node.slots) {
      const child = s.node;
      if (s.blank) add('', null);
      for (const c of s.above) add(pad(indent) + c, null, { aboveOf: s });
      const after = s.after ? s.gap + s.after : '';
      if (child.type === 'scalar') {
        if (child.block) {
          add(pad(indent) + '- |' + after, s, { kind: 'block-scalar', node: child });
          const body = child.text.split('\n').filter((l, i, all) => !(i === all.length - 1 && l === ''));
          for (const l of body) add(pad(indent + 2) + l, s, { kind: 'block-body', node: child });
        } else add(pad(indent) + '- ' + scalarToken(child) + after, s, { kind: 'scalar', node: child });
      } else if (child.slots.length === 0 || child.flow) {
        add(
          pad(indent) +
            '- ' +
            (child.slots.length === 0 ? (child.type === 'map' ? '{}' : '[]') : flowText(child)) +
            after,
          s,
          { kind: 'flow', node: child }
        );
      } else if (child.type === 'map') {
        // the first entry shares the line of the dash
        const from = lines.length;
        writeMapEntries(child, indent + 2);
        let first = from;
        while (first < lines.length && lines[first].slot === null) first++;
        // the comments and blank lines of the first entry stay where they are written (above the dash line): they belong to the entry, which is fine for the checks
        const line = lines[first];
        line.text = pad(indent) + '- ' + line.text.slice(indent + 2);
        // the entries' comments written before the first line go above the dash: they are inside the item, so they are moved above it
        const moved = lines.splice(from, first - from);
        lines.splice(
          from,
          0,
          ...moved.map((l) => Object.assign({}, l, { text: l.text === '' ? '' : pad(indent) + l.text.trim() }))
        );
        line.itemSlot = s;
      } else {
        add(pad(indent) + '-' + after, s, { kind: 'dash', node: child });
        writeListItems(child, indent + 2);
      }
    }
  };
  writeMapEntries(root, 0);
  return { lines, text: lines.map((l) => l.text).join('\n') + '\n' };
}

// ---- the edits ---------------------------------------------------------------------------------------------------------------------------------------------------

function clone(node, map = new Map()) {
  // a deep copy that keeps the identity of every node and slot by id (`map` finds the copy of a slot)
  if (node.type === 'scalar') return Object.assign({}, node);
  const copy = Object.assign({}, node, {
    slots: node.slots.map((s) => {
      const c = Object.assign({}, s, { node: clone(s.node, map) });
      map.set(s, c);
      return c;
    })
  });
  return copy;
}

function walk(node, visit, parentNode = null, slot = null) {
  visit(node, parentNode, slot);
  if (node.type !== 'scalar') for (const s of node.slots) walk(s.node, visit, node, s);
}

function allSlots(root) {
  const slots = [];
  walk(root, (node, parent, slot) => {
    if (slot) slots.push({ slot, parent });
  });
  return slots;
}

/**
 * An edit chosen at random: a description that `applyEdit` makes on a copy of the tree (`{ kind, target, ... }`, `target` the id of a slot or of a collection), or null when none
 * applies. The description is plain data, so that a failing case can be reduced (`reduce`) and still make the same edit.
 */
function chooseEdit(root, rand) {
  const slots = allSlots(root);
  const lists = [];
  const maps = [];
  walk(root, (node) => {
    if (node.type === 'list') lists.push(node);
    if (node.type === 'map') maps.push(node);
  });
  const kinds = [
    'set',
    'set',
    'add-item',
    'add-item',
    'remove-item',
    'remove-item',
    'add-key',
    'remove-key',
    'wrap',
    'wrap',
    'unwrap',
    'to-scalar',
    'reorder',
    'first-key',
    'first-key',
    'first-key'
  ];
  // the maps that are items of a list and whose second key is a block scalar: the first key is the one that changes (#155, L2)
  const itemMaps = [];
  walk(root, (node) => {
    if (node.type === 'list')
      for (const s of node.slots)
        if (s.node.type === 'map' && !s.node.flow && s.node.slots.length >= 2 && s.node.slots[1].node.block)
          itemMaps.push(s.node);
  });
  for (let attempt = 0; attempt < 12; attempt++) {
    const kind = rand.pick(kinds);
    if (kind === 'first-key') {
      if (itemMaps.length) {
        const map = rand.pick(itemMaps);
        return { kind: rand.chance(0.5) ? 'add-key' : 'remove-key', target: map.id, at: 0, shape: 'first-key' };
      }
    } else if (kind === 'set') {
      const leaves = slots.filter((s) => s.slot.node.type === 'scalar' && !s.slot.node.block);
      if (leaves.length) return { kind, target: rand.pick(leaves).slot.id };
    } else if (kind === 'add-item' && lists.length) {
      const list = rand.pick(lists);
      return { kind, target: list.id, at: rand.int(list.slots.length + 1), asMap: rand.chance(0.3) };
    } else if (kind === 'remove-item') {
      const nonEmpty = lists.filter((l) => l.slots.length > 0);
      if (nonEmpty.length) {
        const list = rand.pick(nonEmpty);
        return { kind, target: list.id, at: rand.int(list.slots.length) };
      }
    } else if (kind === 'add-key' && maps.length) {
      const map = rand.pick(maps);
      return { kind, target: map.id, at: rand.int(map.slots.length + 1) };
    } else if (kind === 'remove-key') {
      const nonEmpty = maps.filter((m) => m.slots.length > 0);
      if (nonEmpty.length) {
        const map = rand.pick(nonEmpty);
        return { kind, target: map.id, at: rand.int(map.slots.length) };
      }
    } else if (kind === 'wrap' && slots.length) {
      return { kind, target: rand.pick(slots).slot.id, withMap: rand.chance(0.5), oldFirst: rand.chance(0.5) };
    } else if (kind === 'unwrap') {
      const some = slots.filter((s) => s.slot.node.type === 'list' && s.slot.node.slots.length >= 1);
      if (some.length) {
        const t = rand.pick(some);
        return { kind, target: t.slot.id, keep: rand.int(t.slot.node.slots.length) };
      }
    } else if (kind === 'to-scalar') {
      const some = slots.filter((s) => s.slot.node.type !== 'scalar');
      if (some.length) return { kind, target: rand.pick(some).slot.id };
    } else if (kind === 'reorder') {
      const many = lists.filter((l) => l.slots.length >= 2);
      if (many.length) {
        const list = rand.pick(many);
        return { kind, target: list.id, reverse: rand.chance(0.5), at: rand.int(list.slots.length - 1) };
      }
    }
  }
  return null;
}

/** The tree after the edit `d` (see `chooseEdit`), with what the checks need to know about it; null when the edit does not apply to this tree (it was reduced away). */
function applyEdit(root, d, uid) {
  const tree = clone(root);
  const slots = allSlots(tree);
  const nodes = [];
  walk(tree, (node) => nodes.push(node));
  const fresh = () => ({ type: 'scalar', id: uid(), text: 'n' + uid(), quote: '', block: false });
  const freshSlot = (key) => ({
    id: uid(),
    key,
    keyQuote: '',
    node: fresh(),
    above: [],
    after: null,
    gap: '  ',
    blank: false
  });
  const slotOf = () => slots.find((s) => s.slot.id === d.target);
  const nodeOf = () => nodes.find((n) => n.id === d.target);
  const kind = d.kind;
  if (kind === 'set') {
    const target = slotOf();
    if (!target || target.slot.node.type !== 'scalar') return null;
    const old = target.slot.node;
    target.slot.node = fresh();
    return {
      tree,
      kind,
      description: 'set ' + old.text,
      changed: [old.id],
      setOf: target.slot,
      listItem: target.parent.type === 'list'
    };
  }
  if (kind === 'add-item') {
    const list = nodeOf();
    if (!list || list.type !== 'list') return null;
    const s = freshSlot(undefined);
    if (d.asMap)
      s.node = {
        type: 'map',
        id: uid(),
        slots: [freshSlot('n' + uid()), freshSlot('n' + uid())],
        flow: false,
        atKey: false
      };
    list.slots.splice(Math.min(d.at, list.slots.length), 0, s);
    return { tree, kind, description: 'add item at ' + d.at };
  }
  if (kind === 'remove-item') {
    const list = nodeOf();
    if (!list || list.type !== 'list' || list.slots.length === 0) return null;
    list.slots.splice(Math.min(d.at, list.slots.length - 1), 1);
    return { tree, kind, description: 'remove item ' + d.at };
  }
  if (kind === 'add-key') {
    const map = nodeOf();
    if (!map || map.type !== 'map') return null;
    map.slots.splice(Math.min(d.at, map.slots.length), 0, freshSlot('n' + uid()));
    return { tree, kind, description: 'add key' };
  }
  if (kind === 'remove-key') {
    const map = nodeOf();
    if (!map || map.type !== 'map' || map.slots.length === 0) return null;
    map.slots.splice(Math.min(d.at, map.slots.length - 1), 1);
    return { tree, kind, description: 'remove key' };
  }
  if (kind === 'wrap') {
    // a value becomes a list of itself and a new one (`value: {a: b}` becomes `value: [{a: b}, {c: d}]`)
    const target = slotOf();
    if (!target) return null;
    const old = target.slot.node;
    const other = d.withMap
      ? { type: 'map', id: uid(), slots: [freshSlot('n' + uid())], flow: false, atKey: false }
      : fresh();
    const itemOld = { id: uid(), node: old, above: [], after: null, gap: '  ', blank: false };
    const itemNew = { id: uid(), node: other, above: [], after: null, gap: '  ', blank: false };
    target.slot.node = {
      type: 'list',
      id: uid(),
      slots: d.oldFirst ? [itemOld, itemNew] : [itemNew, itemOld],
      flow: false,
      atKey: false
    };
    return { tree, kind, description: 'wrap a ' + old.type, changed: [], reshaped: target.slot };
  }
  if (kind === 'unwrap') {
    const target = slotOf();
    if (!target || target.slot.node.type !== 'list' || target.slot.node.slots.length === 0) return null;
    const list = target.slot.node;
    target.slot.node = list.slots[Math.min(d.keep, list.slots.length - 1)].node;
    return { tree, kind, description: 'unwrap a list', changed: [], reshaped: target.slot };
  }
  if (kind === 'to-scalar') {
    const target = slotOf();
    if (!target || target.slot.node.type === 'scalar') return null;
    target.slot.node = fresh();
    return { tree, kind, description: 'collection to scalar', changed: [], reshaped: target.slot };
  }
  if (kind === 'reorder') {
    const list = nodeOf();
    if (!list || list.type !== 'list' || list.slots.length < 2) return null;
    if (d.reverse) list.slots.reverse();
    else {
      const a = Math.min(d.at, list.slots.length - 2);
      const t = list.slots[a];
      list.slots[a] = list.slots[a + 1];
      list.slots[a + 1] = t;
    }
    return { tree, kind, description: 'reorder' };
  }
  return null;
}

// ---- the checks --------------------------------------------------------------------------------------------------------------------------------------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The slots of a tree, by id, with the node each holds, and the leaves and keys below it. */
function slotIndex(root) {
  const index = new Map();
  const visit = (node, parent) => {
    if (node.type === 'scalar') return;
    for (const s of node.slots) {
      index.set(s.id, { slot: s, parent: node });
      visit(s.node, node);
    }
  };
  visit(root, null);
  return index;
}

function tokensOf(node) {
  const out = [];
  walk(node, (n, parent, slot) => {
    if (n.type === 'scalar') out.push(n.block ? n.text.split('\n')[0] : n.text);
    if (slot && slot.key !== undefined) out.push(slot.key);
  });
  return out;
}

/** The shape of the line a slot writes: two slots with the same shape write the same line when the edit leaves them alone. */
function shapeOf(slot) {
  const n = slot.node;
  if (n.type === 'scalar') return (n.block ? 'block:' : 'scalar:') + n.text;
  if (n.slots.length === 0) return 'empty:' + n.type;
  if (n.flow) return 'flow:' + JSON.stringify(valueOf(n));
  return 'block';
}

/** The violations of the properties for a save of `before` (a tree, written as `file`) into `after` (the edited tree), `out` the text written. */
function check(page, before, file, after, edited, out) {
  const problems = [];
  const fail = (kind, message) => problems.push({ kind, message });
  const value = valueOf(after);
  // model
  try {
    const read = page.parseYaml(out);
    if (JSON.stringify(read) !== JSON.stringify(value) && !deepSame(read, value))
      fail('model', 'the file does not read back as the edit');
    else if (page.serializeYamlValue(page.parseYamlAsModel(out), 0) !== page.serializeYamlValue(value, 0))
      fail('model', 'the file does not say what the emitter writes for the edit');
  } catch (e) {
    fail('model', 'the result does not parse: ' + e.message);
    return problems;
  }
  const outLines = out.split('\n');
  const reorder = edited.kind === 'reorder';
  const beforeSlots = slotIndex(before);
  const afterSlots = slotIndex(after);
  // the slots below a value that changed shape: their lines are written again, deeper or shallower (a node moved into a list); what they must keep is their text, not their place
  const moved = new Set();
  if (edited.reshaped) {
    const below = (node) => {
      if (node.type !== 'scalar')
        for (const s of node.slots) {
          moved.add(s.id);
          below(s.node);
        }
    };
    below(edited.reshaped.node);
  }
  // quotes: a scalar or a key that is still in the value as it was, wherever it went
  const unchanged = new Set(edited.changed || []);
  const afterNodes = new Set();
  walk(after, (n) => afterNodes.add(n.id));
  const afterLeaves = new Map();
  walk(after, (n, parent, slot) => {
    if (n.type === 'scalar') afterLeaves.set(n.id, n);
  });
  walk(before, (n, parent, slot) => {
    if (n.type !== 'scalar' || n.block || unchanged.has(n.id) || !afterLeaves.has(n.id)) return;
    const token = scalarToken(n);
    const re = new RegExp('(?<![\\w"\'])' + escapeRe(token) + '(?![\\w"\'])');
    if (!re.test(out)) fail('quote', 'the value ' + token + ' lost its quotes');
  });
  for (const [id, { slot }] of beforeSlots) {
    if (!afterSlots.has(id) || slot.key === undefined || slot.keyQuote === '') continue;
    const re = new RegExp('(?<![\\w"\'])' + escapeRe(keyText(slot)) + '(?![\\w"\'])');
    if (!re.test(out)) fail('quote', 'the key ' + keyText(slot) + ' lost its quotes');
  }
  // comments
  const count = (text) => outLines.filter((l) => l.includes(text)).length;
  for (const [id, { slot }] of beforeSlots) {
    const alive = afterSlots.has(id);
    const current = alive ? afterSlots.get(id).slot : slot;
    for (const c of slot.above) {
      const n = count(c);
      if (n > 1) fail('comment', 'the comment ' + c + ' is written ' + n + ' times');
      else if (alive && !reorder && !edited.setOf) {
        if (n === 0) fail('comment', 'the comment ' + c + ' above a line was lost');
        else if (!moved.has(id)) {
          const at = outLines.findIndex((l) => l.includes(c));
          let next = at + 1;
          while (next < outLines.length && (outLines[next].trim() === '' || outLines[next].trim().startsWith('#')))
            next++;
          if (!slotLineOk(outLines, next, current, afterSlots))
            fail(
              'comment',
              'the comment ' +
                c +
                ' is not above the line of its own item or key: ' +
                JSON.stringify(outLines.slice(at, next + 1))
            );
        }
      }
    }
    if (slot.after) {
      const n = count(slot.after);
      const survives = afterNodes.has(slot.node.id); // the slot is gone but the value is still in the file, under another slot (a list unwrapped): its comment may follow it
      const replacedItem = edited.reshaped === current && alive && beforeSlots.get(id).parent.type === 'list'; // `- {a: b}  # why` that becomes `- c`: the comment of a collection in brackets that is gone
      if (n > 1) fail('comment', 'the comment ' + slot.after + ' is written ' + n + ' times');
      else if (!alive && n === 1 && !reorder && !survives)
        fail(
          'comment',
          'the comment ' +
            slot.after +
            ' of a line that goes is on another line: ' +
            JSON.stringify(outLines[outLines.findIndex((l) => l.includes(slot.after))])
        );
      else if (alive && !reorder && !replacedItem && !(edited.setOf === current && edited.listItem)) {
        if (n === 0) fail('comment', 'the comment ' + slot.after + ' after a line was lost');
        else {
          const at = outLines.findIndex((l) => l.includes(slot.after));
          if (!slotLineOk(outLines, at, current, afterSlots))
            fail(
              'comment',
              'the comment ' + slot.after + ' is on the line of another item or key: ' + JSON.stringify(outLines[at])
            );
        }
      }
    }
  }
  // lines: a line the edit did not touch is in the result as it was
  if (!reorder) {
    for (const line of file.lines) {
      if (!line.slot || line.kind === 'block-body') continue;
      const id = line.slot.id;
      if (!afterSlots.has(id) || moved.has(id)) continue;
      const current = afterSlots.get(id).slot;
      if (shapeOf(current) !== shapeOf(line.slot)) continue;
      if (edited.setOf && edited.setOf.id === id) continue;
      if (line.kind === 'header' && current.node.type !== line.slot.node.type) continue;
      if (line.kind === 'dash') continue;
      const norm = (text) => text.trim().replace(/^- /, '');
      if (!outLines.some((l) => norm(l) === norm(line.text)))
        fail('line', 'the line ' + JSON.stringify(line.text) + ' is not in the result as it was');
    }
  }
  return problems;
}

function deepSame(a, b) {
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => deepSame(a[k], b[k]));
}

/** Whether line `at` is the line of `slot` (the key of an entry, the dash of an item), and its region holds what the slot holds now. */
function slotLineOk(lines, at, slot, afterSlots) {
  if (at >= lines.length) return false;
  const text = lines[at].trim();
  if (slot.key !== undefined) {
    if (!(
      text.replace(/^- /, '').startsWith(keyText(slot) + ':') ||
      text.replace(/^- /, '').startsWith(slot.key + ':') ||
      text.startsWith('"' + slot.key + '"')
    ))
      return false;
    return true;
  }
  if (!(text === '-' || text.startsWith('- '))) return false;
  const indent = lines[at].length - lines[at].replace(/^ +/, '').length;
  const region = [lines[at]];
  for (let j = at + 1; j < lines.length; j++) {
    if (lines[j].trim() === '') continue;
    const deeper = lines[j].length - lines[j].replace(/^ +/, '').length > indent;
    if (!deeper) break;
    region.push(lines[j]);
  }
  const anchors = tokensOf(slot.node);
  if (!anchors.length) return true;
  return anchors.some((t) => new RegExp('(?<![\\w])' + escapeRe(t) + '(?![\\w])').test(region.join('\n')));
}

/**
 * The known limit that an edit falls in, or null. Each is pinned by a case of `save-keeps-quotes-and-comments.test.js` that says what the save does today; the generator leaves
 * them out so that it can say there is nothing else (wave 021, run 0154: found by the generator, not fixed, listed in the run).
 */
function limitOf(root, d) {
  const slots = allSlots(root);
  const nodes = [];
  walk(root, (node) => nodes.push(node));
  if (d.kind === 'wrap' || d.kind === 'unwrap') {
    // a comment on an item that is a list (`-  # why`, then its items, or `- [a, b]  # why`): lost, or taken by another item, when the lists around it are nested again, which writes every dash line anew
    const target = slots.find((x) => x.slot.id === d.target);
    let found = false;
    if (target)
      walk(target.slot.node, (node, parent, slot) => {
        if (slot && slot.after && node.type === 'list' && node.slots.length > 0 && parent.type === 'list') found = true;
      });
    if (found) return 'comment-on-a-dash-when-lists-are-nested-again';
  }
  if (d.kind === 'wrap') {
    // a list in brackets that is an item of a block list, inside the list that is wrapped: the mark of the collection lands on the dash line that stayed, and the list is written in brackets
    const target = slots.find((x) => x.slot.id === d.target);
    let found = false;
    if (target)
      walk(target.slot.node, (node) => {
        if (
          node.type === 'list' &&
          !node.flow &&
          node.slots.some((s) => s.node.type === 'list' && s.node.flow && s.node.slots.length > 0)
        )
          found = true;
      });
    if (found) return 'wrap-a-list-of-lists-in-brackets';
  }
  return null;
}

/** One case: the file of `root`, the edit `d`, and the problems of the save (empty when it is right). `null` when `d` does not apply to the tree. */
function attempt(page, root, d) {
  const file = write(root);
  let counter = 100000;
  const edited = applyEdit(root, d, () => ++counter);
  if (edited === null) return null;
  const value = valueOf(edited.tree);
  let out;
  try {
    out = page.patchYamlText(file.text, JSON.parse(JSON.stringify(value)));
  } catch (e) {
    return { file: file.text, out: null, edit: edited.description, problems: [{ kind: 'crash', message: e.message }] };
  }
  const problems = check(page, root, file, edited.tree, edited, out);
  if (!problems.length) {
    let again;
    try {
      again = page.patchYamlText(out, JSON.parse(JSON.stringify(value)));
    } catch (e) {
      again = null;
    }
    if (again !== out) problems.push({ kind: 'idempotent', message: 'saving the result again changes it' });
  }
  return { file: file.text, out, edit: edited.description, problems };
}

function copyTree(n) {
  if (n.type === 'scalar') return Object.assign({}, n);
  return Object.assign({}, n, {
    slots: n.slots.map((s) => Object.assign({}, s, { above: s.above.slice(), node: copyTree(s.node) }))
  });
}

/** The smallest tree (items and keys taken out, comments, quotes, blank lines and block scalars dropped) for which the same edit still gives a problem of `kind`. */
function reduce(page, root, d, kind) {
  const fails = (tree) => {
    const r = attempt(page, tree, d);
    return r !== null && r.problems.some((p) => p.kind === kind);
  };
  const slotsOf = (tree) => allSlots(tree).map((x) => ({ s: x.slot, n: x.parent }));
  let current = copyTree(root);
  let progress = true;
  while (progress) {
    progress = false;
    const count = slotsOf(current).length;
    for (let i = 0; i < count && !progress; i++) {
      const t = copyTree(current);
      const { s, n } = slotsOf(t)[i];
      n.slots.splice(n.slots.indexOf(s), 1);
      if ((n.slots.length === 0 && n !== t) || t.slots.length === 0) continue;
      if (fails(t)) {
        current = t;
        progress = true;
      }
    }
    if (progress) continue;
    const features = [
      (s) => {
        s.above = [];
      },
      (s) => {
        s.after = null;
      },
      (s) => {
        s.blank = false;
      },
      (s) => {
        s.keyQuote = '';
      },
      (s) => {
        s.node.quote = '';
      },
      (s) => {
        if (s.node.type === 'list') s.node.atKey = false;
      },
      (s) => {
        if (s.node.type === 'scalar' && s.node.block) {
          s.node.block = false;
          s.node.text = s.node.text.split('\n')[0];
        }
      }
    ];
    for (let i = 0; i < count && !progress; i++) {
      for (const f of features) {
        const t = copyTree(current);
        const { s } = slotsOf(t)[i];
        const text = write(t).text;
        f(s);
        if (write(t).text === text) continue;
        if (fails(t)) {
          current = t;
          progress = true;
          break;
        }
      }
    }
  }
  return current;
}

/** All cases of the generator on `page`: `{ stats, failures }`, each failure with the case's number, the edit, the file and the result. */
function run(page, seed, cases, options = {}) {
  const failures = [];
  const stats = {
    cases: 0,
    edits: {},
    skipped: 0,
    limits: {},
    shapes: { 'block-scalar-item': 0, 'first-key-before-block': 0 }
  }; // the shapes of #154 and of #155 L2
  for (let n = 0; n < cases; n++) {
    const rand = prng(seed * 100003 + n);
    const root = generate(rand, n);
    const file = write(root);
    let read;
    try {
      read = page.parseYaml(file.text);
    } catch (e) {
      throw new Error(
        'the generator wrote a file the page cannot read (case ' + n + '): ' + e.message + '\n' + file.text
      );
    }
    if (!deepSame(read, valueOf(root)))
      throw new Error('the generator wrote a file that does not read as its tree (case ' + n + ')\n' + file.text);
    const d = chooseEdit(root, rand);
    if (d === null || applyEdit(root, d, () => 0) === null) {
      stats.skipped++;
      continue;
    }
    const limit = limitOf(root, d);
    if (limit !== null) {
      stats.limits[limit] = (stats.limits[limit] || 0) + 1;
      continue;
    }
    stats.cases++;
    if (/^ *(?:- +)*- \|/m.test(file.text)) stats.shapes['block-scalar-item']++;
    if (d.shape === 'first-key') stats.shapes['first-key-before-block']++;
    stats.edits[d.kind] = (stats.edits[d.kind] || 0) + 1;
    const result = attempt(page, root, d);
    if (result.problems.length) failures.push(Object.assign({ n, kind: d.kind, d, root }, result));
  }
  return { stats, failures };
}

module.exports = { prng, generate, write, chooseEdit, applyEdit, limitOf, valueOf, check, attempt, reduce, run };
