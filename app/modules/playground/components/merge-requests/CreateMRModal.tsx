"use client";

import { useEffect, useMemo, useState } from "react";
import { createPatch } from "diff";
import { GitPullRequest, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createMergeRequest } from "./api";
import type { MergeRequest, WorkspaceMergeRequestChange } from "./types";

type CreateMRModalProps = {
  open: boolean;
  workspaceId: string;
  fileChanges: WorkspaceMergeRequestChange[];
  onOpenChange: (open: boolean) => void;
  onCreated: (mergeRequest: MergeRequest) => void;
};

function buildPreviewPatch(change: WorkspaceMergeRequestChange) {
  return createPatch(
    change.path,
    change.oldContent,
    change.newContent,
    "Workspace",
    "Current changes",
  );
}

function DiffPreview({ patch }: { patch: string }) {
  return (
    <pre className="ide-scrollbar max-h-72 overflow-auto rounded-lg border border-white/10 bg-[#090d1a] p-3 text-[11px] leading-5 text-white/70">
      <code>{patch}</code>
    </pre>
  );
}

export function CreateMRModal({
  open,
  workspaceId,
  fileChanges,
  onOpenChange,
  onCreated,
}: CreateMRModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedPath((currentPath) => {
      if (
        currentPath &&
        fileChanges.some((change) => change.path === currentPath)
      ) {
        return currentPath;
      }

      return fileChanges[0]?.path ?? null;
    });
  }, [fileChanges, open]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setSelectedPath(null);
    }
  }, [open]);

  const selectedChange = useMemo(
    () => fileChanges.find((change) => change.path === selectedPath) ?? null,
    [fileChanges, selectedPath],
  );
  const previewPatch = useMemo(
    () => (selectedChange ? buildPreviewPatch(selectedChange) : ""),
    [selectedChange],
  );

  async function handleSubmit() {
    if (!selectedChange) {
      toast.error("Choose a file change first.");
      return;
    }

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      toast.error("Add a title for the merge request.");
      return;
    }

    setIsSubmitting(true);

    try {
      const mergeRequest = await createMergeRequest(workspaceId, {
        title: normalizedTitle,
        description: description.trim(),
        path: selectedChange.path,
        content: selectedChange.newContent,
      });

      toast.success("MR Created");
      onCreated(mergeRequest);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create merge request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden border-white/10 bg-[#060b16] p-0 text-white sm:max-w-2xl">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <DialogTitle className="text-white">New MR</DialogTitle>
          <DialogDescription className="text-white/55">
            Package one changed file for review.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="ide-scrollbar max-h-[64vh]">
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                Title
              </label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Update editor save flow"
                className="rounded-lg border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What changed, why it matters, and anything reviewers should check."
                className="min-h-24 rounded-lg border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                    File changes
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {fileChanges.length} changed file
                    {fileChanges.length === 1 ? "" : "s"} available
                  </p>
                </div>
                <GitPullRequest className="h-4 w-4 text-white/35" />
              </div>

              {fileChanges.length ? (
                <div className="grid gap-2">
                  {fileChanges.map((change) => (
                    <button
                      key={change.path}
                      type="button"
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition",
                        selectedPath === change.path
                          ? "border-sky-400/35 bg-sky-400/10 text-white"
                          : "border-white/10 bg-white/[0.035] text-white/70 hover:bg-white/[0.06]",
                      )}
                      onClick={() => setSelectedPath(change.path)}
                      disabled={isSubmitting}
                    >
                      <span className="block truncate">{change.path}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                  No workspace changes are ready for a merge request.
                </div>
              )}
            </div>

            {selectedChange ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                  Preview
                </p>
                <DiffPreview patch={previewPatch} />
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-white/10 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-lg border border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !selectedChange || !title.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitPullRequest className="mr-2 h-4 w-4" />
            )}
            Create MR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

