import type { editor } from "monaco-editor";

const extensionLanguageMap: Record<string, string> = {
  cjs: "javascript",
  css: "css",
  html: "html",
  js: "javascript",
  json: "json",
  jsx: "javascript",
  md: "markdown",
  mjs: "javascript",
  scss: "scss",
  ts: "typescript",
  tsx: "typescript",
  txt: "plaintext",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
};

export function getLanguageFromPath(filePath: string) {
  const match = /\.([a-z0-9]+)$/i.exec(filePath.trim());
  if (!match) {
    return "plaintext";
  }

  return extensionLanguageMap[match[1].toLowerCase()] ?? "plaintext";
}

export const playgroundEditorOptions: editor.IStandaloneEditorConstructionOptions =
  {
    automaticLayout: true,
    fontSize: 14,
    fontLigatures: true,
    lineHeight: 1.55,
    minimap: { enabled: false },
    padding: { top: 16, bottom: 16 },
    renderWhitespace: "selection",
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    tabSize: 2,
    wordWrap: "on",
  };
