// ---- Diagram: scale, scroll, highlight, keyboard, export ----

/** Below this the captions of the diagram stop being readable (the smallest one is 11px). */
const DIAGRAM_MIN_READABLE_SCALE = 0.8;
/** Room kept around the drawing, in pixels of the canvas. */
const DIAGRAM_MARGIN = 24;

/** The largest scale, at most 1 (a diagram is never enlarged), at which the whole drawing is in the view. */
function diagramFitScale(view, drawing) {
  const w = Math.max(1, view.width - 2 * DIAGRAM_MARGIN);
  const h = Math.max(1, view.height - 2 * DIAGRAM_MARGIN);
  return Math.max(0.1, Math.min(1, w / drawing.width, h / drawing.height));
}

/** How a diagram opens: the whole of it when that is readable, else a readable part of it. */
function diagramAutoScale(view, drawing) {
  return Math.max(DIAGRAM_MIN_READABLE_SCALE, diagramFitScale(view, drawing));
}

/**
 * The point of the drawing to put in the middle of the view. On an axis where the drawing fits, the drawing is
 * centered (never a blank half for an element at one end). Where it does not, the element is centered but the view
 * never goes past the drawing's edges; an element larger than the view is anchored by its start, so that its title
 * shows. `focal` is {x, y, w, h}, the center and the size of the element's box, in the drawing's pixels. With no focal
 * element (the map with nothing selected), a drawing that does not fit is centered across and shown from its top.
 */
function diagramFrameCenter(view, drawing, focal, scale) {
  const axis = (viewSize, drawingSize, center, size, fromStart) => {
    const span = viewSize / scale;
    const margin = DIAGRAM_MARGIN / scale;
    if (drawingSize + 2 * margin <= span) return drawingSize / 2;
    let target = center === null ? (fromStart ? 0 : drawingSize / 2) : center;
    if (size !== null && size * scale > viewSize - 2 * DIAGRAM_MARGIN) target = center - size / 2 - margin + span / 2;
    return Math.min(Math.max(target, span / 2 - margin), drawingSize - span / 2 + margin);
  };
  return {
    x: axis(view.width, drawing.width, focal ? focal.x : null, focal ? focal.w : null),
    y: axis(view.height, drawing.height, focal ? focal.y : null, focal ? focal.h : null, true)
  };
}

/** The part of the canvas the drawing is framed in: the toolbar floats over the bottom, so that strip does not count. */
function diagramViewSize(canvas) {
  const tools = canvas.parentElement && canvas.parentElement.querySelector('.diagram-tools');
  const covered = tools ? tools.offsetHeight + 16 : 0;
  return { width: canvas.clientWidth, height: Math.max(1, canvas.clientHeight - covered) };
}

/** The scale actually applied: 'auto' and 'fit' are worked out for the canvas as it is now. */
function resolveDiagramScale(canvas) {
  if (typeof diagramScale === 'number') return diagramScale;
  if (!diagramScene || !diagramScene.hasSvg) return 1;
  const view = diagramViewSize(canvas);
  const drawing = { width: diagramScene.width, height: diagramScene.height };
  // Center is a readable size, with or without an element to put in the middle (the map with nothing selected has none):
  // only Fit shows the whole drawing, however small
  return diagramScale === 'fit' ? diagramFitScale(view, drawing) : diagramAutoScale(view, drawing);
}

/** The user took over the framing (zoom, drag, wheel): keep what is on screen as the manual view. */
function takeOverDiagramFraming(canvas) {
  if (typeof diagramScale === 'number') return;
  const wasFit = diagramScale === 'fit';
  diagramScale = resolveDiagramScale(canvas);
  if (wasFit) diagramFramingChanged(); // the framing is no longer Fit
}

function applyDiagramScale() {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas || !diagramScene) return 1;
  const scale = resolveDiagramScale(canvas);
  const svg = canvas.querySelector('svg');
  if (svg) {
    svg.setAttribute('width', String(Math.round(diagramScene.width * scale)));
    svg.setAttribute('height', String(Math.round(diagramScene.height * scale)));
  }
  applyDiagramPan(canvas);
  const label = document.getElementById('diagram-zoom-label');
  if (label) { label.textContent = Math.round(scale * 100) + '%'; label.setAttribute('aria-label', 'Actual size (now ' + Math.round(scale * 100) + '%)'); }
  const fit = document.getElementById('diagram-fit-button');
  if (fit) fit.setAttribute('aria-pressed', String(diagramScale === 'fit'));
  const center = document.getElementById('diagram-center-button');
  if (center) center.setAttribute('data-lit', String(diagramScale === 'auto')); // an action that is lit while its framing holds, not a toggle
  // the opening view stops at a readable size: say what is left out, and how to see it
  const hint = document.getElementById('diagram-hint');
  if (hint) {
    const whole = diagramScene.hasSvg && diagramScale === 'auto'
      ? diagramFitScale(diagramViewSize(canvas), { width: diagramScene.width, height: diagramScene.height })
      : 1;
    hint.textContent = whole < DIAGRAM_MIN_READABLE_SCALE - 0.005 && scale > whole + 0.005 ? 'Part of the diagram is out of view: Fit shows all of it (' + Math.round(whole * 100) + '%).' : '';
  }
  return scale;
}

/** Put the drawing where the framing says, in the canvas as it is now. */
function applyDiagramPan(canvas) {
  const svg = canvas && canvas.querySelector('svg');
  if (!svg) return;
  const scale = resolveDiagramScale(canvas);
  if (typeof diagramScale !== 'number' && diagramScene) {
    const view = diagramViewSize(canvas);
    const drawing = { width: diagramScene.width, height: diagramScene.height };
    diagramCenter = diagramFrameCenter(view, drawing, diagramScale === 'auto' ? diagramScene.focal : null, scale);
  }
  const x = canvas.clientWidth / 2 - diagramCenter.x * scale;
  const y = diagramViewSize(canvas).height / 2 - diagramCenter.y * scale;
  svg.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
}

/** Move the view by (dx, dy) canvas pixels: the drawing follows. */
function moveDiagramBy(canvas, dx, dy) {
  applyDiagramPan(canvas); // the framing that is on screen is where the move starts
  takeOverDiagramFraming(canvas);
  const scale = resolveDiagramScale(canvas);
  diagramCenter = { x: diagramCenter.x - dx / scale, y: diagramCenter.y - dy / scale };
  applyDiagramPan(canvas);
}

/** Change the scale, keeping the point under (clientX, clientY) — by default the middle of the canvas — where it is. */
function setDiagramScale(next, clientX, clientY) {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas || !diagramScene || !diagramScene.hasSvg) return;
  if (next === 'fit' || next === 'auto') {
    diagramScale = next;
    applyDiagramScale();
    diagramFramingChanged();
    return;
  }
  applyDiagramPan(canvas);
  const before = resolveDiagramScale(canvas);
  const rect = canvas.getBoundingClientRect();
  // the pointer's offset from the middle of the canvas
  const ox = clientX === undefined ? 0 : clientX - rect.left - rect.width / 2;
  const oy = clientY === undefined ? 0 : clientY - rect.top - diagramViewSize(canvas).height / 2;
  diagramScale = next;
  const after = applyDiagramScale();
  diagramCenter = { x: diagramCenter.x + ox / before - ox / after, y: diagramCenter.y + oy / before - oy / after };
  applyDiagramPan(canvas);
  diagramFramingChanged();
}

/** One step along DIAGRAM_SCALES from the scale on screen. */
function diagramScaleStep(direction) {
  const canvas = document.getElementById('diagram-canvas');
  const current = canvas ? resolveDiagramScale(canvas) : 1;
  const steps = DIAGRAM_SCALES.slice();
  if (direction > 0) return steps.find((s) => s > current + 0.01) || steps[steps.length - 1];
  return steps.reverse().find((s) => s < current - 0.01) || steps[steps.length - 1];
}

/** Back to how the diagram opens: the element in the middle, at a readable size. */
function resetDiagramView() {
  diagramScale = 'auto';
  applyDiagramScale();
  diagramFramingChanged();
}

/** Pan so that a box is inside the canvas (keyboard focus can land on a box that is out of sight). */
function revealDiagramNode(node) {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas || !node) return;
  const box = (node.querySelector('.dg-box, .dg-header') || node).getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const view = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + diagramViewSize(canvas).height };
  const margin = 24;
  let dx = 0;
  let dy = 0;
  if (box.left < view.left + margin) dx = view.left + margin - box.left;
  else if (box.right > view.right - margin) dx = view.right - margin - box.right;
  if (box.top < view.top + margin) dy = view.top + margin - box.top;
  else if (box.bottom > view.bottom - margin) dy = view.bottom - margin - box.bottom;
  if (dx || dy) moveDiagramBy(canvas, dx, dy);
}

/** What identifies the box (or fold button) of the diagram that `el` is, to find it again once the drawing is rebuilt; null for anything else. */
function diagramFocusTargetOf(el) {
  const part = el && el.closest ? el.closest('#diagram-canvas .dg-node, #diagram-canvas .dg-fold, #diagram-canvas .dg-link') : null;
  if (part && part.classList.contains('dg-link')) return diagramLinkKeyOf(part);
  return part ? { fold: part.classList.contains('dg-fold'), id: part.getAttribute('data-id') } : null;
}

/** The box of the diagram a fold button belongs to (they are siblings in the drawing). */
function diagramNodeOf(el) {
  const node = el && el.closest ? el.closest('.dg-node') : null;
  if (node) return node;
  const fold = el && el.closest ? el.closest('.dg-fold') : null;
  if (!fold) return null;
  const id = fold.getAttribute('data-id');
  return Array.from(document.querySelectorAll('#diagram-canvas .dg-node')).find((n) => n.getAttribute('data-id') === id) || null;
}

/** What tells a link of the drawing from the others: its pair of boxes and, when it has a twin, its position among them (`data-nth`, else null). */
function diagramLinkKeyOf(link) {
  return { link: true, from: link.getAttribute('data-from'), to: link.getAttribute('data-to'), nth: diagramLinkNth(link) };
}

/** The position (`data-nth`) of a link among the links of its pair, as text; null for a link that has no twin. */
function diagramLinkNth(link) {
  const nth = link.getAttribute('data-nth');
  return nth === null || nth === undefined ? null : nth;
}

/** The link of the drawing that `key` (see `diagramLinkKeyOf`) names; with a twin that is gone, the first link of the pair; else null. */
function findDiagramLink(links, key) {
  const ofPair = links.filter((el) => el.getAttribute('data-from') === key.from && el.getAttribute('data-to') === key.to);
  return ofPair.find((el) => diagramLinkNth(el) === key.nth) || ofPair[0] || null;
}

/**
 * After the drawing is on screen: exactly one link is the tab stop. The one the focus last rested on if the drawing still has it,
 * else the first link of the selected pair, else the first link drawn; what is kept is what was chosen, so it is never a link the
 * drawing lacks. A drawing with no link has no stop.
 */
function syncLinkTabStop(canvas) {
  if (!canvas || !canvas.querySelectorAll) return;
  const links = Array.from(canvas.querySelectorAll('.dg-link'));
  if (!links.length) { diagramLinkStop = null; return; }
  const sel = diagramSelection();
  const remembered = diagramLinkStop ? findDiagramLink(links, diagramLinkStop) : null;
  const selected = sel.kind === 'link' ? links.find((el) => el.getAttribute('data-from') === sel.from && el.getAttribute('data-to') === sel.to) : null;
  setLinkTabStop(links, remembered || selected || links[0]);
}

/**
 * The boxes of a diagram are one tab stop too (roving tabindex): `tabindex="0"` on one of them, `-1` on the others, the arrow keys move between them
 * (`handleDiagramKeydown`) and the stop follows the focus. This is the id of the box where the focus last rested, or null. A ghost box keeps its own stop.
 */
let diagramNodeStop = null;

/** After the drawing is on screen: the box the focus last rested on if the drawing still has it, else the selected one, else the focal one, else the first. */
function syncNodeTabStop(canvas) {
  if (!canvas || !canvas.querySelectorAll) return;
  const nodes = Array.from(canvas.querySelectorAll('.dg-node')).filter((el) => !el.classList.contains('dg-ghost'));
  if (!nodes.length) { diagramNodeStop = null; return; }
  const remembered = diagramNodeStop ? nodes.find((el) => el.getAttribute('data-id') === diagramNodeStop) : null;
  const named = (cls) => nodes.find((el) => el.classList.contains(cls));
  setNodeTabStop(nodes, remembered || named('dg-selected') || named('dg-focal') || nodes[0]);
}

/** `stop` is the one box of `nodes` that Tab reaches; its id is remembered. */
function setNodeTabStop(nodes, stop) {
  for (const el of nodes) el.setAttribute('tabindex', el === stop ? '0' : '-1');
  diagramNodeStop = stop.getAttribute('data-id');
}

/** `stop` is the one link of `links` that Tab reaches; its key is remembered. */
function setLinkTabStop(links, stop) {
  for (const el of links) el.setAttribute('tabindex', el === stop ? '0' : '-1');
  diagramLinkStop = diagramLinkKeyOf(stop);
}

/** Arrow keys, Home and End on a focused link: the link to go to in the order of the drawing (no wrap-around), or null. */
function diagramLinkTarget(links, current, key) {
  const index = links.indexOf(current);
  if (index < 0) return null;
  if (key === 'Home') return links[0];
  if (key === 'End') return links[links.length - 1];
  const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
  return links[Math.min(links.length - 1, Math.max(0, index + step))];
}

/**
 * After the drawing was rebuilt: the focus goes back to the same box (or fold button, else the box it belonged to, else
 * the canvas), unless the user has meanwhile gone elsewhere.
 */
function restoreDiagramFocus(canvas) {
  const wanted = pendingDiagramFocus;
  pendingDiagramFocus = null;
  if (!wanted || !canvas.querySelectorAll) return;
  const active = document.activeElement;
  if (active && active !== document.body && !(canvas.contains && canvas.contains(active))) return;
  const find = (selector) => Array.from(canvas.querySelectorAll(selector)).find((el) => el.getAttribute('data-id') === wanted.id);
  const link = wanted.link ? findDiagramLink(Array.from(canvas.querySelectorAll('.dg-link')), wanted) : null;
  const target = link || (wanted.link ? null : ((wanted.fold ? find('.dg-fold') : null) || find('.dg-node'))) || canvas;
  if (target.focus) target.focus({ preventScroll: true });
}

/** Put a computed diagram on screen: markup, status, scale, then the scroll position. */
function showDiagramScene(scene) {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas) return;
  // on the map, "the element" is the one selected: Center puts it in the middle, Fit shows everything
  if (canvas.hasAttribute('data-map')) {
    const sel = AppState.selection;
    const pickedRemoved = removedInspectionOf(sel, 'map'); // a removed box that was clicked is the element Center puts in the middle
    scene.focal = pickedRemoved && scene.boxes && scene.boxes[pickedRemoved.reference] ? scene.boxes[pickedRemoved.reference] : sel.kind === 'element' && scene.boxes && scene.boxes[sel.key] ? scene.boxes[sel.key] : null;
    // scenes that say nothing about what they draw (an error) leave the selection alone and the check for the next one
    if (scene.drawnIds) {
      const selectionIsDrawn = sel.kind === 'element' && (sel.layer === 'application' && mapLayer() === 'technology' ? !!scene.drawnApps && scene.drawnApps.has(sel.key) : scene.drawnIds.has(sel.key));
      if (mapSelectionCheck && sel.kind === 'element' && !selectionIsDrawn) {
        AppState.selection = { kind: 'none', key: null, mode: 'view' };
        syncHashFromState();
        document.querySelectorAll('.element-header-subject, [data-action="open-as-diagram"]').forEach((el) => el.remove());
        if (comparisonPanelOn()) refreshRightPanel(); else removeInspectionPanel(); // a comparison keeps its Changes panel
      }
      mapSelectionCheck = false;
    }
  }
  diagramScene = scene;
  document.querySelectorAll('[data-action="diagram-export"]').forEach((button) => { button.disabled = !scene.hasSvg; }); // nothing to download from a message
  canvas.innerHTML = scene.html;
  const status = document.getElementById('diagram-status');
  if (status) { status.textContent = scene.status; status.title = scene.status; }
  const legend = document.getElementById('diagram-legend');
  if (legend) legend.innerHTML = scene.legend;
  syncDiagramKey();
  applyDiagramScale();
  // the same diagram, whichever perspective shows it, keeps the view the user chose; another one opens framed on its element
  if (scene.viewKey !== diagramShownView && typeof diagramScale === 'number') diagramScale = 'auto';
  applyDiagramScale();
  diagramShownView = scene.viewKey;
  reconcileLinkSelection();
  if (rightPanelPending && comparisonPanelOn() && !(comparisonState() || {}).pending) refreshRightPanel(); // the kernel is loaded now: the list of the changes fills the panel
  markMapSelection();
  markLinkSelection();
  syncLinkTabStop(canvas);
  syncNodeTabStop(canvas);
  revealSelectedLink(canvas);
  markMapScope();
  markInspection();
  restoreDiagramFocus(canvas);
  if (diagramResizeObserver) diagramResizeObserver.disconnect();
  if (typeof ResizeObserver === 'function') {
    diagramResizeObserver = new ResizeObserver(() => applyDiagramScale());
    diagramResizeObserver.observe(canvas);
  }
}

/** On the map and on the page of a view, the element selected by a click on a box is outlined. (The tree of the map selects nothing: it only folds and unfolds.) */
function markMapSelection() {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas || !(canvas.hasAttribute('data-map') || canvas.getAttribute('data-host') === 'library')) return;
  canvas.querySelectorAll('.dg-selected').forEach((el) => el.classList.remove('dg-selected'));
  const sel = diagramSelection();
  const removed = removedInspectionOf(sel, canvas.getAttribute('data-host') === 'library' ? 'library' : 'map'); // a removed box that was clicked
  if (removed) {
    const box = Array.from(canvas.querySelectorAll('.dg-node')).find((el) => el.getAttribute('data-ref') === removed.reference && el.getAttribute('data-layer') === removed.layer);
    if (box) box.classList.add('dg-selected');
    return;
  }
  if (sel.kind !== 'element') return;
  // the Map's boxes are the elements themselves (id = reference); on the page of a view a box can be an element hosted by another (id differs): its reference and layer say which
  const onPage = canvas.getAttribute('data-host') === 'library';
  const deployed = !onPage && sel.layer === 'application' && mapLayer() === 'technology'; // a deployed application of the Map of the technology layer: told by its reference and its layer
  // an application deployed on several nodes is several boxes of one reference: all of them are the selection
  const nodes = Array.from(canvas.querySelectorAll('.dg-node')).filter((el) => onPage || deployed
    ? el.getAttribute('data-ref') === sel.key && (!sel.layer || el.getAttribute('data-layer') === sel.layer)
    : el.getAttribute('data-id') === sel.key);
  nodes.forEach((node) => node.classList.add('dg-selected'));
}

/** Dim everything but a box (or a link) and what it is linked to — for pointer hover and keyboard focus. */
function highlightDiagram(target) {
  const svg = document.querySelector('#diagram-canvas svg');
  if (!svg) return;
  svg.querySelectorAll('.dg-on').forEach((el) => el.classList.remove('dg-on'));
  if (!target) { svg.classList.remove('dg-dim'); return; }
  const ids = new Set();
  const lit = (el) => { el.classList.add('dg-on'); ids.add(el.getAttribute('data-from')); ids.add(el.getAttribute('data-to')); };
  if (target.classList.contains('dg-link')) {
    const from = target.getAttribute('data-from');
    const to = target.getAttribute('data-to');
    svg.querySelectorAll('.dg-link, .dg-label').forEach((el) => { if (el.getAttribute('data-from') === from && el.getAttribute('data-to') === to) lit(el); });
  } else {
    const id = target.getAttribute('data-id');
    ids.add(id);
    svg.querySelectorAll('.dg-link, .dg-label').forEach((el) => { if (el.getAttribute('data-from') === id || el.getAttribute('data-to') === id) lit(el); });
  }
  svg.querySelectorAll('.dg-node, .dg-fold').forEach((el) => { if (ids.has(el.getAttribute('data-id'))) el.classList.add('dg-on'); });
  svg.classList.add('dg-dim');
}

function handleDiagramPointerOver(e) {
  const inCanvas = e.target.closest && e.target.closest('#diagram-canvas');
  if (!inCanvas) return;
  highlightDiagram(e.target.closest('.dg-node, .dg-fold, .dg-link'));
}

/** The pointer left the canvas: the dimming goes (unless a box has the keyboard focus, which keeps its own). */
function handleDiagramPointerOut(e) {
  const canvas = e.target.closest && e.target.closest('#diagram-canvas');
  if (!canvas) return;
  const into = e.relatedTarget;
  if (into && canvas.contains && canvas.contains(into)) return;
  const focused = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.dg-node, .dg-fold, .dg-link') : null;
  highlightDiagram(focused && canvas.contains(focused) ? focused : null);
}

function handleDiagramFocus(e) {
  if (!(e.target.closest && e.target.closest('#diagram-canvas'))) return;
  const node = e.type === 'focusin' ? e.target.closest('.dg-node, .dg-fold, .dg-link') : null;
  highlightDiagram(node);
  if (node) revealDiagramNode(node);
  // the stop of the links goes where their focus is (a click, an arrow key, Tab coming back, the focus given back after a redraw)
  if (node && node.classList.contains('dg-link')) setLinkTabStop(Array.from(document.querySelectorAll('#diagram-canvas .dg-link')), node);
  if (node && node.classList.contains('dg-node') && !node.classList.contains('dg-ghost')) setNodeTabStop(Array.from(document.querySelectorAll('#diagram-canvas .dg-node')).filter((el) => !el.classList.contains('dg-ghost')), node);
}

/**
 * The wheel moves the diagram (shift, or a sideways wheel, moves it left and right); ctrl/⌘ + wheel zooms around the
 * pointer. Nothing scrolls: the canvas is a free surface.
 */
function handleAppWheel(e) {
  const canvas = e.target.closest && e.target.closest('#diagram-canvas');
  // no drawing (the plain list shown when the layout engine could not load, a message): the wheel scrolls it as usual
  if (!canvas || !canvas.querySelector('svg')) return;
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    setDiagramScale(diagramScaleStep(e.deltaY < 0 ? 1 : -1), e.clientX, e.clientY);
    return;
  }
  const unit = e.deltaMode === 1 ? 16 : 1;
  const sideways = e.shiftKey && !e.deltaX;
  moveDiagramBy(document.getElementById('diagram-canvas'), -(sideways ? e.deltaY : e.deltaX) * unit, -(sideways ? 0 : e.deltaY) * unit);
}

/** The canvas never scrolls (a focused box can make the browser try); the drawing moves with `diagramCenter` instead. */
function keepDiagramCanvasStill(e) {
  if (e.target && e.target.id === 'diagram-canvas') { e.target.scrollLeft = 0; e.target.scrollTop = 0; }
}

/** Drag the diagram with the mouse; a drag is never taken for a click on the box it started on. */
function startDiagramPan(e) {
  const canvas = e.target.closest('#diagram-canvas');
  if (!canvas || e.button !== 0) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const start = { x: startX, y: startY, center: { x: diagramCenter.x, y: diagramCenter.y } };
  let moved = false;
  let taken = false;
  const onMove = (m) => {
    const dx = m.clientX - startX;
    const dy = m.clientY - startY;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    moved = true;
    canvas.classList.add('panning');
    if (!taken) { applyDiagramPan(canvas); takeOverDiagramFraming(canvas); start.center = { x: diagramCenter.x, y: diagramCenter.y }; taken = true; }
    const scale = resolveDiagramScale(canvas);
    diagramCenter = { x: start.center.x - dx / scale, y: start.center.y - dy / scale };
    applyDiagramPan(canvas);
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    canvas.classList.remove('panning');
    if (moved) {
      diagramPanned = true;
      setTimeout(() => { diagramPanned = false; }, 0);
    }
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}

/** The box next to `from` in an arrow key's direction, or null. */
function diagramNeighbor(from, key) {
  const anchor = (el) => (el.querySelector('.dg-box, .dg-header') || el).getBoundingClientRect();
  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const origin = center(anchor(from));
  let best = null;
  for (const el of document.querySelectorAll('#diagram-canvas .dg-node')) {
    if (el === from) continue;
    const group = el.querySelector('.dg-group');
    if (group) { // a box that encloses the one the arrow starts from is not "next to" it
      const g = group.getBoundingClientRect();
      if (origin.x >= g.left && origin.x <= g.right && origin.y >= g.top && origin.y <= g.bottom) continue;
    }
    const c = center(anchor(el));
    const dx = c.x - origin.x;
    const dy = c.y - origin.y;
    const along = key === 'ArrowRight' ? dx : key === 'ArrowLeft' ? -dx : key === 'ArrowDown' ? dy : -dy;
    const across = (key === 'ArrowRight' || key === 'ArrowLeft') ? dy : dx;
    if (along <= 1 || Math.abs(across) > along * 2) continue;
    const score = along + 2 * Math.abs(across);
    if (!best || score < best.score) best = { el, score };
  }
  return best ? best.el : null;
}

/** Keyboard on the diagram: arrows move between boxes, Enter opens, + - 0 F zoom. */
function handleDiagramKeydown(e) {
  if (!(e.target.closest && e.target.closest('.diagram-stage')) || e.ctrlKey || e.metaKey || e.altKey) return;
  const canvas = document.getElementById('diagram-canvas');
  if (e.key === 'Enter' || e.key === ' ') {
    const actionable = e.target.closest('[data-action]');
    if (actionable && e.target.closest('#diagram-canvas') && actionable.tagName.toLowerCase() === 'g') {
      e.preventDefault();
      actionable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    return;
  }
  // on a link the arrow keys, Home and End move among the links (they are one tab stop); on a box they move between boxes
  const onLink = e.target.closest('.dg-link');
  if (onLink && canvas && (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End')) {
    e.preventDefault();
    const next = diagramLinkTarget(Array.from(canvas.querySelectorAll('.dg-link')), onLink, e.key);
    if (next && next !== onLink) next.focus({ preventScroll: true }); // the focus handler pans to it and moves the stop
    return;
  }
  if (e.key.startsWith('Arrow')) {
    const current = diagramNodeOf(e.target);
    const next = current ? diagramNeighbor(current, e.key) : canvas && canvas.querySelector('.dg-focal, .dg-node');
    if (next) {
      e.preventDefault();
      next.focus({ preventScroll: true }); // the focus handler pans to it
    }
    return;
  }
  if (e.key === '+' || e.key === '=') { e.preventDefault(); setDiagramScale(diagramScaleStep(1)); }
  else if (e.key === '-') { e.preventDefault(); setDiagramScale(diagramScaleStep(-1)); }
  else if (e.key === '0') { e.preventDefault(); setDiagramScale(1); }
  else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setDiagramScale('fit'); }
  else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); resetDiagramView(); }
  else if ((e.key === 'm' || e.key === 'M') && !diagramMaximized && (anyDiagramShown() || libraryDiagramShown())) { e.preventDefault(); toggleDiagramMaximized(); }
  else if (e.key === 'Escape' && diagramMaximized && (anyDiagramShown() || libraryDiagramShown())) { e.preventDefault(); toggleDiagramMaximized(); } // the maximized state is that of the diagram on screen (it is parked with the host)
  else if (e.key === 'Escape' && AppState.selection.kind === 'link' && anyDiagramShown()) { e.preventDefault(); dropLinkSelection(); render(); }
  else if (e.key === 'Escape' && libraryDiagramShown() && libraryPickFor(selectedViewId).selection) { e.preventDefault(); closeLibrarySelection(); }
}

/** The styles of the diagram with real colors, for an SVG that must look right outside this page. */
function diagramExportCss() {
  const style = getComputedStyle(document.documentElement);
  const c = (name) => style.getPropertyValue(name).trim();
  return '.dg-box{fill:' + c('--bg') + ';stroke:' + c('--border') + ';stroke-width:1.25}' +
    '.dg-stack{fill:' + c('--panel-bg') + '}' +
    '.dg-group{fill:none;stroke:' + c('--muted') + ';stroke-opacity:.55;stroke-width:1.5}' +
    // what the workspace styled: the --st-* variables stay inline on the boxes, these rules read them (the colours of the theme are the fallbacks)
    '.dg-styled>.dg-box{fill:var(--st-fill,' + c('--bg') + ');stroke:var(--st-stroke,' + c('--border') + ');stroke-width:var(--st-width,1.25px);stroke-dasharray:var(--st-dash,none)}' +
    '.dg-styled>.dg-stack{fill:var(--st-fill,' + c('--panel-bg') + ')}' +
    '.dg-styled>.dg-group{fill:var(--st-fill,none);stroke:var(--st-stroke,' + c('--muted') + ');stroke-opacity:var(--st-stroke-opacity,.55);stroke-width:var(--st-width,1.5px);stroke-dasharray:var(--st-dash,none)}' +
    '.dg-shadow>.dg-box,.dg-shadow>.dg-group{filter:drop-shadow(2px 2px 2px rgba(0,0,0,.4))}' +
    '.dg-focal .dg-box,.dg-focal .dg-group{stroke:' + c('--accent') + ';stroke-width:2.5}' +
    '.dg-ghost .dg-box{stroke:' + c('--danger') + ';stroke-dasharray:5 4}' +
    '.dg-title{fill:' + c('--fg') + ';font:600 14px sans-serif}.dg-sub{fill:' + c('--muted') + ';font:12px sans-serif}.dg-desc{fill:' + c('--muted') + ';font:11px sans-serif}' +
    '.dg-styled .dg-title{fill:var(--st-text,' + c('--fg') + ');font-weight:var(--st-weight,600);font-style:var(--st-fstyle,normal)}' +
    '.dg-styled .dg-sub,.dg-styled .dg-desc{fill:var(--st-text,' + c('--muted') + ');font-weight:var(--st-weight,400);font-style:var(--st-fstyle,normal)}' +
    '.dg-over-fill .dg-title,.dg-over-fill .dg-sub{fill:var(--ov-text)}' +
    '.dg-badge rect{fill:var(--st-fill,' + c('--panel-bg') + ');stroke:var(--st-stroke,' + c('--border') + ');stroke-width:1}.dg-badge text{fill:var(--st-text,' + c('--fg') + ');font:600 10.5px sans-serif}' +
    '.dg-edge{fill:none;stroke:' + c('--muted') + ';stroke-width:1.4}.dg-aggregated{stroke-dasharray:7 4}' +
    '.dg-ghost-edge{stroke:' + c('--danger') + ';stroke-dasharray:3 4}' +
    // the comparison of two plateaus. The colours of the states in the theme of the page (the boxes carry var(--chg-*) in their --st-* variables), the tint, the strike, the lines of the links
    'svg{--chg-new:' + c('--chg-new') + ';--chg-changed:' + c('--chg-changed') + ';--chg-removed:' + c('--chg-removed') + ';--chg-removed-text:' + c('--chg-removed-text') + ';--chg-contains:' + c('--chg-contains') + '}' +
    'svg{--chg-moved:' + c('--chg-moved') + ';--chg-split:' + c('--chg-split') + ';--chg-merged:' + c('--chg-merged') + '}' + // the three states of identity (wave 009), for the boxes that carry them
    '.dg-tint{fill:var(--st-tint,none);fill-opacity:.16;stroke:none}.dg-compound .dg-tint{fill-opacity:.08}' +
    '.dg-struck{text-decoration:line-through}.dg-glyph{font-weight:700}.dg-label .dg-glyph{font-size:14px}' +
    '.dg-edge.dg-chg-new{stroke:' + c('--chg-new') + ';stroke-width:3;stroke-dasharray:none}' +
    '.dg-edge.dg-chg-changed{stroke:' + c('--chg-changed') + ';stroke-width:2;stroke-dasharray:2 3}' +
    '.dg-edge.dg-chg-removed{stroke:' + c('--chg-removed') + ';stroke-width:1.6;stroke-dasharray:7 4}' +
    '.dg-arrowhead.dg-chg-new{fill:' + c('--chg-new') + '}.dg-arrowhead.dg-chg-changed{fill:' + c('--chg-changed') + '}.dg-arrowhead.dg-chg-removed{fill:' + c('--chg-removed') + '}' +
    '.dg-arrowhead{fill:' + c('--muted') + '}' +
    '.dg-node.dg-context{opacity:.55}' +
    '.dg-label{fill:' + c('--fg') + ';font:11px sans-serif;paint-order:stroke;stroke:' + c('--panel-bg') + ';stroke-width:4px;stroke-linejoin:round}' +
    '.dg-header,.dg-hit,.dg-hit-edge{fill:none;stroke:none}.dg-fold{display:none}';
}

/** The diagram on screen as a self-contained SVG document (what the SVG file holds, and what the PNG is drawn from); null when nothing is drawn. */
function diagramExportDocument() {
  const canvas = document.getElementById('diagram-canvas');
  const svg = canvas && canvas.querySelector('svg');
  if (!svg || !diagramScene) return null;
  const clone = svg.cloneNode(true);
  // the page pans the drawing with an inline transform, which would push it out of the image: the file is the drawing itself
  clone.removeAttribute('style');
  clone.setAttribute('width', String(diagramScene.width));
  clone.setAttribute('height', String(diagramScene.height));
  clone.setAttribute('viewBox', '-4 -4 ' + diagramScene.width + ' ' + diagramScene.height);
  clone.classList.remove('dg-dim');
  clone.querySelectorAll('.dg-fold').forEach((el) => el.remove());
  clone.querySelectorAll('.dg-on').forEach((el) => el.classList.remove('dg-on'));
  for (const el of clone.querySelectorAll('[tabindex],[data-action]')) { el.removeAttribute('tabindex'); el.removeAttribute('data-action'); }
  for (const el of clone.querySelectorAll('[aria-pressed]')) el.removeAttribute('aria-pressed');
  for (const el of clone.querySelectorAll('.dg-links')) { el.removeAttribute('role'); el.removeAttribute('aria-label'); } // it describes keys of the page
  for (const el of clone.querySelectorAll('.dg-link-selected')) el.classList.remove('dg-link-selected');
  const ns = 'http://www.w3.org/2000/svg';
  const style = document.createElementNS(ns, 'style');
  style.textContent = diagramExportCss();
  const background = document.createElementNS(ns, 'rect');
  background.setAttribute('x', '-4');
  background.setAttribute('y', '-4');
  background.setAttribute('width', String(diagramScene.width));
  background.setAttribute('height', String(diagramScene.height));
  background.setAttribute('fill', getComputedStyle(document.documentElement).getPropertyValue('--panel-bg').trim() || '#ffffff');
  clone.insertBefore(background, clone.firstChild);
  clone.insertBefore(style, clone.firstChild);
  return {
    xml: '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone),
    width: diagramScene.width,
    height: diagramScene.height,
    name: (canvas.getAttribute('data-ref') || canvas.getAttribute('data-view') || 'diagram').replace(/[^\w.-]+/g, '_') + '-' + (diagramShownView ? diagramShownView.split('|')[1] : 'diagram')
  };
}

function downloadDiagramFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download the diagram as a self-contained SVG. */
function exportDiagramSvg() {
  const exported = diagramExportDocument();
  if (exported) downloadDiagramFile(new Blob([exported.xml], { type: 'image/svg+xml' }), exported.name + '.svg');
}

/** A PNG is drawn at twice the size of the diagram, less when that would pass this many pixels on its longest side (a browser refuses a canvas much bigger). */
const DIAGRAM_PNG_MAX_SIDE = 8000;

/** Download the diagram as a PNG: the SVG of the export, drawn on a canvas. */
async function exportDiagramPng() {
  const exported = diagramExportDocument();
  if (!exported) return;
  try {
    const scale = Math.min(2, DIAGRAM_PNG_MAX_SIDE / Math.max(exported.width, exported.height, 1));
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('the browser could not draw the diagram'));
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(exported.xml);
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(exported.width * scale));
    canvas.height = Math.max(1, Math.round(exported.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('the image is too big for the browser');
    downloadDiagramFile(blob, exported.name + '.png');
  } catch (e) {
    console.error('PNG export failed', e);
    alert('The PNG could not be made: ' + (e && e.message ? e.message : String(e)) + '. The SVG download does not have this limit.');
  }
}

/**
 * The pair of boxes joined by a link becomes the selection (with the element of the diagram it was made on, in Elements).
 * `nth`: which of the links of the pair was clicked, when there are several (`data-nth`); the selection keeps the
 * relationships of that link (`via`, their keys), not the position, which a redraw may change: the panel marks them.
 */
function selectLink(from, to, layer, nth) {
  const canvas = document.getElementById('diagram-canvas');
  const focal = mapIsShown() || !canvas ? null : canvas.getAttribute('data-ref');
  AppState.selection = linkSelectionFor(from, to, layer, nth, focal);
}

/** The selection a click on a link makes (the drawing on screen says which relationships the link stands for); `focal`: the element of an Elements diagram. */
function linkSelectionFor(from, to, layer, nth, focal) {
  const sel = { kind: 'link', key: from + ' -> ' + to, from, to, layer: layer || 'application', mode: 'view' };
  if (focal) sel.focal = focal;
  const pair = inspectionLinkFor(sel);
  if (pair && pair.links.length > 1 && Number.isInteger(nth) && pair.links[nth]) sel.via = relationshipsOfLink(pair.links[nth], pair).map(relationshipKeyOf);
  return sel;
}

/** Moving to another element or viewpoint is a step the browser's Back button should be able to undo. */
function pushDiagramHistory() {
  if (currentPerspective === 'elements' || mapIsShown()) history.pushState(null, '', location.href);
}

