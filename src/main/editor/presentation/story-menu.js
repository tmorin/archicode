// ---- What is drawn ----

/** How a step is named in the menu when it names no view of its own: the first words of what it says (wave 020, run 0149). */
const STORY_MENU_WORDS = 6;

/**
 * The title of a step in the menu of the steps: the label of the view it names (`viewLabel`, as the bar and the story editor say it), else the first words of its text, else
 * the label of the recipe it carries (the element and the viewpoint), else what is wrong with it (a view that is gone, a step with no view).
 */
function storyStepTitle(step) {
  const view = stepView(step);
  if (view && step.view) return viewLabel(view);
  const words = typeof step.text === 'string' ? step.text.split(/\s+/).filter(Boolean) : [];
  if (words.length)
    return words.length > STORY_MENU_WORDS
      ? words
          .slice(0, STORY_MENU_WORDS)
          .join(' ')
          .replace(/[\s,:;.\-–—]+$/, '') + '…'
      : words.join(' ');
  if (view) return viewLabel(view);
  return step.view ? 'Missing view “' + step.view + '”' : 'No view';
}

/**
 * The menu of the steps of a story (wave 020, run 0149, #142, second request; T7), the player's since wave 021 (run 0153): a native `<select data-player-step-menu>`, so that the keys,
 * the touch and the screen readers work as for any list and the bar of the player does not grow past the window at 360 px. One entry per step, "n. title", the step on screen
 * selected; a step that cannot be shown (`stepProblem`, looked at in the plateau the step is drawn at from `options.home`, the player's) says so in the text of its entry and
 * carries the sentence as its title. A story with one step has nothing to choose: no menu. `className` is the class of the list; `options.label` and `options.title` its
 * accessible name and its tooltip. The one handler is `handleStoryPlayerChange`.
 */
function renderStoryStepMenuHtml(story, current, className, options) {
  const steps = storySteps(story);
  if (steps.length < 2) return '';
  const opts = options || {};
  const id = escapeHtml(story.id);
  const entries = steps.map((step, i) => {
    const problem = stepProblem(step, stepPlateauAt(step, opts.home), i + 1);
    return (
      '<option value="' +
      i +
      '"' +
      (i === current ? ' selected' : '') +
      (problem ? ' title="' + escapeHtml(problem) + '"' : '') +
      '>' +
      (i + 1) +
      '. ' +
      escapeHtml(storyStepTitle(step)) +
      (problem ? ' — cannot be shown: ' + escapeHtml(problem) : '') +
      '</option>'
    );
  });
  return (
    '<select class="' +
    (className || 'player-step-menu') +
    '" data-player-step-menu data-story="' +
    id +
    '" aria-label="' +
    escapeHtml(opts.label || 'Go to a step of the story') +
    '" title="' +
    escapeHtml(opts.title || 'Go to any step') +
    '">' +
    entries.join('') +
    '</select>'
  );
}
