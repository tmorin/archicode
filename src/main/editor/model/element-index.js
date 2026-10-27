/** Whether an item of a list has a value: the command line leaves an item with no value (`- ` or `null`) out of a list. */
function isPresent(item) {
  return item !== null && item !== undefined;
}

/**
 * The list without its `n`th item that has a value, the items with no value left where they are: `withoutNthPresent([null, 'a', null, 'b'], 1)` is `[null, 'a', null]`. The forms of an
 * element draw the pills of `qualifiers`, `applications` and `uses` without the items with no value and address a pill by its place among those drawn (`data-index`), while the list
 * the edit is made on may still hold them (the manifest does, the resolution of a plateau may not): counting the items with a value reaches the same item in either (issue #120; a
 * relationship is addressed by its place in the file, `fileIndex`, #105).
 */
function withoutNthPresent(list, n) {
  const copy = Array.isArray(list) ? list.slice() : [];
  let seen = -1;
  for (let place = 0; place < copy.length; place++) {
    if (!isPresent(copy[place])) continue;
    seen++;
    if (seen === n) {
      copy.splice(place, 1);
      break;
    }
  }
  return copy;
}

/**
 * Recursively index one element node (manifest-root or nested) and its
 * descendants (content.elements, at any depth) into `index[category]`.
 * Returns the ElementRecord (CTR-1 shape) for this node.
 *
 * `level` (TDD-0010 DEC-3) is the nesting-rule level this node sits at —
 * one of 'solution'|'system'|'container'|'component'|'person'|
 * 'environment'|'node': its own bare `kind` string. The caller (`buildIndex`) computes
 * the manifest root's own `level` once, from its un-generalized
 * `bareKind`, before ever calling this function for that root.
 */
function indexElementRecursive(
  node,
  kind,
  reference,
  sourceFile,
  category,
  index,
  settings,
  level,
  declarations,
  attachedRoots
) {
  const rawRelationships = Array.isArray(node.relationships) ? node.relationships : [];
  // an item with no value is no relationship (the command line reads none, issue #105): it is left out, and each relationship keeps its place in the list it was read from
  // (`fileIndex`: the list of the manifest; in a plateau that patches the element, the list the plateau resolves), which the forms of an element address it by (`data-index`)
  const relationships = rawRelationships
    .map((r, fileIndex) => ({ r, fileIndex }))
    .filter(({ r }) => isPresent(r))
    .map(({ r, fileIndex }) => {
      const rel = r && typeof r === 'object' ? r : {};
      return {
        fileIndex,
        // Jackson reads a number or a boolean into a String field: a destination `8080` names the element "8080"
        destination:
          typeof rel.destination === 'number' || typeof rel.destination === 'boolean'
            ? String(rel.destination)
            : rel.destination,
        label: rel.label !== undefined && rel.label !== null ? rel.label : settings.relationships.defaultSyntheticLabel,
        // The label as written in the manifest (null when absent): the viewpoint kernel needs it, because ArchiCode
        // draws a natural link without a label, whereas `label` above is the display fallback.
        rawLabel: rel.label !== undefined && rel.label !== null ? rel.label : null,
        qualifiers: Array.isArray(rel.qualifiers) ? rel.qualifiers.filter(isPresent) : [], // an item with no value is no item
        tags: rel.tags && typeof rel.tags === 'object' ? rel.tags : {},
        resolved: false // filled in by resolveRelationships (FLOW-4)
      };
    });

  const record = {
    reference,
    layer: category, // 'application' | 'technology': a reference can exist in both, and then only the layer tells them apart
    kind,
    level,
    id: node.id,
    name: node.name !== undefined ? node.name : null,
    description: node.description !== undefined ? node.description : null,
    qualifiers: Array.isArray(node.qualifiers) ? node.qualifiers.filter(isPresent) : [],
    tags: node.tags && typeof node.tags === 'object' ? node.tags : {},
    applications: Array.isArray(node.applications) ? node.applications.filter(isPresent) : [],
    uses: Array.isArray(node.uses) ? node.uses.filter(isPresent) : [], // an environment: where the dependencies of its applications are looked for
    replaces: Array.isArray(node.replaces) ? node.replaces : [], // wave 009: the references of the baseline this element replaces (the comparison reads it; nothing else does)
    relationships,
    children: [],
    sourceFile
  };

  index[category].set(reference, record);
  if (declarations) {
    if (!declarations[category].has(reference)) declarations[category].set(reference, []);
    declarations[category].get(reference).push(sourceFile);
  }

  const childNodes = Array.isArray(node.elements) ? node.elements : [];
  for (const childNode of childNodes) {
    if (!childNode || typeof childNode !== 'object' || !childNode.id) continue;
    // ASM-3b: a nested element carries its own *bare* kind discriminator
    // directly (no prefix stripping, unlike header.kind).
    const childReference = reference + '.' + childNode.id;
    // wave 014 (run 0080): in a graph resolved from layers, the root of a manifest that says `header.parent` sits inside the element it names: it keeps
    // the kind, the level and the file of its own manifest (`attachedRoots`: Map layer|reference -> { kind, level, file }); the old callers pass none
    const attached = attachedRoots ? attachedRoots.get(category + '|' + childReference) : undefined;
    const childKind = attached ? attached.kind : childNode.kind;
    // DEC-3: the level of a node is its own kind
    const childLevel = attached ? attached.level : childKind;
    const childRecord = indexElementRecursive(
      childNode,
      childKind,
      childReference,
      attached ? attached.file : sourceFile,
      category,
      index,
      settings,
      childLevel,
      declarations,
      attachedRoots
    );
    record.children.push(childRecord);
  }

  return record;
}

/**
 * The kinds a parent of a type holds: the kinds of the interface its `elements` takes, from `READ_SCHEMA`, which `EditorReadSchemaTest` compares with the classes (the
 * `Parent<...>` each class implements and the `@JsonSubTypes` of that interface). This is the one rule of the page for "which kind a parent holds" (issue #87); the command
 * line reads it from the same classes (`Nesting.java`). A type that holds nothing (a person, a component) gives [].
 */
function nestingKindsOfType(typeName) {
  const type = READ_SCHEMA.types[typeName];
  const spec = type && type.extends === 'Element' && type.fields ? type.fields.elements : undefined; // an element: the workspace and its two layers hold elements, and are no level
  const iface = typeof spec === 'string' && spec.indexOf('[*') === 0 ? spec.slice(2, -1) : null;
  const kinds = iface ? Object.keys(READ_SCHEMA.kinds[iface] || {}) : [];
  return kinds.sort();
}

/**
 * The child-kind nesting-rule table (TDD DEC-3, TG-4) as a function of the nesting-rule level of the parent ('solution', 'system', 'container', 'environment', 'node').
 * Returns the list of bare kinds a node at `level` may contain as a new child; an empty array means `level` is a leaf (`'component'`/`'person'`, or any unrecognized level).
 */
function childKindOptionsForLevel(level) {
  if (typeof level !== 'string' || level === '') return [];
  return nestingKindsOfType(level.charAt(0).toUpperCase() + level.slice(1));
}

/** `childKindOptionsForLevel`, keyed off an `ElementRecord`'s own `level` (DEC-3). */
function childKindOptionsFor(record) {
  return childKindOptionsForLevel(record.level);
}
