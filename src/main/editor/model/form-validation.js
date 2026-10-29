// =====================================================================
// Structured-form validation rules (TDD-0009 DEC-9, resolves FR-20) —
// one small, independently-callable function per rule. Every function
// here is pure (reads AppState only where a rule needs it, e.g. the id-
// collision check; never mutates AppState) and returns either
// `{ valid: true, ... }` (with whatever normalized value(s) the caller
// needs to proceed) or `{ valid: false, error: string }`. A later task's
// click handlers call these *before* commitElementEdit/commitSettingsEdit
// — a rejection must never call either commit function, so AppState is
// never touched on a rejected action.
// =====================================================================

/**
 * `name`/`description` normalization (not a rejection): empty-after-trim
 * normalizes to `null`, matching indexElementRecursive's own
 * null-means-absent convention and the read-only view's "none" display.
 */
function normalizeOptionalText(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed === '' ? null : trimmed;
}

/** DEC-8's own reference-prefix-rewrite formula, reused here so the id-rename collision check validates against the *actual* new reference. */
function computeRenamedReference(currentReference, newId) {
  const dotIdx = currentReference.lastIndexOf('.');
  return dotIdx === -1 ? newId : currentReference.slice(0, dotIdx + 1) + newId;
}

/**
 * `id` rename validation: non-empty after trim; the resulting new
 * reference must not collide with any other existing element's current
 * reference in the same category index (DEC-9's first rule) — this is
 * checked against the live `AppState.index[category]`, i.e. before any
 * rebuild the eventual commit would trigger.
 */
function validateElementIdRename(newId, currentReference, category) {
  const trimmed = typeof newId === 'string' ? newId.trim() : '';
  if (trimmed === '') {
    return { valid: false, error: 'Id is required.' };
  }
  // an id that is not changed is not judged (a hand-written manifest may use one the editor would not accept for a
  // new element, and saving the other fields of the form must still work); a new id has to be a safe one
  const currentRecord = findElementRecord(currentReference, category);
  if (!currentRecord || String(currentRecord.id) !== trimmed) {
    const idCheck = validateElementId(trimmed);
    if (!idCheck.valid) return idCheck;
  }
  const newReference = computeRenamedReference(currentReference, trimmed);
  const categoryIndex = AppState.index && AppState.index[category];
  if (categoryIndex) {
    for (const ref of categoryIndex.keys()) {
      if (ref !== currentReference && ref === newReference) {
        return { valid: false, error: 'Another element already uses reference "' + newReference + '".' };
      }
    }
  }
  return { valid: true, newId: trimmed, newReference };
}

/**
 * `qualifiers`/`applications` add validation: the new entry must be
 * non-empty after trim (shared by both fields — DEC-9 states the same
 * rule for each).
 */
function validateNewListEntry(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed === '') {
    return { valid: false, error: 'Value is required.' };
  }
  return { valid: true, value: trimmed };
}

/**
 * `uses` add validation, on the environment `environmentReference`: the entry must be an environment or a node of the
 * technology layer, that the environment does not already use, and that is not the environment itself or inside it
 * (it would use what it hosts). A dangling entry would make every deep view of the technology layer fail.
 */
function validateNewUse(environmentReference, value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed === '') {
    return { valid: false, error: 'Value is required.' };
  }
  if (!AppState.index.technology.has(trimmed)) {
    return { valid: false, error: 'No environment or node has the reference "' + trimmed + '".' };
  }
  if (trimmed === environmentReference || trimmed.startsWith(environmentReference + '.')) {
    return { valid: false, error: 'An environment cannot use itself or what it contains.' };
  }
  const record = findElementRecord(environmentReference, 'technology');
  if (record && Array.isArray(record.uses) && record.uses.includes(trimmed)) {
    return { valid: false, error: '"' + trimmed + '" is already used.' };
  }
  return { valid: true, value: trimmed };
}

/**
 * `tags` add validation: the key must be non-empty after trim AND must
 * not already exist in the element's current tags (reject rather than
 * silently overwrite). The value has no format requirement.
 */
function validateNewTagKey(key, existingTags) {
  const trimmed = typeof key === 'string' ? key.trim() : '';
  if (trimmed === '') {
    return { valid: false, error: 'Tag key is required.' };
  }
  if (existingTags && Object.prototype.hasOwnProperty.call(existingTags, trimmed)) {
    return { valid: false, error: 'Tag key "' + trimmed + '" already exists — edit it instead.' };
  }
  return { valid: true, key: trimmed };
}

/**
 * `relationships` add/save validation: `destination` must be non-empty
 * after trim; `label` empty-after-trim normalizes to `undefined` (not
 * stored as a literal empty string, so indexElementRecursive's existing
 * fallback-to-defaultSyntheticLabel logic still applies, exactly as it
 * does for a relationship with no explicit label in a manifest file).
 */
function validateRelationshipDraft(destination, label) {
  const trimmedDestination = typeof destination === 'string' ? destination.trim() : '';
  if (trimmedDestination === '') {
    return { valid: false, error: 'Destination is required.' };
  }
  const trimmedLabel = typeof label === 'string' ? label.trim() : '';
  return { valid: true, destination: trimmedDestination, label: trimmedLabel === '' ? undefined : trimmedLabel };
}

/**
 * Settings `manifests.paths` validation: the textarea's raw text (one
 * path per line) splits/trims into `paths`; at least one non-empty path
 * is required, else reject (keep the previous value).
 */
function validateManifestsPaths(rawPathsText) {
  const paths = String(rawPathsText === null || rawPathsText === undefined ? '' : rawPathsText)
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p !== '');
  if (paths.length === 0) {
    return { valid: false, error: 'At least one manifests path is required.' };
  }
  // the sentences of the command line and of the load (run 0076): a path may end in `/**`, and `**` is read nowhere else
  const refused = paths.map(manifestsPathSentence).filter((sentence) => sentence !== null);
  if (refused.length > 0) {
    return { valid: false, error: refused.join(' ') };
  }
  return { valid: true, paths };
}

/**
 * Settings `views.path` validation: non-empty after trim required. The
 * documented default (`'views'`) is deliberately not applied here — that
 * is `parseSettings`' behavior for an *absent* key at load time, not a
 * rule for an explicit, empty form submission.
 */
function validateViewsPath(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed === '') {
    return { valid: false, error: 'Views path is required.' };
  }
  return { valid: true, path: trimmed };
}

/**
 * Parse a `facets.directoryNameTemplate`, which the Java side feeds to
 * `String.format(template, viewsPath, facetName)` (WorkspaceFactory) — so
 * only `%s`, the positional `%1$s`/`%2$s` and a literal `%%` are meaningful
 * with those two string arguments; anything else (`%d`, a dangling `%`, a
 * third `%s`) throws when views are generated. Returns `{ valid: true,
 * format(viewsPath, facetName) }`, or `{ valid: false, error }`. The facet
 * name must be referenced, else every facet would write to one folder.
 */
function parseDirectoryNameTemplate(template) {
  const parts = [];
  const used = new Set();
  let sequential = 0;
  let last = 0;
  const token = /%%|%s|%[12]\$s|%/g;
  let m;
  while ((m = token.exec(template)) !== null) {
    if (m.index > last) parts.push({ literal: template.slice(last, m.index) });
    last = token.lastIndex;
    if (m[0] === '%%') {
      parts.push({ literal: '%' });
    } else if (m[0] === '%s') {
      if (sequential > 1) return { valid: false, error: 'Template can use at most two %s (views path, facet name).' };
      used.add(sequential);
      parts.push({ arg: sequential++ });
    } else if (m[0] === '%') {
      return { valid: false, error: 'Template may only use %s, %1$s, %2$s or %% — a lone % fails at generation time.' };
    } else {
      const arg = parseInt(m[0].charAt(1), 10) - 1;
      used.add(arg);
      parts.push({ arg: arg });
    }
  }
  if (last < template.length) parts.push({ literal: template.slice(last) });
  if (!used.has(1)) {
    return {
      valid: false,
      error: 'Template must include the facet name (the second %s), or all facets share one folder.'
    };
  }
  return {
    valid: true,
    format(viewsPath, facetName) {
      const args = [viewsPath, facetName];
      return parts.map((part) => ('literal' in part ? part.literal : args[part.arg])).join('');
    }
  };
}

/** Settings `facets.directoryNameTemplate` validation: non-empty after trim, and a template Java's String.format accepts (see parseDirectoryNameTemplate). */
function validateDirectoryNameTemplate(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed === '') {
    return { valid: false, error: 'Directory name template is required.' };
  }
  const parsed = parseDirectoryNameTemplate(trimmed);
  if (!parsed.valid) return { valid: false, error: parsed.error };
  return { valid: true, value: trimmed };
}

/** The fixed viewpoint id vocabulary (matches the Java `View.viewpoint` field) — `views.labels`/`views.properties` are keyed by these. */
const VIEWPOINT_IDS = ['overview', 'detailed', 'deep'];

/** The one operator the Java `Facets.Facet.Action` enum defines today — a `<select>` kept open to more without a UI change later. */
const FACET_ACTION_OPERATORS = ['REMOVE'];

/** `views.properties[viewpoint]` save validation: the text must parse as a JSON object (not an array/scalar/null). */
function validateViewPropertiesJson(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    return { valid: false, error: 'Invalid JSON: ' + (e && e.message ? e.message : String(e)) };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Properties must be a JSON object.' };
  }
  return { valid: true, value: parsed };
}

/** The current text of a viewpoint's JSON editor — the live CodeMirror doc, else the fallback textarea. */
function readViewPropertiesEditorText(viewpoint) {
  const view = activeJsonEditorViews[viewpoint];
  if (view) return view.state.doc.toString();
  const textarea = document.querySelector('.json-editor-fallback[data-viewpoint="' + viewpoint + '"]');
  return textarea ? textarea.value : '';
}

/**
 * Read and validate the whole Settings form (FLOW-2, all-or-nothing): clears
 * every previous inline error, shows each failing field's own error, and
 * returns `{ valid: false }` if any failed — else `{ valid: true, apply }`,
 * where `apply(settings)` writes every field. Shared by "Save all changes" and
 * by the structural add/remove-facet(-action) buttons, which apply it first
 * so a re-render never discards what the user typed elsewhere.
 */
function readSettingsDraft() {
  const byId = (id) => document.getElementById(id);
  const errorIds = [
    'settings-manifests-paths-error',
    'settings-views-path-error',
    'settings-facets-directory-template-error'
  ];
  for (const vp of VIEWPOINT_IDS) errorIds.push('view-properties-error-' + vp);
  errorIds.forEach((id) => setInlineErrorText(id, ''));
  document.querySelectorAll('.facets-editor .inline-error').forEach((el) => {
    el.textContent = '';
  });

  let hasError = false;
  const fail = (id, message) => {
    setInlineErrorText(id, message);
    hasError = true;
  };

  const nameInput = byId('settings-name-input');
  const pathsInput = byId('settings-manifests-paths-input');
  const viewsPathInput = byId('settings-views-path-input');
  const templateInput = byId('settings-facets-directory-template-input');
  const defaultLabelInput = byId('settings-default-label-input');
  const globalEnabledInput = byId('settings-facets-global-enabled-input');

  const pathsResult = pathsInput ? validateManifestsPaths(pathsInput.value) : { valid: true, paths: null };
  const viewsPathResult = validateViewsPath(viewsPathInput ? viewsPathInput.value : '');
  const templateResult = validateDirectoryNameTemplate(templateInput ? templateInput.value : '');
  if (!pathsResult.valid) fail('settings-manifests-paths-error', pathsResult.error);
  if (!viewsPathResult.valid) fail('settings-views-path-error', viewsPathResult.error);
  if (!templateResult.valid) fail('settings-facets-directory-template-error', templateResult.error);

  // views.labels: an empty-after-trim label omits that viewpoint's key rather than storing ''.
  const labels = {};
  for (const vp of VIEWPOINT_IDS) {
    const input = byId('settings-label-' + vp + '-input');
    const trimmed = input ? input.value.trim() : '';
    if (trimmed !== '') labels[vp] = trimmed;
  }

  const properties = Object.assign({}, AppState.workspace.settings.views.properties);
  for (const vp of VIEWPOINT_IDS) {
    const result = validateViewPropertiesJson(readViewPropertiesEditorText(vp));
    if (!result.valid) {
      fail('view-properties-error-' + vp, result.error);
      continue;
    }
    // wave 027, run 0202 (DEC-1): the `layout` a viewpoint gives to every view is checked where it is typed, with the sentence of the load
    const layoutProblem = columnsProblem(result.value.layout, '`settings.views.properties.' + vp + '.layout`');
    if (layoutProblem) fail('view-properties-error-' + vp, layoutProblem);
    else properties[vp] = result.value;
  }

  const customs = AppState.workspace.settings.facets.customs.map((facet, facetIndex) => {
    const actions = (Array.isArray(facet.actions) ? facet.actions : []).map((action, actionIndex) => {
      const row = document.querySelector(
        '.relationship-edit-row[data-facet-index="' + facetIndex + '"][data-action-index="' + actionIndex + '"]'
      );
      if (!row) return action;
      const result = validateFacetActionDraft(row.querySelector('.facet-action-jsonpath-input').value);
      if (!result.valid) {
        setRowInlineErrorText(row, result.error);
        hasError = true;
        return action;
      }
      return { operator: row.querySelector('.facet-action-operator-input').value, jsonPath: result.jsonPath };
    });
    const hide = document.querySelector('.facet-hide-unlinked-input[data-facet-index="' + facetIndex + '"]');
    return Object.assign({}, facet, {
      actions: actions,
      hideUnlinked: hide ? hide.checked : facet.hideUnlinked === true
    });
  });

  if (hasError) return { valid: false };
  return {
    valid: true,
    apply(settings) {
      if (nameInput) settings.name = nameInput.value.trim();
      if (pathsResult.paths) settings.manifests.paths = pathsResult.paths;
      settings.relationships.defaultSyntheticLabel = defaultLabelInput ? defaultLabelInput.value : '';
      settings.views.path = viewsPathResult.path;
      settings.views.labels = labels;
      settings.views.properties = properties;
      settings.facets.globalEnabled = globalEnabledInput ? globalEnabledInput.checked : false;
      settings.facets.directoryNameTemplate = templateResult.value;
      settings.facets.customs = customs;
    }
  };
}

/**
 * `facets.customs` add validation: the name must be non-empty after trim
 * AND must not already name another facet (same reject-rather-than-
 * overwrite rule as `validateNewTagKey`) — the UI never supports an
 * in-place rename, so a name collision would otherwise silently shadow
 * the earlier facet's actions.
 */
function validateFacetName(name, existingCustoms) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed === '') {
    return { valid: false, error: 'Facet name is required.' };
  }
  if (Array.isArray(existingCustoms) && existingCustoms.some((f) => f.name === trimmed)) {
    return { valid: false, error: 'A facet named "' + trimmed + '" already exists.' };
  }
  // the name goes into the name of a folder: one the command line would refuse when it loads the workspace is not written (issue #147)
  const reason = facetNameReason(trimmed);
  if (reason !== null) {
    return {
      valid: false,
      error: 'Facet name ' + reason + ': it is the name of a folder, write a plain word, such as "journey".'
    };
  }
  return { valid: true, name: trimmed };
}

/** `facets.customs[].actions` add/save validation: `jsonPath` must be non-empty after trim; `operator` always comes from a closed `<select>`. */
function validateFacetActionDraft(jsonPath) {
  const trimmed = typeof jsonPath === 'string' ? jsonPath.trim() : '';
  if (trimmed === '') {
    return { valid: false, error: 'JSON path is required.' };
  }
  return { valid: true, jsonPath: trimmed };
}
