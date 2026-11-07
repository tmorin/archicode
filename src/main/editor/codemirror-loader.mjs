try {
  // the address of the asset beside the page, from the <meta> the build writes; none: window.CM stays undefined
  const meta = document.querySelector('meta[name="archicode-asset:codemirror.js"]');
  const content = meta ? meta.getAttribute('content') : null;
  if (!content) throw new Error('the page names no codemirror.js asset');
  // a classic script, which a page opened from a disk (file://) may load, unlike a module: it sets window.ArchiCodeCodeMirror
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(content, document.baseURI).href;
    script.onload = resolve;
    script.onerror = () => reject(new Error('the script ' + script.src + ' could not be loaded'));
    document.head.appendChild(script);
  });
  const cm = window.ArchiCodeCodeMirror;
  if (!cm) throw new Error('codemirror.js did not define ArchiCodeCodeMirror');
  window.CM = { EditorView: cm.EditorView, basicSetup: cm.basicSetup, yaml: cm.yaml, json: cm.json };
  // the colors of the code in the dark scheme (the default highlighting is written for a light page): a plain extra,
  // the editor works without it
  try {
    const language = cm;
    const t = cm.tags;
    window.CM.darkHighlight = language.syntaxHighlighting(
      language.HighlightStyle.define([
        { tag: [t.propertyName, t.definition(t.propertyName)], color: '#9cdcfe' },
        { tag: [t.string, t.special(t.string)], color: '#ce9178' },
        { tag: [t.number, t.integer, t.float], color: '#b5cea8' },
        { tag: [t.bool, t.null, t.atom, t.keyword], color: '#6cb0f0' },
        { tag: [t.comment, t.lineComment], color: '#9a9a9a', fontStyle: 'italic' },
        { tag: [t.meta, t.labelName, t.typeName, t.tagName], color: '#c586c0' },
        { tag: [t.punctuation, t.separator, t.bracket, t.squareBracket, t.brace], color: '#c8c8c8' }
      ])
    );
  } catch (e) {
    console.warn('The dark highlighting of the code editor could not be loaded.', e);
  }
  window.dispatchEvent(new Event('codemirror-ready'));
} catch (e) {
  console.warn('CodeMirror failed to load — falling back to a plain textarea for YAML editing.', e);
}
