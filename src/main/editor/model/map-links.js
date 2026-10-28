/**
 * The entry model of the `links` and `highlight` of a Map view (wave 026, run 0199, issue #143, DEC-2). An entry names one
 * relationship by the element that declares it, its destination and its label; the label rule is the command line's and the
 * kernel's (`RelationshipLabel.normalize`: trimmed, and a blank label is no label).
 */

/** The label of an entry as the rule reads it: trimmed, the empty text for none. */
function normalLinkLabel(label) {
  return typeof label === 'string' ? label.trim() : '';
}

/** The entry of a relationship of a record: the label as declared, trimmed, left out when there is none (the display fallback is no label). */
function linkEntryOf(relationship, sourceReference) {
  const entry = { source: sourceReference, destination: relationship.destination };
  const label = normalLinkLabel(relationship.rawLabel);
  if (label) entry.label = label;
  return entry;
}

/** The key of an entry: its source, its destination and its trimmed label. */
function linkEntryKey(entry) {
  return JSON.stringify([entry.source, entry.destination, normalLinkLabel(entry.label)]);
}

function isLinkEntry(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  for (const key of Object.keys(value)) {
    if (key !== 'source' && key !== 'destination' && key !== 'label') return false;
  }
  if (typeof value.source !== 'string' || value.source === '') return false;
  if (typeof value.destination !== 'string' || value.destination === '') return false;
  return value.label === undefined || typeof value.label === 'string';
}

/** Reads a `links` or `highlight` value as the kernel does: the entries, and one sentence for the first item that is not one. */
function linkEntriesOf(value, key) {
  const name = key || 'links';
  const entries = [];
  const problems = [];
  if (value === undefined || value === null) return { entries, problems };
  if (!Array.isArray(value)) {
    problems.push('`' + name + '` is a list of mappings with `source`, `destination` and optionally `label`');
    return { entries, problems };
  }
  value.forEach((item, index) => {
    if (isLinkEntry(item)) entries.push(item);
    else if (problems.length === 0) {
      problems.push(
        '`' +
          name +
          '[' +
          index +
          ']` is a mapping with `source`, `destination` and optionally `label`, and ' +
          JSON.stringify(item) +
          ' is not one'
      );
    }
  });
  return { entries, problems };
}

/** True when the source declares a relationship to the destination with the same normal label, in the model (reference -> record). */
function linkEntryExists(entry, index) {
  const record = index.get(entry.source);
  if (!record) return false;
  const label = normalLinkLabel(entry.label);
  return (record.relationships || []).some(
    (relationship) => relationship.destination === entry.destination && normalLinkLabel(relationship.rawLabel) === label
  );
}

/** Rewrites the source and the destination of the entries with `rewrite` (a reference -> reference function); true when anything changed. */
function rewriteLinkEntries(entries, rewrite) {
  let changed = false;
  for (const entry of entries) {
    const source = rewrite(entry.source);
    if (source !== entry.source) {
      entry.source = source;
      changed = true;
    }
    const destination = rewrite(entry.destination);
    if (destination !== entry.destination) {
      entry.destination = destination;
      changed = true;
    }
  }
  return changed;
}

/** The written form: one entry per key, sorted by key, a label trimmed and a blank one not written. */
function canonicalLinkEntries(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    const key = linkEntryKey(entry);
    if (byKey.has(key)) continue;
    const written = { source: entry.source, destination: entry.destination };
    const label = normalLinkLabel(entry.label);
    if (label) written.label = label;
    byKey.set(key, written);
  }
  return Array.from(byKey.keys())
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => byKey.get(key));
}

/** The entries whose relationship exists in one of the models drawn (the plateau, and the one compared with: a removed relationship can be ticked); the others are left out of the kernel input. */
function drawnLinkEntries(entries, indexes) {
  const models = indexes.filter(Boolean);
  return entries.filter((entry) => models.some((index) => linkEntryExists(entry, index)));
}
