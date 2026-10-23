'use strict';
// Wave 021, run 0153 (W-2), issue #153: *Play* opens a modal that covers the window and plays the story like slides (plan decisions T3, T5, T6). The scene of a step is W-1's
// (`storyStepScene`, story-player-scene.test.js); here is the modal around it: it is opened by Play and by an address, draws every step of the shipped stories as the editor draws
// them, walks them with Previous, Next, the menu and the keys, traps the focus and gives it back, says each step through the live region, has an address of its own (opening is an
// entry of the history, choosing a step is not, Back closes, Forward opens again, an address that names nothing leaves it closed), and leaves the editor behind it exactly as it was.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run } = require('./library-page');
const { waitFor } = require('./harness');
const {
  REPO, LAYERED, shippedFiles, SHIPPED, boxesAndLinks, openPlayerPage, sceneShown, playerClick, playerChoose, press, pressPlay, editorOf
} = require('./story-player-page');

const PAGE = process.env.ARCHICODE_EDITOR_HTML || path.join(REPO, 'src/main/resources/editor-webapp/standalone.html'); // the page under test (a test that must fail on an older page is run with ARCHICODE_EDITOR_HTML)
const tick = () => new Promise((resolve) => setImmediate(resolve));
const hashChanged = (page) => { for (const fn of page.sandbox.__windowListeners.hashchange || []) fn(); };

/** What the editor shows of the step the editing walk (`goToStoryStep`) is at: the drawing, the status line, the key, the plateau and the comparison. */
async function editingWalk(files, home, story) {
  const editing = await openPlayerPage(files, home);
  const count = editing.sandbox.storySteps(editing.sandbox.findStory(story)).length;
  const walked = [];
  for (let i = 0; i < count; i++) {
    editing.sandbox.goToStoryStep(story, i);
    await editing.drawn();
    const scene = editing.scene();
    const compare = editing.state.layers.compare;
    walked.push({ drawn: boxesAndLinks(scene.html), status: scene.status, legend: scene.legend, plateau: editing.state.layers.current, against: compare ? compare.other : null });
  }
  return walked;
}

/** What the player must show for a step of a shipped story, checked on the scene it holds and on the markup it has written. */
function checkStep(page, story, walked, i, count) {
  const player = run(page.sandbox, 'storyPlayer');
  const scene = player.scene;
  const where = story + ' step ' + (i + 1);
  assert.equal(player.step, i, where);
  assert.equal(scene.problem, null, where + ' can be drawn');
  assert.deepEqual(boxesAndLinks(scene.diagram.html), walked[i].drawn, where + ': the boxes and the links of the editor');
  assert.equal(scene.diagram.status, walked[i].status, where + ': the status line');
  assert.equal(scene.diagram.legend, walked[i].legend, where + ': the key');
  assert.equal(scene.plateau, walked[i].plateau, where + ': the plateau');
  assert.equal(scene.against, walked[i].against, where + ': the comparison');
  const html = page.root.innerHTML;
  assert.ok(html.includes('Step ' + (i + 1) + ' of ' + count), where + ': "Step n of N"');
  assert.deepEqual(boxesAndLinks(html), walked[i].drawn, where + ': the markup of the modal has the same boxes and links');
  assert.doesNotMatch(html, /id="diagram-key"|data-action=|role="link"/, where + ': the modal reuses no id of the page and offers no action on a box');
  assert.equal(/id="player-key"/.test(html), !!walked[i].against, where + ': the key of the comparison is there when the step compares');
  assert.match(html, new RegExp('<option value="' + i + '" selected>'), where + ': the menu is on the step');
  assert.equal(page.region.textContent, scene.announcement, where + ': the step is said through the live region');
  const step = page.sandbox.storySteps(page.sandbox.findStory(story))[i];
  assert.ok(html.includes(page.sandbox.escapeHtml(step.text || 'No words for this step.')), where + ': its words');
  assert.equal(/ disabled/.test(html.match(/data-player-action="previous"[^>]*>/)[0]), i === 0, where + ': Previous');
  assert.equal(/ disabled/.test(html.match(/data-player-action="next"[^>]*>/)[0]), i === count - 1, where + ': Next');
}

for (const { story, dir, homes } of SHIPPED) {
  homes.forEach((home) => {
    const label = story + (home.plateau ? ' from ' + home.plateau + ' (' + home.compare + ')' : '');
    test('story `' + label + '`: played in the modal step by step (Next, Previous), with the keys and from the menu, every step has the boxes and links the editor draws for it', async () => {
      const files = shippedFiles(dir);
      const walked = await editingWalk(files, home, story);
      const count = walked.length;
      assert.ok(count >= 2);
      const page = await openPlayerPage(files, home);
      const opener = pressPlay(page, story);
      await sceneShown(page, 0);
      assert.equal(page.root.hidden, false, 'the modal is on screen');
      assert.equal(page.inert.value, true, 'and the editor behind it is inert');
      assert.match(page.root.innerHTML, /role="dialog" aria-modal="true" aria-labelledby="player-title"/);
      assert.deepEqual(run(page.sandbox, 'storyPlayer.home'), run(page.sandbox, 'storyHomeNow()'), 'the home is the one on screen when Play was pressed');
      checkStep(page, story, walked, 0, count);

      for (let i = 1; i < count; i++) { playerClick(page, 'next'); await sceneShown(page, i); checkStep(page, story, walked, i, count); }
      for (let i = count - 2; i >= 0; i--) { playerClick(page, 'previous'); await sceneShown(page, i); checkStep(page, story, walked, i, count); }
      // the keys: Right, Left, End, Home
      press(page, 'ArrowRight'); await sceneShown(page, 1); checkStep(page, story, walked, 1, count);
      press(page, 'ArrowLeft'); await sceneShown(page, 0); checkStep(page, story, walked, 0, count);
      press(page, 'End'); await sceneShown(page, count - 1); checkStep(page, story, walked, count - 1, count);
      press(page, 'Home'); await sceneShown(page, 0); checkStep(page, story, walked, 0, count);
      // the menu, in an order that is not the story's: last to first, then from the ends towards the middle
      const order = [];
      for (let i = count - 1; i >= 0; i--) order.push(i);
      for (let lo = 0, hi = count - 1; lo <= hi; lo++, hi--) { order.push(lo); if (hi !== lo) order.push(hi); }
      for (const i of order) { playerChoose(page, i); await sceneShown(page, i); checkStep(page, story, walked, i, count); }
      // the entries of the menu: one per step, "n. title", none refused in a shipped story
      const entries = Array.from(page.root.innerHTML.matchAll(/<option value="(\d+)"( selected)?(?: title="([^"]*)")?>([^<]*)<\/option>/g));
      assert.equal(entries.length, count);
      entries.forEach((entry, i) => assert.ok(entry[3] === undefined && !entry[4].includes('cannot be shown') && new RegExp('^' + (i + 1) + '\\. \\S').test(entry[4]), 'entry ' + (i + 1)));

      // Escape closes it, the editor is no longer inert, the live region is emptied, the focus is back on Play
      press(page, 'Escape');
      assert.equal(run(page.sandbox, 'storyPlayer'), null);
      assert.equal(page.root.hidden, true);
      assert.equal(page.root.innerHTML, '');
      assert.equal(page.inert.value, false);
      assert.equal(page.region.textContent, '');
      assert.equal(page.dom.active, opener, 'the focus is back on the Play that opened it');
    });
  });
}

test('after playing and closing, the editor is what it was: AppState, the selection, the perspective, the address, the page, the caches and the files; modelsChanged() was not called; nothing changed while it was open', async () => {
  for (const { story, dir, homes } of SHIPPED) {
    for (const home of homes) {
      const page = await openPlayerPage(shippedFiles(dir), home);
      page.state.selection = { kind: 'element', key: 'customer', layer: 'application', mode: 'view' }; // the reader had something selected
      await page.show(); // the page draws it, and the address says it
      const before = editorOf(page);
      let changed = 0;
      const original = page.sandbox.modelsChanged;
      page.sandbox.modelsChanged = (...args) => { changed++; return original.apply(page.sandbox, args); };
      pressPlay(page, story);
      await sceneShown(page, 0);
      const count = page.sandbox.storySteps(page.sandbox.findStory(story)).length;
      const same = (a, b, what, ignore) => {
        assert.deepStrictEqual(b.state, a.state, what + ': AppState is deeply equal');
        a.identity.forEach((value, i) => assert.equal(b.identity[i], value, what + ': the same object (' + i + ')'));
        for (const key of ['perspective', 'version', 'activeStory', 'storyHome', 'selectedStoryId', 'storyBarNotice', 'removedStep', 'html', 'files', 'writes', 'shown'].concat(ignore ? [] : ['hash'])) assert.deepStrictEqual(b[key], a[key], what + ': ' + key);
        for (const key of ['diagramScene', 'diagramCache', 'comparisonCache']) assert.equal(b[key], a[key], what + ': ' + key + ' (the same object)');
      };
      for (let i = 1; i < count; i++) {
        playerClick(page, 'next');
        await sceneShown(page, i);
        if (i === 1) same(before, editorOf(page), story + ' while it is open', true);
      }
      playerChoose(page, 0);
      await sceneShown(page, 0);
      press(page, 'End');
      await sceneShown(page, count - 1);
      same(before, editorOf(page), story + ' at the last step', true);
      assert.match(page.sandbox.location.hash, new RegExp('play=' + story + '&step=' + (count - 1)), 'the address says what is played');
      press(page, 'Escape');
      page.sandbox.modelsChanged = original;
      assert.equal(changed, 0, story + ': modelsChanged() was not called');
      same(before, editorOf(page), story + ' after it is closed');
      assert.deepEqual(editorOf(page).writes, [], 'no file written');
    }
  }
});

test('the two toggles of the editor\'s diagram (Changes only, wording) are not read: the player draws a step with the defaults, whatever the editor has', async () => {
  const files = shippedFiles(LAYERED);
  const home = { plateau: 'marketplace', compare: 'past' };
  const scenesOf = async (page) => {
    pressPlay(page, 'fork_tour');
    const out = [];
    for (let i = 0; i < 4; i++) {
      await sceneShown(page, i);
      const scene = run(page.sandbox, 'storyPlayer.scene');
      out.push({ html: scene.diagram.html, legend: scene.diagram.legend, status: scene.diagram.status });
      if (i < 3) playerClick(page, 'next');
    }
    press(page, 'Escape');
    return out;
  };
  const plain = await openPlayerPage(files, home);
  const toggled = await openPlayerPage(files, home);
  toggled.state.changesOnly = true;
  toggled.state.hideWording = true;
  run(toggled.sandbox, 'diagramHideUnlinked = true;');
  assert.deepEqual(await scenesOf(toggled), await scenesOf(plain), 'the same scenes with the toggles on');
  // the scene itself has the two toggles as options of its own, off unless given
  const sandbox = plain.sandbox;
  const fixed = JSON.parse(JSON.stringify(run(sandbox, 'storyHomeNow()')));
  let fewer = 0;
  let fewerAt = 1;
  for (let i = 1; i < 7; i++) {
    const everything = await sandbox.storyStepScene('fork_tour', i, { home: fixed });
    const changes = await sandbox.storyStepScene('fork_tour', i, { home: fixed, changesOnly: true });
    assert.ok(everything.against, 'a comparison step');
    const [all, only] = [everything, changes].map((scene) => boxesAndLinks(scene.diagram.html).boxes.length);
    assert.ok(only <= all, 'Changes only never draws more');
    if (only < all) { fewer++; fewerAt = i; }
  }
  assert.ok(fewer >= 1, 'Changes only is an option of the scene, and draws less on some step');
  // and the editor's own walk still reads them
  toggled.sandbox.goToStoryStep('fork_tour', fewerAt);
  await toggled.drawn();
  plain.sandbox.goToStoryStep('fork_tour', fewerAt);
  await plain.drawn();
  assert.ok(boxesAndLinks(toggled.scene().html).boxes.length < boxesAndLinks(plain.scene().html).boxes.length, 'the editing diagram is still Changes only');
});

// ---- the modal: focus, keys, semantics ----

test('the focus is inside when it opens (Next), Tab goes round, Shift+Tab too, and Escape gives it back to Play', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  const opener = pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  assert.equal(page.dom.active.attrs['data-player-action'], 'next', 'the focus is on Next, which advances');
  const items = page.root.controls().filter((el) => !el.disabled);
  assert.deepEqual(items.map((el) => el.attrs['data-player-action'] || 'menu'), ['menu', 'next', 'close', 'zoom-out', 'zoom-reset', 'zoom-in', 'center', 'fit'], 'the controls Tab goes through, in the order of the page');
  // Tab on the last control goes to the first, Shift+Tab on the first goes to the last
  page.dom.active = items[items.length - 1];
  let event = press(page, 'Tab');
  assert.equal(event.defaultPrevented, true);
  assert.equal(page.dom.active, items[0]);
  event = press(page, 'Tab', { shiftKey: true });
  assert.equal(event.defaultPrevented, true);
  assert.equal(page.dom.active, items[items.length - 1]);
  // in the middle the browser moves the focus
  page.dom.active = items[1];
  event = press(page, 'Tab');
  assert.equal(event.defaultPrevented, false);
  // a focus that is outside (the page behind) is brought in
  page.dom.active = { tagName: 'BUTTON', closest: () => null };
  event = press(page, 'Tab');
  assert.equal(event.defaultPrevented, true);
  assert.equal(page.dom.active, items[0]);
  // the Close button closes, and the focus goes back to Play
  playerClick(page, 'close');
  assert.equal(run(page.sandbox, 'storyPlayer'), null);
  assert.equal(page.dom.active, opener);
  assert.ok(opener.focused >= 1);
});

test('the keys: Left and Right, Home and End walk the steps and stay in the story; a modifier, a dialog, the help and the menu of the steps keep their keys; Escape closes from anywhere, the menu included', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  const entries = page.sandbox.__history.entries.length;
  const at = () => run(page.sandbox, 'storyPlayer.step');
  // at the ends the keys do nothing, and are still taken
  let event = press(page, 'ArrowLeft');
  assert.equal(at(), 0);
  assert.equal(event.defaultPrevented, true);
  press(page, 'ArrowRight'); await sceneShown(page, 1);
  // a modifier leaves the key alone
  for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }]) { event = press(page, 'ArrowRight', extra); assert.equal(at(), 1); assert.equal(event.defaultPrevented, false); }
  // the menu of the steps owns the arrows, Home and End; Escape alone leaves from it
  const menu = page.root.querySelector('[data-player-step-menu]');
  page.dom.active = menu;
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) { event = press(page, key, { target: menu }); assert.equal(at(), 1, key + ' on the menu'); assert.equal(event.defaultPrevented, false); }
  // a dialog or the help open: not the player's keys
  run(page.sandbox, 'helpOpen = true;');
  page.dom.active = page.root.querySelector('[data-player-action="next"]');
  press(page, 'ArrowRight'); assert.equal(at(), 1);
  run(page.sandbox, 'helpOpen = false; appDialog = { kind: "text" };');
  press(page, 'ArrowRight'); assert.equal(at(), 1);
  press(page, 'Escape'); assert.notEqual(run(page.sandbox, 'storyPlayer'), null, 'a dialog keeps its Escape');
  run(page.sandbox, 'appDialog = null;');
  // another key is not taken
  event = press(page, 'a');
  assert.equal(event.defaultPrevented, false);
  assert.equal(page.sandbox.__history.entries.length, entries, 'no key made an entry of the history');
  page.dom.active = menu;
  event = press(page, 'Escape', { target: menu });
  assert.equal(run(page.sandbox, 'storyPlayer'), null, 'Escape closes from the menu');
  assert.equal(event.defaultPrevented, true);
});

test('Play on a story with no step is disabled and opens nothing; Play on the others is the one way in; a second Play while it is open does nothing', async () => {
  const files = Object.assign({}, shippedFiles(LAYERED), {
    'shared/story.empty.yaml': 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "empty"\n  name: "Nothing yet"\n'
  });
  const page = await openPlayerPage(files, {});
  run(page.sandbox, "libraryTab = 'stories'; selectedStoryId = 'empty';");
  assert.match(page.sandbox.renderLibraryPerspectiveHtml().center, /<button type="button" data-action="story-player-open" data-story="empty" disabled /);
  pressPlay(page, 'empty');
  assert.equal(run(page.sandbox, 'storyPlayer'), null);
  assert.equal(page.root.hidden, true);
  run(page.sandbox, "selectedStoryId = 'order_journey';");
  const center = page.sandbox.renderLibraryPerspectiveHtml().center;
  assert.match(center, /<button type="button" data-action="story-player-open" data-story="order_journey" title="Play the story like slides[^"]*">Play<\/button>/);
  assert.match(center, /data-action="story-play" data-story="order_journey" data-step="0"/, '"Show on diagram" is still there, per step');
  pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  const player = run(page.sandbox, 'storyPlayer');
  assert.equal(page.sandbox.openStoryPlayer('order_journey', 1), null, 'one player at a time');
  assert.equal(run(page.sandbox, 'storyPlayer'), player);
  assert.equal(page.sandbox.openStoryPlayer('nobody', 0), null);
  press(page, 'Escape');
  assert.equal(page.sandbox.openStoryPlayer('order_journey', 99), null, 'a step that is none');
});

test('Play does not clear what the editor was saying: the notice of the bar and the step that can be put back', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  run(page.sandbox, "storyBarNotice = 'a notice'; removedStep = { storyId: 'order_journey', index: 0, step: {} };");
  pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  assert.equal(run(page.sandbox, 'storyBarNotice'), 'a notice');
  assert.deepEqual(run(page.sandbox, 'removedStep.index'), 0);
});

test('the editor is untouched by a close that comes from a folder being closed or replaced: the player is gone with it', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  run(page.sandbox, 'resetUiState();');
  assert.equal(run(page.sandbox, 'storyPlayer'), null);
  assert.equal(page.root.hidden, true);
  assert.equal(page.inert.value, false);
});

// ---- the address ----

test('the address: opening is an entry of the history, choosing a step is not, Back closes it, Forward opens it again at the step it was; Escape goes back too', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  const h = page.sandbox.__history;
  const before = { hash: page.sandbox.location.hash, entries: h.entries.length, at: h.at };
  pressPlay(page, 'fork_tour');
  await sceneShown(page, 0);
  assert.equal(h.entries.length, before.entries + 1, 'opening made an entry');
  assert.equal(h.at, before.at + 1);
  assert.match(page.sandbox.location.hash, /[?&]play=fork_tour&step=0$/);
  const entries = h.entries.length;
  playerClick(page, 'next'); await sceneShown(page, 1);
  playerChoose(page, 3); await sceneShown(page, 3);
  page.dom.active = page.root.querySelector('[data-player-action="next"]');
  press(page, 'ArrowLeft'); await sceneShown(page, 2);
  assert.equal(h.entries.length, entries, 'choosing a step made no entry');
  assert.equal(h.at, before.at + 1);
  assert.match(page.sandbox.location.hash, /[?&]play=fork_tour&step=2$/, 'the step is in the address, which is rewritten in place');
  // Back closes it; Forward opens it again, at the step the entry holds
  page.sandbox.history.back();
  assert.equal(run(page.sandbox, 'storyPlayer'), null, 'Back closed it');
  assert.equal(page.root.hidden, true);
  assert.equal(page.sandbox.location.hash, before.hash, 'the address of the editor is the one it was');
  page.sandbox.history.forward();
  const player = await sceneShown(page, 2);
  assert.equal(player.story, 'fork_tour');
  assert.equal(page.root.hidden, false);
  assert.equal(page.inert.value, true);
  // Escape from a player the history holds an entry for goes Back, so that Forward opens it again
  press(page, 'Escape');
  assert.equal(h.at, before.at, 'Escape went back');
  assert.equal(page.sandbox.location.hash, before.hash);
  assert.equal(h.entries.length, entries, 'the entry is kept for Forward');
  page.sandbox.history.forward();
  await sceneShown(page, 2);
  assert.equal(run(page.sandbox, 'storyPlayer.story'), 'fork_tour');
  // an address typed by hand that names another step shows it, and makes no entry
  const typed = page.sandbox.location.hash.replace(/step=2$/, 'step=4');
  page.sandbox.history.replaceState(null, '', typed);
  hashChanged(page);
  await sceneShown(page, 4);
  assert.equal(h.entries.length, entries);
});

test('a link opens it at load for a reader who has the folder open: the home is the plateau of the link; an address that names nothing leaves it closed and is written back as it really is', async () => {
  const files = shippedFiles(LAYERED);
  const page = await openPlayerPage(files, {});
  page.sandbox.location.hash = '#/stories?story=fork_tour&play=fork_tour&step=2&plateau=marketplace';
  await page.sandbox.loadWorkspace(page.mem.handle);
  const player = await sceneShown(page, 2);
  assert.equal(player.story, 'fork_tour');
  assert.equal(player.home.plateau, 'marketplace', 'the plateau of the address is the home');
  assert.equal(page.root.hidden, false);
  assert.equal(page.inert.value, true);
  assert.match(page.sandbox.location.hash, /play=fork_tour&step=2/, 'the address keeps the link');
  assert.equal(run(page.sandbox, 'storyPlayer.entry'), false, 'a link made no entry of its own');
  // Escape rewrites the address in place, without the player\'s two keys
  const entries = page.sandbox.__history.entries.length;
  press(page, 'Escape');
  assert.doesNotMatch(page.sandbox.location.hash, /play=|step=/);
  assert.equal(page.sandbox.__history.entries.length, entries, 'no history was walked');
  assert.equal(page.root.hidden, true);

  for (const wrong of ['play=nobody&step=0', 'play=fork_tour&step=99', 'play=fork_tour', 'play=fork_tour&step=x', 'play=fork_tour&step=-1', 'play=fork_tour&step=', 'step=1']) {
    const other = await openPlayerPage(files, {});
    other.sandbox.location.hash = '#/timeline/applications?' + wrong;
    await other.sandbox.loadWorkspace(other.mem.handle);
    await tick();
    assert.equal(run(other.sandbox, 'storyPlayer'), null, wrong + ': closed');
    assert.equal(other.root.hidden, true);
    assert.doesNotMatch(other.sandbox.location.hash, /play=/, wrong + ': the address is written back as it really is');
  }
  // a typed address that names nothing, while the editor is open
  const typed = await openPlayerPage(files, {});
  typed.sandbox.location.hash = '#/timeline/applications?play=nobody&step=0';
  hashChanged(typed);
  assert.equal(run(typed.sandbox, 'storyPlayer'), null);
  assert.doesNotMatch(typed.sandbox.location.hash, /play=/);
  // a page that has no story at all
  const flat = await openPlayerPage({ '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n' }, {});
  flat.sandbox.location.hash = '#/timeline/applications?play=anything&step=0';
  await flat.sandbox.loadWorkspace(flat.mem.handle);
  assert.equal(run(flat.sandbox, 'storyPlayer'), null);
  assert.doesNotMatch(flat.sandbox.location.hash, /play=/);
});

test('the address with the player on top keeps the editor\'s own part: the step of a story walked on the diagram is not mixed with the step of the player', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  page.sandbox.goToStoryStep('order_journey', 1);
  await page.drawn();
  const bar = page.sandbox.location.hash;
  assert.match(bar, /[?&]story=order_journey&step=1$/);
  pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  playerClick(page, 'next');
  await sceneShown(page, 1);
  playerClick(page, 'next');
  await sceneShown(page, 2);
  const open = page.sandbox.location.hash;
  assert.match(open, /[?&]play=order_journey&step=2$/);
  assert.equal((open.match(/step=/g) || []).length, 1, 'one step in the address');
  assert.deepEqual(JSON.parse(JSON.stringify(run(page.sandbox, 'activeStory'))), { id: 'order_journey', step: 1 }, 'the story walked on the diagram is where it was');
  press(page, 'Escape');
  assert.equal(page.sandbox.location.hash, bar, 'and the bar\'s address is back as it was');
});

// ---- a step that cannot be drawn, a late answer, full screen, the key, zoom ----

const SYSTEM = (id) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const CONTAINER = (id, parent, plateau) => 'header:\n  kind: "archicode.morin.io/container"\n  parent: "' + parent + '"\n' + (plateau ? '  plateau: ' + plateau + '\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const PLATEAU = (id) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n';
const STORY = (id, steps) => 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  steps:\n' + steps;
const VIEW = (id, element) => 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "Named ' + id + '"\n  viewpoint: "overview"\n  properties:\n    element: "' + element + '"\n';
const FERRY = {
  '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n',
  'app.ferry.yaml': SYSTEM('ferry'),
  'later/plateau.yaml': PLATEAU('later'),
  'later/app.ferry.dock.yaml': CONTAINER('dock', 'ferry', 'later'),
  'view.dock.yaml': VIEW('dock_view', 'ferry.dock'),
  'story.tour.yaml': STORY('tour',
    '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: baseline\n      text: The ferry company as it is.\n' +
    '    - viewpoint: overview\n      properties:\n        element: ferry.dock\n      at: baseline\n      text: The dock, which is not there yet.\n' +
    '    - view: ghost_view\n' +
    '    - view: dock_view\n      at: later\n      against: baseline\n      text: The dock is new.\n')
};

test('a step that cannot be drawn is marked with its reason and the way on stays open: the other steps are drawn, the menu marks it, the live region says it', async () => {
  const page = await openPlayerPage(FERRY, {});
  pressPlay(page, 'tour');
  await sceneShown(page, 0);
  const menu = () => Array.from(page.root.innerHTML.matchAll(/<option value="(\d+)"( selected)?(?: title="([^"]*)")?>([^<]*)<\/option>/g), (m) => ({ value: Number(m[1]), title: m[3], text: m[4] }));
  assert.deepEqual(menu().map((entry) => entry.title !== undefined), [false, true, true, false], 'the menu marks the steps that cannot be shown, with the sentence as their title');
  assert.match(menu()[1].text, /cannot be shown: .*ferry\.dock/);
  playerClick(page, 'next'); await sceneShown(page, 1);
  let html = page.root.innerHTML;
  assert.match(html, /<strong>Step 2 cannot be shown\.<\/strong> [^<]*ferry\.dock[^<]* Use Previous, Next or the menu to go on\./);
  assert.doesNotMatch(html, /<svg/, 'no diagram');
  assert.ok(html.includes('The dock, which is not there yet.'), 'the words are there');
  assert.match(page.region.textContent, /^Step 2 of 4, .* — cannot be shown: .*ferry\.dock/);
  assert.doesNotMatch(html.match(/data-player-action="next"[^>]*>/)[0], / disabled/, 'the way on is open');
  assert.doesNotMatch(html.match(/data-player-action="previous"[^>]*>/)[0], / disabled/);
  playerClick(page, 'next'); await sceneShown(page, 2);
  assert.match(page.root.innerHTML, /ghost_view/);
  playerClick(page, 'next'); await sceneShown(page, 3);
  html = page.root.innerHTML;
  assert.match(html, /<svg/, 'the step after it is drawn');
  assert.match(html, /Plateau <b>[^<]*later[^<]*<\/b>[^<]*compared with <b>[^<]*baseline/s, 'the plateau and the comparison the step names, said');
  assert.match(html, /dg-chg-new/, 'the dock is new');
  assert.equal(page.region.textContent, run(page.sandbox, 'storyPlayer.scene.announcement'));
  assert.equal(run(page.sandbox, 'storyPlayer.scene.problem'), null);
});

test('the plateau of a step is said, and a step that names none says it is the editor\'s', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), { plateau: 'marketplace', compare: 'past' });
  pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  const scene = run(page.sandbox, 'storyPlayer.scene');
  assert.equal(scene.told.at, null, 'order_journey names no plateau');
  assert.match(page.root.innerHTML, /<p class="player-plateaus" data-player-plateaus>Plateau <b>[^<]*<\/b> <span class="player-inherited"[^>]*>\(from the editor\)<\/span>/);
  press(page, 'Escape');
  pressPlay(page, 'fork_tour');
  await sceneShown(page, 0);
  const named = run(page.sandbox, 'storyPlayer.scene');
  assert.notEqual(named.told.at, null, 'fork_tour names its plateaus');
  assert.doesNotMatch(page.root.innerHTML.match(/<p class="player-plateaus"[^]*?<\/p>/)[0].split('compared with')[0], /from the editor/);
});

test('the answer of a step the reader has left is dropped: Next, Next, then the first answer comes last and does not replace the step on screen', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  const { sandbox } = page;
  const original = sandbox.storyStepScene;
  const held = new Map();
  sandbox.__orig = original;
  sandbox.__gate = (id, i, options) => new Promise((resolve) => { held.set(i, () => original(id, i, options).then(resolve)); });
  run(sandbox, 'storyStepScene = __gate;');
  pressPlay(page, 'order_journey');
  playerClick(page, 'next');
  playerClick(page, 'next');
  assert.equal(run(sandbox, 'storyPlayer.step'), 2);
  assert.equal(run(sandbox, 'storyPlayer.scene'), null, 'drawing');
  assert.match(page.root.innerHTML, /Drawing the step…/);
  await held.get(2)();
  await sceneShown(page, 2);
  const shown = page.root.innerHTML;
  await held.get(0)();
  await held.get(1)();
  await tick();
  assert.equal(run(sandbox, 'storyPlayer.step'), 2);
  assert.equal(run(sandbox, 'storyPlayer.scene.index'), 2, 'the answers of the steps left are dropped');
  assert.equal(page.root.innerHTML, shown);
  run(sandbox, 'storyStepScene = __orig;');
});

test('a scene that fails is a step that cannot be shown, not a modal that is stuck', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  const { sandbox } = page;
  sandbox.__gate = () => Promise.reject(new Error('the layout broke'));
  run(sandbox, 'storyStepScene = __gate;');
  pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  assert.match(page.root.innerHTML, /The step could not be drawn: the layout broke/);
  assert.doesNotMatch(page.root.innerHTML.match(/data-player-action="next"[^>]*>/)[0], / disabled/);
});

test('full screen: the button is there when the browser can, a refusal says so and the modal stays, closing leaves it', async () => {
  const none = await openPlayerPage(shippedFiles(LAYERED), {});
  pressPlay(none, 'order_journey');
  await sceneShown(none, 0);
  assert.doesNotMatch(none.root.innerHTML, /data-player-action="fullscreen"/, 'no Fullscreen API, no button');

  const refusing = await openPlayerPage(shippedFiles(LAYERED), {}, { fullscreen: { request: async () => { throw new Error('refused'); } } });
  pressPlay(refusing, 'order_journey');
  await sceneShown(refusing, 0);
  assert.match(refusing.root.innerHTML, /data-player-action="fullscreen" aria-pressed="false"[^>]*>Full screen</);
  playerClick(refusing, 'fullscreen');
  await waitFor(() => /The browser did not give full screen\./.test(refusing.root.innerHTML), 'the notice of a refusal');
  assert.notEqual(run(refusing.sandbox, 'storyPlayer'), null, 'the modal stays');
  assert.equal(refusing.root.hidden, false);
  playerClick(refusing, 'next');
  await sceneShown(refusing, 1);
  assert.doesNotMatch(refusing.root.innerHTML, /did not give full screen/, 'the notice goes with the step');

  let asked = 0;
  let left = 0;
  const granting = await openPlayerPage(shippedFiles(LAYERED), {}, { fullscreen: { request: async () => { asked++; granting.sandbox.document.fullscreenElement = granting.root; } } });
  granting.sandbox.document.exitFullscreen = async () => { left++; granting.sandbox.document.fullscreenElement = null; };
  pressPlay(granting, 'order_journey');
  await sceneShown(granting, 0);
  playerClick(granting, 'fullscreen');
  await waitFor(() => asked === 1, 'the request');
  for (const fn of granting.sandbox.__documentListeners.fullscreenchange || []) fn();
  assert.match(granting.root.innerHTML, /aria-pressed="true"[^>]*>Exit full screen</);
  press(granting, 'Escape');
  assert.equal(left, 1, 'closing leaves full screen');
});

test('the key of a comparison is the player\'s own: its ids and its button, folded until it is opened, and the page\'s key is not duplicated', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  pressPlay(page, 'fork_tour');
  await sceneShown(page, 0);
  playerClick(page, 'next');
  await sceneShown(page, 1);
  const folded = page.root.innerHTML;
  assert.match(folded, /id="player-key"/);
  assert.match(folded, /data-player-action="toggle-key" aria-expanded="false" aria-controls="player-key"/);
  assert.doesNotMatch(folded, /id="diagram-key"|toggle-diagram-key/);
  assert.doesNotMatch(folded, /dg-key-open/);
  playerClick(page, 'toggle-key');
  assert.match(page.root.innerHTML, /class="dg-legend-compare dg-key-open"/);
  assert.match(page.root.innerHTML, /data-player-action="toggle-key" aria-expanded="true"/);
  assert.equal(run(page.sandbox, 'diagramKeyOpen'), false, 'the editor\'s own choice is not touched');
  playerClick(page, 'toggle-key');
  assert.equal(page.root.innerHTML, folded);
});

test('zoom and pan are the player\'s own: the buttons and the wheel frame its diagram and never the editor\'s', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  const editorFraming = JSON.stringify([run(page.sandbox, 'diagramScale'), run(page.sandbox, 'diagramCenter')]);
  pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  const canvas = page.playerCanvas();
  const drawing = run(page.sandbox, 'storyPlayer.scene.diagram');
  const widthAt = (scale) => String(Math.round(drawing.width * scale));
  assert.equal(canvas.svg.attrs.width, widthAt(run(page.sandbox, 'diagramAutoScale({ width: 800, height: 600 }, { width: ' + drawing.width + ', height: ' + drawing.height + ' })')), 'it opens at a readable size');
  playerClick(page, 'zoom-in');
  const zoomed = Number(canvas.svg.attrs.width);
  assert.ok(zoomed > Math.round(drawing.width * 0.8));
  playerClick(page, 'zoom-reset');
  assert.equal(canvas.svg.attrs.width, widthAt(1));
  playerClick(page, 'zoom-out');
  assert.equal(canvas.svg.attrs.width, widthAt(0.8));
  playerClick(page, 'fit');
  assert.equal(run(page.sandbox, 'storyPlayer.framing.scale'), 'fit');
  assert.match(page.root.innerHTML, /id="player-fit-button"/);
  playerClick(page, 'center');
  assert.equal(run(page.sandbox, 'storyPlayer.framing.scale'), 'auto');
  // the wheel moves the diagram, ctrl+wheel zooms
  const target = { closest: (selector) => (selector === '#player-canvas' ? canvas : null) };
  const wheel = (extra) => { let prevented = false; for (const fn of page.root.listeners.wheel) fn(Object.assign({ target, deltaX: 0, deltaY: 120, deltaMode: 0, preventDefault() { prevented = true; } }, extra)); return prevented; };
  const moved = canvas.svg.style.transform;
  assert.equal(wheel({}), true);
  assert.notEqual(canvas.svg.style.transform, moved, 'the wheel pans');
  assert.equal(typeof run(page.sandbox, 'storyPlayer.framing.scale'), 'number', 'the framing is the reader\'s now');
  const before = canvas.svg.attrs.width;
  wheel({ ctrlKey: true, deltaY: -120, clientX: 100, clientY: 100 });
  assert.ok(Number(canvas.svg.attrs.width) > Number(before), 'ctrl+wheel zooms in');
  // another step opens framed afresh
  playerClick(page, 'next');
  await sceneShown(page, 1);
  assert.equal(run(page.sandbox, 'storyPlayer.framing.scale'), 'auto');
  assert.equal(JSON.stringify([run(page.sandbox, 'diagramScale'), run(page.sandbox, 'diagramCenter')]), editorFraming, 'the editor\'s framing was never touched');
});

test('the modal survives what redraws the editor: render() leaves it alone, and the live region is outside #app', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  pressPlay(page, 'order_journey');
  await sceneShown(page, 0);
  const shown = page.root.innerHTML;
  page.sandbox.render();
  assert.equal(page.root.innerHTML, shown, 'a redraw of the editor does not touch the modal');
  assert.match(page.sandbox.location.hash, /play=order_journey&step=0$/, 'and keeps its address');
  const html = fs.readFileSync(PAGE, 'utf8');
  assert.match(html, /<div id="story-announcer"[^>]*><\/div>\s*<!--[^>]*-->\s*<div id="story-player" class="story-player" hidden><\/div>/, 'the player is a container beside #app, hidden until it is opened');
  assert.ok(html.indexOf('<div id="app"></div>') < html.indexOf('id="story-player"'), 'after #app, not inside it');
});

// ---- the bar over the editing diagram, and what is gone ----

test('the bar over the editing diagram has no Previous, Next, menu or Read; it keeps what shows one step; the grep of the gate prints 0', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), {});
  page.sandbox.goToStoryStep('fork_tour', 1);
  await page.drawn();
  const bar = page.sandbox.renderStoryBarHtml();
  assert.doesNotMatch(bar, /story-prev|story-next|story-step-menu|data-player|>Read</);
  for (const kept of ['story-bar-title', 'Step 2 of 7', 'story-bar-words', 'told at ', 'data-action="story-bar-edit"', 'data-action="story-edit"', 'data-action="story-exit"']) assert.ok(bar.includes(kept), kept);
  assert.doesNotMatch(bar, /story-restore/, 'the screen is the step');
  page.sandbox.drawPlateau('marketplace');
  assert.match(page.sandbox.renderStoryBarHtml(), /data-action="story-restore"/, '"Back to this step" still applies');
  const html = fs.readFileSync(PAGE, 'utf8');
  assert.equal((html.match(/readingMode|read=1|renderReadingShellHtml|quietDiagramForReading/g) || []).length, 0, 'the grep of the gate prints 0');
  for (const name of ['chooseStoryStep', 'story-prev', 'story-next', 'data-story-step-menu', 'story-step-menu']) assert.ok(!html.includes(name), name + ' is gone from the editing layout');
  // the walk on the diagram is "Show on diagram", and it did not move the player
  assert.equal(run(page.sandbox, 'storyPlayer'), null);
});

test('the page of the player: a title for the dialog, no horizontal scroll rules left out, a layout that never grows past the window', () => {
  const html = fs.readFileSync(PAGE, 'utf8');
  const css = html.slice(html.indexOf('.story-player[hidden]'), html.indexOf('.player-words.muted') + 80);
  assert.match(css, /\.story-player \{ position: fixed; inset: 0;/);
  assert.match(css, /\.player-shell \{ height: 100vh; height: 100dvh; display: flex; flex-direction: column; min-width: 0; max-width: 100vw; overflow: hidden;/);
  assert.match(css, /\.player-bar \{ flex: none; display: flex; flex-wrap: wrap;/);
  assert.match(css, /\.player-step-menu \{ flex: 0 1 22rem; min-width: 0; max-width: 100%;/);
  assert.match(css, /\.player-words \{[^}]*overflow-y: auto;[^}]*overflow-wrap: anywhere;/);
  assert.ok(!/\.story-player[^{]*\{[^}]*overflow-x: scroll/.test(css));
});

test('while the player is open the keys of the editor are off: J and K of the changes do not walk, and the hint of a drawing that does not fit is the player\'s own', async () => {
  const page = await openPlayerPage(shippedFiles(LAYERED), { plateau: 'marketplace', compare: 'past' });
  const { sandbox } = page;
  let asked = 0;
  sandbox.__asked = () => { asked++; return true; };
  run(sandbox, 'changesListIsOnPage = __asked;');
  const event = { key: 'j', target: { tagName: 'BODY', closest: () => null }, preventDefault() {} };
  sandbox.handleChangesKeydown(event);
  assert.equal(asked, 1, 'the editor listens while the player is closed');
  pressPlay(page, 'fork_tour');
  await sceneShown(page, 0);
  sandbox.handleChangesKeydown(event);
  assert.equal(asked, 1, 'and does not while it is open');
  assert.match(page.root.innerHTML, /<span class="player-hint" id="player-hint"><\/span>/, 'the hint has its place in the status line');
});
