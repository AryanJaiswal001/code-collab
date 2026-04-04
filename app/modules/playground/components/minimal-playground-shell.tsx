"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft, Play, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FileExplorer } from "./file-explorer";
import { PlaygroundEditor } from "./playground-editor";
import { useFileExplorer } from "../hooks/useFileExplorer";
import { createStarterTemplate } from "../lib/starter-template";
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

  const {
    templateData,
    activeFile,
    activeFileId,
    flattenedFiles,
    selectFile,
    updateActiveFileContent,
  } = useFileExplorer(starterTemplate);

  const { instance, isLoading, error, writeFileSync } = useWebContainer({
    templateData,
  });

  useEffect(() => {
    if (!activeFile) {
      return;
    }

    const syncDelay = window.setTimeout(() => {
      void writeFileSync(activeFile.id, activeFile.file.content).catch(
        (syncError) => {
          console.error("Failed to sync file to WebContainer:", syncError);
        },
      );
    }, 250);

    return () => window.clearTimeout(syncDelay);
  }, [activeFile, writeFileSync]);

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
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button type="button" className="bg-white text-black hover:bg-white/90">
              <Play className="mr-2 h-4 w-4" />
              Live
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel defaultSize={20} minSize={16}>
              <FileExplorer
                templateData={templateData}
                activeFileId={activeFileId}
                onSelectFile={selectFile}
              />
            </ResizablePanel>

            <ResizableHandle className="w-px bg-white/10" />

            <ResizablePanel defaultSize={45} minSize={30}>
              <div className="flex h-full flex-col bg-[#090d1a]">
                <div className="border-b border-white/10 px-4 py-2">
                  <div className="flex items-center gap-2 text-sm text-white/75">
                    <span className="rounded-md bg-white/5 px-3 py-1">
                      {activeFile?.name ?? "No file selected"}
                    </span>
                    <span className="text-xs text-white/35">
                      {flattenedFiles.length} files
                    </span>
                  </div>
                </div>

                <div className="min-h-0 flex-1">
                  {activeFile ? (
                    <PlaygroundEditor
                      filePath={activeFile.path}
                      language={activeFile.language}
                      value={activeFile.file.content}
                      onChange={updateActiveFileContent}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/50">
                      Select a file to start editing.
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className="w-px bg-white/10" />

            <ResizablePanel defaultSize={35} minSize={24}>
              <WebContainerPreview
                templateData={templateData}
                instance={instance}
                isLoading={isLoading}
                error={error?.message ?? null}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </main>
  );
}
