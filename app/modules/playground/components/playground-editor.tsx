"use client";

import { useMemo } from "react";
import Editor from "@monaco-editor/react";
import { Circle, Save, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { playgroundEditorOptions } from "../lib";
import type { FlattenedTemplateFile, OpenFileTab } from "../types";

type PlaygroundEditorProps = {
  openFiles: OpenFileTab[];
  activeFile: FlattenedTemplateFile | null;
  hasDirtyFiles: boolean;
  onSelectFile: (fileId: string) => void;
  onCloseAllFiles: () => void;
  onCloseFile: (fileId: string) => void;
  onChange: (fileId: string, value: string) => void;
  onSaveFile: (fileId?: string) => void;
  onSaveAllFiles: () => void;
};

export function PlaygroundEditor({
  openFiles,
  activeFile,
  hasDirtyFiles,
  onSelectFile,
  onCloseAllFiles,
  onCloseFile,
  onChange,
  onSaveFile,
  onSaveAllFiles,
}: PlaygroundEditorProps) {
  const activeTab = useMemo(
    () => openFiles.find((file) => file.id === activeFile?.id) ?? null,
    [activeFile?.id, openFiles],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#090d1a]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0a1020] px-2 py-2">
        <ScrollArea className="w-full">
          <div className="flex min-w-max items-center gap-1">
            {openFiles.length ? (
              openFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onSelectFile(file.id)}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition",
                    activeFile?.id === file.id
                      ? "border-white/15 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      : "border-transparent bg-transparent text-white/55 hover:border-white/10 hover:bg-white/5 hover:text-white/80",
                  )}
                >
                  <span className="truncate">{file.name}</span>
                  {file.isDirty ? (
                    <Circle className="h-2.5 w-2.5 fill-amber-300 text-amber-300" />
                  ) : null}
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      onCloseFile(file.id);
                    }}
                    className="rounded-md p-0.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))
            ) : (
              <div className="px-2 py-1 text-sm text-white/35">
                No open files. Select one from the explorer to start editing.
              </div>
            )}
          </div>
        </ScrollArea>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0 text-white/55 hover:bg-white/10 hover:text-white disabled:text-white/25"
          onClick={onCloseAllFiles}
          disabled={!openFiles.length}
        >
          Close all
        </Button>
      </div>

      <div className="flex items-center justify-between border-b border-white/10 bg-[#0b1120] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-white">
              {activeFile?.name ?? "No file selected"}
            </p>
            {activeTab?.isDirty ? (
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[11px] text-amber-200">
                Unsaved
              </span>
            ) : activeFile ? (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[11px] text-emerald-200">
                Saved
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-white/45">
            {activeFile?.path ?? "Choose a file from the explorer to begin editing."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
            onClick={onSaveAllFiles}
            disabled={!hasDirtyFiles}
          >
            <Sparkles className="h-4 w-4" />
            Save all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
            onClick={() => onSaveFile(activeFile?.id)}
            disabled={!activeFile || !activeTab?.isDirty}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-[#0b1020]">
        {activeFile ? (
          <Editor
            key={activeFile.path}
            path={activeFile.path}
            language={activeFile.language}
            theme="vs-dark"
            value={activeFile.file.content}
            onMount={(instance, monaco) => {
              instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                onSaveFile(activeFile.id);
              });
              instance.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
                () => {
                  onSaveAllFiles();
                },
              );
            }}
            onChange={(nextValue) => onChange(activeFile.id, nextValue ?? "")}
            options={playgroundEditorOptions}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.08),transparent_35%)] p-6">
            <div className="max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-sm font-medium text-white">No active editor tab</p>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Open a file from the explorer or create a new one to start working.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
