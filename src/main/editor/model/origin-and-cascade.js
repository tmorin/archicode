// ---- Where a value comes from ----

/**
 * Where a field of an element of the plateau drawn comes from: `{ kind: 'patch', plateau, rank, operator, selector, inherited }` when a patch set it (the last one),
 * else `{ kind: 'declared' | 'inherited', plateau }`, the plateau of the manifest that declares the element. `inherited` is true when that plateau is not the one drawn.
 * Null for a record of a workspace that has no layers.
 */
function fieldOriginOf(record, field, drawn) {
  if (!record || record.declaredIn === undefined) return null;
  const now = drawn || (AppState.layers ? AppState.layers.current : BASELINE_PLATEAU);
  const set = record.patched ? record.patched.get(field) : null;
  if (set) return { kind: 'patch', plateau: set.plateau, rank: set.rank, operator: set.operator, selector: set.selector, inherited: set.plateau !== now };
  return { kind: record.declaredIn === now ? 'declared' : 'inherited', plateau: record.declaredIn, inherited: record.declaredIn !== now };
}

/** The origin as a sentence: `declared in saas`, `inherited from baseline`, `set by patch 3 of saas (SET target shop.web)`, `inherited from inhouse: set by patch 3 ...`. */
function originText(origin) {
  if (!origin) return '';
  if (origin.kind === 'patch') return (origin.operator === 'REMOVE' ? 'taken out by patch ' : 'set by patch ') + origin.rank + ' of ' + origin.plateau + ' (' + origin.operator + ' ' + origin.selector + ')' + (origin.inherited ? ', inherited' : '');
  return origin.kind === 'declared' ? 'declared in ' + origin.plateau : 'inherited from ' + origin.plateau;
}

/** The small note after a value: where it comes from. `forPlateau`: the plateau the record is read in (the plateau drawn when omitted). '' for a workspace that has no layers. */
function originNoteHtml(record, field, forPlateau) {
  const origin = AppState.layers && AppState.plateauTree && AppState.plateauTree.layered ? fieldOriginOf(record, field, forPlateau) : null;
  if (!origin) return '';
  return ' <span class="field-origin" data-origin="' + origin.kind + '" data-field="' + escapeHtml(field) + '" title="' + escapeHtml(originText(origin)) + '">' + escapeHtml(originText(origin)) + '</span>';
}

/** The patches that selected an element without naming a field it sets (a `json-path` that replaces nodes), as lines of the origin block. */
function renderOriginBlockHtml(record, forPlateau) {
  if (!AppState.layers || !AppState.plateauTree || !AppState.plateauTree.layered || record.declaredIn === undefined) return '';
  const now = forPlateau || AppState.layers.current;
  const patches = (record.touchedBy || []).map((t) => '<li>patch ' + t.rank + ' of ' + escapeHtml(t.plateau) + ': ' + escapeHtml(t.operator + ' ' + t.selector) + (t.field ? ' <span class="muted">(' + escapeHtml(t.field) + ')</span>' : '') + '</li>').join('');
  return '<section class="origin-block" aria-label="Origin" data-declared-in="' + escapeHtml(record.declaredIn) + '">' +
    renderFieldRowHtml('Plateau', escapeHtml(record.declaredIn === now ? 'declared in ' + record.declaredIn : 'inherited from ' + record.declaredIn)) +
    (patches ? renderFieldRowHtml('Patches', '<ul class="origin-patches">' + patches + '</ul>', record.touchedBy.length) : '') + '</section>';
}

// ---- The cascade of a REMOVE ----

/**
 * What the REMOVE patches of the chain of the plateau compared took besides the elements they select, among what the other plateau has (`Removal.cascade`):
 * the elements that left with the selected ones, then the entries taken out of the elements that stay. `[{ plateau, rank, patch, effect, layer, element, detail }]`.
 * `base`: the index of the plateau the target is compared with.
 */
function cascadeOf(removals, base) {
  const out = [];
  for (const removal of removals) {
    const patch = removal.operator + ' ' + removal.selector;
    const selected = new Set((removal.touched || []).map((r) => r.layer + '|' + r.reference));
    const gone = (removal.removed || [])
      .filter((r) => !selected.has(r.layer + '|' + r.reference) && base[r.layer] && base[r.layer].has(r.reference))
      .sort((a, b) => compareUnits(a.layer, b.layer) || compareUnits(a.reference, b.reference));
    for (const r of gone) out.push({ plateau: removal.plateau, rank: removal.rank, patch, effect: 'removed', layer: r.layer, element: r.reference, detail: '' });
    const dropped = [];
    for (const d of removal.dropped || []) {
      const holder = base[d.layer] ? base[d.layer].get(d.reference) : null;
      if (!holder) continue;
      const entry = d.entry && typeof d.entry === 'object' ? d.entry : null;
      const destination = entry ? String(entry.destination) : String(d.entry);
      const label = entry && entry.label !== undefined && entry.label !== null ? String(entry.label) : null;
      let held = false;
      if (d.field === 'relationships') held = holder.relationships.some((r) => String(r.destination) === destination && (r.rawLabel === null || r.rawLabel === undefined ? '' : String(r.rawLabel)) === (label === null ? '' : label));
      else if (d.field === 'uses') held = holder.kind === 'environment' && kernelStringsOf(holder.uses).includes(destination);
      else if (d.field === 'applications') held = holder.kind === 'node' && kernelStringsOf(holder.applications).includes(destination);
      if (held) dropped.push({ layer: d.layer, holder: d.reference, field: d.field, text: destination + (label === null ? '' : ' (' + label + ')') });
    }
    dropped.sort((a, b) => compareUnits(a.layer, b.layer) || compareUnits(a.holder, b.holder) || compareUnits(a.field, b.field) || compareUnits(a.text, b.text));
    for (const d of dropped) out.push({ plateau: removal.plateau, rank: removal.rank, patch, effect: 'dropped', layer: d.layer, element: d.holder, detail: d.field + ': ' + d.text });
  }
  return out;
}

