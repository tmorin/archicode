// ---- Element edition form (run-0009, task-003; TDD DEC-1/DEC-2/DEC-8) ----

/** Join a string[] for a relationship's comma-separated qualifiers text input. */
function formatCommaList(arr) {
  return Array.isArray(arr) ? arr.join(', ') : '';
}

/** Join a {k: v} map for a relationship's comma-separated `k=v` tags text input. */
function formatCommaKvList(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return yamlKeysOf(obj)
    .map((k) => k + '=' + obj[k])
    .join(', ');
}

/** Parse a comma-separated text input into a trimmed, non-empty-entries string[]. */
function parseCommaList(text) {
  return String(text === null || text === undefined ? '' : text)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/**
 * Parse a comma-separated `k=v` text input into a {k: v} map (DEC-9: a
 * malformed pair with no `=` is dropped, not rejected).
 */
function parseCommaKvList(text) {
  const tags = {};
  for (const pair of parseCommaList(text)) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (key === '') continue;
    setOwnKey(tags, key, value);
  }
  return tags;
}

/** `obj[key] = value` as an own property, even for a key like `__proto__` (a plain assignment would set the prototype, or nothing). */
function setOwnKey(obj, key, value) {
  setYamlKey(obj, key, value); // keeps the order of the keys that look like array indexes
  return obj;
}

/** A shallow copy of an object's own enumerable properties, keys like `__proto__` included. */
function copyOwnKeys(obj) {
  const copy = {};
  for (const key of yamlKeysOf(obj)) setOwnKey(copy, key, obj[key]);
  return copy;
}

/** Set (or clear) an inline-error span's text by its element id, without a full render. */
function setInlineErrorText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text || '';
}

/** Set (or clear) a relationship sub-form row's own inline-error span, without a full render. */
function setRowInlineErrorText(row, text) {
  if (!row) return;
  const el = row.querySelector('.inline-error');
  if (el) el.textContent = text || '';
}

/**
 * Auto-grow textarea (form UX review follow-up): height tracks content up to
 * AUTO_GROW_MAX_LINES, then an internal scrollbar takes over — resolves the
 * "largeur 100%, hauteur auto, max ~10 lignes" request without a fixed-size
 * textarea that either wastes space or clips long text.
 */
const AUTO_GROW_MAX_LINES = 10;

function autosizeTextarea(el) {
  const style = window.getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
  const verticalExtra =
    (parseFloat(style.paddingTop) || 0) +
    (parseFloat(style.paddingBottom) || 0) +
    (parseFloat(style.borderTopWidth) || 0) +
    (parseFloat(style.borderBottomWidth) || 0);
  const maxHeight = lineHeight * AUTO_GROW_MAX_LINES + verticalExtra;
  el.style.height = 'auto';
  const contentHeight = el.scrollHeight;
  el.style.height = Math.min(contentHeight, maxHeight) + 'px';
  el.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
}

let autoGrowObserver = null;

/**
 * Re-run autosizeTextarea on every `.auto-grow-textarea` currently in the DOM
 * — called after each render(). A textarea is also re-measured whenever its
 * width changes: a textarea measured while the grid is still narrower than it
 * ends up (the first render, a panel being resized) wraps its text over many
 * lines, and would otherwise keep that inflated height forever.
 */
function autosizeAllTextareas() {
  const textareas = document.querySelectorAll('.auto-grow-textarea');
  textareas.forEach(autosizeTextarea);
  if (typeof ResizeObserver === 'undefined') return;
  if (autoGrowObserver) {
    autoGrowObserver.disconnect();
  } else {
    autoGrowObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        if (entry.target._autoGrowWidth !== width) {
          entry.target._autoGrowWidth = width;
          autosizeTextarea(entry.target);
        }
      }
    });
  }
  textareas.forEach((el) => {
    el._autoGrowWidth = Math.round(el.getBoundingClientRect().width);
    autoGrowObserver.observe(el);
  });
}

/** Delegated `input` listener (DEC — mirrors the existing click/pointerdown/dblclick delegation on #app): resizes as the user types. */
function handleAppInput(e) {
  if (handleMapLinksControl(e.target)) return; // the filter of the list of relationships: the rows are drawn again in place
  if (e.target.matches && e.target.matches('[data-settings-current]')) return; // the list of Settings writes on `change`; choosing in it is no typed draft (run 0111, #111)
  if (e.target.matches && e.target.matches('input[name="theme-choice"]')) {
    // a preference of the browser, not a change of the workspace
    setThemeChoice(e.target.value);
    return;
  }
  if (e.target.matches && e.target.matches('[data-dialog-filter]')) {
    // the search of the Move dialog
    applyMoveFilter(e.target.value);
    return;
  }
  if (
    e.target.tagName === 'INPUT' &&
    e.target.type === 'text' &&
    e.target.closest &&
    e.target.closest('[data-view-field], [data-view-list]')
  )
    lightSaveForTypedViewText();
  if (!draftTyped && e.target.closest && e.target.closest('.element-edition-form, .settings-view, .file-view')) {
    draftTyped = true;
    refreshSaveAllButton();
  }
  if (e.target.matches && e.target.matches('[data-dialog-new]')) {
    // typing a name picks "New story"
    const choice = document.querySelector('input[name="story-choice"][value="' + NEW_STORY_CHOICE + '"]');
    if (choice) choice.checked = true;
    return;
  }
  if (e.target.matches && e.target.matches('[data-story-repair]')) {
    if (e.target.value)
      repairStoryStep(e.target.getAttribute('data-story'), Number(e.target.getAttribute('data-step')), e.target.value);
    return;
  }
  if (e.target.matches && e.target.matches('[data-story-step-plateau]')) {
    // wave 015 (run 0101): where a step is told, and what it is compared with
    setStepPlateau(
      e.target.getAttribute('data-story'),
      Number(e.target.getAttribute('data-step')),
      e.target.getAttribute('data-story-step-plateau'),
      e.target.value
    );
    return;
  }
  const storyField = e.target.closest && e.target.closest('[data-story-field]');
  if (storyField) {
    updateStoryField(storyField);
    return;
  }
  if (e.target.getAttribute && e.target.getAttribute('data-changes-filter')) {
    // wave 015 (run 0103): the two filters of the list of changes
    setChangesFilter(e.target.getAttribute('data-changes-filter'), e.target.value);
    return;
  }
  if (e.target.getAttribute && e.target.getAttribute('data-band-select')) {
    // wave 015 (run 0097): the two lists of the band
    chooseOnBand(e.target);
    return;
  }
  if (e.target.id === 'diagram-facet-select') {
    pushDiagramHistory();
    diagramFacet = e.target.value || null;
    mapSelectionCheck = true;
    requestRedraw();
    return;
  }
  if (e.target.matches && e.target.matches('.auto-grow-textarea')) {
    autosizeTextarea(e.target);
  }
  if (e.target.id === 'settings-facets-directory-template-input' || e.target.id === 'settings-views-path-input') {
    refreshFacetDirectoryPreviews();
  }
}

/**
 * Read a relationship sub-form row's four inputs and validate them
 * (DEC-9's `validateRelationshipDraft`), returning the parsed
 * `qualifiers`/`tags` alongside on success.
 */
function readRelationshipDraftFromRow(row) {
  if (!row) return { valid: false, error: 'Relationship row not found.' };
  const destinationInput = row.querySelector('.rel-destination-input');
  const labelInput = row.querySelector('.rel-label-input');
  const qualifiersInput = row.querySelector('.rel-qualifiers-input');
  const tagsInput = row.querySelector('.rel-tags-input');
  const draft = validateRelationshipDraft(
    destinationInput ? destinationInput.value : '',
    labelInput ? labelInput.value : ''
  );
  if (!draft.valid) return draft;
  // A field the user did not touch keeps the model's own value: re-splitting its text on commas would corrupt a
  // qualifier like `A, B` or a tag like `ports=80,443`. Only a field whose text differs from the one rendered
  // (`data-initial`) is parsed; `undefined` means "leave as it is".
  const edited = (input) =>
    !!input &&
    (!input.getAttribute ||
      input.getAttribute('data-initial') === null ||
      input.getAttribute('data-initial') !== input.value);
  return {
    valid: true,
    destination: draft.destination,
    label: draft.label,
    qualifiers: edited(qualifiersInput) ? parseCommaList(qualifiersInput ? qualifiersInput.value : '') : undefined,
    tags: edited(tagsInput) ? parseCommaKvList(tagsInput ? tagsInput.value : '') : undefined
  };
}

/**
 * A relationship of the model as the form's draft `d` (from `readRelationshipDraftFromRow`) leaves it: only what
 * the user changed is written, everything else — a numeric label, qualifiers with commas in them, keys the form
 * does not know — stays as it was. An empty label is written as no `label` key at all (an absent label is not the
 * label `uses`: the kernel draws a natural link without one).
 */
function applyRelationshipDraft(rel, d) {
  const out = rel && typeof rel === 'object' ? copyOwnKeys(rel) : {};
  if (String(out.destination) !== d.destination) out.destination = d.destination;
  const originalLabel = out.label === undefined || out.label === null ? '' : String(out.label).trim();
  if ((d.label === undefined ? '' : d.label) !== originalLabel) {
    if (d.label === undefined) delete out.label;
    else out.label = d.label;
  }
  if (d.qualifiers !== undefined) {
    if (d.qualifiers.length === 0) delete out.qualifiers;
    else out.qualifiers = d.qualifiers;
  }
  if (d.tags !== undefined) {
    if (Object.keys(d.tags).length === 0) delete out.tags;
    else out.tags = d.tags;
  }
  return out;
}

/**
 * Read and validate the whole element edit form (all-or-nothing, same idea
 * as readSettingsDraft): id, name, description and every existing
 * relationship row. Shows each failing field's own error and returns
 * `{ valid: false }`, else `{ valid: true, apply(node) }` — `apply` writes
 * every field and returns `{ renamedTo }` when the id changed (DEC-8).
 */
function readElementDraft(reference, layer) {
  const category = layerOfReference(reference, layer) || 'application';
  const idInput = document.getElementById('edit-id-input');
  const nameInput = document.getElementById('edit-name-input');
  const descriptionInput = document.getElementById('edit-description-input');
  setInlineErrorText('edit-id-error', '');
  const rows = Array.from(document.querySelectorAll('.element-edition-form .relationship-edit-row[data-index]'));
  rows.forEach((row) => setRowInlineErrorText(row, ''));

  let hasError = false;
  const idResult = validateElementIdRename(idInput ? idInput.value : '', reference, category);
  if (!idResult.valid) {
    setInlineErrorText('edit-id-error', idResult.error);
    hasError = true;
  }

  const relationshipDrafts = new Map();
  for (const row of rows) {
    const draft = readRelationshipDraftFromRow(row);
    if (!draft.valid) {
      setRowInlineErrorText(row, draft.error);
      hasError = true;
      continue;
    }
    relationshipDrafts.set(parseInt(row.getAttribute('data-index'), 10), draft);
  }
  if (hasError) return { valid: false };

  const name = normalizeOptionalText(nameInput ? nameInput.value : '');
  const description = normalizeOptionalText(descriptionInput ? descriptionInput.value : '');
  const current = findElementRecord(reference, category);
  return {
    valid: true,
    renamed: current && String(current.id) !== idResult.newId ? { from: reference, to: idResult.newReference } : null, // what `commitElementWithDraft` asks about before it writes (run 0113)
    apply(node) {
      const oldId = node.id;
      if (String(oldId) !== idResult.newId) node.id = idResult.newId;
      // name and description: absent when empty, and untouched (type included) when the text is the one rendered
      if (name === null) delete node.name;
      else if (node.name === undefined || node.name === null || String(node.name) !== name) node.name = name;
      if (description === null) delete node.description;
      else if (node.description === undefined || node.description === null || String(node.description) !== description)
        node.description = description;
      if (relationshipDrafts.size > 0 && Array.isArray(node.relationships)) {
        node.relationships = node.relationships.map((rel, i) => {
          const d = relationshipDrafts.get(i);
          return d ? applyRelationshipDraft(rel, d) : rel;
        });
      }
      return String(oldId) !== idResult.newId
        ? { renamedTo: { from: reference, to: idResult.newReference } }
        : undefined;
    }
  };
}

/**
 * Commit the whole form's pending edits plus (optionally) one structural
 * change — an add/remove of a qualifier, tag, application or relationship —
 * as a single edit, so the re-render that follows never throws away what the
 * user typed elsewhere in the form. Returns false when the form is invalid.
 */
function commitElementWithDraft(reference, structuralFn) {
  const layer = layerOfReference(reference) || undefined;
  const draft = readElementDraft(reference, layer);
  if (!draft.valid) return false;
  // wave 016 (run 0113, #116): a rename rewrites the views and the stories everywhere, and a plateau beside the one drawn may still declare the old reference. The author is told
  // first, in a dialog, which plateaus and which views and steps; the write waits for the answer, and is the same write as without the dialog.
  const impact = draft.renamed
    ? renameSiblingImpact(draft.renamed.from, draft.renamed.to, layerOfReference(reference) || 'application')
    : null;
  if (impact) {
    openAppDialog({
      kind: 'rename-siblings',
      reference,
      impact,
      plateau: impact.plateau,
      onConfirm: () => {
        writeElementDraft(reference, layer, draft, structuralFn);
      }
    });
    return false; // "Save all changes" waits, as for the dialog of the plateaus a write changes
  }
  return writeElementDraft(reference, layer, draft, structuralFn);
}

/** The write of `commitElementWithDraft`, once the draft is read and the author has said yes to whatever was asked. Returns false when it did not write (a refusal, or a dialog is open). */
function writeElementDraft(reference, layer, draft, structuralFn) {
  // a refused write, or an error, redraws the form from the model (`guardedLayerWrite` first, then the sentence in the top bar): the fields as typed are kept before it and put back by that redraw (wave 018, run 0130, #129)
  const typedForm = keepElementForm();
  try {
    // a rename rewrites the references to the element, in the model and in the UI state, inside the commit (DEC-8)
    const written = commitElementEdit(
      reference,
      (node) => {
        const renamed = draft.apply(node);
        if (structuralFn) structuralFn(node);
        return renamed;
      },
      layer
    );
    if (written && written.pending) return false; // wave 014 (run 0082): the author is asked first (the plateaus it changes); nothing is applied yet, and "Save all changes" waits
  } catch (e) {
    saveStatus = { state: 'error', failedFile: reference, message: e && e.message ? e.message : String(e) };
    keptElementForm = typedForm; // `render()` puts it back and drops it (no dialog is open): view state, no `modelsChanged()`
    requestRedraw();
    return false;
  }
  return true;
}

/** One relationship sub-form row — used both for an existing relationship and the blank "add new" one. */
function renderRelationshipEditRowHtml(reference, rel, index) {
  const refAttr = escapeHtml(reference);
  const isNew = index === null;
  const destination = rel ? rel.destination : '';
  // the label as written in the manifest, not the display fallback: an unlabeled relationship stays unlabeled when saved
  const label = rel && rel.rawLabel !== undefined && rel.rawLabel !== null ? String(rel.rawLabel) : '';
  const labelPlaceholder =
    'label' +
    (AppState.workspace ? ' (default: ' + AppState.workspace.settings.relationships.defaultSyntheticLabel + ')' : '');
  const qualifiersText = rel ? formatCommaList(rel.qualifiers) : '';
  const tagsText = rel ? formatCommaKvList(rel.tags) : '';
  // data-initial: the text as rendered, so that a field the user did not touch is not parsed (and corrupted) on save
  let html =
    '<div class="relationship-edit-row' +
    (isNew ? ' relationship-edit-row-new' : '') +
    '"' +
    (isNew ? '' : ' data-index="' + index + '"') +
    '>';
  html +=
    '<input type="text" class="rel-destination-input" placeholder="destination" aria-label="Relationship destination" list="archicode-all-references" value="' +
    escapeHtml(destination) +
    '">';
  html +=
    '<input type="text" class="rel-label-input" placeholder="' +
    escapeHtml(labelPlaceholder) +
    '" aria-label="Relationship label" value="' +
    escapeHtml(label) +
    '">';
  html +=
    '<input type="text" class="rel-qualifiers-input" placeholder="qualifiers (comma-separated)" aria-label="Relationship qualifiers, comma-separated"' +
    (isNew ? '' : ' data-initial="' + escapeHtml(qualifiersText) + '"') +
    ' value="' +
    escapeHtml(qualifiersText) +
    '">';
  html +=
    '<input type="text" class="rel-tags-input" placeholder="tags (k=v, comma-separated)" aria-label="Relationship tags, comma-separated key=value pairs"' +
    (isNew ? '' : ' data-initial="' + escapeHtml(tagsText) + '"') +
    ' value="' +
    escapeHtml(tagsText) +
    '">';
  if (isNew) {
    html += '<button type="button" data-action="add-relationship" data-ref="' + refAttr + '">Add</button>';
  } else {
    html +=
      '<button type="button" data-action="remove-relationship" data-ref="' +
      refAttr +
      '" data-index="' +
      index +
      '">Remove</button>';
  }
  html += '<span class="inline-error"></span>';
  html += '</div>';
  return html;
}

/**
 * The edit-mode sibling of `renderElementViewHtml` (DEC-1/DEC-2): one
 * shared template covering every kind's id/name/description/qualifiers/
 * tags/relationships, plus a `node`-only `applications` block (DEC-2a).
 * "Save all changes" commits the whole form (id/name/description and every
 * relationship row — readElementDraft). Each add/remove control commits
 * immediately (DEC-5) but applies that draft first, so nothing typed
 * elsewhere in the form is lost to the re-render.
 */
function renderElementEditionFormHtml(reference) {
  const record = findElementRecord(reference);
  if (!record) return '<div class="center-placeholder">Element not found: ' + escapeHtml(reference) + '</div>';

  const refAttr = escapeHtml(reference);
  let html = '<div class="element-edition-form">';

  html += renderElementHeaderHtml(
    '<h2>' +
      escapeHtml(record.name || record.id) +
      '</h2><span class="element-kind-badge">' +
      escapeHtml(record.kind) +
      '</span>',
    // Same order as every header: destructive first, primary last.
    // TDD-0010 DEC-4: Delete is always present — even a leaf can be the
    // destination of a relationship elsewhere.
    '<button type="button" class="btn-danger" data-action="request-delete-element" data-ref="' +
      refAttr +
      '">Delete</button>' +
      (moveIsPossible(reference, record.layer)
        ? '<button type="button" data-action="open-move-dialog" data-ref="' +
          refAttr +
          '" title="Put this element, and everything inside it, under another parent. The references to it follow.">Move</button>'
        : '') +
      (childKindOptionsFor(record).length > 0
        ? '<button type="button" data-action="open-create-child-form" data-ref="' + refAttr + '">Add child</button>'
        : '') +
      '<button type="button" data-action="toggle-element-edit">Back to view</button>'
  );

  // TDD-0010 DEC-4: a pending delete confirmation for this exact element
  // overlays the already-rendering edition view below — it never changes
  // AppState.selection (mirrors TDD-0009's rawYamlEditDraft pattern).
  if (pendingDeleteConfirmation && pendingDeleteConfirmation.reference === reference) {
    const affected = pendingDeleteConfirmation.affected;
    const deletedReferences = pendingDeleteConfirmation.deletedReferences || [];
    const deletedFiles = pendingDeleteConfirmation.files || [];
    html += '<div class="edition-section delete-confirmation">';
    html += '<h3>Confirm delete</h3>';
    if (pendingDeleteConfirmation.removal) {
      const removal = pendingDeleteConfirmation.removal;
      html +=
        '<p class="delete-removal">This adds a <code>REMOVE</code> patch to the plateau <code>' +
        escapeHtml(removal.plateau) +
        '</code>. The element stays in <code>' +
        escapeHtml(removal.declaredIn) +
        '</code> and in the plateaus that do not remove it; here the kernel takes it out, with what is inside it and the links towards it.</p>';
    }
    // the whole subtree goes: what is nested in the element, and the manifests attached below it
    if (deletedReferences.length > 1) {
      html +=
        '<p>This also deletes ' +
        (deletedReferences.length - 1) +
        ' element' +
        (deletedReferences.length === 2 ? '' : 's') +
        ' inside it:</p>' +
        '<ul class="relationship-list">' +
        deletedReferences
          .filter((ref) => ref !== reference)
          .map((ref) => '<li>' + escapeHtml(ref) + '</li>')
          .join('') +
        '</ul>';
    }
    if (deletedFiles.length > 0) {
      html +=
        '<p>' +
        (deletedFiles.length === 1
          ? 'This manifest file is removed'
          : 'These ' + deletedFiles.length + ' manifest files are removed') +
        ' when you save:</p>' +
        '<ul class="relationship-list">' +
        deletedFiles.map((p) => '<li>' + escapeHtml(p) + '</li>').join('') +
        '</ul>';
    }
    if (affected.length === 0) {
      html += '<p class="muted">No other relationship is affected.</p>';
    } else {
      html +=
        '<p>These links elsewhere point at what is deleted, and are removed with it:</p><ul class="relationship-list">';
      for (const a of affected) {
        html +=
          '<li>' +
          escapeHtml(a.ownerSourceFile) +
          ' (' +
          escapeHtml(a.ownerReference) +
          '): ' +
          escapeHtml(a.label) +
          ' &rarr; ' +
          escapeHtml(a.destination) +
          '</li>';
      }
      html += '</ul>';
    }
    html +=
      '<button type="button" data-action="cancel-delete-element">Cancel</button> ' +
      '<button type="button" class="btn-danger-solid" data-action="confirm-delete-element">Confirm delete</button>';
    html += '</div>';
  }

  // id / name / description — committed together with the rest of the form by "Save all changes" (see readElementDraft).
  html += '<div class="edition-section">';
  html +=
    '<div class="field-row"><label class="field-label" for="edit-id-input">Id</label><span class="field-value">' +
    '<input type="text" id="edit-id-input" value="' +
    escapeHtml(record.id) +
    '">' +
    '<span class="inline-error" id="edit-id-error"></span>' +
    '</span></div>';
  html +=
    '<div class="field-row"><label class="field-label" for="edit-name-input">Name</label><span class="field-value">' +
    '<input type="text" id="edit-name-input" value="' +
    escapeHtml(record.name !== null && record.name !== undefined ? record.name : '') +
    '">' +
    '</span></div>';
  html +=
    '<div class="field-row"><label class="field-label" for="edit-description-input">Description</label><span class="field-value">' +
    '<textarea id="edit-description-input" class="auto-grow-textarea">' +
    escapeHtml(record.description !== null && record.description !== undefined ? record.description : '') +
    '</textarea>' +
    '</span></div>';
  html += '</div>';

  // qualifiers
  html += '<div class="edition-section"><h3>Qualifiers</h3>';
  if (record.qualifiers && record.qualifiers.length) {
    html += record.qualifiers
      .map(
        (q, i) =>
          '<span class="pill">' +
          escapeHtml(q) +
          ' <button type="button" class="pill-remove" data-action="remove-qualifier" data-ref="' +
          refAttr +
          '" data-index="' +
          i +
          '">&times;</button>' +
          '</span>'
      )
      .join('');
  }
  html +=
    '<div class="edition-add-row">' +
    '<input type="text" id="add-qualifier-input" placeholder="new qualifier" aria-label="New qualifier">' +
    '<button type="button" data-action="add-qualifier" data-ref="' +
    refAttr +
    '">Add</button>' +
    '<span class="inline-error" id="add-qualifier-error"></span>' +
    '</div>';
  html += '</div>';

  // tags
  html += '<div class="edition-section"><h3>Tags</h3>';
  const tagKeys = record.tags ? yamlKeysOf(record.tags) : [];
  if (tagKeys.length) {
    html +=
      '<ul class="tag-list">' +
      tagKeys
        .map(
          (k) =>
            '<li><span class="tag-key">' +
            escapeHtml(k) +
            '</span>: <span class="tag-value">' +
            escapeHtml(String(record.tags[k])) +
            '</span> ' +
            '<button type="button" class="pill-remove" data-action="remove-tag" data-ref="' +
            refAttr +
            '" data-key="' +
            escapeHtml(k) +
            '">&times;</button></li>'
        )
        .join('') +
      '</ul>';
  }
  html +=
    '<div class="edition-add-row">' +
    '<input type="text" id="add-tag-key-input" placeholder="key" aria-label="New tag key">' +
    '<input type="text" id="add-tag-value-input" placeholder="value" aria-label="New tag value">' +
    '<button type="button" data-action="add-tag" data-ref="' +
    refAttr +
    '">Add</button>' +
    '<span class="inline-error" id="add-tag-error"></span>' +
    '</div>';
  html += '</div>';

  // relationships
  html += '<div class="edition-section"><h3>Relationships</h3>';
  if (record.relationships && record.relationships.length) {
    for (const rel of record.relationships) {
      html += renderRelationshipEditRowHtml(reference, rel, rel.fileIndex); // the place in the file, not in the list drawn: an item with no value is not in the record (#105)
    }
  }
  html += renderRelationshipEditRowHtml(reference, null, null);
  html += '</div>';

  // replaces (wave 009): the elements of the other plateau this one is the new place of
  if (replacesSectionShown(record)) html += renderReplacesEditionHtml(record, refAttr);

  // applications (node only — DEC-2a)
  if (record.kind === 'node') {
    html += '<div class="edition-section"><h3>Applications</h3>';
    if (record.applications && record.applications.length) {
      html += record.applications
        .map(
          (a, i) =>
            '<span class="pill">' +
            escapeHtml(a) +
            ' <button type="button" class="pill-remove" data-action="remove-application" data-ref="' +
            refAttr +
            '" data-index="' +
            i +
            '">&times;</button>' +
            '</span>'
        )
        .join('');
    }
    html +=
      '<div class="edition-add-row">' +
      '<input type="text" id="add-application-input" placeholder="new application" aria-label="New application reference" list="archicode-application-references">' +
      '<button type="button" data-action="add-application" data-ref="' +
      refAttr +
      '">Add</button>' +
      '<span class="inline-error" id="add-application-error"></span>' +
      '</div>';
    html += '</div>';
  }

  // uses (environment only): where the dependencies of the applications deployed in the environment are looked for
  if (record.kind === 'environment') {
    html += '<div class="edition-section"><h3>Uses</h3>';
    if (record.uses && record.uses.length) {
      html += record.uses
        .map(
          (u, i) =>
            '<span class="pill">' +
            escapeHtml(u) +
            ' <button type="button" class="pill-remove" data-action="remove-use" data-ref="' +
            refAttr +
            '" data-index="' +
            i +
            '">&times;</button>' +
            '</span>'
        )
        .join('');
    }
    html +=
      '<div class="edition-add-row">' +
      '<input type="text" id="add-use-input" placeholder="environment or node used" aria-label="Environment or node used" list="archicode-technology-references">' +
      '<button type="button" data-action="add-use" data-ref="' +
      refAttr +
      '">Add</button>' +
      '<span class="inline-error" id="add-use-error"></span>' +
      '</div>';
    html += '</div>';
  }

  html += '</div>'; // .element-edition-form
  return html;
}

// ---- `replaces` by hand (wave 009) ----

/** The Replaces section is offered when there is a plateau to replace elements of (the workspace writes plateaus), or the element already says something: a workspace without plateaus has a form as it always had. */
function replacesSectionShown(record) {
  return (
    !!(AppState.plateauTree && AppState.plateauTree.layered) ||
    (Array.isArray(record.replaces) && record.replaces.length > 0)
  );
}

/**
 * What the plateau compared with thinks of a reference written in `replaces`, for the element `record`: '' when it is an element of that plateau, else the reason it
 * will be ignored or is not checked. An unknown reference is allowed (the author may have compared with another baseline), but it is flagged, as the kernel warns about it.
 */
function replacesFlagOf(record, reference) {
  const layer = record.layer || 'application';
  if (AppState.index[layer].has(String(reference))) return 'still in this plateau: ignored';
  if (!AppState.baseline || layerCompareIsFuture()) return ''; // with the future the plateau compared with is the one that comes after: it names no element this one replaces
  return AppState.baseline.index[layer].has(String(reference))
    ? ''
    : 'not in “' + plateauTitle(AppState.baseline.plateau) + '”';
}

/** The Replaces section of the edit form: the list, each with its flag and a remove button, and a field to add one. */
function renderReplacesEditionHtml(record, refAttr) {
  const replaces = Array.isArray(record.replaces) ? record.replaces : [];
  let html =
    '<div class="edition-section" data-section="replaces"><h3>Replaces</h3>' +
    '<p class="muted">The elements of the plateau this one is compared with that this element is the new place of (moved, renamed, split or merged). Written by you, never guessed.</p>';
  html += replaces
    .map((entry, i) => {
      const flag = replacesFlagOf(record, entry);
      return (
        '<span class="pill">' +
        escapeHtml(entry) +
        (flag ? '<span class="replaces-flag">' + escapeHtml(flag) + '</span>' : '') +
        ' <button type="button" class="pill-remove" data-action="remove-replaces" data-ref="' +
        refAttr +
        '" data-index="' +
        i +
        '">&times;</button></span>'
      );
    })
    .join('');
  html +=
    '<div class="edition-add-row">' +
    '<input type="text" id="add-replaces-input" placeholder="reference of the element it replaces" aria-label="Reference of the element this one replaces"' +
    (AppState.baseline ? ' list="archicode-baseline-references"' : '') +
    '>' +
    '<button type="button" data-action="add-replaces" data-ref="' +
    refAttr +
    '">Add</button>' +
    '<span class="inline-error" id="add-replaces-error"></span></div></div>';
  return html;
}

/** A reference to add to `replaces` of `record`: not empty, not the element itself, not already listed. Unknown to the other plateau is allowed (it is flagged afterwards). */
function validateNewReplaces(record, value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed === '') return { valid: false, error: 'Value is required.' };
  if (/\s/.test(trimmed)) return { valid: false, error: 'A reference has no spaces.' };
  if (trimmed === record.reference) return { valid: false, error: 'An element cannot replace itself.' };
  if ((record.replaces || []).some((entry) => String(entry) === trimmed))
    return { valid: false, error: '“' + trimmed + '” is already listed.' };
  return { valid: true, value: trimmed };
}

/**
 * The create form (TDD-0010 DEC-1/DEC-2) — one shared template for both
 * `createMode`s. `sel` is `AppState.selection` itself (`{kind:'create',
 * createMode, category, parentReference}`); the kind `<select>`'s own
 * options come from `childKindOptionsFor` (child mode) or the fixed
 * per-category `TOP_LEVEL_KIND_OPTIONS` list (top-level mode). The
 * "attach under" input only appears in top-level mode (FR-4).
 */
function renderCreateElementFormHtml(sel) {
  let kindOptions;
  if (sel.createMode === 'child') {
    const parentRecord = findElementRecord(sel.parentReference);
    kindOptions = parentRecord ? childKindOptionsFor(parentRecord) : [];
  } else {
    kindOptions = TOP_LEVEL_KIND_OPTIONS[sel.category] || [];
  }

  let html = '<div class="create-element-form">';
  html += '<h2>' + (sel.createMode === 'child' ? 'Add child element' : 'Add top-level element') + '</h2>';
  if (sel.createMode === 'child') {
    html +=
      '<div class="field-row"><span class="field-label">Parent</span><span class="field-value">' +
      escapeHtml(sel.parentReference) +
      '</span></div>';
  }
  html +=
    '<div class="field-row"><label class="field-label" for="create-kind-select">Kind</label><span class="field-value">' +
    '<select id="create-kind-select">' +
    kindOptions.map((k) => '<option value="' + escapeHtml(k) + '">' + escapeHtml(k) + '</option>').join('') +
    '</select>' +
    '</span></div>';
  html +=
    '<div class="field-row"><label class="field-label" for="create-id-input">Id</label><span class="field-value">' +
    '<input type="text" id="create-id-input">' +
    '<span class="inline-error" id="create-id-error"></span>' +
    '</span></div>';
  html +=
    '<div class="field-row"><label class="field-label" for="create-name-input">Name</label><span class="field-value">' +
    '<input type="text" id="create-name-input">' +
    '</span></div>';
  html +=
    '<div class="field-row"><label class="field-label" for="create-description-input">Description</label><span class="field-value">' +
    '<textarea id="create-description-input" class="auto-grow-textarea"></textarea>' +
    '</span></div>';
  if (sel.createMode === 'top-level') {
    html +=
      '<div class="field-row"><label class="field-label" for="create-attach-under-input">Attach under</label><span class="field-value">' +
      '<input type="text" id="create-attach-under-input" placeholder="(optional) existing element reference" list="archicode-all-references">' +
      '<span class="inline-error" id="create-attach-under-error"></span>' +
      '</span></div>';
  }
  html +=
    '<div class="field-row"><span class="field-label"></span><span class="field-value">' +
    '<button type="button" data-action="' +
    (sel.createMode === 'child' ? 'submit-create-child' : 'submit-create-top-level') +
    '">Create</button> ' +
    '<button type="button" data-action="cancel-create">Cancel</button>' +
    '<span class="inline-error" id="create-form-error"></span>' +
    '</span></div>';
  html += '</div>';
  return html;
}

/**
 * `<datalist>`s backing the reference-typing inputs above (UX review
 * follow-up): one over every known reference (application + technology),
 * used by "Attach under" and a relationship's "destination"; one over
 * application references only, used by a node's "applications" field,
 * since that field only ever points at application elements.
 */
function renderReferenceDatalistsHtml() {
  const appRefs = Array.from(AppState.index.application.keys());
  const techRefs = Array.from(AppState.index.technology.keys());
  const optionsHtml = (refs) => refs.map((r) => '<option value="' + escapeHtml(r) + '">').join('');
  // wave 009: what `replaces` can name is in the plateau compared with (only offered while one is read; an unknown reference can be typed all the same)
  const baseline = AppState.baseline
    ? Array.from(AppState.baseline.index.application.keys()).concat(
        Array.from(AppState.baseline.index.technology.keys())
      )
    : null;
  return (
    '<datalist id="archicode-all-references">' +
    optionsHtml(appRefs.concat(techRefs)) +
    '</datalist>' +
    '<datalist id="archicode-application-references">' +
    optionsHtml(appRefs) +
    '</datalist>' +
    '<datalist id="archicode-technology-references">' +
    optionsHtml(techRefs) +
    '</datalist>' +
    (baseline ? '<datalist id="archicode-baseline-references">' + optionsHtml(baseline) + '</datalist>' : '')
  );
}

/** The Elements perspective's center — element view/edit or the create form; everything else (notably a 'file' selection, which belongs to the Files perspective) falls back to the same placeholder as "nothing selected". */
function renderCenterPanelHtml() {
  const sel = elementSelection();
  if (sel.kind === 'create') return renderCreateElementFormHtml(sel);
  if (sel.kind === 'element') {
    // an element is edited on its Details: Back to view must not land on a diagram the user left long ago
    if (sel.mode === 'edit') {
      elementTab = 'details';
      return renderElementEditionFormHtml(sel.key);
    }
    return diagramTabShown() ? renderElementDiagramHtml(findElementRecord(sel.key)) : renderElementViewHtml(sel.key);
  }
  return '<div class="center-placeholder">Select an item on the left, or use "+ Add" above the Applications/Environments tree to create your first element.</div>';
}
