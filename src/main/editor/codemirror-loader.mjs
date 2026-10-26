  try {
    const cm = await import('https://esm.sh/codemirror@6.0.1');
    const yamlMod = await import('https://esm.sh/@codemirror/lang-yaml@6.1.1');
    const jsonMod = await import('https://esm.sh/@codemirror/lang-json@6.0.1');
    window.CM = { EditorView: cm.EditorView, basicSetup: cm.basicSetup, yaml: yamlMod.yaml, json: jsonMod.json };
    // the colors of the code in the dark scheme (the default highlighting is written for a light page): a plain extra,
    // the editor works without it
    try {
      const language = await import('https://esm.sh/@codemirror/language@6');
      const lezer = await import('https://esm.sh/@lezer/highlight@1');
      const t = lezer.tags;
      window.CM.darkHighlight = language.syntaxHighlighting(language.HighlightStyle.define([
        { tag: [t.propertyName, t.definition(t.propertyName)], color: '#9cdcfe' },
        { tag: [t.string, t.special(t.string)], color: '#ce9178' },
        { tag: [t.number, t.integer, t.float], color: '#b5cea8' },
        { tag: [t.bool, t.null, t.atom, t.keyword], color: '#6cb0f0' },
        { tag: [t.comment, t.lineComment], color: '#9a9a9a', fontStyle: 'italic' },
        { tag: [t.meta, t.labelName, t.typeName, t.tagName], color: '#c586c0' },
        { tag: [t.punctuation, t.separator, t.bracket, t.squareBracket, t.brace], color: '#c8c8c8' }
      ]));
    } catch (e) {
      console.warn('The dark highlighting of the code editor could not be loaded.', e);
    }
    window.dispatchEvent(new Event('codemirror-ready'));
  } catch (e) {
    console.warn('CodeMirror failed to load — falling back to a plain textarea for YAML editing.', e);
  }
