/** The facet of the settings the diagram is drawn through, or null (also when the named facet no longer exists). */
function currentDiagramFacet() {
  if (!diagramFacet) return null;
  return AppState.workspace.settings.facets.customs.find((facet) => facet.name === diagramFacet) || null;
}

/** The viewpoint actually drawn for an element: 'detailed' only makes sense for an element that can contain others. */
function leafSafeViewpoint(viewpoint, record) {
  return viewpoint === 'detailed' && LEAF_KINDS.includes(record.kind) ? 'overview' : viewpoint;
}

/** The viewpoint actually shown by the tabs of Elements. */
function effectiveDiagramViewpoint(record) {
  return leafSafeViewpoint(elementTab, record);
}

/** A diagram of the selected element is what the Elements perspective shows now (not its page, not a form). */
function diagramTabShown() {
  const sel = elementSelection();
  return (
    currentPerspective === 'elements' &&
    sel.kind === 'element' &&
    sel.mode !== 'edit' &&
    elementTab !== 'details' &&
    !!findElementRecord(sel.key)
  );
}

/** Whether a diagram (of an element, or the map) is on screen. */
function anyDiagramShown() {
  return diagramTabShown() || mapIsShown();
}

/** Whether the page of a view in the Library is drawing its view: the other place a diagram can be, with its own selection and its own Maximize. */
function libraryDiagramShown() {
  return (
    currentPerspective === 'library' &&
    libraryTab === 'views' &&
    !!selectedViewId &&
    !!libraryDiagramRecipe(findSavedView(selectedViewId))
  );
}

/** Hides (or brings back) the panels around the diagram; `panels`: what it hides (the element tree of the Map and Elements). */
function renderMaximizeButtonHtml(panels) {
  // the label says the state, so the button is not also "pressed"; in a narrow header the icon stays and the word goes (the title has it)
  const label = diagramMaximized ? 'Restore' : 'Maximize';
  const what = panels || 'the element tree';
  return (
    '<button type="button" class="maximize-button with-icon" data-action="toggle-maximize" aria-label="' +
    label +
    '" title="' +
    (diagramMaximized ? 'Bring back ' + what + ' (Esc)' : 'Hide ' + what + ' to give the diagram all the room (M)') +
    '">' +
    controlIconHtml(
      diagramMaximized ? 'M6 3v3H3M10 3v3h3M6 13v-3H3M10 13v-3h3' : 'M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3'
    ) +
    '<span class="control-label">' +
    label +
    '</span></button>'
  );
}

/** A 16px outline icon of a header control (decorative: the control has its own label). */
function controlIconHtml(path) {
  return (
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="' +
    path +
    '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  );
}

/** The icons of the header controls that lose their words in a narrow header. */
const CONTROL_ICON_PATHS = {
  map: 'M8 14.2s4.3-3.7 4.3-7.2a4.3 4.3 0 0 0-8.6 0c0 3.5 4.3 7.2 4.3 7.2zM8 8.3a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z',
  elements: 'M2.5 3.5h11v9h-11zM5 8h5.5M8.5 5.8 10.7 8l-2.2 2.2',
  nameView: 'M2.5 2.5h5.2l6 6-5.2 5.2-6-6zM5.2 5.2h.01',
  addToStory: 'M2.5 4h7M2.5 8h4.5M2.5 12h4.5M11.5 8.5v5M9 11h5'
};

/**
 * The header of a diagram (Elements on a diagram tab, the Map). What is rarely used (`rare`: the way to the other
 * perspective, Story, Download) sits in `.header-overflow`, which is part of the row in a wide header and the menu of
 * the "⋯" button in a narrow one (see the container queries of the stylesheet). The same buttons in both cases: they
 * are in the page once, so their data-actions, the download state and the focus need no second copy to keep in step.
 * Facet and Maximize stay in the row at every width.
 */
function renderDiagramHeaderActionsHtml(openerHtml) {
  return (
    renderFacetSelectHtml() +
    '<span class="header-more">' +
    '<button type="button" class="header-more-button" data-action="toggle-header-menu" aria-haspopup="true" aria-expanded="' +
    headerMenuOpen +
    '" aria-controls="header-overflow" aria-label="More actions" title="More actions: ' +
    (openerHtml ? 'the other perspective, ' : '') +
    'story, download">' +
    '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="3" cy="8" r="1.6" fill="currentColor"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="13" cy="8" r="1.6" fill="currentColor"/></svg></button>' +
    '<div class="header-overflow" id="header-overflow" role="group" aria-label="More actions" data-open="' +
    headerMenuOpen +
    '">' +
    openerHtml +
    renderStoryButtonsHtml() +
    renderDiagramDownloadHtml() +
    '</div>' +
    '</span>' +
    renderMaximizeButtonHtml()
  );
}

/**
 * Opens or closes the "⋯" menu of a diagram header WITHOUT render(), for the reason `setHelpOpen` gives: a redraw would
 * lose whatever was typed and not committed. Only aria-expanded and data-open change. `focusMenu`: the focus goes to the
 * first control of the menu (opened from the keyboard); `focusButton`: it goes back to the "⋯" button (closed from the
 * keyboard, or because an item of the menu was used: the dialog an item opens then gives the focus back to the button,
 * which is on screen, rather than to an item that is hidden again).
 */
function setHeaderMenuOpen(open, options = {}) {
  headerMenuOpen = open;
  const button = document.querySelector('.header-more-button');
  if (button && button.setAttribute) button.setAttribute('aria-expanded', String(open));
  const menu = document.querySelector('.header-overflow');
  if (menu && menu.setAttribute) menu.setAttribute('data-open', String(open));
  if (open && options.focusMenu) {
    const first = document.querySelector('.header-overflow button:not(:disabled)');
    if (first && first.focus) first.focus();
  } else if (!open && options.focusButton && button && button.focus) {
    button.focus();
  }
}

/**
 * Escape closes the menu of the header, and only that (not the maximized diagram): registered in capture, like the help's.
 * The state can be left over when the panel grew wide again (the "⋯" button is then not drawn, the menu is the inline row):
 * the key is then not the menu's, and the leftover is cleared.
 */
function handleHeaderMenuKeydown(e) {
  if (!headerMenuOpen || e.key !== 'Escape') return;
  const button = document.querySelector('.header-more-button');
  if (button && button.getClientRects && button.getClientRects().length === 0) {
    headerMenuOpen = false;
    return;
  }
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  else if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  setHeaderMenuOpen(false, { focusButton: true });
}
document.addEventListener('keydown', handleHeaderMenuKeydown, true);

/**
 * Gives the focus to a control of the page. One that is not drawn (an item of the "⋯" menu while the menu is closed or
 * the header is wide again) gives it to the "⋯" button instead, when there is one, so that it is not lost.
 */
function focusControl(control) {
  let target = control;
  if (control.getClientRects && control.getClientRects().length === 0 && control.closest) {
    const more = control.closest('.header-more');
    const button = more && more.querySelector ? more.querySelector('.header-more-button') : null;
    if (button && button.getClientRects && button.getClientRects().length > 0) target = button;
  }
  target.focus({ preventScroll: true });
}

function toggleDiagramMaximized() {
  diagramMaximized = !diagramMaximized;
  requestRedraw();
  const canvas = document.getElementById('diagram-canvas');
  if (canvas) canvas.focus({ preventScroll: true }); // so that Esc (or M) keeps working
}

/**
 * The left of the header of an element, the same on every tab: its name, its kind and the tabs. What changes from a tab
 * to the other (Edit, the facet, Maximize...) is on the right, so the tabs do not move when switching.
 */
function renderElementTitleHtml(record) {
  return (
    '<h2>' +
    escapeHtml(record.name || record.id) +
    '</h2><span class="element-kind-badge">' +
    escapeHtml(record.kind) +
    '</span>' +
    renderHeaderBadgesHtml(record) +
    renderElementTabsHtml(record)
  );
}

/**
 * The styled stereotypes of the element, as in the tree and the panel, after its kind (nothing when it has none). The group
 * is named, since the badges are read one after the other; the same markup as everywhere, so a style cannot be told twice.
 */
function renderHeaderBadgesHtml(record) {
  const badges = stereotypeBadgesHtml(stereotypesOfRecord(record));
  return badges
    ? '<span class="element-header-badges" role="group" aria-label="Stereotypes">' + badges + '</span>'
    : '';
}

/**
 * Details, then the three diagrams of the element — Overview | Detailed | Deep — as one group of joined buttons: they are
 * three ways to look at the same thing, where Details is the page of the element.
 */
function renderElementTabsHtml(record) {
  const current = elementTab === 'details' ? 'details' : effectiveDiagramViewpoint(record);
  const tab = (id) => {
    const disabled = id === 'detailed' && LEAF_KINDS.includes(record.kind);
    return (
      '<button type="button" data-action="set-element-tab" data-tab="' +
      id +
      '" aria-pressed="' +
      (id === current) +
      '"' +
      (disabled ? ' disabled' : '') +
      ' title="' +
      escapeHtml(disabled ? 'Only available for an element that can contain others.' : ELEMENT_TABS[id].title) +
      '">' +
      escapeHtml(ELEMENT_TABS[id].label) +
      '</button>'
    );
  };
  return (
    '<span class="viewpoint-switch" role="group" aria-label="View of this element">' +
    tab('details') +
    '<span class="button-group" role="group" aria-label="Diagram of this element">' +
    ['overview', 'detailed', 'deep'].map(tab).join('') +
    '</span>' +
    '</span>'
  );
}

/** The facet picker of the header; absent when the workspace defines no facet. */
function renderFacetSelectHtml() {
  const facets = AppState.workspace.settings.facets.customs;
  if (!facets.length) return '';
  let html =
    '<select id="diagram-facet-select" aria-label="Facet" title="Draw the diagram as the CLI generates it for a facet: the relationships the facet removes are left out.">' +
    '<option value="">Facet: none</option>';
  for (const facet of facets) {
    html +=
      '<option value="' +
      escapeHtml(facet.name) +
      '"' +
      (facet.name === diagramFacet ? ' selected' : '') +
      '>' +
      escapeHtml(facet.name) +
      '</option>';
  }
  return html + '</select>';
}

function diagramTruncate(text, max) {
  // by code points: a cut between the two halves of a surrogate pair would leave a character that is not valid XML in the SVG
  const chars = Array.from(String(text));
  return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : chars.join('');
}

function diagramTextWidth(text, px) {
  return Math.ceil(String(text).length * px * 0.6);
}

/** A link's caption: its label, then its qualifiers in brackets (as PlantUML shows them). */
function diagramLinkText(link) {
  const parts = [];
  if (link.label && link.label.trim()) parts.push(link.label);
  const qualifiers = Array.from(link.qualifiers || []);
  if (qualifiers.length) parts.push('[' + qualifiers.join(', ') + ']');
  return parts.join(' ');
}

/**
 * The options of a Columns list (wave 027, run 0202, DEC-4): "Default (n)" or "Default (none)" first, then the usual choices, and the value in force
 * when the list does not offer it (a 7 from a view, as an extra entry in its place); `invalid` is the entry of a `layout` the editor cannot read.
 * `selected` is the choice (null: the Default), `inherited` the value the lower levels give.
 */
function columnsOptionsHtml(selected, inherited, invalid) {
  const option = (value, label, on) =>
    '<option value="' + value + '"' + (on ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
  const choices = DIAGRAM_COLUMNS_CHOICES.slice();
  if (selected !== null && !choices.includes(selected)) choices.push(selected);
  choices.sort((a, b) => a - b);
  return (
    option('', 'Default (' + (inherited === null ? 'none' : inherited) + ')', selected === null && !invalid) +
    (invalid ? option('invalid', 'invalid', true) : '') +
    choices.map((n) => option(String(n), String(n), n === selected && !invalid)).join('')
  );
}

/** The list of the toolbar of a diagram: it chooses the boxes per row of the diagram on screen, or of the view on its page. */
function renderColumnsToolHtml(record, host) {
  const viewpoint = host ? host.viewpoint : record ? effectiveDiagramViewpoint(record) : 'map';
  const selected = host ? ownColumnsOf(host.view) : diagramColumns;
  return (
    '<span class="button-group diagram-columns" role="group" aria-label="Boxes per row">' +
    '<label for="diagram-columns" title="The number of boxes the layout aims at in a row">Columns</label>' +
    '<select id="diagram-columns" data-action="set-columns">' +
    columnsOptionsHtml(selected, workspaceColumnsOf(viewpoint), false) +
    '</select></span>'
  );
}
