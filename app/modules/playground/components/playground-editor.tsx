"use client";

import Editor from "@monaco-editor/react";

type PlaygroundEditorProps = {
  filePath: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
};

export function PlaygroundEditor({
  filePath,
  language,
  value,
  onChange,
}: PlaygroundEditorProps) {
  return (
    <div className="h-full min-h-0 bg-[#0b1020]">
      <Editor
        path={filePath}
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        options={{
          fontSize: 14,
          fontLigatures: true,
          minimap: { enabled: false },
          padding: { top: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          automaticLayout: true,
          wordWrap: "on",
          tabSize: 2,
        }}
      />
    </div>
  );
}
