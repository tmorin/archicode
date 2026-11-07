// Entry of the asset codemirror.js (src/main/editor/assets.json): the one module graph of CodeMirror, so that
// @codemirror/state and @codemirror/view exist once. codemirror-loader.mjs builds window.CM from these exports.
export { EditorView, basicSetup } from 'codemirror';
export { yaml } from '@codemirror/lang-yaml';
export { json } from '@codemirror/lang-json';
export { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
export { tags } from '@lezer/highlight';
