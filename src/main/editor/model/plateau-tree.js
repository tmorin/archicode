// =====================================================================
// The plateaus of a workspace (wave 014, run 0077): a plateau is a layer over the plateau it overrides. A manifest says which plateau it belongs to
// with `plateau: <id>` in its header (a manifest without one belongs to `baseline`, the implicit root), and an optional manifest of kind `plateau`
// gives the plateau a name, a horizon, the plateau it overrides (`override`) and its patches. The tree of plateaus is checked here with the sentences
// of the command line (`PlateauTree.java`): keep them alike. Nothing is loaded as a layer yet: the editor draws `baseline` alone.
// =====================================================================

const BASELINE_PLATEAU = 'baseline';
const LAYER_PLATEAU_ID_PATTERN = /^[a-z0-9_-]+$/;

/** Strings in the order Java's `String.compareTo` gives (UTF-16 code units), which orders the sentences of the command line. */
function compareUnits(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Some names for a sentence, as `PlateauTree.list`: `a`, `a` and `b`, `a`, `b` and `c`, and past three the first three and how many more (`all`: every one of them). */
function plateauNames(names, all) {
  const quoted = names.map((n) => '`' + n + '`');
  if (quoted.length === 1) return quoted[0];
  if (quoted.length <= 3 || all) return quoted.slice(0, -1).join(', ') + ' and ' + quoted[quoted.length - 1];
  return quoted.slice(0, 3).join(', ') + ' and ' + (quoted.length - 3) + ' more';
}

/** A plateau that only headers name: no manifest of kind plateau, not the root (`PlateauTree.Node.headerOnly`). */
function plateauIsHeaderOnly(node) {
  return node.manifest === null && node.id !== BASELINE_PLATEAU && node.headers.length > 0;
}

/** Whether two ids differ by one letter added, removed or changed. */
function oneLetterApart(a, b) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  let i = 0;
  while (i < shorter.length && shorter[i] === longer[i]) i++;
  if (shorter.length === longer.length) return shorter.slice(i + 1) === longer.slice(i + 1);
  return shorter.slice(i) === longer.slice(i + 1);
}

/** The plateau a header names: its text, or null when the key is absent or empty-valued (the command line reads a null `plateau` as none). */
function headerPlateau(header) {
  if (!header || readIsMissing(header.plateau)) return null;
  return String(header.plateau);
}

/** Whether a manifest of this kind belongs to no plateau: a view and a story are the workspace's whatever plateau is drawn (wave 015, run 0100, issue #100); only elements, patches and plateaus are layers. */
function isPlateauFreeManifest(mf) {
  const kind = mf && mf.header ? manifestKindName(mf.header.kind) : null;
  return kind === 'view' || kind === 'story';
}

/** The plateau a manifest belongs to: the one its header names, else `baseline`. Null for a view and a story, which belong to none (their `plateau:` is accepted and means nothing: no message, no plateau). */
function plateauOfManifest(mf) {
  if (isPlateauFreeManifest(mf)) return null;
  const written = headerPlateau(mf.header);
  return written === null ? BASELINE_PLATEAU : written;
}

/**
 * The cycles of `parents` (a Map id -> parent id), each told once and starting from its smallest id, as `PlateauTree.cycles` tells them.
 */
function plateauCycles(parents) {
  const out = new Map(); // smallest id -> sentence (a cycle met from each of its plateaus is told once)
  for (const start of parents.keys()) {
    const path = [];
    let at = start;
    while (at !== undefined && at !== null && !path.includes(at)) {
      path.push(at);
      at = parents.get(at);
    }
    if (at === undefined || at === null) continue;
    const cycle = path.slice(path.indexOf(at));
    const smallest = cycle.reduce((a, b) => (compareUnits(a, b) <= 0 ? a : b));
    const from = cycle.indexOf(smallest);
    const rotated = cycle.slice(from).concat(cycle.slice(0, from));
    if (rotated.length === 1) {
      out.set(smallest, 'the plateau `' + smallest + '` overrides itself');
    } else {
      const steps = rotated.map((id, i) => '`' + id + '` overrides `' + rotated[(i + 1) % rotated.length] + '`');
      out.set(smallest, 'the plateaus ' + plateauNames(rotated, true) + ' form a cycle: ' + steps.join(', '));
    }
  }
  return Array.from(out.keys())
    .sort(compareUnits)
    .map((k) => out.get(k));
}

/**
 * The tree of the plateaus of the manifests, checked: `{ nodes, ids, problems, redeclared, warnings, layered }`. `nodes` is a Map id -> `{ id, name,
 * horizon, parent, patches, manifest, headers }` in the order of the tree (`baseline`, then what overrides it, each followed by what overrides it,
 * the siblings by id); `problems` are the mistakes of the tree, one sentence each (the command line stops on them); `warnings` are what is odd
 * without being wrong. A manifest with an error is left out: the file says why.
 */
function buildPlateauTree(manifestFiles) {
  const declaredBy = new Map(); // id -> [{ content, source }]
  const headers = new Map(); // id -> [relPath]
  let layered = false; // a manifest of kind plateau, or a header that says `plateau:`
  for (const mf of manifestFiles) {
    if (mf.error || !mf.header || !mf.content) continue;
    if (manifestKindName(mf.header.kind) === 'plateau') {
      const id = String(mf.content.id);
      if (!declaredBy.has(id)) declaredBy.set(id, []);
      declaredBy.get(id).push({ content: mf.content, source: mf.relPath });
      layered = true;
      continue;
    }
    if (isPlateauFreeManifest(mf)) continue; // a view and a story name no plateau
    const written = headerPlateau(mf.header);
    if (written === null) continue;
    if (!headers.has(written)) headers.set(written, []);
    headers.get(written).push(mf.relPath);
    layered = true;
  }
  const model = { nodes: new Map(), ids: [], problems: [], redeclared: [], warnings: [], layered };
  if (!layered) {
    model.nodes.set(BASELINE_PLATEAU, {
      id: BASELINE_PLATEAU,
      name: null,
      horizon: null,
      parent: null,
      patches: [],
      manifest: null,
      headers: []
    });
    model.ids = [BASELINE_PLATEAU];
    return model;
  }

  const ids = Array.from(new Set([...declaredBy.keys(), ...headers.keys(), BASELINE_PLATEAU])).sort(compareUnits);
  const problems = model.problems;
  for (const id of ids) {
    if (!LAYER_PLATEAU_ID_PATTERN.test(id)) {
      const files = new Set(headers.get(id) || []);
      for (const d of declaredBy.get(id) || []) files.add(d.source);
      problems.push(
        'the plateau id `' +
          id +
          '` in ' +
          plateauNames(Array.from(files).sort(compareUnits)) +
          ' is not valid: use lowercase letters, digits, `_` and `-`'
      );
    }
  }
  for (const id of Array.from(declaredBy.keys()).sort(compareUnits)) {
    const all = declaredBy.get(id);
    if (all.length > 1)
      problems.push(
        duplicateReferenceMessage(
          id,
          all.map((d) => d.source),
          'plateau'
        )
      );
  }
  const parents = new Map();
  for (const id of ids) {
    const first = (declaredBy.get(id) || [])[0];
    const override = first && !readIsMissing(first.content.override) ? String(first.content.override) : null;
    if (id === BASELINE_PLATEAU) {
      if (override !== null)
        problems.push(
          'the plateau `baseline` (`' +
            first.source +
            '`) is the root of the plateaus and cannot override `' +
            override +
            '`'
        );
      continue;
    }
    const parent = override === null ? BASELINE_PLATEAU : override;
    if (!ids.includes(parent)) {
      problems.push(
        'the plateau `' +
          id +
          '` (`' +
          first.source +
          '`) overrides `' +
          parent +
          '`, which is not a plateau of this workspace (the plateaus are ' +
          plateauNames(ids, true) +
          ')'
      );
      continue;
    }
    parents.set(id, parent);
  }
  problems.push(...plateauCycles(parents));
  if (problems.length) return model;

  const children = new Map();
  for (const [id, parent] of parents) {
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(id);
  }
  const order = [];
  const preorder = (id) => {
    order.push(id);
    for (const child of (children.get(id) || []).sort(compareUnits)) preorder(child);
  };
  preorder(BASELINE_PLATEAU);
  for (const id of order) {
    const own = (declaredBy.get(id) || [])[0];
    const content = own ? own.content : null;
    model.nodes.set(id, {
      id,
      name: content && !readIsMissing(content.name) ? String(content.name) : null,
      horizon: content && !readIsMissing(content.horizon) ? String(content.horizon) : null,
      parent: id === BASELINE_PLATEAU ? null : parents.get(id),
      patches:
        content && Array.isArray(content.patches) ? content.patches.filter((patch) => !readIsMissing(patch)) : [],
      manifest: own ? own.source : null,
      headers: Array.from(new Set(headers.get(id) || [])).sort(compareUnits)
    });
  }
  model.ids = order;

  const sorted = Array.from(model.nodes.keys()).sort(compareUnits);
  for (const id of sorted) {
    const node = model.nodes.get(id);
    if (plateauIsHeaderOnly(node)) {
      model.warnings.push(
        'the plateau `' +
          id +
          '` exists only through the `plateau` key of the header of ' +
          plateauNames(node.headers) +
          ': it has no manifest of kind `archicode.morin.io/plateau`, so it overrides `baseline` and has no name'
      );
    }
  }
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      // only a plateau that headers alone name can be a typo: two plateaus with a manifest each (`p1`, `p2`) are the author's choice (A1)
      if (
        oneLetterApart(sorted[i], sorted[j]) &&
        (plateauIsHeaderOnly(model.nodes.get(sorted[i])) || plateauIsHeaderOnly(model.nodes.get(sorted[j])))
      )
        model.warnings.push(
          'the plateaus `' +
            sorted[i] +
            '` and `' +
            sorted[j] +
            '` have ids one letter apart: check that one of them is not a typo'
        );
    }
  }
  for (const id of sorted) {
    const node = model.nodes.get(id);
    const parent = node.parent === null ? null : model.nodes.get(node.parent);
    // earlier means the whole period ends before the period above begins: `2026` under `2026-Q4` is not earlier, `2026-Q1` is
    const own = parent ? horizonPeriod(node.horizon) : null;
    const above = parent ? horizonPeriod(parent.horizon) : null;
    if (own !== null && above !== null && own.end < above.start) {
      model.warnings.push(
        'the horizon `' +
          node.horizon +
          '` of the plateau `' +
          id +
          '` is earlier than the horizon `' +
          parent.horizon +
          '` of the plateau it overrides, `' +
          parent.id +
          '`'
      );
    }
    model.warnings.push(...repeatedSetWarnings(node));
  }
  return model;
}

/**
 * The warnings for two `SET` of the same field of the same element in one plateau: the last one wins (`PlateauTree.repeatedSets`; variant V9 of the
 * Brightcart document). Only patches that name a `target` are compared: what a `json-path` selects is not known before the patches are applied.
 */
function repeatedSetWarnings(node) {
  const ranks = new Map(); // key -> { what, ranks }
  node.patches.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object' || String(raw.operator).toUpperCase() !== 'SET' || readIsMissing(raw.target))
      return;
    const where = !readIsMissing(raw.where) && typeof raw.where === 'object' ? raw.where : null;
    const field = !readIsMissing(raw.field) ? String(raw.field) : where ? 'relationships' : null;
    if (field === null) return;
    const layer =
      !readIsMissing(raw.layer) && String(raw.layer).toLowerCase() === 'technology' ? 'technology' : 'application';
    const towards = where
      ? ' (the relationship towards `' +
        String(where.destination) +
        '`' +
        (!readIsMissing(where.label) ? ' labelled `' + String(where.label) + '`' : '') +
        ')'
      : '';
    const key = layer + '|' + String(raw.target) + '|' + field + towards;
    if (!ranks.has(key))
      ranks.set(key, { what: '`' + field + '` of `' + String(raw.target) + '`' + towards, ranks: [] });
    ranks.get(key).ranks.push(i + 1);
  });
  const out = [];
  for (const { what, ranks: all } of ranks.values()) {
    if (all.length > 1)
      out.push(
        'the plateau `' +
          node.id +
          '` sets ' +
          what +
          ' in patches ' +
          (all.length === 2 ? all.join(' and ') : all.slice(0, -1).join(', ') + ' and ' + all[all.length - 1]) +
          ': the last one wins'
      );
  }
  return out;
}

/** The plateaus from the root down to `id`, itself last (`PlateauTree.chain`): what a plateau is loaded from. */
function plateauChain(model, id) {
  const chain = [];
  for (let at = model.nodes.get(id); at; at = at.parent === null ? null : model.nodes.get(at.parent)) chain.unshift(at);
  return chain;
}

/**
 * A reference declared in a plateau and again in one of its ancestors is a mistake (`PlateauTree.redeclared`): two plateaus that do not stack may each declare it. A view and a
 * story belong to no plateau (wave 015, run 0100): they are not concerned. `declarations`: Map plateau id -> { application, technology } (Map reference -> files).
 * Adds the sentences to `model.redeclared` (the command line tells them after the references declared twice in a plateau).
 */
function checkPlateauRedeclarations(model, declarations) {
  if (model.problems.length) return;
  const messages = new Map(); // reference -> [message]
  for (const id of model.ids) {
    const own = declarations.get(id);
    if (!own) continue;
    const chain = plateauChain(model, id);
    for (const ancestor of chain.slice(0, -1)) {
      const above = declarations.get(ancestor.id);
      if (!above) continue;
      for (const namespace of ['application', 'technology']) {
        for (const [reference, sources] of own[namespace]) {
          const ancestorSources = above[namespace].get(reference);
          if (!ancestorSources) continue;
          const names = (files) => plateauNames(Array.from(new Set(files)).sort(compareUnits));
          if (!messages.has(reference)) messages.set(reference, new Set());
          messages
            .get(reference)
            .add(
              'the reference `' +
                reference +
                '` is declared in the plateau `' +
                id +
                '` (' +
                names(sources) +
                ') and again in its ancestor `' +
                ancestor.id +
                '` (' +
                names(ancestorSources) +
                ')'
            );
        }
      }
    }
  }
  for (const reference of Array.from(messages.keys()).sort(compareUnits)) {
    for (const message of Array.from(messages.get(reference)).sort(compareUnits)) model.redeclared.push(message);
  }
}
