/**
 * What the command line reads, as the editor knows it (run 0072, issues #75 and #76): the keys each part of a manifest and of
 * `.archicode.yaml` takes, the shape of each value, the kinds a nested element may have, and the kinds of manifest. The command
 * line takes them from its classes; this table is checked against them (`EditorReadSchemaTest.java` reads it from this page), so the
 * two cannot drift. Specs: `text` (a text; a number or a boolean is read as one), `int`, `bool`, `any` (not checked), `texts` (a list of
 * texts), `text-map` (a map of texts), `object-map` (a map of objects), `enum:A,B`, `T` (an object of type T), `[T]` (a list of them),
 * `{T}` (a map of them), `[*I]` (a list of elements whose `kind` says the type, among those of the interface I). `extends` takes the
 * fields and the required keys of another type; `aliases` are other names of a field (only the first is told in a sentence);
 * `lenient` is a type whose unknown keys are ignored (a view, a story).
 */
// READ_SCHEMA begin
const READ_SCHEMA = {
  "types": {
    "Element": { "fields": { "description": "text", "id": "text", "name": "text", "qualifiers": "texts", "relationships": "[Relationship]", "replaces": "any", "tags": "text-map" }, "required": ["id"] },
    "Relationship": { "fields": { "destination": "text", "label": "text", "qualifier": "text", "qualifiers": "texts", "tags": "text-map" }, "required": ["destination"] },
    "Person": { "extends": "Element" },
    "Component": { "extends": "Element" },
    "Container": { "extends": "Element", "fields": { "elements": "[*ContainerElement]" } },
    "System": { "extends": "Element", "fields": { "elements": "[*SystemElement]" } },
    "Solution": { "extends": "Element", "fields": { "elements": "[*SolutionElement]" } },
    "Environment": { "extends": "Element", "fields": { "elements": "[*EnvironmentElement]", "uses": "texts" } },
    "Node": { "extends": "Element", "fields": { "applications": "texts", "elements": "[*NodeElement]" } },
    "View": { "lenient": true, "fields": { "description": "text", "id": "text", "layer": "enum:APPLICATION,TECHNOLOGY", "name": "text", "properties": "any", "viewpoint": "text" }, "required": ["id", "viewpoint"] },
    "Story": { "lenient": true, "fields": { "description": "text", "id": "text", "name": "text", "steps": "[Step]" }, "required": ["id"] },
    "Plateau": { "fields": { "horizon": "text", "id": "text", "name": "text", "override": "text", "patches": "[Patch]" }, "required": ["id"] },
    "Patch": { "fields": { "expect": "int", "field": "text", "json-path": "text", "layer": "enum:APPLICATION,TECHNOLOGY", "operator": "enum:ADD,MERGE,REMOVE,SET", "target": "text", "value": "any", "where": "Where" }, "aliases": { "json_path": "json-path" }, "required": ["operator"] },
    "Where": { "fields": { "destination": "text", "label": "text" }, "required": ["destination"] },
    "Step": { "lenient": true, "fields": { "against": "text", "at": "text", "layer": "enum:APPLICATION,TECHNOLOGY", "name": "text", "properties": "any", "text": "text", "view": "text", "viewpoint": "text" } },
    "Application": { "fields": { "elements": "[*ApplicationElement]" } },
    "Technology": { "fields": { "elements": "[*TechnologyElement]" } },
    "Workspace": { "fields": { "application": "Application", "formatters": "Formatters", "settings": "Settings", "stories": "any", "story": "any", "styles": "Styles", "technology": "Technology", "view": "any", "views": "any" } },
    "Settings": { "fields": { "current": "text", "facets": "Facets", "manifests": "Manifests", "name": "text", "relationships": "Relationships", "views": "Views" } },
    "Manifests": { "fields": { "paths": "texts" } },
    "Relationships": { "fields": { "default-synthetic-label": "text" } },
    "Views": { "fields": { "labels": "text-map", "path": "text", "properties": "object-map" } },
    "Facets": { "fields": { "customs": "[Facet]", "directory-name-template": "text", "global-enabled": "bool" } },
    "Facet": { "fields": { "actions": "[Action]", "hide-unlinked": "bool", "name": "text" }, "required": ["name"] },
    "Action": { "fields": { "json-path": "text", "operator": "enum:REMOVE" }, "required": ["operator", "json-path"] },
    "Styles": { "fields": { "atomic": "Style", "by-qualifiers": "{Style}", "by-tags": "{Style}", "composite": "Style" } },
    "Style": { "fields": { "background-color": "text", "font-color": "text", "font-style": "text", "line-color": "text", "line-gap": "int", "line-style": "int", "line-thickness": "int", "round-corner": "int", "shadowing": "bool" } },
    "Formatters": { "fields": { "atomic": "AtomicFormatter", "composite": "CompositeFormatter", "link": "LinkFormatter" } },
    "AtomicFormatter": { "fields": { "description": "text", "name": "text", "qualifiers": "text" } },
    "CompositeFormatter": { "fields": { "name": "text", "qualifiers": "text" } },
    "LinkFormatter": { "fields": { "label": "text", "qualifiers": "text" } }
  },
  "kinds": {
    "ApplicationElement": { "person": "Person", "solution": "Solution", "system": "System" },
    "SystemElement": { "container": "Container" },
    "ContainerElement": { "component": "Component" },
    "SolutionElement": { "system": "System" },
    "TechnologyElement": { "environment": "Environment" },
    "EnvironmentElement": { "node": "Node" },
    "NodeElement": { "node": "Node" }
  },
  "manifestKinds": {
    "component": "Component", "container": "Container", "environment": "Environment", "node": "Node", "person": "Person",
    "plateau": "Plateau", "solution": "Solution", "story": "Story", "system": "System", "view": "View"
  }
};
// READ_SCHEMA end

const readTypes = new Map(); // the types of READ_SCHEMA with what they extend resolved: { fields, required, aliases, lenient, known }

function readType(name) {
  if (readTypes.has(name)) return readTypes.get(name);
  const def = READ_SCHEMA.types[name];
  const base = def.extends ? readType(def.extends) : { fields: {}, required: [], aliases: {} };
  const type = {
    fields: Object.assign({}, base.fields, def.fields || {}),
    required: def.required || base.required,
    aliases: Object.assign({}, base.aliases, def.aliases || {}),
    lenient: def.lenient === true
  };
  type.known = Object.keys(type.fields).sort(); // the order of the command line's sentence
  readTypes.set(name, type);
  return type;
}

function readIsObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readIsMissing(value) {
  return value === undefined || value === null;
}

/** What kind of value this is, in the words of the command line's sentence. */
function readFound(value, plain) {
  if (plain !== undefined) return 'a number'; // a plain scalar YAML 1.1 reads as a number, held as the text it was written as
  if (Array.isArray(value)) return 'an array';
  if (readIsObject(value)) return 'an object';
  if (typeof value === 'string') return 'a string';
  if (typeof value === 'number') return 'a number';
  return 'a boolean';
}

/** The sentence for a value that is not of the shape its key takes; the command line says the same (`ArchiCodeException.reason`). */
function readWrongShape(value, path, plain) {
  return 'the value has the wrong shape (found ' + readFound(value, plain) + ')' + (path ? ' at `' + path + '`' : '');
}

function readAt(path, key) {
  return path ? path + '.' + key : key;
}

/** `Missing content.elements[0].id`: the words of the command line for a key that is required and absent (or empty). */
function readMissing(prefix, path, key) {
  return 'Missing ' + [prefix, path, key].filter(Boolean).join('.');
}

/** What is said of a group, which is gone (issue #114): what to write instead. The command line says the same words (`ArchiCodeException.GROUP_IS_GONE`). */
const GROUP_IS_GONE = 'a group is no kind any more: write its children in the `elements` of its parent';

/** The sentence for a `header.kind` that is none of the kinds, with the kinds there are (the command line's, whole); #76. */
function unrecognizedKindProblem(value) {
  const known = Object.keys(READ_SCHEMA.manifestKinds).map((kind) => ARCHICODE_KIND_PREFIX + kind).sort();
  const gone = /^archicode\.morin\.io\/((container|solution|system)-)?group$/.test(String(value).trim().toLowerCase()) ? ', ' + GROUP_IS_GONE : '';
  return 'unrecognized `header.kind` "' + value + '"' + gone + ' (known: ' + known.join(', ') + ')';
}

/** The range of a Java `int`: what the command line takes for a whole number of `.archicode.yaml` (`line-gap`, `round-corner`...). */
const READ_INT_MIN = -2147483648;
const READ_INT_MAX = 2147483647;

/** The first problem of one value against its spec, in document order, or null. `prefix`: where the `Missing` sentences start. */
function readValue(spec, value, path, prefix, plain) {
  if (readIsMissing(value) || spec === 'any') return null;
  const wrong = () => readWrongShape(value, path, plain);
  const nested = Array.isArray(value) || readIsObject(value);
  if (spec === 'text') return nested ? wrong() : null;
  if (spec === 'int') {
    if (nested || typeof value === 'boolean') return wrong();
    if (plain !== undefined) {
      // a plain scalar YAML 1.1 reads as a number (`0x1F`, `5.0`, `9999999999999999999`): the command line takes a float as the whole number it truncates to, and says a number out of range with the text
      // as written (issue #103)
      const beyond = plain.kind === 'int' ? plain.big > BigInt(READ_INT_MAX) || plain.big < BigInt(READ_INT_MIN) : Math.trunc(plain.value) > READ_INT_MAX || Math.trunc(plain.value) < READ_INT_MIN;
      return beyond ? 'Numeric value (' + plain.source + ') out of range of int (' + READ_INT_MIN + ' - ' + READ_INT_MAX + ')' + (path ? ' at `' + path + '`' : '') : null;
    }
    // a whole number must fit in the 32 bits of the command line's `int`: said with its sentence for a number, as a text that is no number for a quoted one
    if (typeof value === 'number' && (Math.trunc(value) > READ_INT_MAX || Math.trunc(value) < READ_INT_MIN)) {
      return 'Numeric value (' + value + ') out of range of int (' + READ_INT_MIN + ' - ' + READ_INT_MAX + ')' + (path ? ' at `' + path + '`' : '');
    }
    if (typeof value === 'string' && value !== '') {
      if (!/^\s*[-+]?\p{Nd}+\s*$/u.test(value)) return wrong(); // an empty text is no value
      if (/^\s*[-+]?\d+\s*$/.test(value) && (BigInt(value.trim()) > BigInt(READ_INT_MAX) || BigInt(value.trim()) < BigInt(READ_INT_MIN))) return wrong();
    }
    return null;
  }
  if (spec === 'bool') {
    if (nested) return wrong();
    if (plain !== undefined) return plain.kind === 'int' ? null : wrong(); // a whole number is read as true or false, a number with a dot or an exponent is not
    if (typeof value === 'string') return value === '' || ['true', 'True', 'TRUE', 'false', 'False', 'FALSE'].includes(value) ? null : wrong();
    return typeof value === 'number' && !Number.isInteger(value) ? wrong() : null;
  }
  if (spec === 'texts') {
    if (!Array.isArray(value)) return wrong();
    for (let i = 0; i < value.length; i++) {
      if (Array.isArray(value[i]) || readIsObject(value[i])) return readWrongShape(value[i], path + '[' + i + ']');
    }
    return null;
  }
  if (spec === 'text-map' || spec === 'object-map') {
    if (!readIsObject(value)) return wrong();
    for (const key of Object.keys(value)) {
      const item = value[key];
      if (readIsMissing(item)) continue;
      const bad = spec === 'text-map' ? Array.isArray(item) || readIsObject(item) : !readIsObject(item);
      if (bad) return readWrongShape(item, readAt(path, key));
    }
    return null;
  }
  if (spec.startsWith('enum:')) {
    if (nested || typeof value === 'boolean' || (typeof value === 'number' && !Number.isInteger(value)) || (plain !== undefined && plain.kind !== 'int')) return wrong();
    const values = spec.slice('enum:'.length).split(',');
    const written = plain !== undefined ? plain.big.toString() : String(value).trim(); // a number is said as the number it is (`0x1F` is `31`)
    if (values.some((v) => v.toLowerCase() === written.toLowerCase())) return null;
    return 'unrecognized `' + path + '` "' + written + '" (known: ' + values.join(', ') + ')'; // the command line says the value without the blanks around it
  }
  if (spec.startsWith('[')) {
    if (!Array.isArray(value)) return wrong();
    const polymorphic = spec.startsWith('[*');
    const name = spec.slice(polymorphic ? 2 : 1, -1);
    for (let i = 0; i < value.length; i++) {
      if (readIsMissing(value[i])) continue;
      const at = path + '[' + i + ']';
      const problem = polymorphic ? readTyped(name, value[i], at, prefix) : readObject(name, value[i], at, prefix, false);
      if (problem) return problem;
    }
    return null;
  }
  if (spec.startsWith('{')) {
    if (!readIsObject(value)) return wrong();
    for (const key of Object.keys(value)) {
      if (readIsMissing(value[key])) continue;
      const problem = readObject(spec.slice(1, -1), value[key], readAt(path, key), prefix, false);
      if (problem) return problem;
    }
    return null;
  }
  return readObject(spec, value, path, prefix, false);
}

/**
 * The first problem of an object against its type, or null: the keys in the order of the file (an unknown key, a value of the wrong
 * shape), then, once the object is done, the key it needs and lacks. This is the order in which the command line's reader finds them.
 * `consumesKind`: the `kind` key says the type and is no key of the object.
 */
function readObject(typeName, node, path, prefix, consumesKind) {
  if (!readIsObject(node)) return readWrongShape(node, path);
  const type = readType(typeName);
  for (const key of Object.keys(node)) {
    if (consumesKind && key === 'kind') continue;
    const field = Object.prototype.hasOwnProperty.call(type.fields, key) ? key : type.aliases[key];
    if (field === undefined) {
      if (type.lenient) continue;
      // a key in camel-case that the manual writes in kebab-case (`hideUnlinked`): the spelling earlier versions still read
      const kebab = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      const write = kebab !== key && type.known.includes(kebab) ? ', write `' + kebab + '`' : '';
      return 'unknown key `' + key + '`' + write + ' (known: ' + type.known.join(', ') + ') at `' + readAt(path, key) + '`';
    }
    const problem = readValue(type.fields[field], node[key], readAt(path, key), prefix, plainNumberOf(node, key));
    if (problem) return problem;
  }
  for (const key of type.required) {
    const names = [key, ...Object.keys(type.aliases).filter((alias) => type.aliases[alias] === key)];
    if (names.every((name) => readIsMissing(node[name]))) return readMissing(prefix, path, key);
  }
  return null;
}

/** An element of a list whose `kind` says its type: the kind is read first, whatever its place in the object. */
function readTyped(iface, node, path, prefix) {
  const kinds = READ_SCHEMA.kinds[iface];
  if (Array.isArray(node)) return readWrongShape(node, path); // a list is no element (the command line does not read the array form of a type id)
  const written = readIsObject(node) ? node.kind : undefined;
  const known = Object.keys(kinds).sort().join(', ');
  if (typeof written !== 'string' && typeof written !== 'number' && typeof written !== 'boolean') {
    return 'missing `kind` (known: ' + known + ') at `' + path + '`';
  }
  if (!Object.prototype.hasOwnProperty.call(kinds, String(written))) {
    return 'unknown kind `' + written + '`' + (String(written) === 'group' ? ', ' + GROUP_IS_GONE : '') + ' (known: ' + known + ') at `' + path + '`';
  }
  return readObject(kinds[String(written)], node, path, prefix, true);
}

/** The keys the header of a manifest has, in the order the command line lists them (`Manifest.Header`: `kind`, `parent`, `plateau`, `version`). */
const MANIFEST_HEADER_KEYS = ['kind', 'parent', 'plateau', 'version'];

/** The keys of the header that the command line types as text: it keeps what is written, a `yes` is `yes` (`kind` is an enum, which it reads by the kind of the value: a boolean is a wrong shape). */
const MANIFEST_HEADER_TEXT_KEYS = ['parent', 'plateau', 'version'];

/** The kind of a manifest as the command line reads it: the prefix is required, the case and the spaces around are not. Null when it is not one. */
function manifestKindName(value) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return null;
  const written = String(value).trim().toLowerCase();
  if (!written.startsWith(ARCHICODE_KIND_PREFIX)) return null;
  const name = written.slice(ARCHICODE_KIND_PREFIX.length);
  return Object.prototype.hasOwnProperty.call(READ_SCHEMA.manifestKinds, name) ? name : null;
}

/** The first problem of the header of a manifest, or null (a missing header is told by the caller). */
function headerProblem(header) {
  if (readIsMissing(header)) return null;
  if (!readIsObject(header)) return readWrongShape(header, 'header');
  for (const key of Object.keys(header)) {
    if (!MANIFEST_HEADER_KEYS.includes(key)) {
      // the reader reads the value of a key before it says the key is not one: a tagged integer or binary text it cannot read is said first
      const refusedUnder = plainNumberOf(header, key);
      if (refusedUnder !== undefined && refusedUnder.kind === 'malformed' && refusedUnder.eager) return refusedUnder.message + ' at `header`';
      return 'unknown key `' + key + '` (known: ' + MANIFEST_HEADER_KEYS.join(', ') + ') at `header.' + key + '`';
    }
    const value = header[key];
    if (readIsMissing(value)) continue;
    const refused = plainNumberOf(header, key);
    if (refused !== undefined && refused.kind === 'malformed') {
      // a scalar the reader refuses: the command line meets it when it gets to the key (the kind is an enum, which a refused number is the wrong shape of)
      if (refused.eager) return refused.message + ' at `header`';
      return key === 'kind' ? readWrongShape(value, 'header.kind', refused) : refused.message + ' at `header.' + key + '`';
    }
    if (key !== 'kind') {
      const problem = readValue('text', value, 'header.' + key, '');
      if (problem) return problem;
    } else if (Array.isArray(value) || readIsObject(value) || typeof value === 'boolean' || (typeof value === 'number' && !Number.isInteger(value)) || (plainNumberOf(header, 'kind') || { kind: 'int' }).kind === 'float') {
      return readWrongShape(value, 'header.kind', plainNumberOf(header, 'kind'));
    } else if (manifestKindName(value) === null) {
      return unrecognizedKindProblem(value);
    }
  }
  if (readIsMissing(header.kind)) return 'Missing header.kind';
  if (readIsMissing(header.version)) return 'Missing header.version';
  return null;
}

/** The sentence of the first scalar of `container[key]`, at any depth and in the order of the file, that the reader refuses (`yamlDeferMalformed`), or null. */
function firstRefusedScalarIn(container, key) {
  const mark = plainNumberOf(container, key);
  if (mark !== undefined && mark.kind === 'malformed') return mark.message;
  const value = container[key];
  if (value === null || typeof value !== 'object') return null;
  for (const inner of Array.isArray(value) ? value.keys() : yamlKeysOf(value)) {
    const found = firstRefusedScalarIn(value, inner);
    if (found !== null) return found;
  }
  return null;
}

/**
 * The first problem a manifest has, as the command line's sentence without the file and the place, or null. The command line reads the
 * file as a manifest (a header and a content, the keys in the order of the file), then the content as the kind of the header says; so does this.
 */
function manifestProblem(root) {
  if (!readIsObject(root)) return readWrongShape(root, '');
  for (const key of Object.keys(root)) {
    if (key === 'header') {
      const refused = plainNumberOf(root, 'header');
      if (refused !== undefined && refused.kind === 'malformed') return refused.eager ? refused.message : refused.message + ' at `header`'; // the header is a scalar the reader refuses
      const problem = headerProblem(root.header);
      if (problem) return problem;
    } else if (key === 'content') {
      // the command line decodes the content whole when it gets to it, so a scalar it refuses anywhere in it is the first thing it says of it
      const own = plainNumberOf(root, 'content');
      if (own !== undefined && own.kind === 'malformed') return own.eager ? own.message : readWrongShape(root.content, 'content', own); // a content that is a scalar the reader refuses is a number, said before it is decoded
      const refused = Array.isArray(root.content) ? null : firstRefusedScalarIn(root, 'content'); // (a list is the wrong shape whatever it holds)
      if (refused !== null) return refused + ' at `content`';
      if (!readIsMissing(root.content) && !readIsObject(root.content)) return readWrongShape(root.content, 'content');
    } else {
      const refused = plainNumberOf(root, key);
      if (refused !== undefined && refused.kind === 'malformed' && refused.eager) return refused.message;
      return 'unknown key `' + key + '` (known: content, header) at `' + key + '`';
    }
  }
  if (readIsMissing(root.header)) return 'Missing header.kind';
  if (readIsMissing(root.content)) return 'Missing content.id';
  const type = READ_SCHEMA.manifestKinds[manifestKindName(root.header.kind)];
  if (type === null || type === undefined) return readIsMissing(root.content.id) ? 'Missing content.id' : null;
  const problem = readObject(type, root.content, '', 'content', true);
  if (problem) return problem;
  const kind = manifestKindName(root.header.kind);
  if (kind === 'plateau') return plateauShapeProblem(root.content);
  return ARCHICODE_KIND_MAP[kind] ? dottedIdProblem(root.content, 'content') : null;
}

/**
 * The first element of a manifest (the root, then what it holds, in the order of the file) whose id has a dot, as the command line's sentence (`ManifestParser.dottedId`):
 * the dot separates the levels of a reference (`shop.web`), so an id that holds one is two ids (issue #104). Null when no id has one.
 */
function dottedIdProblem(node, path) {
  if (readIsMissing(node) || !readIsObject(node)) return null;
  if (typeof node.id === 'string' || typeof node.id === 'number' || typeof node.id === 'boolean') {
    const id = String(node.id);
    if (id.indexOf('.') !== -1) return 'the id `' + id + '` contains a dot, which separates the levels of a reference, at `' + path + '.id`';
  }
  if (Array.isArray(node.elements)) {
    for (let i = 0; i < node.elements.length; i++) {
      const found = dottedIdProblem(node.elements[i], path + '.elements[' + i + ']');
      if (found) return found;
    }
  }
  return null;
}

/**
 * What is wrong with the shape of the patches of a plateau beyond the keys and the values `readObject` checks: a patch says what it selects
 * with a `target` or a `json-path`, one of them. The command line says the same (`Plateau.shapeProblems`): keep them alike. The rest of what a
 * combination of keys means is the kernel's to say, with the plateau and the rank, when the layer is built.
 */
function plateauShapeProblem(content) {
  if (!Array.isArray(content.patches)) return null;
  for (let i = 0; i < content.patches.length; i++) {
    const patch = content.patches[i];
    if (readIsMissing(patch)) continue;
    const hasTarget = !readIsMissing(patch.target);
    const hasPath = !readIsMissing(patch['json-path']) || !readIsMissing(patch['json_path']);
    if (hasTarget && hasPath) return '`patches[' + i + ']` has a `target` and a `json-path`: write one of them';
    if (!hasTarget && !hasPath) return '`patches[' + i + ']` has no selector: write a `target` or a `json-path`';
  }
  return null;
}

/**
 * The first problem `.archicode.yaml` has, as the command line's sentence without the file and the place, or null: the key that no longer exists
 * (the command line looks for it first, before anything else is read: `WorkspaceFactory.read`), then the keys it takes and the shape of each value.
 */
function workspaceProblem(raw) {
  const settings = readIsObject(raw.settings) ? raw.settings : {};
  if (Object.prototype.hasOwnProperty.call(settings, 'plateaus')) return REMOVED_PLATEAUS_KEY;
  return readObject('Workspace', raw, '', '', false);
}

/**
 * `parseYaml` for a file of the model (a manifest): the fields of its header that YAML 1.1 reads as a boolean or a number (`parent: yes`, `plateau: On`, `parent: 0`, `version: 1.0`) are
 * the text as written, as the command line reads them (issues #85 and #103). The model then holds `yes`, not `true`, and `0`, not the number, and a save compares the file with the
 * model on the same terms. The content is read as the command line reads it, which makes a number of every YAML 1.1 number (`yamlModelNumbers`).
 */
function parseYamlAsModel(text) {
  const before = yamlModelNumbers;
  yamlModelNumbers = !yamlPlainReading;
  try {
    const value = parseYaml(text);
    if (value !== null && typeof value === 'object') keepHeaderAsWritten(value, text);
    return value;
  } finally {
    yamlModelNumbers = before;
  }
}

/** The header is read once more, keeping the words and the numbers, only when one of its fields came out as a boolean or a number (which is rare): those fields take the text as written. */
function keepHeaderAsWritten(parsed, text) {
  if (!readIsObject(parsed.header)) return;
  const changed = (key) => parsed.header[key] !== undefined && parsed.header[key] !== null && (typeof parsed.header[key] !== 'string' || plainNumberOf(parsed.header, key) !== undefined);
  const keys = MANIFEST_HEADER_TEXT_KEYS.filter(changed);
  if (keys.length === 0) return;
  yamlKeepWords = true;
  try {
    const again = parseYaml(text);
    for (const key of keys) parsed.header[key] = again.header[key];
  } finally {
    yamlKeepWords = false;
  }
}

/**
 * Parse one manifest file's text the way every load/edit path needs
 * (loadWorkspace, commitFileEdit, reloadManifestFile): `{ header, content,
 * error }`, `error` set (and header/content null) when the text is not
 * valid YAML or is a manifest the command line refuses (`manifestProblem`).
 */
function parseManifestText(text) {
  const deferring = yamlDeferMalformed;
  yamlDeferMalformed = true;
  try {
    const parsed = parseYamlAsModel(text) || {};
    const header = (parsed.header && typeof parsed.header === 'object') ? parsed.header : null;
    const content = (parsed.content && typeof parsed.content === 'object') ? parsed.content : null;
    return { header, content, error: manifestProblem(parsed) };
  } catch (e) {
    return { header: null, content: null, error: e && e.message ? e.message : String(e) };
  } finally {
    yamlDeferMalformed = deferring;
  }
}


/** The sentence for a workspace file that still has the key that listed the plateaus. It is the command line's (`WorkspaceFactory.REMOVED_KEY`), word for word. */
const REMOVED_PLATEAUS_KEY =
  '`settings.plateaus` no longer exists: a plateau is a layer now. Remove the key, write `plateau: <id>` in the header of the manifests of each plateau, ' +
  'and declare each plateau in a manifest of kind `archicode.morin.io/plateau` (`id`, `name`, `override`: the plateau it builds on, `baseline` when absent, ' +
  'and `patches` for what it changes)';
