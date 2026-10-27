// ---- The story player (wave 021, run 0153, #153; plan decisions T3, T5 and T6) ----

/**
 * The player that is open, or null: *Play* on a story opens a modal that covers the window and plays the story like slides. It is view state of the page and nothing else (not in
 * `AppState`, not in the workspace, no `modelsChanged()`): `{ story, step, home, scenes, scene, seq, framing, keyOpen, notice, opener, entry }`.
 *   home     the plateau and the comparison the editor drew when *Play* was pressed (`storyHomeNow()`), fixed for as long as the player is open: what a step that names none is drawn at;
 *   scenes   the scenes drawn so far, by step (`storyStepScene`, read-only: no fold buttons), so that a step seen again is not computed again;  scene  the one on screen, null while it is drawn;
 *   seq      counts the steps asked for, so that the answer of a step the reader has left is dropped;  framing  `{ scale, center }` of the diagram on screen (zoom and pan, the player's own);
 *   opener   the control that opened it (the focus goes back to it);  entry  whether the history holds an entry made for it (Escape and Close then go Back, so that Forward opens it again).
 * While it is open the editor behind it is `inert` and nothing of it is read or written: the player draws from the model of the plateau of each step, on the side.
 */
let storyPlayer = null;
/** The roots whose listeners are in place (the container is in the page once; a test may give another). */
const storyPlayerBound = new WeakSet();

function storyPlayerRoot() {
  return typeof document !== 'undefined' && typeof document.getElementById === 'function' ? document.getElementById('story-player') : null;
}

/** The story and the step the address asks the player to open (`play=<story>&step=n`), or null: no `play=`, a story that is not there or has no step, a step that is none. */
function storyPlayerAddress() {
  const queryIdx = location.hash.indexOf('?');
  if (queryIdx === -1 || !AppState.workspace) return null;
  const params = new URLSearchParams(location.hash.slice(queryIdx + 1));
  const id = params.get('play');
  const raw = params.getAll('step').pop();
  const story = id ? findStory(id) : null;
  if (!story || raw === undefined || !/^\d+$/.test(raw)) return null;
  return Number(raw) < storySteps(story).length ? { story: id, step: Number(raw) } : null;
}

/** An address without the two keys of the player (`play=` and `step=`, when `play=` is there): what is left is the editor's. */
function hashWithoutPlayer(hash) {
  const queryIdx = hash.indexOf('?');
  if (queryIdx === -1) return hash;
  const parts = hash.slice(queryIdx + 1).split('&');
  if (!parts.some((part) => part.startsWith('play='))) return hash;
  const rest = parts.filter((part) => !part.startsWith('play=') && !part.startsWith('step='));
  return hash.slice(0, queryIdx) + (rest.length ? '?' + rest.join('&') : '');
}

/**
 * The address changed under the page (Back, Forward, a hand-typed address): the editor follows the part that is its own, and the player follows `play=`. Back from an open player closes
 * it, Forward opens it again, another `step=` shows that step (no entry made), an address with no `play=` or a `play=` that names nothing leaves it closed and the address is written
 * back as it really is. The editor's part is compared without the player's two keys, so the step of the player is not mistaken for a change of the editor.
 */
function handleHashChange() {
  const wanted = storyPlayerAddress();
  if (storyPlayer && (!wanted || wanted.story !== storyPlayer.story)) closeStoryPlayer({ address: false });
  if (hashWithoutPlayer(location.hash) !== hashWithoutPlayer('#' + currentRouteHash())) {
    syncPerspectiveFromHash();
    requestRedraw();
  }
  if (wanted) {
    if (!storyPlayer) openStoryPlayer(wanted.story, wanted.step, { address: 'none' });
    else if (storyPlayer.step !== wanted.step) showPlayerStep(wanted.step, { address: false });
  }
  if (!storyPlayer && location.hash !== '#' + currentRouteHash() && typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', '#' + currentRouteHash());
}

/**
 * Opens the player on step `index` of a story (*Play*: the first). `options.opener` is the control the focus goes back to; `options.address` is how the address learns of it: 'push'
 * (the default: an entry of the history, so that Back closes it), 'replace' (an address that named it at load: no entry) or 'none' (the history already moved). Returns the promise of
 * the first step's scene, or null when nothing is opened: no container, a story with no such step, a player or a dialog already open.
 */
function openStoryPlayer(storyId, index, options) {
  const opts = options || {};
  const root = storyPlayerRoot();
  const story = AppState.workspace ? findStory(storyId) : null;
  const steps = story ? storySteps(story) : [];
  if (storyPlayer || appDialog || !root || !Number.isInteger(index) || index < 0 || index >= steps.length) return null;
  const active = typeof document !== 'undefined' && document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  const address = opts.address || 'push';
  storyPlayer = { story: storyId, step: index, home: storyHomeNow(), scenes: new Map(), scene: null, seq: 0, framing: freshPlayerFraming(), keyOpen: false, notice: null, opener: opts.opener || active, entry: address !== 'replace' };
  if (typeof history !== 'undefined' && address === 'push' && history.pushState) history.pushState(null, '', '#' + currentRouteHash());
  else if (address === 'replace' && typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', '#' + currentRouteHash());
  mountStoryPlayer(root);
  return showPlayerStep(index, { address: false, first: true });
}

/** Puts the player on screen: the container shown, the editor behind it inert, the listeners in place, the focus inside. */
function mountStoryPlayer(root) {
  root.hidden = false;
  root.innerHTML = renderStoryPlayerHtml();
  const app = document.getElementById('app');
  if (app && app.setAttribute) app.setAttribute('inert', '');
  if (!storyPlayerBound.has(root)) {
    storyPlayerBound.add(root);
    root.addEventListener('click', handleStoryPlayerClick);
    root.addEventListener('change', handleStoryPlayerChange);
    root.addEventListener('pointerdown', handleStoryPlayerPointerDown);
    root.addEventListener('wheel', handleStoryPlayerWheel, { passive: false });
  }
  focusPlayerControl(null);
  applyPlayerFraming();
}

/**
 * Closes the player and puts the editor back as it was: the container emptied, the editor no longer inert, the full screen left, the live region emptied, the address without `play=`
 * (Back when the history holds the entry the player made, else the address rewritten in place) and the focus on the control that opened it. `options.address` false leaves the address
 * to the caller (the history already moved), `options.focus` false leaves the focus. Nothing of the editor was changed while it was open, so nothing is restored.
 */
function closeStoryPlayer(options) {
  const player = storyPlayer;
  if (!player) return false;
  const opts = options || {};
  storyPlayer = null;
  player.seq++;
  const root = storyPlayerRoot();
  if (typeof document !== 'undefined' && document.fullscreenElement && typeof document.exitFullscreen === 'function') {
    try { const left = document.exitFullscreen(); if (left && left.catch) left.catch(() => {}); } catch (e) { /* the browser left it already */ }
  }
  if (root) { root.innerHTML = ''; root.hidden = true; }
  const app = document.getElementById('app');
  if (app && app.removeAttribute) app.removeAttribute('inert');
  announceStoryStep('');
  if (opts.address !== false && typeof history !== 'undefined') {
    if (player.entry && history.back) history.back();
    else if (history.replaceState) history.replaceState(null, '', '#' + currentRouteHash());
  }
  if (opts.focus !== false) returnFocusAfterPlayer(player);
  return true;
}

/** Gives the focus back to the control that opened the player; if the page drew it again since, to the same action; failing that, to the *Play* of the story. */
function returnFocusAfterPlayer(player) {
  const opener = player.opener;
  if (opener && typeof opener.focus === 'function' && opener.isConnected !== false) { opener.focus({ preventScroll: true }); return; }
  const selector = (opener && actionSelectorOf(opener)) || '[data-action="story-player-open"][data-story="' + player.story + '"]';
  const app = document.getElementById('app');
  const again = app && app.querySelector ? app.querySelector(selector) : null;
  if (again && typeof again.focus === 'function') again.focus({ preventScroll: true });
}

function freshPlayerFraming() {
  return { scale: 'auto', center: { x: 0, y: 0 } };
}

/**
 * Shows step `index`: the address learns of it without an entry (`options.address` false: it does not), the scene is drawn on the side (`storyStepScene`, from the home fixed when the
 * player opened, read-only, the diagram toggles off) or taken from the scenes already drawn, and the step is said through the live region. The answer of a step the reader has left
 * is dropped. Resolves to the scene (null when nothing was asked for).
 */
function showPlayerStep(index, options) {
  const player = storyPlayer;
  const story = player ? findStory(player.story) : null;
  const steps = story ? storySteps(story) : [];
  if (!player || !Number.isInteger(index) || index < 0 || index >= steps.length) return Promise.resolve(null);
  const opts = options || {};
  player.step = index;
  player.framing = freshPlayerFraming();
  player.notice = null;
  const seq = ++player.seq;
  if (opts.address !== false && typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', '#' + currentRouteHash());
  const kept = player.scenes.get(index);
  if (kept) {
    player.scene = kept;
    renderStoryPlayer();
    sayPlayerStep(player);
    return Promise.resolve(kept);
  }
  player.scene = null;
  if (!opts.first) renderStoryPlayer();
  const arrived = (scene) => {
    if (storyPlayer !== player || player.seq !== seq) return null;
    if (scene) player.scenes.set(index, scene);
    player.scene = scene;
    renderStoryPlayer();
    sayPlayerStep(player);
    return scene;
  };
  return storyStepScene(player.story, index, { home: player.home, readonly: true }).then(arrived, (e) => arrived({
    storyId: player.story, index, count: steps.length, title: storyStepTitle(steps[index]), text: typeof steps[index].text === 'string' ? steps[index].text : '', announcement: storyStepAnnouncement(story, index),
    plateau: null, against: null, told: { at: null, against: null }, problem: 'The step could not be drawn: ' + (e && e.message ? e.message : String(e)), comparison: null, diagram: null
  }));
}

/** Says the step on screen through the live region (outside #app): "Step n of N", the view, and why it cannot be shown when it cannot. */
function sayPlayerStep(player) {
  const scene = player.scene;
  if (scene) announceStoryStep(scene.announcement + (scene.problem ? ' — cannot be shown: ' + scene.problem : ''));
}

/** What the player draws of a diagram: the page's markup with what selects or opens an element taken out (a click on a box does nothing here), so that no box says it is a link. */
function playerDiagramHtml(html) {
  return String(html)
    .replace(/<button type="button" class="relationship-link"[^>]*>([\s\S]*?)<\/button>/g, '<span class="relationship-name">$1</span>')
    .replace(/ data-action="[^"]*"/g, '')
    .replace(/ role="link"/g, ' role="img"')
    .replace(/ tabindex="[^"]*"/g, '');
}

/** The key of the lines and of a comparison under the diagram, for the player: its own ids and its own button (the editor's `toggle-diagram-key` is the page's), open or folded as the player has it. */
function playerLegendHtml(legend, open) {
  let html = String(legend || '')
    .replace(/ id="diagram-key"/g, ' id="player-key"')
    .replace(/ aria-controls="diagram-key"/g, ' aria-controls="player-key"')
    .replace(/ data-action="toggle-diagram-key"/g, ' data-player-action="toggle-key"');
  if (open) html = html.replace(/class="dg-legend-compare"/g, 'class="dg-legend-compare dg-key-open"').replace(/data-player-action="toggle-key" aria-expanded="false"/g, 'data-player-action="toggle-key" aria-expanded="true"');
  return html;
}

/** The plateau a step is drawn at and the one it is compared with, said and not chosen: what the step names, and "from the editor" for what it leaves to the plateau drawn when *Play* was pressed. */
function playerPlateausHtml(scene) {
  const tree = AppState.plateauTree;
  if (!scene || !tree || !tree.layered || !AppState.layers || AppState.layers.blocked) return '';
  const titled = (id) => escapeHtml(tree.nodes.has(id) ? plateauTitle(layerPlateauModel(id)) : id);
  const inherited = ' <span class="player-inherited" title="The step names none: it is drawn at the plateau the editor showed when Play was pressed">(from the editor)</span>';
  let html = 'Plateau <b>' + titled(scene.plateau) + '</b>' + (scene.told.at === null ? inherited : '');
  if (scene.against) html += ' · compared with <b>' + titled(scene.against) + '</b>' + (scene.told.against === null ? inherited : '');
  return '<p class="player-plateaus" data-player-plateaus>' + html + '</p>';
}

/** The whole player: the bar (title, position, menu, Previous, Next, Full screen, Close), the plateaus, the diagram with its zoom, its status and key, and the words of the step. */
function renderStoryPlayerHtml() {
  const player = storyPlayer;
  const story = player ? findStory(player.story) : null;
  const steps = story ? storySteps(story) : [];
  if (!player || !story || player.step >= steps.length) return '';
  const n = player.step;
  const step = steps[n];
  const scene = player.scene;
  const view = stepView(step);
  const diagram = scene ? scene.diagram : null;
  const text = scene ? scene.text : typeof step.text === 'string' ? step.text : '';
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled === true;
  const isFull = canFullscreen && !!document.fullscreenElement;
  let stage;
  if (!scene) stage = '<div class="muted player-loading" role="status">Drawing the step…</div>';
  else if (scene.problem) stage = '<div class="player-problem" role="status"><strong>Step ' + (n + 1) + ' cannot be shown.</strong> ' + escapeHtml(scene.problem) + ' Use Previous, Next or the menu to go on.</div>';
  else stage = playerDiagramHtml(diagram.html);
  const showTools = !!(diagram && diagram.hasSvg);
  return '<div class="player-shell" role="dialog" aria-modal="true" aria-labelledby="player-title" data-story-player>' +
    '<div class="player-bar">' +
      '<h2 class="player-title" id="player-title">' + escapeHtml(storyLabel(story)) + '</h2>' +
      '<span class="player-position" data-player-position>Step ' + (n + 1) + ' of ' + steps.length + (view ? ' · ' + escapeHtml(viewLabel(view)) : '') + '</span>' +
      renderStoryStepMenuHtml(story, n, 'player-step-menu', { home: player.home, label: 'Go to a step of the story', title: 'Go to any step: the plateau and the comparison it names are drawn' }) +
      '<span class="player-actions">' +
        '<span class="button-group" role="group" aria-label="Steps">' +
          '<button type="button" data-player-action="previous"' + (n === 0 ? ' disabled' : '') + ' aria-keyshortcuts="ArrowLeft" title="The step before (Left arrow)">Previous</button>' +
          '<button type="button" data-player-action="next"' + (n === steps.length - 1 ? ' disabled' : '') + ' aria-keyshortcuts="ArrowRight" title="The next step (Right arrow)">Next</button>' +
        '</span>' +
        (canFullscreen ? '<button type="button" data-player-action="fullscreen" aria-pressed="' + isFull + '" title="' + (isFull ? 'Leave full screen' : 'Take the whole screen') + '">' + (isFull ? 'Exit full screen' : 'Full screen') + '</button>' : '') +
        '<button type="button" data-player-action="close" aria-keyshortcuts="Escape" title="Close the player and go back to the editor, as it was (Esc)">Close</button>' +
      '</span>' +
    '</div>' +
    playerPlateausHtml(scene) +
    (player.notice ? '<p class="player-notice" role="status">' + escapeHtml(player.notice) + '</p>' : '') +
    '<div class="player-stage"><div class="diagram-canvas player-canvas" id="player-canvas" data-player-canvas>' + stage + '</div>' +
      (showTools ? '<div class="diagram-tools player-tools" role="toolbar" aria-label="Diagram tools">' +
        '<span class="button-group" role="group" aria-label="Zoom">' +
          '<button type="button" data-player-action="zoom-out" aria-label="Zoom out" title="Zoom out">−</button>' +
          '<button type="button" id="player-zoom-label" data-player-action="zoom-reset" aria-label="Actual size" title="Actual size">100%</button>' +
          '<button type="button" data-player-action="zoom-in" aria-label="Zoom in" title="Zoom in">+</button></span>' +
        '<button type="button" id="player-center-button" data-player-action="center" data-lit="true" title="Back to how the step opens: at a readable size, in the middle">Center</button>' +
        '<button type="button" id="player-fit-button" data-player-action="fit" aria-pressed="false" title="Fit the whole diagram in the window">Fit</button></div>' : '') +
    '</div>' +
    (diagram && (diagram.status || diagram.legend) ? '<div class="player-status"><span class="player-status-text" title="' + escapeHtml(diagram.status || '') + '">' + escapeHtml(diagram.status || '') + '</span>' +
      '<span class="player-hint" id="player-hint"></span><span class="dg-legend player-legend">' + playerLegendHtml(diagram.legend, player.keyOpen) + '</span></div>' : '') +
    '<div class="player-words' + (text ? '' : ' muted') + '" data-player-words>' + (text ? escapeHtml(text) : 'No words for this step.') + '</div>' +
  '</div>';
}

/** Draws the player again from its state, the focus kept on the control that had it (or the nearest that can take it), the framing applied. */
function renderStoryPlayer() {
  const root = storyPlayerRoot();
  if (!storyPlayer || !root) return;
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  const inside = !!(active && root.contains && root.contains(active));
  const key = inside ? (active.hasAttribute && active.hasAttribute('data-player-step-menu') ? 'menu' : active.getAttribute ? active.getAttribute('data-player-action') : null) : null;
  root.innerHTML = renderStoryPlayerHtml();
  applyPlayerFraming();
  focusPlayerControl(key);
}

/** Puts the focus on a control of the player: the one asked for ('menu' or an action), else the nearest that can take it (Next, Previous, then Close). */
function focusPlayerControl(key) {
  const root = storyPlayerRoot();
  if (!root || !root.querySelector) return;
  const find = (wanted) => root.querySelector(wanted === 'menu' ? '[data-player-step-menu]' : '[data-player-action="' + wanted + '"]');
  const near = { previous: ['next'], next: ['previous'], menu: ['next', 'previous'] };
  for (const wanted of [key].concat(key ? near[key] || [] : [], ['next', 'previous', 'close'])) {
    const control = wanted ? find(wanted) : null;
    if (control && !control.disabled && typeof control.focus === 'function') { control.focus({ preventScroll: true }); return; }
  }
}

/** The keys of the player (a listener on the document, in the capture phase): Left and Right, Home and End walk the steps, Escape closes, Tab goes round inside. See `handleChangesKeydown` for the rule. */
function handleStoryPlayerKeydown(e) {
  const player = storyPlayer;
  if (!player) return;
  if (e.key === 'Tab') { trapPlayerFocus(e); return; }
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented || e.isComposing) return;
  if (appDialog || helpOpen || headerMenuOpen) return;
  const last = storySteps(findStory(player.story)).length - 1;
  const stop = () => { if (e.preventDefault) e.preventDefault(); if (e.stopPropagation) e.stopPropagation(); };
  if (e.key === 'Escape') { stop(); closeStoryPlayer(); return; } // from the menu of the steps too: it is a list that chooses with the arrows, Escape alone leaves
  const wanted = e.key === 'ArrowLeft' ? player.step - 1 : e.key === 'ArrowRight' ? player.step + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
  if (wanted === null) return;
  const focused = typeof document.activeElement === 'undefined' ? null : document.activeElement;
  if (isTypingTarget(e.target) || isTypingTarget(focused)) return; // the menu of the steps owns the arrows, Home and End
  stop();
  if (wanted >= 0 && wanted <= last && wanted !== player.step) showPlayerStep(wanted);
}
document.addEventListener('keydown', handleStoryPlayerKeydown, true);

/** Tab goes round inside the player: the page behind it is not reachable (it is inert too, this is for the ends of the list and for a focus that is outside). */
function trapPlayerFocus(e) {
  const root = storyPlayerRoot();
  if (!root || !root.querySelectorAll) return;
  const items = Array.from(root.querySelectorAll('button, select, input, textarea, a[href], [tabindex]')).filter((el) => !el.disabled && !el.hidden && el.getAttribute('tabindex') !== '-1');
  if (!items.length) { if (e.preventDefault) e.preventDefault(); return; }
  const focused = typeof document.activeElement === 'undefined' ? null : document.activeElement;
  const inside = !!(focused && root.contains && root.contains(focused));
  if (!inside || (e.shiftKey && focused === items[0]) || (!e.shiftKey && focused === items[items.length - 1])) {
    if (e.preventDefault) e.preventDefault();
    items[e.shiftKey ? items.length - 1 : 0].focus();
  }
}

function handleStoryPlayerClick(e) {
  const player = storyPlayer;
  const control = player && e.target && e.target.closest ? e.target.closest('[data-player-action]') : null;
  if (!control || control.disabled) return;
  const action = control.getAttribute('data-player-action');
  if (action === 'previous') showPlayerStep(player.step - 1);
  else if (action === 'next') showPlayerStep(player.step + 1);
  else if (action === 'close') closeStoryPlayer();
  else if (action === 'fullscreen') togglePlayerFullscreen();
  else if (action === 'toggle-key') { player.keyOpen = !player.keyOpen; renderStoryPlayer(); }
  else if (action === 'zoom-in') setPlayerScale(playerScaleStep(1));
  else if (action === 'zoom-out') setPlayerScale(playerScaleStep(-1));
  else if (action === 'zoom-reset') setPlayerScale(1);
  else if (action === 'fit') setPlayerScale('fit');
  else if (action === 'center') setPlayerScale('auto');
}

/** The menu of the steps: the step chosen is shown, as for Next. */
function handleStoryPlayerChange(e) {
  if (storyPlayer && e.target && e.target.matches && e.target.matches('[data-player-step-menu]')) showPlayerStep(Number(e.target.value));
}

/** Full screen for the player (the Fullscreen API on its container): a browser that refuses, or has none, leaves the player where it is and says so. */
async function togglePlayerFullscreen() {
  const player = storyPlayer;
  const root = storyPlayerRoot();
  if (!player || !root) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (typeof root.requestFullscreen === 'function') await root.requestFullscreen();
    else throw new Error('no full screen here');
  } catch (e) {
    if (storyPlayer !== player) return;
    player.notice = 'The browser did not give full screen.';
    renderStoryPlayer();
  }
}
document.addEventListener('fullscreenchange', () => { if (storyPlayer) renderStoryPlayer(); });

// zoom and pan of the player's own diagram: the pure parts of the editor's framing (`diagramFitScale`, `diagramAutoScale`, `diagramFrameCenter`) over the state of the player

function playerCanvas() {
  return storyPlayer && typeof document !== 'undefined' ? document.getElementById('player-canvas') : null;
}

/** The drawing on screen when it is an SVG, else null. */
function playerDrawing() {
  const diagram = storyPlayer && storyPlayer.scene ? storyPlayer.scene.diagram : null;
  return diagram && diagram.hasSvg ? diagram : null;
}

/** The part of the canvas the drawing is framed in: the tools float over the bottom, so that strip does not count. */
function playerViewSize(canvas) {
  const tools = canvas.parentElement && canvas.parentElement.querySelector ? canvas.parentElement.querySelector('.player-tools') : null;
  return { width: canvas.clientWidth, height: Math.max(1, canvas.clientHeight - (tools ? tools.offsetHeight + 16 : 0)) };
}

function resolvePlayerScale(canvas, drawing) {
  const framing = storyPlayer.framing;
  if (typeof framing.scale === 'number') return framing.scale;
  const view = playerViewSize(canvas);
  return framing.scale === 'fit' ? diagramFitScale(view, drawing) : diagramAutoScale(view, drawing);
}

/** Puts the drawing where the framing says, in the canvas as it is now, and the zoom label with it. Returns the scale applied. */
function applyPlayerFraming() {
  const canvas = playerCanvas();
  const drawing = playerDrawing();
  const svg = canvas && drawing && canvas.querySelector ? canvas.querySelector('svg') : null;
  if (!svg) return 1;
  const framing = storyPlayer.framing;
  const scale = resolvePlayerScale(canvas, drawing);
  svg.setAttribute('width', String(Math.round(drawing.width * scale)));
  svg.setAttribute('height', String(Math.round(drawing.height * scale)));
  const view = playerViewSize(canvas);
  // a slide has no selection to put in the middle: a drawing that does not fit is centered across and shown from its top
  if (typeof framing.scale !== 'number') framing.center = diagramFrameCenter(view, drawing, null, scale);
  svg.style.transform = 'translate(' + Math.round(canvas.clientWidth / 2 - framing.center.x * scale) + 'px,' + Math.round(view.height / 2 - framing.center.y * scale) + 'px)';
  const label = document.getElementById('player-zoom-label');
  if (label) { label.textContent = Math.round(scale * 100) + '%'; label.setAttribute('aria-label', 'Actual size (now ' + Math.round(scale * 100) + '%)'); }
  const fit = document.getElementById('player-fit-button');
  if (fit) fit.setAttribute('aria-pressed', String(framing.scale === 'fit'));
  const center = document.getElementById('player-center-button');
  if (center) center.setAttribute('data-lit', String(framing.scale === 'auto'));
  // the opening view stops at a readable size: say what is left out, and how to see it (as the editor's diagram does)
  const hint = document.getElementById('player-hint');
  if (hint) {
    const whole = framing.scale === 'auto' ? diagramFitScale(view, drawing) : 1;
    hint.textContent = whole < DIAGRAM_MIN_READABLE_SCALE - 0.005 && scale > whole + 0.005 ? 'Part of the diagram is out of view: Fit shows all of it (' + Math.round(whole * 100) + '%).' : '';
  }
  return scale;
}
window.addEventListener('resize', () => { if (storyPlayer) applyPlayerFraming(); });

/** The reader took over the framing (zoom, drag, wheel): what is on screen is the framing from now on. */
function takeOverPlayerFraming(canvas, drawing) {
  const framing = storyPlayer.framing;
  if (typeof framing.scale !== 'number') framing.scale = resolvePlayerScale(canvas, drawing);
}

/** Moves the view by (dx, dy) canvas pixels: the drawing follows. */
function movePlayerBy(dx, dy) {
  const canvas = playerCanvas();
  const drawing = playerDrawing();
  if (!canvas || !drawing) return;
  applyPlayerFraming();
  takeOverPlayerFraming(canvas, drawing);
  const framing = storyPlayer.framing;
  framing.center = { x: framing.center.x - dx / framing.scale, y: framing.center.y - dy / framing.scale };
  applyPlayerFraming();
}

/** Sets the scale ('fit', 'auto' or a number), keeping the point under (clientX, clientY), by default the middle of the canvas, where it is. */
function setPlayerScale(next, clientX, clientY) {
  const canvas = playerCanvas();
  const drawing = playerDrawing();
  if (!canvas || !drawing) return;
  const framing = storyPlayer.framing;
  if (next === 'fit' || next === 'auto') { framing.scale = next; applyPlayerFraming(); return; }
  applyPlayerFraming();
  const before = resolvePlayerScale(canvas, drawing);
  const rect = canvas.getBoundingClientRect();
  const view = playerViewSize(canvas);
  const ox = clientX === undefined ? 0 : clientX - rect.left - rect.width / 2;
  const oy = clientY === undefined ? 0 : clientY - rect.top - view.height / 2;
  framing.scale = next;
  const after = applyPlayerFraming();
  framing.center = { x: framing.center.x + ox / before - ox / after, y: framing.center.y + oy / before - oy / after };
  applyPlayerFraming();
}

/** One step along DIAGRAM_SCALES from the scale on screen. */
function playerScaleStep(direction) {
  const canvas = playerCanvas();
  const drawing = playerDrawing();
  const current = canvas && drawing ? resolvePlayerScale(canvas, drawing) : 1;
  const steps = DIAGRAM_SCALES.slice();
  if (direction > 0) return steps.find((s) => s > current + 0.01) || steps[steps.length - 1];
  return steps.reverse().find((s) => s < current - 0.01) || steps[steps.length - 1];
}

/** The wheel moves the diagram (shift, or a sideways wheel, moves it left and right); ctrl/⌘ + wheel zooms around the pointer. */
function handleStoryPlayerWheel(e) {
  const canvas = storyPlayer && e.target && e.target.closest ? e.target.closest('#player-canvas') : null;
  if (!canvas || !playerDrawing()) return;
  if (e.preventDefault) e.preventDefault();
  if (e.ctrlKey || e.metaKey) { setPlayerScale(playerScaleStep(e.deltaY < 0 ? 1 : -1), e.clientX, e.clientY); return; }
  const unit = e.deltaMode === 1 ? 16 : 1;
  const sideways = e.shiftKey && !e.deltaX;
  movePlayerBy(-(sideways ? e.deltaY : e.deltaX) * unit, -(sideways ? 0 : e.deltaY) * unit);
}

/** Drag the diagram with the mouse or a finger. */
function handleStoryPlayerPointerDown(e) {
  const canvas = storyPlayer && e.target && e.target.closest ? e.target.closest('#player-canvas') : null;
  const drawing = playerDrawing();
  if (!canvas || !drawing || e.button !== 0) return;
  applyPlayerFraming();
  takeOverPlayerFraming(canvas, drawing);
  const player = storyPlayer;
  const start = { x: e.clientX, y: e.clientY, center: { x: player.framing.center.x, y: player.framing.center.y } };
  let moved = false;
  const onMove = (m) => {
    const dx = m.clientX - start.x;
    const dy = m.clientY - start.y;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    moved = true;
    canvas.classList.add('panning');
    player.framing.center = { x: start.center.x - dx / player.framing.scale, y: start.center.y - dy / player.framing.scale };
    applyPlayerFraming();
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    canvas.classList.remove('panning');
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}

