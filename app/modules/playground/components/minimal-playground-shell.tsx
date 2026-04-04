"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  FolderGit2,
  PanelLeft,
  RefreshCw,
  Save,
  Share2,
  SquareTerminal,
} from "lucide-react";
import { toast } from "sonner";
import { GitHubRepositoryPicker } from "@/app/modules/github/components/github-repository-picker";
import { useGitHubRepositories } from "@/app/modules/github/hooks/useGitHubRepositories";
import type {
  GitHubRepoFilesResponse,
  GitHubRepositorySummary,
} from "@/app/modules/github/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import TerminalComponent, {
  type TerminalRef,
} from "../../webcontainers/components/terminal";
import { getWebContainerRuntimeOutputBuffer } from "../../webcontainers/components/runtime-output-buffer";
import { PanelResizeHandle } from "./panel-resize-handle";
import { PlaygroundExplorer } from "./playground-explorer";
import { useFileExplorer } from "../hooks/useFileExplorer";
import { useIdeLayout } from "../hooks/useIdeLayout";
import { createStarterTemplate, findFileById } from "../lib";
import type { CreateTemplateNodeInput, TemplateFolder } from "../types";
import { useWebContainer } from "../../webcontainers/hooks/useWebContainer";

type MinimalPlaygroundShellProps = {
  projectId: string;
  projectName: string;
  backHref?: string;
  initialRepositoryFullName?: string | null;
};

const LazyPlaygroundEditor = dynamic(
  () => import("./playground-editor").then((module) => module.PlaygroundEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#090d1a] text-sm text-white/45">
        Loading editor...
      </div>
    ),
  },
);

const LazyWebContainerPreview = dynamic(
  () => import("../../webcontainers/components/webcontainer-preview"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#050816] text-sm text-white/45">
        Loading preview...
      </div>
    ),
  },
);

async function fetchGitHubRepositoryFiles(repositoryFullName: string) {
  const searchParams = new URLSearchParams({
    repo: repositoryFullName,
  });
  const response = await fetch(`/api/github/repo-files?${searchParams.toString()}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as
    | GitHubRepoFilesResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : "Unable to import that GitHub repository.",
    );
  }

  return payload as GitHubRepoFilesResponse;
}

function getRepositoryName(fullName: string) {
  return fullName.split("/").filter(Boolean).at(-1) ?? fullName;
}

function createEmptyTemplate(folderName: string): TemplateFolder {
  return {
    folderName,
    items: [],
  };
}

function ImportingRepositoryPanel({
  repositoryFullName,
}: {
  repositoryFullName: string;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-[#050816] p-6">
      <div className="max-w-sm rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center text-white">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Spinner className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm font-semibold">Importing repository</p>
        <p className="mt-2 text-sm leading-6 text-white/55">
          Loading files from <span className="font-medium text-white">{repositoryFullName}</span>
          {" "}and preparing the workspace preview.
        </p>
      </div>
    </div>
  );
}

export function MinimalPlaygroundShell({
  projectId,
  projectName,
  backHref = "/dashboard",
  initialRepositoryFullName = null,
}: MinimalPlaygroundShellProps) {
  const starterTemplate = useMemo(
    () => createStarterTemplate(projectName),
    [projectName],
  );
  const initialTemplate = useMemo(
    () =>
      initialRepositoryFullName
        ? createEmptyTemplate(getRepositoryName(initialRepositoryFullName))
        : starterTemplate,
    [initialRepositoryFullName, starterTemplate],
  );
  const [restartKey, setRestartKey] = useState(0);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedImportRepository, setSelectedImportRepository] =
    useState<GitHubRepositorySummary | null>(null);
  const [importedRepository, setImportedRepository] =
    useState<GitHubRepositorySummary | null>(null);
  const [detectedProjectType, setDetectedProjectType] = useState<string | null>(null);
  const [isImportingRepository, setIsImportingRepository] = useState(
    Boolean(initialRepositoryFullName),
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [isInitialImportResolved, setIsInitialImportResolved] = useState(
    !initialRepositoryFullName,
  );
  const initialImportAttemptedRef = useRef(false);
  const terminalRef = useRef<TerminalRef | null>(null);
  const layout = useIdeLayout({
    storageKey: `minimal-playground-layout:${projectId}`,
  });
  const primaryButtonClass =
    "rounded-xl border border-blue-500/40 bg-blue-600 text-white shadow-[0_12px_32px_rgba(37,99,235,0.26)] hover:bg-blue-500";
  const secondaryButtonClass =
    "rounded-xl border border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10";

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
    loadTemplate,
    createNode,
    renameNode,
    deleteNode,
  } = useFileExplorer(initialTemplate);

  const {
    repositories: githubRepositories,
    isLoading: isLoadingRepositories,
    error: githubRepositoriesError,
    fetchRepositories,
  } = useGitHubRepositories({
    enabled: isImportDialogOpen,
  });

  const {
    instance,
    isLoading,
    error,
    writeFile,
    createDirectory,
    renameEntry,
    deleteEntry,
  } = useWebContainer();

  const importRepositoryByFullName = useCallback(
    async (
      repositoryFullName: string,
      options: {
        announceSuccess?: boolean;
        skipConfirm?: boolean;
      } = {},
    ) => {
      if (
        !options.skipConfirm &&
        (hasDirtyFiles || templateData.items.length > 0) &&
        !window.confirm(
          hasDirtyFiles
            ? "Importing a GitHub repository will replace the current files and discard unsaved changes. Continue?"
            : "Importing a GitHub repository will replace the current workspace files. Continue?",
        )
      ) {
        return null;
      }

      setIsImportingRepository(true);
      setImportError(null);

      try {
        const payload = await fetchGitHubRepositoryFiles(repositoryFullName);

        loadTemplate(payload.templateData, {
          activeFileId: payload.preferredOpenPath,
          openFileIds: payload.preferredOpenPath
            ? [payload.preferredOpenPath]
            : undefined,
        });
        setImportedRepository(payload.repository);
        setSelectedImportRepository(payload.repository);
        setDetectedProjectType(
          payload.projectType === "Unknown" ? null : payload.projectType,
        );
        setRestartKey((currentValue) => currentValue + 1);

        if (options.announceSuccess) {
          const importedSummary = payload.stats.skippedFileCount
            ? `Imported ${payload.stats.importedFileCount} files and skipped ${payload.stats.skippedFileCount}.`
            : `Imported ${payload.stats.importedFileCount} files.`;
          toast.success(`${payload.repository.full_name} loaded. ${importedSummary}`);
        }

        return payload;
      } catch (nextError) {
        const message =
          nextError instanceof Error
            ? nextError.message
            : "Unable to import that GitHub repository.";
        setImportError(message);
        throw nextError;
      } finally {
        setIsImportingRepository(false);
      }
    },
    [hasDirtyFiles, loadTemplate, templateData.items.length],
  );

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

  const handleImportSelectedRepository = useCallback(async () => {
    if (!selectedImportRepository) {
      toast.error("Select a repository to import.");
      return;
    }

    try {
      const payload = await importRepositoryByFullName(
        selectedImportRepository.full_name,
        {
          announceSuccess: true,
        },
      );

      if (payload) {
        setIsImportDialogOpen(false);
      }
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Unable to import that GitHub repository.",
      );
    }
  }, [importRepositoryByFullName, selectedImportRepository]);

  useEffect(() => {
    if (!initialRepositoryFullName || initialImportAttemptedRef.current) {
      return;
    }

    initialImportAttemptedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        await importRepositoryByFullName(initialRepositoryFullName, {
          announceSuccess: false,
          skipConfirm: true,
        });
      } catch (nextError) {
        if (!cancelled) {
          setImportedRepository(null);
          setDetectedProjectType(null);
          loadTemplate(starterTemplate);
          toast.error(
            nextError instanceof Error
              ? `${nextError.message} Starter workspace loaded instead.`
              : "Unable to load the linked GitHub repository. Starter workspace loaded instead.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsInitialImportResolved(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    importRepositoryByFullName,
    initialRepositoryFullName,
    loadTemplate,
    starterTemplate,
  ]);

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

  const previewPanel = !isInitialImportResolved && initialRepositoryFullName ? (
    <ImportingRepositoryPanel repositoryFullName={initialRepositoryFullName} />
  ) : (
    <LazyWebContainerPreview
      templateData={templateData}
      instance={instance}
      isLoading={isLoading}
      error={error?.message ?? null}
      restartKey={restartKey}
      onRestart={() => setRestartKey((value) => value + 1)}
      runtimeKey={projectId}
      showTerminalPanel={false}
      terminalRef={terminalRef}
    />
  );

  const rightRailContent = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#050816]">
      {layout.previewOpen ? (
        <div className="min-h-[280px] min-w-0 flex-1 overflow-hidden">
          {previewPanel}
        </div>
      ) : null}

      {layout.terminalOpen ? (
        <>
          {layout.previewOpen ? (
            <PanelResizeHandle
              orientation="horizontal"
              onResize={(delta) => layout.setTerminalHeight(layout.terminalHeight - delta)}
              className="border-y border-white/10 bg-[#060b16]"
            />
          ) : null}
          <div
            className="min-h-[10rem] flex-shrink-0 overflow-hidden"
            style={{ height: `${layout.terminalHeight}px` }}
          >
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full border-0"
              initialOutput={getWebContainerRuntimeOutputBuffer()}
            />
          </div>
        </>
      ) : null}

      {!layout.previewOpen && !layout.terminalOpen ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-white/45">
          Enable preview or terminal from the toolbar to open the runtime rail.
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <Dialog
        open={isImportDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsImportDialogOpen(nextOpen);

          if (nextOpen) {
            setImportError(null);
            setSelectedImportRepository(importedRepository);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import from GitHub</DialogTitle>
            <DialogDescription>
              Choose a repository to replace the current workspace files. Your
              GitHub token stays on the server.
            </DialogDescription>
          </DialogHeader>

          <GitHubRepositoryPicker
            repositories={githubRepositories}
            selectedRepository={selectedImportRepository}
            isLoading={isLoadingRepositories}
            error={githubRepositoriesError}
            onRefresh={() => {
              void fetchRepositories(true).catch(() => undefined);
            }}
            onSelectRepository={setSelectedImportRepository}
          />

          {importError ? (
            <div className="rounded-[1.25rem] border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {importError}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              disabled={isImportingRepository}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleImportSelectedRepository()}
              disabled={!selectedImportRepository || isImportingRepository}
            >
              {isImportingRepository ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <FolderGit2 className="mr-2 h-4 w-4" />
              )}
              {isImportingRepository ? "Importing..." : "Import repository"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="h-screen overflow-hidden bg-[#050816] text-white">
        <div className="flex h-full flex-col overflow-hidden">
          <header className="flex flex-shrink-0 flex-col gap-4 border-b border-white/10 bg-[#050816]/95 px-4 py-3 backdrop-blur sm:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Link
                  href={backHref}
                  className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
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
                  {(importedRepository || detectedProjectType) ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {importedRepository ? (
                        <Badge
                          variant="outline"
                          className="border-white/10 bg-white/5 text-white/70"
                        >
                          <FolderGit2 className="mr-1 h-3.5 w-3.5" />
                          {importedRepository.full_name}
                        </Badge>
                      ) : null}
                      {detectedProjectType ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                        >
                          {detectedProjectType}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl px-3 text-white/75 hover:bg-white/10 hover:text-white"
                    onClick={layout.toggleExplorer}
                    aria-pressed={
                      layout.isCompactViewport
                        ? layout.explorerSheetOpen
                        : layout.explorerOpen
                    }
                  >
                    <PanelLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Explorer</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl px-3 text-white/75 hover:bg-white/10 hover:text-white"
                    onClick={layout.togglePreview}
                    aria-pressed={layout.previewOpen}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Preview</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl px-3 text-white/75 hover:bg-white/10 hover:text-white"
                    onClick={layout.toggleTerminal}
                    aria-pressed={layout.terminalOpen}
                  >
                    <SquareTerminal className="h-4 w-4" />
                    <span className="hidden sm:inline">Terminal</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className={secondaryButtonClass}
                  onClick={handleSaveAllFiles}
                  disabled={!hasDirtyFiles || isImportingRepository}
                >
                  <Save className="h-4 w-4" />
                  Save all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={secondaryButtonClass}
                  onClick={() => setIsImportDialogOpen(true)}
                  disabled={isImportingRepository}
                >
                  {isImportingRepository ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <FolderGit2 className="h-4 w-4" />
                  )}
                  Import
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={secondaryButtonClass}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => setRestartKey((value) => value + 1)}
                  disabled={isImportingRepository}
                >
                  <RefreshCw className="h-4 w-4" />
                  Restart
                </Button>
              </div>
            </div>
          </header>

          <div className="flex flex-shrink-0 flex-col gap-1 border-b border-white/10 bg-[#060b16] px-4 py-2 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {isImportingRepository
                ? `Importing ${selectedImportRepository?.full_name ?? initialRepositoryFullName ?? "repository"}...`
                : `${openFiles.length} open tab${openFiles.length === 1 ? "" : "s"} and ${dirtyFileIds.length} unsaved change${dirtyFileIds.length === 1 ? "" : "s"}`}
            </span>
            <span className="sm:text-right">
              {isImportingRepository
                ? "GitHub files are loading into the editor and preview."
                : importedRepository
                  ? detectedProjectType
                    ? `Detected ${detectedProjectType}. Save changes to sync the preview.`
                    : "Repository imported. Save changes to sync the preview."
                  : hasDirtyFiles
                    ? "Save to sync changes into the running preview."
                    : "Preview is in sync with the saved filesystem state."}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div
              className="hidden h-full min-h-0 lg:grid"
              style={{ gridTemplateColumns: layout.desktopGridTemplateColumns }}
            >
              {layout.explorerOpen ? (
                <div className="min-h-0 overflow-hidden">
                  <PlaygroundExplorer
                    tree={tree}
                    activeFileId={activeFileId}
                    dirtyFileIds={dirtyFileIds}
                    onToggleCollapse={layout.toggleExplorer}
                    onSelectFile={selectFile}
                    onCreateNode={handleCreateNode}
                    onRenameNode={handleRenameNode}
                    onDeleteNode={handleDeleteNode}
                  />
                </div>
              ) : (
                <div />
              )}

              {layout.explorerOpen ? (
                <PanelResizeHandle
                  orientation="vertical"
                  onResize={(delta) =>
                    layout.setExplorerWidth(layout.explorerWidth + delta)
                  }
                  className="border-r border-white/10 bg-[#050816]"
                />
              ) : (
                <div />
              )}

              <div className="min-h-0 min-w-0 overflow-hidden">
                <LazyPlaygroundEditor
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
              </div>

              {layout.isRightRailVisible ? (
                <PanelResizeHandle
                  orientation="vertical"
                  onResize={(delta) =>
                    layout.setRightRailWidth(layout.rightRailWidth - delta)
                  }
                  className="border-l border-white/10 bg-[#050816]"
                />
              ) : (
                <div />
              )}

              {layout.isRightRailVisible ? (
                <div className="min-h-0 min-w-0 overflow-hidden border-l border-white/10">
                  {rightRailContent}
                </div>
              ) : (
                <div />
              )}
            </div>

            <div className="flex h-full min-h-0 lg:hidden">
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <LazyPlaygroundEditor
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
              </div>
            </div>
          </div>
        </div>

        <Sheet open={layout.explorerSheetOpen} onOpenChange={layout.setExplorerSheetOpen}>
          <SheetContent side="left" className="w-full max-w-sm border-white/10 bg-[#050816] p-0 text-white">
            <SheetHeader className="border-b border-white/10 px-4 py-4 text-left">
              <SheetTitle className="text-white">Explorer</SheetTitle>
              <SheetDescription className="text-white/55">
                Browse files without squeezing the editor.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-hidden">
              <PlaygroundExplorer
                tree={tree}
                activeFileId={activeFileId}
                dirtyFileIds={dirtyFileIds}
                onToggleCollapse={() => layout.setExplorerSheetOpen(false)}
                onSelectFile={(fileId) => {
                  selectFile(fileId);
                  layout.setExplorerSheetOpen(false);
                }}
                onCreateNode={handleCreateNode}
                onRenameNode={handleRenameNode}
                onDeleteNode={handleDeleteNode}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={layout.rightRailSheetOpen} onOpenChange={layout.setRightRailSheetOpen}>
          <SheetContent side="right" className="w-full max-w-md border-white/10 bg-[#050816] p-0 text-white">
            <SheetHeader className="border-b border-white/10 px-4 py-4 text-left">
              <SheetTitle className="text-white">Runtime</SheetTitle>
              <SheetDescription className="text-white/55">
                Preview and terminal stay available here on smaller screens.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-hidden">{rightRailContent}</div>
          </SheetContent>
        </Sheet>
      </main>
    </>
  );
}
