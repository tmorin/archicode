// ---- The band ----
//
// Wave 015 (run 0097, W-9, #98): the band chooses the plateau drawn and the plateau compared with, on the pages of the perspective Timeline, and does nothing else.
// Two lists, one row: "Plateau" (every plateau of the tree, indented by its depth) and "Compare with" (nothing, the past that follows the plateau drawn, then the same tree, the plateau drawn greyed in it; wave 016, run 0109), then, only when
// there is one, a button that opens the mistakes of the plateaus. What the tree of buttons held moved to where it belongs: the tree and the counts of each plateau are on the
// page Plateaus, the sentence that said what is compared is the Changes panel's (and the list says it), Everything / Changes only is among the tools of the diagram, and the
// mistakes are behind the button. The state is `AppState.layers`, not the band's: the band is not drawn on Stories, Files and Settings, and nothing is reset there.

/** The band is on screen: a workspace is open, it has layers, and the page is one of the perspective Timeline. */
function bandIsShown() {
  return !!(
    AppState.workspace &&
    !AppState.fatalError &&
    AppState.layers &&
    AppState.plateauTree &&
    PERSPECTIVES[currentPerspective].group === 'timeline'
  );
}

/** The sentences of the first layer of the chain of a plateau that the command line refuses, or null (resolves the plateau if it was not: a click on its node would). */
function layerModelBroken(id) {
  if (!AppState.layers || AppState.layers.blocked || !AppState.plateauTree.layered) return null; // a workspace with no layer has the one plateau, drawn from its manifests
  return layerModelOf(id, AppState.workspace.settings).problems;
}

/** The text of a plateau in a list of the band: its name (else its id) and its horizon, a `!` before it when the command line refuses it. */
function bandPlateauLabel(id) {
  const node = AppState.plateauTree.nodes.get(id);
  return (
    (layerModelBroken(id) ? '! ' : '') +
    plateauTitle(layerPlateauModel(id)) +
    (node && node.horizon ? ' · ' + node.horizon : '')
  );
}

/** One step of indentation in the lists of the band: an em space (U+2003), which an `<option>` keeps (only ASCII white space at the start of an option's text is collapsed). */
const BAND_INDENT = '\u2003';

function bandOptionHtml(value, label, selected, extra) {
  return (
    '<option value="' +
    escapeHtml(value) +
    '"' +
    (selected ? ' selected' : '') +
    (extra || '') +
    '>' +
    escapeHtml(label) +
    '</option>'
  );
}

/** The list "Plateau": every plateau in the order of the tree, each indented by its depth; the one drawn is selected. */
function bandPlateauSelectHtml(root, disabled) {
  const layers = AppState.layers;
  const options = [];
  const walk = (item, depth) => {
    options.push(
      bandOptionHtml(
        item.id,
        BAND_INDENT.repeat(Math.min(depth, 6)) + bandPlateauLabel(item.id),
        item.id === layers.current
      )
    );
    item.children.forEach((child) => walk(child, depth + 1));
  };
  walk(root, 0);
  const node = AppState.plateauTree.nodes.get(layers.current);
  return (
    '<label class="band-field"><span class="plateau-label" id="band-plateau-label">Plateau</span>' +
    '<select id="band-plateau" data-band-select="plateau" aria-labelledby="band-plateau-label"' +
    (disabled ? ' disabled' : '') +
    ' title="The plateau drawn in the whole editor' +
    (node && node.parent !== null ? ' (it overrides ' + escapeHtml(node.parent) + ')' : '') +
    '">' +
    options.join('') +
    '</select></label>'
  );
}

/**
 * The list "Compare with" (wave 016, run 0109, W-3, #72): nothing; the past, which follows the plateau drawn (the plateau it overrides, whichever that is); then the tree of the
 * plateaus, the same as the list "Plateau" (every plateau in the order of the tree, indented by its depth, the same labels), where the plateau drawn is greyed (disabled) in its
 * place, so that the hierarchy can be read in both lists. A plateau of the tree is a fixed comparison, as `archicode diff --plateau <drawn> --against <id>`. A future the address
 * asked for with several plateaus on top of the drawn one is told as a choice still to make (a first entry, disabled and selected, with the tree under it and nothing selected in it);
 * with one plateau on top of it, the entry of that plateau is the one selected.
 */
function bandCompareSelectHtml(root, disabled) {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  const node = tree.nodes.get(layers.current);
  const parent = node && node.parent !== null ? node.parent : null;
  const listing = !layers.blocked; // a write in flight disables the list, it does not change what it says; blocked plateaus have nothing to choose from
  const compare = layers.compare;
  const other = layerCompareOther();
  let selected = '';
  if (compare && !other && compare.mode === 'future')
    selected = 'future'; // waiting for the choice of the future
  else if (other) selected = compare.mode === 'past' && !compare.chosen ? 'past' : 'plateau:' + other.id;
  let html = bandOptionHtml('', 'Nothing', selected === '');
  if (selected === 'future') html += bandOptionHtml('future', 'Choose a future plateau', true, ' disabled');
  if (parent !== null && listing)
    html += bandOptionHtml('past', 'Past (follows the plateau drawn)', selected === 'past');
  if (listing) {
    const walk = (item, depth) => {
      html += bandOptionHtml(
        'plateau:' + item.id,
        BAND_INDENT.repeat(Math.min(depth, 6)) + bandPlateauLabel(item.id),
        selected === 'plateau:' + item.id,
        item.id === layers.current ? ' disabled' : ''
      );
      item.children.forEach((child) => walk(child, depth + 1));
    };
    walk(root, 0);
  }
  return (
    '<label class="band-field"><span class="plateau-label" id="band-compare-label">Compare with</span>' +
    '<select id="band-compare" data-band-select="compare" aria-labelledby="band-compare-label"' +
    (disabled ? ' disabled' : '') +
    ' title="What the plateau drawn is compared with: the Changes panel lists what differs. The plateau drawn is greyed in the tree.">' +
    html +
    '</select></label>'
  );
}

/**
 * The mistakes of the plateaus the page knows of, as sections `{ heading, lines }` (the heading may be null): why only baseline is drawn, the sentences of the first layer of the
 * chain of the plateau drawn that the command line refuses, and the same for the plateau it is compared with. `note` is the one thing said without being counted: why nothing is written.
 */
function bandMistakes() {
  const layers = AppState.layers;
  const sections = [];
  if (layers.blocked) sections.push({ heading: 'Only baseline is drawn:', lines: [layers.blocked] });
  if (AppState.layerProblems) {
    const name = plateauTitle(layerPlateauModel(layers.current));
    sections.push({
      heading: AppState.layerUndrawable
        ? name + ' cannot be drawn.'
        : name + ' is drawn, and the command line refuses it:',
      lines: AppState.layerProblems
    });
  }
  if (AppState.baseline && AppState.baseline.problem) {
    const name = plateauTitle(AppState.baseline.plateau);
    sections.push({
      heading: AppState.baseline.undrawable
        ? name + ', which the drawing is compared with, cannot be drawn.'
        : name + ', which the drawing is compared with, is refused by the command line:',
      lines: AppState.baseline.problem.split('\n')
    });
  }
  // not a mistake of a plateau: a view or a story names an element that no plateau has (wave 015, run 0100); told whatever plateau is drawn
  // the steps of a story that name a plateau that is none are told apart from the names (run 0101): a workspace with no plateau has them too
  const entries = entryProblemsOf(AppState.workspace.settings);
  const names = entries.filter((line) => line.endsWith(', which exists in no plateau'));
  const steps = entries.filter((line) => !names.includes(line));
  if (names.length)
    sections.push({ heading: 'The views and the stories name elements that no plateau has:', lines: names });
  if (steps.length) sections.push({ heading: 'The steps of the stories name plateaus that are none:', lines: steps });
  return {
    sections,
    count: sections.reduce((n, section) => n + section.lines.length, 0),
    note: readOnlyPlateauMessage()
  };
}

/** The body of the dialog of the mistakes (the band's button opens it): the sections of `bandMistakes`, read from the state each time the page is drawn. */
function renderMistakesDialogBodyHtml() {
  const mistakes = AppState.layers ? bandMistakes() : { sections: [], count: 0, note: null };
  if (!mistakes.count) return '<p>No mistake in the plateaus.</p>';
  return (
    mistakes.sections
      .map(
        (section) =>
          '<section class="band-errors">' +
          (section.heading ? '<strong>' + escapeHtml(section.heading) + '</strong>' : '') +
          '<ul>' +
          section.lines.map((line) => '<li>' + duplicateMessageHtml(line) + '</li>').join('') +
          '</ul></section>'
      )
      .join('') + (mistakes.note ? '<p class="band-readonly">' + duplicateMessageHtml(mistakes.note) + '</p>' : '')
  );
}

/** The band: the plateau drawn and what it is compared with, and, when there are some, the button of the mistakes. Nothing while no workspace is open. */
function renderPlateauBandHtml() {
  const layers = AppState.layers;
  if (!layers || !AppState.workspace || !AppState.plateauTree) return '';
  const tree = AppState.plateauTree;
  const root = bandTreeOf(tree) || {
    id: BASELINE_PLATEAU,
    node: { id: BASELINE_PLATEAU, name: null, horizon: null, parent: null },
    children: []
  };
  const disabled = !!layers.blocked || saveInFlight;
  const mistakes = bandMistakes();
  return (
    '<nav class="plateau-band col-span-3" id="plateau-band" aria-label="Plateaus">' +
    bandPlateauSelectHtml(root, disabled) +
    bandCompareSelectHtml(root, disabled) +
    (mistakes.count
      ? '<button type="button" class="band-mistakes" data-action="open-mistakes" title="' +
        escapeHtml(mistakes.sections[0].lines[0]) +
        '">' +
        '<span class="band-flag" aria-hidden="true">!</span> ' +
        mistakes.count +
        (mistakes.count === 1 ? ' mistake' : ' mistakes') +
        '</button>'
      : '') +
    '</nav>'
  );
}

/**
 * The controls of the plateaus (wave 014, run 0082; the page Plateaus, wave 015, run 0096, W-8, #99): "writing in: <plateau>" says the plateau drawn is the one a write goes to
 * (when the workspace has layers), the buttons make a plateau that overrides it, and rename it, give it a horizon or another parent. They are on the page Plateaus and nowhere
 * else: the band does not write.
 */
function plateauWritingHtml() {
  const layers = AppState.layers;
  const tree = AppState.plateauTree;
  if (!layers || !tree || layers.blocked) return '';
  const id = layers.current;
  const title = plateauTitle(layerPlateauModel(id));
  const writing = writingPlateau();
  const busy = saveInFlight ? ' disabled' : '';
  return (
    '<span class="band-writing">' +
    (writing !== null
      ? '<span class="band-writing-label" role="status">writing in: <strong>' +
        escapeHtml(title) +
        '</strong>' +
        (title !== id ? ' <code>' + escapeHtml(id) + '</code>' : '') +
        '</span>'
      : '') +
    '<button type="button" data-action="plateau-create" data-plateau="' +
    escapeHtml(id) +
    '"' +
    busy +
    ' title="Create a plateau that overrides ' +
    escapeHtml(title) +
    '">New plateau</button>' +
    (tree.layered
      ? '<button type="button" data-action="plateau-edit" data-plateau="' +
        escapeHtml(id) +
        '"' +
        busy +
        ' title="Rename ' +
        escapeHtml(title) +
        ', give it a horizon or another parent">Edit plateau</button>'
      : '') +
    (tree.layered && id !== BASELINE_PLATEAU ? plateauDeleteButtonHtml(id, 'Delete plateau', busy) : '') +
    '</span>'
  );
}

/** The button that opens the dialog of the delete (run 0102): offered for every plateau but the root; for one that others override (run 0132, #112) the dialog also says what they lose. */
function plateauDeleteButtonHtml(id, label, busy) {
  const children = layerChildrenOf(id);
  const title =
    'Delete ' +
    plateauTitle(layerPlateauModel(id)) +
    ' and its files, after a list of what goes' +
    (children.length
      ? ' and of what ' +
        (children.length === 1
          ? children[0] + ', which overrides it, loses'
          : children.join(', ') + ', which override it, lose') +
        ' (' +
        (children.length === 1 ? 'it goes' : 'they go') +
        ' under ' +
        AppState.plateauTree.nodes.get(id).parent +
        ')'
      : '');
  return (
    '<button type="button" class="btn-danger" data-action="plateau-delete" data-plateau="' +
    escapeHtml(id) +
    '"' +
    busy +
    ' title="' +
    escapeHtml(title) +
    '">' +
    escapeHtml(label) +
    '</button>'
  );
}

/**
 * What a change of one of the two lists of the band does: draw the plateau, or compare. The lists are the band's way to say it, the functions are the ones the page, the address
 * and the tests use (`drawPlateau`, `toggleCompareWithPast`, `toggleCompareWithFuture`, `compareWithPlateau`). A refusal (a form that was typed in and not kept, a write in flight,
 * a plateau that cannot be drawn) puts the list back as it was.
 */
function chooseOnBand(select) {
  const layers = AppState.layers;
  const value = select.value;
  const kind = select.getAttribute('data-band-select');
  if (!layers || !AppState.plateauTree || layers.blocked || saveInFlight || (draftTyped && !confirmDiscardingDraft())) {
    restoreBandLists();
    return;
  }
  const compare = layers.compare;
  let changed = true;
  if (kind === 'plateau') changed = drawPlateau(value);
  else if (value === '') {
    if (compare) {
      layers.compare = null;
      rememberLayerChoice();
      settleAfterLayerChange();
    }
  } else if (value === 'past') {
    if (!compare || compare.mode !== 'past') toggleCompareWithPast();
  } else if (value === 'future') {
    // not an entry a person can choose since run 0109 (the one entry of that value is disabled); kept for a script and for the tests
    if (!compare || compare.mode !== 'future') toggleCompareWithFuture();
  } else if (value.indexOf('plateau:') === 0) {
    const id = value.slice('plateau:'.length);
    // a list chooses, it does not toggle: the plateau the drawing is compared with already (the past that follows the plateau drawn is one) is not pressed twice
    if (id === layers.current || (compare && compare.other === id)) changed = false;
    else compareWithPlateau(id);
  }
  if (!changed) restoreBandLists();
}

/** Puts the two lists of the band back on what the state says, without drawing the page again: what was typed in a form of the page stays where it is. */
function restoreBandLists() {
  const band = typeof document !== 'undefined' ? document.getElementById('plateau-band') : null;
  if (!band || !AppState.layers) return;
  const holder = document.createElement('template');
  holder.innerHTML = renderPlateauBandHtml();
  if (holder.content && holder.content.firstElementChild) band.replaceWith(holder.content.firstElementChild);
}

/** The form of a plateau: a new one that overrides `id` (`create`), or `id` itself (`edit`). */
function openPlateauDialog(mode, id) {
  const tree = AppState.plateauTree;
  if (!AppState.layers || !tree || AppState.layers.blocked) return;
  if (mode === 'edit') {
    const node = tree.nodes.get(id);
    if (!node) return;
    openAppDialog({
      kind: 'plateau-form',
      mode,
      plateau: id,
      values: {
        id,
        name: node.name || '',
        horizon: node.horizon || '',
        parent: node.parent === null ? '' : node.parent
      }
    });
  } else {
    openAppDialog({
      kind: 'plateau-form',
      mode: 'create',
      plateau: null,
      values: { id: '', name: '', horizon: '', parent: tree.nodes.has(id) ? id : BASELINE_PLATEAU }
    });
  }
}
