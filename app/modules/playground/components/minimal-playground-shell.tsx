"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Save, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { PlaygroundEditor } from "./playground-editor";
import { PlaygroundExplorer } from "./playground-explorer";
import { useFileExplorer } from "../hooks/useFileExplorer";
import { createStarterTemplate, findFileById } from "../lib";
import type { CreateTemplateNodeInput } from "../types";
import { useWebContainer } from "../../webcontainers/hooks/useWebContainer";
import WebContainerPreview from "../../webcontainers/components/webcontainer-preview";

type MinimalPlaygroundShellProps = {
  projectId: string;
  projectName: string;
  backHref?: string;
};

export function MinimalPlaygroundShell({
  projectId,
  projectName,
  backHref = "/dashboard",
}: MinimalPlaygroundShellProps) {
  const starterTemplate = useMemo(
    () => createStarterTemplate(projectName),
    [projectName],
  );
  const [restartKey, setRestartKey] = useState(0);

  const {
    templateData,
    tree,
    openFiles,
    activeFile,
    activeFileId,
    dirtyFileIds,
    hasDirtyFiles,
    selectFile,
    closeAllFiles,
    closeFile,
    updateFileContent,
    prepareSaveFile,
    prepareSaveAllFiles,
    markFilesSaved,
    createNode,
    renameNode,
    deleteNode,
  } = useFileExplorer(starterTemplate);

  const {
    instance,
    isLoading,
    error,
    writeFile,
    createDirectory,
    renameEntry,
    deleteEntry,
  } = useWebContainer();

  const handleSaveFile = useCallback(async (fileId?: string) => {
    const savedFile = prepareSaveFile(fileId);
    if (!savedFile) {
      toast.message("Nothing to save.");
      return;
    }

    try {
      await writeFile(savedFile.path, savedFile.content);
      markFilesSaved([savedFile]);
      toast.success(`Saved ${savedFile.path}`);
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : "Unable to save that file.",
      );
    }
  }, [markFilesSaved, prepareSaveFile, writeFile]);

  const handleSaveAllFiles = useCallback(async () => {
    const savedFiles = prepareSaveAllFiles();
    if (!savedFiles.length) {
      toast.message("Nothing to save.");
      return;
    }

    const results = await Promise.allSettled(
      savedFiles.map((file) => writeFile(file.path, file.content)),
    );
    const successfulFiles = savedFiles.filter(
      (_file, index) => results[index]?.status === "fulfilled",
    );
    const failedResults = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    if (successfulFiles.length) {
      markFilesSaved(successfulFiles);
    }

    if (!failedResults.length) {
      toast.success(
        `Saved ${successfulFiles.length} file${successfulFiles.length === 1 ? "" : "s"}.`,
      );
      return;
    }

    if (successfulFiles.length) {
      toast.error(
        `${failedResults.length} file${failedResults.length === 1 ? "" : "s"} could not be saved.`,
      );
      return;
    }

    const firstFailure = failedResults[0]?.reason;
    toast.error(
      firstFailure instanceof Error ? firstFailure.message : "Unable to save all files.",
    );
  }, [markFilesSaved, prepareSaveAllFiles, writeFile]);

  const handleCreateNode = async (input: CreateTemplateNodeInput) => {
    let result: ReturnType<typeof createNode> | null = null;

    try {
      result = createNode(input);

      if (result.kind === "folder") {
        await createDirectory(result.createdPath);
        toast.success(`Created folder ${result.createdPath}`);
        return;
      }

      const createdFile = findFileById(result.template, result.createdPath);
      await writeFile(result.createdPath, createdFile?.file.content ?? "");
      toast.success(`Created file ${result.createdPath}`);
    } catch (mutationError) {
      result?.rollback();
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to create that item.",
      );
    }
  };

  const handleRenameNode = async (nodePath: string, nextName: string) => {
    let result: ReturnType<typeof renameNode> | null = null;

    try {
      result = renameNode(nodePath, nextName);

      await renameEntry(result.previousPath, result.nextPath);
      toast.success(`Renamed to ${result.nextPath}`);
    } catch (mutationError) {
      result?.rollback();
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to rename that item.",
      );
    }
  };

  const handleDeleteNode = async (nodePath: string) => {
    let result: ReturnType<typeof deleteNode> | null = null;

    try {
      result = deleteNode(nodePath);

      await deleteEntry(result.deletedPath);
      toast.success(`Deleted ${result.deletedPath}`);
    } catch (mutationError) {
      result?.rollback();
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to delete that item.",
      );
    }
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isMonacoTarget = Boolean(target?.closest(".monaco-editor"));
      const isEditableField = Boolean(
        target?.closest("input, textarea, [contenteditable='true']"),
      );

      if (isMonacoTarget || isEditableField) {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        void handleSaveAllFiles();
        return;
      }

      void handleSaveFile(activeFileId ?? undefined);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeFileId, handleSaveAllFiles, handleSaveFile]);

  return (
    <main className="h-screen overflow-hidden bg-[#050816] text-white">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#050816]/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {projectName}
              </p>
              <p className="truncate text-xs text-white/45">
                Workspace {projectId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
              onClick={handleSaveAllFiles}
              disabled={!hasDirtyFiles}
            >
              <Save className="h-4 w-4" />
              Save all
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              type="button"
              className="bg-white text-black hover:bg-white/90"
              onClick={() => setRestartKey((value) => value + 1)}
            >
              <RefreshCw className="h-4 w-4" />
              Restart preview
            </Button>
          </div>
        </header>

        <div className="flex items-center justify-between border-b border-white/10 bg-[#060b16] px-4 py-2 text-xs text-white/45">
          <span>
            {openFiles.length} open tab{openFiles.length === 1 ? "" : "s"} and{" "}
            {dirtyFileIds.length} unsaved change
            {dirtyFileIds.length === 1 ? "" : "s"}
          </span>
          <span>
            {hasDirtyFiles
              ? "Save to sync changes into the running preview."
              : "Preview is in sync with the saved filesystem state."}
          </span>
        </div>

        <div className="min-h-0 flex-1">
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel defaultSize={22} minSize={16}>
              <PlaygroundExplorer
                tree={tree}
                activeFileId={activeFileId}
                dirtyFileIds={dirtyFileIds}
                onSelectFile={selectFile}
                onCreateNode={handleCreateNode}
                onRenameNode={handleRenameNode}
                onDeleteNode={handleDeleteNode}
              />
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-white/10" />

            <ResizablePanel defaultSize={43} minSize={28}>
              <PlaygroundEditor
                openFiles={openFiles}
                activeFile={activeFile}
                hasDirtyFiles={hasDirtyFiles}
                onSelectFile={selectFile}
                onCloseAllFiles={closeAllFiles}
                onCloseFile={closeFile}
                onChange={updateFileContent}
                onSaveFile={handleSaveFile}
                onSaveAllFiles={handleSaveAllFiles}
              />
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-white/10" />

            <ResizablePanel defaultSize={35} minSize={24}>
              <WebContainerPreview
                templateData={templateData}
                instance={instance}
                isLoading={isLoading}
                error={error?.message ?? null}
                restartKey={restartKey}
                onRestart={() => setRestartKey((value) => value + 1)}
                runtimeKey={projectId}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </main>
  );
}
