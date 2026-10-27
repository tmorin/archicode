/**
 * Over a diagram that belongs to a story: where we are in it, the way to the other steps, and the words of the step
 * (read, or typed when "Edit text" is on). A step that cannot be drawn says why here, and the way on stays open.
 */
function renderStoryBarHtml() {
  const story = activeStory ? findStory(activeStory.id) : null;
  const steps = story ? storySteps(story) : [];
  if (!story || activeStory.step < 0 || activeStory.step >= steps.length) return '';
  const n = activeStory.step;
  const view = stepView(steps[n]);
  const problem = stepProblem(steps[n], undefined, n + 1);
  const here = !!view && !problem && viewMatchesScreen(view) && stepPlateausMatchScreen(steps[n]);
  const text = steps[n].text || '';
  const words = storyBarEditing
    ? '<textarea class="story-bar-text" rows="2" data-story="' +
      escapeHtml(story.id) +
      '" data-story-field="step-text" data-step="' +
      n +
      '" aria-label="What to say about this step" placeholder="What to say about this diagram…">' +
      escapeHtml(text) +
      '</textarea>'
    : '<p class="story-bar-words' +
      (text ? '' : ' muted') +
      '">' +
      (text ? escapeHtml(text) : 'No words for this step yet.') +
      '</p>';
  return (
    '<div class="story-bar" role="region" aria-label="Story ' +
    escapeHtml(storyLabel(story)) +
    '">' +
    '<div class="story-bar-line">' +
    '<span class="story-bar-title">' +
    escapeHtml(storyLabel(story)) +
    '</span>' +
    '<span class="story-bar-step">Step ' +
    (n + 1) +
    ' of ' +
    steps.length +
    (view ? ' · ' + escapeHtml(viewLabel(view)) : '') +
    '</span>' +
    stepPlateausHtml(steps[n], 'story-bar-plateaus') +
    '<span class="story-bar-actions">' +
    (here || problem
      ? ''
      : '<button type="button" data-action="story-restore" title="Draw this step again, as it was saved">Back to this step</button>') +
    '<button type="button" data-action="story-bar-edit" aria-pressed="' +
    storyBarEditing +
    '" title="Type the words of this step (they are also in Edit story)">' +
    (storyBarEditing ? 'Done' : 'Edit text') +
    '</button>' +
    '<button type="button" data-action="story-edit" title="Reorder the steps, rename the story">Edit story</button>' +
    '<button type="button" data-action="story-exit" title="Leave the story: the diagram stays as it is">Leave story</button>' +
    '</span>' +
    '</div>' +
    (storyBarNotice ? '<div class="story-bar-notice" role="status">' + escapeHtml(storyBarNotice) + '</div>' : '') +
    (problem
      ? '<div class="story-step-problem" role="status">Step ' +
        (n + 1) +
        ' cannot be shown: ' +
        escapeHtml(problem) +
        ' The diagram below is the one before it.</div>'
      : '') +
    words +
    '</div>'
  );
}

/** In the header of a diagram: keep it as a view, or put it in a story. */
function renderStoryButtonsHtml() {
  return (
    '<span class="button-group" role="group" aria-label="Story">' +
    '<button type="button" class="with-icon" data-action="name-view" aria-label="Name view…" title="Keep this diagram as a named view, to put in several stories (kept in memory until Save all changes)">' +
    controlIconHtml(CONTROL_ICON_PATHS.nameView) +
    '<span class="control-label">Name view…</span></button>' +
    '<button type="button" class="with-icon" data-action="add-to-story" aria-label="Add to story…" title="Add this diagram to a story as a step">' +
    controlIconHtml(CONTROL_ICON_PATHS.addToStory) +
    '<span class="control-label">Add to story…</span></button>' +
    '</span>'
  );
}

function renderStoriesNavHtml() {
  const stories = storiesSorted();
  let html =
    '<div class="nav-section">' +
    renderNavHeaderHtml(
      'Stories',
      '<button type="button" class="tree-branch-add-btn" data-action="story-new" title="Create a story" aria-label="New story">+ Add</button>'
    );
  for (const story of stories) {
    const active = story.id === selectedStoryId ? ' active' : '';
    const count = storySteps(story).length;
    const walked = activeStory && activeStory.id === story.id && activeStory.step < count;
    html +=
      '<div class="nav-row story-row' +
      active +
      '" role="button" tabindex="0"' +
      (active ? ' aria-current="true"' : '') +
      ' data-action="select-story" data-story="' +
      escapeHtml(story.id) +
      '">' +
      '<span class="file-relpath">' +
      escapeHtml(storyLabel(story)) +
      '</span>' +
      (entryIsModified(story) ? '<span class="modified-badge" title="Changed, not saved yet">modified</span>' : '') +
      '<span class="story-count">' +
      (walked ? 'step ' + (activeStory.step + 1) + ' of ' + count : count + (count === 1 ? ' step' : ' steps')) +
      '</span></div>';
  }
  if (!stories.length) html += '<div class="tree-empty">No story yet — use "+ Add" above to create one.</div>';
  return html + '</div>';
}

/** The plateaus a step names, as words: *Told at* and *Compared with* (nothing when it names none). `className` is the class of the span. */
function stepPlateausHtml(step, className) {
  const keys = stepPlateauKeys(step);
  if (keys.at === null && keys.against === null) return '';
  const tree = AppState.plateauTree;
  const titled = (id) => (tree && tree.layered && tree.nodes.has(id) ? plateauTitle(layerPlateauModel(id)) : id);
  const parts = [];
  if (keys.at !== null) parts.push('told at ' + escapeHtml(titled(keys.at)));
  if (keys.against !== null) parts.push('compared with ' + escapeHtml(titled(keys.against)));
  return '<span class="' + className + '">' + parts.join(', ') + '</span>';
}

/**
 * The two lists of a step in the story editor: the plateau it is told at (the plateau drawn when none) and the plateau it is compared with (nothing when none). Only in a
 * workspace that has plateaus, or when the step already names one (so that it can be put right). A plateau the workspace does not have is listed, flagged, so that it is not lost.
 */
function renderStepPlateausHtml(story, step, index) {
  const tree = AppState.plateauTree;
  const ids = tree && tree.layered ? tree.ids : [];
  const keys = stepPlateauKeys(step);
  if (!ids.length && keys.at === null && keys.against === null) return '';
  const id = escapeHtml(story.id);
  const select = (key, label, none, value) => {
    const known = value === null || ids.includes(value);
    return (
      '<label class="story-step-plateau">' +
      label +
      ' <select data-story-step-plateau="' +
      key +
      '" data-story="' +
      id +
      '" data-step="' +
      index +
      '" aria-label="' +
      label +
      ' (step ' +
      (index + 1) +
      ')">' +
      '<option value="">' +
      none +
      '</option>' +
      ids
        .map(
          (plateau) =>
            '<option value="' +
            escapeHtml(plateau) +
            '"' +
            (plateau === value ? ' selected' : '') +
            '>' +
            escapeHtml(plateauTitle(layerPlateauModel(plateau))) +
            '</option>'
        )
        .join('') +
      (known
        ? ''
        : '<option value="' + escapeHtml(value) + '" selected>' + escapeHtml(value) + ' (not a plateau)</option>') +
      '</select></label>'
    );
  };
  return (
    '<div class="story-step-plateaus">' +
    select('at', 'Told at', 'The plateau drawn', keys.at) +
    select('against', 'Compared with', 'Nothing', keys.against) +
    '</div>'
  );
}

function renderStoryStepHtml(story, step, index, count) {
  const view = stepView(step);
  const problem = stepProblem(step, undefined, index + 1);
  const id = escapeHtml(story.id);
  const current = !!activeStory && activeStory.id === story.id && activeStory.step === index;
  const button = (action, label, extra) =>
    '<button type="button" data-action="' +
    action +
    '" data-story="' +
    id +
    '" data-step="' +
    index +
    '"' +
    (extra || '') +
    '>' +
    label +
    '</button>';
  const missingNamed = !!step.view && !findSavedView(step.view);
  const others = missingNamed ? savedViews() : [];
  return (
    '<li class="story-step' +
    (problem ? ' broken' : '') +
    (current ? ' current' : '') +
    '"' +
    (current ? ' aria-current="step"' : '') +
    '>' +
    '<div class="story-step-head">' +
    (view && step.view && !problem
      ? '<button type="button" class="link-button story-step-view" data-action="library-go-view" data-view="' +
        escapeHtml(step.view) +
        '" title="See this view in Stories, and the other steps that use it">' +
        escapeHtml(viewLabel(view)) +
        '</button>'
      : '<span class="story-step-view">' + (view ? escapeHtml(viewLabel(view)) : '<em>Missing view</em>') + '</span>') +
    (current ? '<span class="story-current-badge">Showing now</span>' : '') +
    (view && !step.view ? '<span class="story-count">Own view — only in this step</span>' : '') +
    '<span class="story-step-tools">' +
    (problem ? '' : button('story-play', 'Show on diagram', ' title="Draw this step on the diagrams"')) +
    (view && !step.view
      ? button(
          'story-step-name',
          'Keep as named view',
          ' title="Give this view a name and a file of its own, so that other stories can use it"'
        )
      : '') +
    button('story-step-up', 'Up', index === 0 ? ' disabled' : '') +
    button('story-step-down', 'Down', index === count - 1 ? ' disabled' : '') +
    button('story-step-remove', 'Remove') +
    '</span>' +
    '</div>' +
    renderStepPlateausHtml(story, step, index) +
    (problem ? '<div class="story-step-problem" role="status">' + escapeHtml(problem) + '</div>' : '') +
    (others.length
      ? '<select class="story-repair" data-story-repair data-story="' +
        id +
        '" data-step="' +
        index +
        '" aria-label="Use another view for step ' +
        (index + 1) +
        '"><option value="">Choose another view…</option>' +
        others
          .map((other) => '<option value="' + escapeHtml(other.id) + '">' + escapeHtml(viewLabel(other)) + '</option>')
          .join('') +
        '</select>'
      : '') +
    '<textarea rows="2" data-story="' +
    id +
    '" data-story-field="step-text" data-step="' +
    index +
    '" aria-label="What to say about step ' +
    (index + 1) +
    '" placeholder="What to say about this diagram…">' +
    escapeHtml(step.text || '') +
    '</textarea>' +
    '</li>'
  );
}

function renderStoryEditorHtml(story) {
  const id = escapeHtml(story.id);
  const steps = storySteps(story);
  const views = savedViewsSorted();
  let html =
    '<section class="story-editor" aria-label="Story">' +
    '<label class="story-field"><span>Name</span><input type="text" data-story="' +
    id +
    '" data-story-field="name" value="' +
    escapeHtml(story.name || '') +
    '" placeholder="' +
    id +
    '"></label>' +
    '<label class="story-field"><span>About</span><textarea rows="2" data-story="' +
    id +
    '" data-story-field="description" placeholder="What this story shows, in a few words.">' +
    escapeHtml(story.description || '') +
    '</textarea></label>';
  if (views.length) {
    html +=
      '<div class="story-add"><label for="story-add-view">Add a saved view as the last step</label><select id="story-add-view">' +
      views
        .map((view) => '<option value="' + escapeHtml(view.id) + '">' + escapeHtml(viewLabel(view)) + '</option>')
        .join('') +
      '</select><button type="button" data-action="story-add-step" data-story="' +
      id +
      '">Add step</button></div>';
  }
  if (removedStep && removedStep.storyId === story.id) {
    html +=
      '<div class="story-undo" role="status">Step ' +
      (removedStep.index + 1) +
      ' removed. <button type="button" data-action="story-undo">Undo</button></div>';
  }
  html += steps.length
    ? '<ol class="story-steps">' +
      steps.map((step, i) => renderStoryStepHtml(story, step, i, steps.length)).join('') +
      '</ol>'
    : '<div class="story-empty"><p>No step yet.</p><ol><li>Open a diagram in Applications or in Elements.</li><li>Press “Add to story…” in its header: it goes after the step being told.</li></ol>' +
      (views.length ? '<p>Or add a saved view with the list above.</p>' : '') +
      '</div>';
  html +=
    '<div class="story-danger"><button type="button" class="btn-danger" data-action="story-delete" data-story="' +
    id +
    '">Delete this story</button></div>';
  return html + '</section>';
}

/** Where an entry is kept: its manifest, or .archicode.yaml for an older one. */
function entryFileLabel(entry) {
  const owner = entryOwners.get(entry);
  return owner ? owner.relPath : '.archicode.yaml';
}

/**
 * The view as a form: what it draws and where it is kept as facts, then a control for each attribute (TDD-0029 DEC-1). A control changes
 * the entry of the view (`editSavedView`) when it is committed: a select or a checkbox at once, a text by Enter or leaving it.
 */
function renderViewFactsHtml(view) {
  const row = (name, content) => '<dt>' + name + '</dt><dd>' + content + '</dd>';
  const isMap = view.viewpoint === 'map';
  const properties = isPlainObject(view.properties) ? view.properties : {};
  const notice = (field) =>
    viewEditNotice && viewEditNotice.view === view.id && viewEditNotice.field === field
      ? '<div class="inline-error" role="alert">' + escapeHtml(viewEditNotice.text) + '</div>'
      : '';
  const typedOr = (name, value) =>
    viewEditNotice && viewEditNotice.view === view.id && viewEditNotice.field === name && viewEditNotice.typed !== null
      ? viewEditNotice.typed
      : value; // a refused text stays in its field, to be corrected
  const field = (id, label, control, name) =>
    '<div class="view-field"><label for="' + id + '">' + label + '</label>' + control + notice(name) + '</div>';
  const option = (value, label, selected, extra) =>
    '<option value="' +
    escapeHtml(value) +
    '"' +
    (selected ? ' selected' : '') +
    (extra || '') +
    '>' +
    escapeHtml(label) +
    '</option>';

  const layer = viewLayerOf(view);
  const record = typeof properties.element === 'string' ? AppState.index[layer].get(properties.element) : null;
  const known = ['overview', 'detailed', 'deep', 'map'];
  const labels = { overview: 'Overview', detailed: 'Detailed', deep: 'Deep', map: 'Map' };
  const viewpoints =
    (known.includes(view.viewpoint)
      ? ''
      : option(String(view.viewpoint), view.viewpoint + ' (not drawn by the editor)', true, ' disabled')) +
    known
      .map((value) =>
        option(
          value,
          labels[value],
          value === view.viewpoint,
          value === 'detailed' && view.viewpoint !== 'detailed' && record && LEAF_KINDS.includes(record.kind)
            ? ' disabled title="Only available for an element that can contain others."'
            : ''
        )
      )
      .join('');
  let html =
    '<dl class="view-facts">' +
    row('Draws', escapeHtml(describeViewDefinition(view))) +
    row('Kept in', '<code>' + escapeHtml(entryFileLabel(view)) + '</code>') +
    '</dl><div class="view-edit">';
  html += field(
    'view-edit-viewpoint',
    'Viewpoint',
    '<select id="view-edit-viewpoint" data-view-field="viewpoint">' + viewpoints + '</select>',
    'viewpoint'
  );
  // the layer of the view: the one its element is of, or the one its map draws (the page Applications, the page Environments)
  html += field(
    'view-edit-layer',
    'Layer',
    '<select id="view-edit-layer" data-view-field="layer">' +
      option('application', 'Application', layer === 'application') +
      option('technology', 'Technology', layer === 'technology') +
      '</select>',
    'layer'
  );
  if (isMap) {
    for (const [list, label, hint] of [
      ['pinned', 'Pinned', 'The elements the map is about'],
      ['hidden', 'Hidden', 'Elements the map leaves out'],
      ['opened', 'Open', 'Boxes drawn unfolded']
    ]) {
      const items = stringList(properties[list]);
      html += field(
        'view-edit-add-' + list,
        label,
        '<div class="view-pills" role="list" aria-label="' +
          label +
          ' elements">' +
          items
            .map(
              (reference) =>
                '<span class="pill' +
                (AppState.index[layer].has(reference) ? '' : ' pill-missing') +
                '" role="listitem"' +
                (AppState.index[layer].has(reference) ? '' : ' title="This element does not exist any more"') +
                '>' +
                escapeHtml(reference) +
                '<button type="button" class="pill-remove" data-action="view-list-remove" data-list="' +
                list +
                '" data-ref="' +
                escapeHtml(reference) +
                '" aria-label="Remove ' +
                escapeHtml(reference) +
                ' from ' +
                label.toLowerCase() +
                '" title="Remove">×</button></span>'
            )
            .join('') +
          '</div>' +
          '<input type="text" id="view-edit-add-' +
          list +
          '" data-view-list="' +
          list +
          '" list="archicode-' +
          layer +
          '-references" value="' +
          escapeHtml(typedOr(list, '')) +
          '" placeholder="Add an element…" autocomplete="off" spellcheck="false" title="' +
          escapeHtml(hint) +
          '. Press Enter to add it.">',
        list
      );
    }
  } else {
    html += field(
      'view-edit-element',
      'Element',
      '<input type="text" id="view-edit-element" data-view-field="element" list="archicode-' +
        layer +
        '-references" value="' +
        escapeHtml(typedOr('element', typeof properties.element === 'string' ? properties.element : '')) +
        '" placeholder="Reference of an element" autocomplete="off" spellcheck="false" title="Press Enter to apply it.">' +
        (record ? '<div class="muted view-element-name">' + escapeHtml(record.name || record.id) + '</div>' : ''),
      'element'
    );
  }
  const facets = AppState.workspace.settings.facets.customs;
  const facetName = typeof properties.facet === 'string' ? properties.facet : '';
  if (facets.length || facetName) {
    html += field(
      'view-edit-facet',
      'Facet',
      '<select id="view-edit-facet" data-view-field="facet">' +
        option('', 'None', !facetName) +
        facets.map((facet) => option(facet.name, facet.name, facet.name === facetName)).join('') +
        (facetName && !facets.some((facet) => facet.name === facetName)
          ? option(facetName, facetName + ' (not defined)', true)
          : '') +
        '</select>',
      'facet'
    );
  }
  const shows = shownTextsOf(view);
  const check = (id, fieldName, label, checked, title) =>
    '<label class="view-check" title="' +
    escapeHtml(title) +
    '"><input type="checkbox" id="' +
    id +
    '" data-view-field="' +
    fieldName +
    '"' +
    (checked ? ' checked' : '') +
    '> ' +
    label +
    '</label>';
  html +=
    '<fieldset class="view-field"><legend>Drawing</legend><div class="view-checks">' +
    check(
      'view-edit-hide-unlinked',
      'hide-unlinked',
      'Hide unlinked',
      properties['hide-unlinked'] === true,
      'Leave out the boxes that no link reaches'
    ) +
    (view.viewpoint === 'map' && layer === 'technology'
      ? check(
          'view-edit-part-applications',
          'part:applications',
          'Applications',
          mapPartsOf(view).applications,
          'Draw the applications deployed on the nodes, inside the nodes that are open'
        ) +
        check(
          'view-edit-part-relationships',
          'part:relationships',
          'Relationships',
          mapPartsOf(view).relationships,
          'Draw the links: the relationships that environments and nodes declare, and the dependencies between environments that the deployed applications give'
        )
      : '') +
    check('view-edit-show-labels', 'show:labels', 'Labels', shows.labels, 'The caption of each link') +
    check(
      'view-edit-show-qualifiers',
      'show:qualifiers',
      'Qualifiers',
      shows.qualifiers,
      'The qualifiers of each element, after its kind'
    ) +
    check(
      'view-edit-show-descriptions',
      'show:descriptions',
      'Descriptions',
      shows.descriptions,
      'The description of each element that does not contain others'
    ) +
    check(
      'view-edit-show-wrap',
      'show:wrap',
      'Wrap',
      shows.wrap,
      'Break long names, qualifiers and descriptions over several lines, and show the whole of a long link label'
    ) +
    '</div></fieldset></div>';
  return html;
}

/** The steps that show a view, each a way into its story. */
function renderViewUsesHtml(view) {
  const uses = [];
  for (const story of storiesSorted()) {
    storySteps(story).forEach((step, index) => {
      if (step.view === view.id) uses.push({ story, index });
    });
  }
  if (!uses.length)
    return '<p class="muted">No story shows this view yet. Add it to one from Stories, with “Add a saved view as the last step”.</p>';
  return (
    '<ul class="view-uses">' +
    uses
      .map(
        ({ story, index }) =>
          '<li><button type="button" class="link-button" data-action="library-go-story" data-story="' +
          escapeHtml(story.id) +
          '" data-step="' +
          index +
          '">' +
          escapeHtml(storyLabel(story)) +
          '</button>' +
          ' <span class="muted">— step ' +
          (index + 1) +
          '</span></li>'
      )
      .join('') +
    '</ul>'
  );
}

/** The attributes of a view and the steps that show it: the centre of the page of a view that cannot be drawn, the right-hand panel of one that can. */
function renderViewAttributesHtml(view) {
  return renderViewFactsHtml(view) + '<h3>Shown in</h3>' + renderViewUsesHtml(view);
}

function renderViewDetailHtml(view) {
  const problem = viewProblem(view);
  return (
    '<section class="story-editor" aria-label="View">' +
    (problem ? '<div class="story-step-problem" role="status">' + escapeHtml(problem) + '</div>' : '') +
    renderViewAttributesHtml(view) +
    '</section>'
  );
}

function renderViewsNavHtml() {
  const views = savedViewsSorted();
  let html = '<div class="nav-section">' + renderNavHeaderHtml('Views');
  for (const view of views) {
    const used = storiesUsingView(view.id);
    html +=
      '<div class="nav-row story-row' +
      (view.id === selectedViewId ? ' active' : '') +
      '" role="button" tabindex="0"' +
      (view.id === selectedViewId ? ' aria-current="true"' : '') +
      ' data-action="select-view" data-view="' +
      escapeHtml(view.id) +
      '">' +
      '<span class="file-relpath">' +
      escapeHtml(viewLabel(view)) +
      '</span>' +
      (viewProblem(view) ? '<span class="modified-badge" title="This view cannot be drawn">broken</span>' : '') +
      (entryIsModified(view) ? '<span class="modified-badge" title="Changed, not saved yet">modified</span>' : '') +
      '<span class="story-count">' +
      (used ? used + (used === 1 ? ' step' : ' steps') : 'unused') +
      '</span></div>';
  }
  if (!views.length) html += '<div class="tree-empty">No view yet.</div>';
  return html + '</div>';
}

/** Views and stories that an older workspace keeps in .archicode.yaml: said once, with the way to move them out. */
function renderLegacyEntriesNoticeHtml() {
  const { views, stories } = legacyEntriesToMove();
  const total = views.length + stories.length;
  if (!total) return '';
  const parts = [
    views.length ? views.length + (views.length === 1 ? ' view' : ' views') : '',
    stories.length ? (stories.length === 1 ? '1 story' : stories.length + ' stories') : ''
  ]
    .filter(Boolean)
    .join(' and ');
  return (
    '<div class="story-legacy" role="status"><span>' +
    parts +
    (total === 1 ? ' is' : ' are') +
    ' still in .archicode.yaml. ' +
    (total === 1 ? 'It works' : 'They work') +
    ' there, but every save rewrites that file. Move ' +
    (total === 1 ? 'it' : 'them') +
    ' into files of ' +
    (total === 1 ? 'its' : 'their') +
    ' own to keep .archicode.yaml small.</span>' +
    '<button type="button" data-action="legacy-move" title="Write a manifest file for each, and take them out of .archicode.yaml">Move to manifests</button></div>'
  );
}

/** The two sides of the Library, as one group of joined buttons. */
function renderLibraryTabsHtml() {
  const tab = (id, label, title) =>
    '<button type="button" data-action="library-tab" data-tab="' +
    id +
    '" aria-pressed="' +
    (id === libraryTab) +
    '" title="' +
    title +
    '">' +
    label +
    '</button>';
  return (
    '<span class="viewpoint-switch"><span class="button-group" role="group" aria-label="Stories and views">' +
    tab('stories', 'Stories', 'Diagrams in order, with a sentence for each') +
    tab('views', 'Views', 'The named diagrams that stories are made of') +
    '</span></span>'
  );
}

/**
 * Library perspective — what the workspace keeps to tell about itself: Stories (diagrams in order, with words) and
 * Views (the named diagrams they are made of). Each side has its list on the left and its page in the center, and the
 * two lead to one another: a step names its view, a view names the steps that show it.
 */
function renderLibraryPerspectiveHtml() {
  const onViews = libraryTab === 'views';
  let subject = '';
  let actions = '';
  let body;
  if (onViews) {
    if (!findSavedView(selectedViewId)) selectedViewId = (savedViewsSorted()[0] || {}).id || null; // a view is always open when there is one
    const view = selectedViewId ? findSavedView(selectedViewId) : null;
    if (view) {
      const id = escapeHtml(view.id);
      subject =
        '<span class="element-header-subject">' +
        escapeHtml(viewLabel(view)) +
        '</span>' +
        (entryIsModified(view) ? '<span class="modified-badge" title="Changed, not saved yet">modified</span>' : '');
      const manage =
        '<button type="button" data-action="saved-view-rename" data-view="' +
        id +
        '">Rename</button>' +
        '<button type="button" data-action="saved-view-delete" data-view="' +
        id +
        '">Delete</button>';
      // the panel on the right narrows the centre: what is rarely used goes into the "⋯" menu of a narrow header, as on the Map (Maximize stays in the row)
      actions = viewProblem(view)
        ? manage
        : '<span class="header-more">' +
          '<button type="button" class="header-more-button" data-action="toggle-header-menu" aria-haspopup="true" aria-expanded="' +
          headerMenuOpen +
          '" aria-controls="header-overflow" aria-label="More actions" title="More actions: download, open on a diagram, rename, delete">' +
          '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="3" cy="8" r="1.6" fill="currentColor"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="13" cy="8" r="1.6" fill="currentColor"/></svg></button>' +
          '<div class="header-overflow" id="header-overflow" role="group" aria-label="More actions" data-open="' +
          headerMenuOpen +
          '">' +
          renderDiagramDownloadHtml() +
          '<button type="button" data-action="saved-view-open" data-view="' +
          id +
          '" title="Draw this view in Applications or in Elements">Open on diagram</button>' +
          manage +
          '</div></span>' +
          renderMaximizeButtonHtml('the list of views and the panel');
    }
    body = view
      ? renderViewDetailHtml(view)
      : '<p class="muted story-intro">A view is a diagram kept under a name, to be a step in as many stories as you like. To keep one, open a diagram in Applications or in Elements and press “Name view…” in its header.</p>';
  } else {
    if (!findStory(selectedStoryId)) selectedStoryId = (storiesSorted()[0] || {}).id || null; // a story is always open when there is one
    const story = selectedStoryId ? findStory(selectedStoryId) : null;
    if (story) {
      subject = '<span class="element-header-subject">' + escapeHtml(storyLabel(story)) + '</span>';
      actions =
        '<button type="button" data-action="story-player-open" data-story="' +
        escapeHtml(story.id) +
        '"' +
        (storySteps(story).length ? '' : ' disabled') +
        ' title="Play the story like slides, in a window of its own, from its first step: the editor behind it is not touched">Play</button>';
    }
    body = story
      ? renderStoryEditorHtml(story)
      : '<p class="muted story-intro">A story puts diagrams in order, with a sentence for each, to tell how part of the architecture works. To start, open a diagram in Applications or in Elements and press “Add to story…”, or create an empty story with “New story…”.</p>';
  }
  const header = renderElementHeaderHtml('<h2>Stories</h2>' + renderLibraryTabsHtml() + subject, actions);
  const notices =
    (storyNotice ? '<div class="error-panel" role="status">' + escapeHtml(storyNotice) + '</div>' : '') +
    renderLegacyEntriesNoticeHtml();
  // a view that can be drawn is drawn: the diagram of the Map under the header, and the panel on the right says what the view is and
  // what is selected in it; Maximize gives the diagram the room of both, as on the Map. One that cannot be drawn keeps its message and its facts.
  const recipe = onViews && selectedViewId ? libraryDiagramRecipe(findSavedView(selectedViewId)) : null;
  const center = recipe
    ? '<div class="diagram-view library-view">' +
      header +
      (notices ? '<div class="library-view-notices">' + notices + '</div>' : '') +
      renderDiagramCanvasHtml(null, '', recipe) +
      '</div>'
    : '<div class="story-view">' + header + '<div class="story-body">' + notices + body + '</div></div>';
  return {
    left:
      recipe && diagramMaximized
        ? null
        : renderLeftPanelWrapperHtml(onViews ? renderViewsNavHtml() : renderStoriesNavHtml()),
    center,
    right: libraryRightHtml(recipe),
    rightLabel: recipe && !diagramMaximized ? 'View and selection' : 'Changes',
    bottom: null
  };
}

/**
 * The tab of the right-hand panel of the page Stories that is shown: 'view' (what the view is and what is selected in it) or 'changes' (the list of the changes of the comparison, wave 015,
 * run 0103, #27). A choice of whoever looks; the tab is offered only while a comparison is on, and 'view' is shown otherwise.
 */
let libraryRightTab = 'view';

/** The comparison the page Stories lists the changes of: null when nothing is compared, or the two plateaus cannot be compared (the other pages say why). While the kernel loads: `{ pending }`. */
function libraryChangesState() {
  if (currentPerspective !== 'library') return null;
  const state = comparisonState();
  return state && !state.problems ? state : null;
}

/**
 * The right-hand panel of the page Stories (null: none). A view that can be drawn has its panel; with a comparison on it has two tabs, View and Changes, and the Changes tab holds the
 * very list the other pages have (`renderChangesPanelHtml`, with its filters and its Next and Previous buttons). A story, or a view that cannot be drawn, has no panel of its own: with a
 * comparison on the Changes panel is alone on the right, as on the page Plateaus, so that a story is read with the list of changes on screen.
 */
function libraryRightHtml(recipe) {
  const state = libraryChangesState();
  rightPanelPending = !!(state && state.pending);
  const panel = recipe && !diagramMaximized ? renderLibraryPanelHtml(recipe.view) : null;
  if (!state || (recipe && diagramMaximized)) return panel;
  const changes = state.pending ? renderChangesPendingHtml() : renderChangesPanelHtml(state);
  if (panel === null) return changes;
  const showChanges = libraryRightTab === 'changes';
  const tab = (id, label, on) =>
    '<button type="button" data-action="set-right-tab" data-tab="' +
    id +
    '" aria-pressed="' +
    on +
    '">' +
    label +
    '</button>';
  return (
    '<div class="right-tabs button-group" role="group" aria-label="Right panel">' +
    tab('view', 'View', !showChanges) +
    tab(
      'changes',
      'Changes' + (state.pending ? '' : ' <span class="field-count">' + state.changes.length + '</span>'),
      showChanges
    ) +
    '</div>' +
    (showChanges ? changes : panel)
  );
}

/** The right-hand panel of the page of a view: what the view is, then — once a box or a link of its diagram is selected — the inspection of the selection. */
function renderLibraryPanelHtml(view) {
  const selection = libraryPickFor(view.id).selection;
  const inspection = selection ? inspectionPanelHtml(selection, 'library') : null;
  if (selection && !inspection) libraryPickFor(view.id).selection = null; // the element was renamed or deleted since (in Elements, or by a save): nothing to show
  return (
    '<div class="library-panel"><section class="library-view-section" aria-label="The view">' +
    '<h3>View</h3>' +
    renderViewAttributesHtml(view) +
    '</section>' +
    (inspection ? '<section class="library-selection" aria-label="The selection">' + inspection + '</section>' : '') +
    '</div>'
  );
}
