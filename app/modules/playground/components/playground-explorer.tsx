"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  FileCode2,
  FileJson2,
  FileText,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getPathAncestors } from "../lib";
import type {
  CreateTemplateNodeInput,
  CreateTemplateNodeKind,
  TemplateTreeNode,
} from "../types";

type ExplorerDialogState =
  | {
      mode: "create";
      kind: CreateTemplateNodeKind;
      parentPath: string | null;
      title: string;
      description: string;
      submitLabel: string;
    }
  | {
      mode: "rename";
      nodePath: string;
      title: string;
      description: string;
      submitLabel: string;
    }
  | null;

type PlaygroundExplorerProps = {
  tree: TemplateTreeNode[];
  activeFileId: string | null;
  dirtyFileIds: string[];
  assignedUserNames?: Record<string, string | null>;
  activeCollaboratorNamesByPath?: Record<string, string[]>;
  canCreateEntries?: boolean;
  canEditPath?: (path: string, kind: "file" | "folder") => boolean;
  onSelectFile: (fileId: string) => void;
  onCreateNode: (input: CreateTemplateNodeInput) => Promise<void> | void;
  onRenameNode: (nodePath: string, nextName: string) => Promise<void> | void;
  onDeleteNode: (nodePath: string) => Promise<void> | void;
};

function FileIcon({ extension }: { extension: string }) {
  if (extension === "json") {
    return <FileJson2 className="h-4 w-4 text-amber-300" />;
  }

  if (extension === "md") {
    return <FileText className="h-4 w-4 text-violet-300" />;
  }

  return <FileCode2 className="h-4 w-4 text-sky-300" />;
}

function collectFolderPaths(nodes: TemplateTreeNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.kind !== "folder") {
      return [];
    }

    return [node.path, ...collectFolderPaths(node.children)];
  });
}

function ExplorerDialog({
  state,
  value,
  onClose,
  onValueChange,
  onSubmit,
}: {
  state: ExplorerDialogState;
  value: string;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{state?.title}</DialogTitle>
          <DialogDescription>{state?.description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Input
            autoFocus
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="Enter a name"
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{state?.submitLabel ?? "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NodeActions({
  node,
  canCreate,
  canEdit,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: {
  node: TemplateTreeNode;
  canCreate: boolean;
  canEdit: boolean;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const hasActions = (node.kind === "folder" && canCreate) || canEdit;

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="h-6 w-6 rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {node.kind === "folder" && canCreate ? (
          <>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onCreateFile();
              }}
            >
              <Plus className="h-4 w-4" />
              New file
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onCreateFolder();
              }}
            >
              <FolderPlus className="h-4 w-4" />
              New folder
            </DropdownMenuItem>
          </>
        ) : null}

        {canEdit ? (
          <>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onRename();
              }}
            >
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>

            <DropdownMenuItem
              className="text-red-400 focus:text-red-300"
              onSelect={(event) => {
                event.preventDefault();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ExplorerNode({
  node,
  activeFileId,
  dirtyFileIds,
  assignedUserNames,
  activeCollaboratorNamesByPath,
  canCreateEntries,
  canEditPath,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: {
  node: TemplateTreeNode;
  activeFileId: string | null;
  dirtyFileIds: string[];
  assignedUserNames: Record<string, string | null>;
  activeCollaboratorNamesByPath: Record<string, string[]>;
  canCreateEntries: boolean;
  canEditPath: (path: string, kind: "file" | "folder") => boolean;
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (folderPath: string) => void;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (parentPath: string | null) => void;
  onCreateFolder: (parentPath: string | null) => void;
  onRename: (nodePath: string, initialValue: string) => void;
  onDelete: (nodePath: string) => void;
}) {
  const isActive = node.kind === "file" && node.id === activeFileId;
  const isDirty = node.kind === "file" && dirtyFileIds.includes(node.id);
  const isExpanded =
    node.kind === "folder" ? expandedFolders[node.path] !== false : false;
  const canEditCurrentPath = canEditPath(node.path, node.kind);
  const assignedUserName = assignedUserNames[node.path] ?? null;
  const activeCollaborators = activeCollaboratorNamesByPath[node.path] ?? [];

  if (node.kind === "folder") {
    return (
      <div className="space-y-1">
        <div
          className={cn(
            "group flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm text-slate-300 transition hover:bg-white/5",
            node.depth === 0 && "mt-1",
          )}
        >
          <button
            type="button"
            onClick={() => onToggleFolder(node.path)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-slate-500 transition",
                isExpanded && "rotate-90",
              )}
            />
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-emerald-300" />
            ) : (
              <FolderClosed className="h-4 w-4 text-slate-400" />
            )}
            <span className="truncate">{node.name}</span>
          </button>

          <div className="opacity-0 transition group-hover:opacity-100">
            <NodeActions
              node={node}
              canCreate={canCreateEntries}
              canEdit={canEditCurrentPath}
              onCreateFile={() => onCreateFile(node.path)}
              onCreateFolder={() => onCreateFolder(node.path)}
              onRename={() => onRename(node.path, node.name)}
              onDelete={() => onDelete(node.path)}
            />
          </div>
        </div>

        {isExpanded ? (
          <div className="ml-3 space-y-1 border-l border-white/6 pl-2">
            {node.children.map((child) => (
              <ExplorerNode
                key={child.path}
                node={child}
                activeFileId={activeFileId}
                dirtyFileIds={dirtyFileIds}
                assignedUserNames={assignedUserNames}
                activeCollaboratorNamesByPath={activeCollaboratorNamesByPath}
                canCreateEntries={canCreateEntries}
                canEditPath={canEditPath}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group rounded-xl px-2 py-1.5 text-sm transition",
        isActive
          ? "bg-emerald-400/10 text-white"
          : "text-slate-300 hover:bg-white/5",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectFile(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <FileIcon extension={node.extension} />
          <span className="truncate">{node.name}</span>
          {isDirty ? <span className="h-2 w-2 rounded-full bg-amber-300" /> : null}
        </button>

        <div className="opacity-0 transition group-hover:opacity-100">
          <NodeActions
            node={node}
            canCreate={false}
            canEdit={canEditCurrentPath}
            onCreateFile={() => undefined}
            onCreateFolder={() => undefined}
            onRename={() => onRename(node.path, node.name)}
            onDelete={() => onDelete(node.path)}
          />
        </div>
      </div>

      {(assignedUserName || activeCollaborators.length) ? (
        <div className="mt-1 flex flex-wrap gap-2 pl-6 text-[11px]">
          {assignedUserName ? (
            <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-0.5 text-sky-100">
              {assignedUserName}
            </span>
          ) : null}
          {activeCollaborators.length ? (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-amber-100">
              {activeCollaborators.length} active
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PlaygroundExplorer({
  tree,
  activeFileId,
  dirtyFileIds,
  assignedUserNames = {},
  activeCollaboratorNamesByPath = {},
  canCreateEntries = true,
  canEditPath = () => true,
  onSelectFile,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
}: PlaygroundExplorerProps) {
  const [dialogState, setDialogState] = useState<ExplorerDialogState>(null);
  const [dialogValue, setDialogValue] = useState("");
  const folderPaths = useMemo(() => collectFolderPaths(tree), [tree]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const expandedFoldersWithActiveFile = useMemo(
    () => ({
      ...Object.fromEntries(
        folderPaths.map((folderPath) => [folderPath, expandedFolders[folderPath] ?? true]),
      ),
      ...Object.fromEntries(
        activeFileId
          ? getPathAncestors(activeFileId).map((folderPath) => [folderPath, true])
          : [],
      ),
    }),
    [activeFileId, expandedFolders, folderPaths],
  );

  const openCreateDialog = (kind: CreateTemplateNodeKind, parentPath: string | null) => {
    const initialValue = kind === "file" ? "new-file.ts" : "new-folder";

    setDialogValue(initialValue);
    setDialogState({
      mode: "create",
      kind,
      parentPath,
      title: kind === "file" ? "Create file" : "Create folder",
      description:
        kind === "file"
          ? "Add a new file to the selected folder."
          : "Add a nested folder to keep the project organized.",
      submitLabel: kind === "file" ? "Create file" : "Create folder",
    });
  };

  const openRenameDialog = (nodePath: string, initialValue: string) => {
    setDialogValue(initialValue);
    setDialogState({
      mode: "rename",
      nodePath,
      title: "Rename item",
      description: "Update the name and keep the playground state in sync.",
      submitLabel: "Rename",
    });
  };

  const handleSubmitDialog = async () => {
    if (!dialogState) {
      return;
    }

    try {
      if (dialogState.mode === "create") {
        await onCreateNode({
          parentPath: dialogState.parentPath,
          kind: dialogState.kind,
          name: dialogValue,
        });
      } else {
        await onRenameNode(dialogState.nodePath, dialogValue);
      }

      setDialogState(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update the explorer.",
      );
    }
  };

  const handleDeleteNode = async (nodePath: string) => {
    if (!window.confirm(`Delete "${nodePath}"? This cannot be undone.`)) {
      return;
    }

    try {
      await onDeleteNode(nodePath);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete that item.",
      );
    }
  };

  return (
    <aside className="flex h-full flex-col border-r border-white/10 bg-[#060b16]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
            Explorer
          </p>
          <p className="mt-1 text-xs text-white/40">
            {dirtyFileIds.length} unsaved change{dirtyFileIds.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => openCreateDialog("file", null)}
            disabled={!canCreateEntries}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="sr-only">Create file</span>
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => openCreateDialog("folder", null)}
            disabled={!canCreateEntries}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="sr-only">Create folder</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-3">
          {tree.length ? (
            tree.map((node) => (
              <ExplorerNode
                key={node.path}
                node={node}
                activeFileId={activeFileId}
                dirtyFileIds={dirtyFileIds}
                assignedUserNames={assignedUserNames}
                activeCollaboratorNamesByPath={activeCollaboratorNamesByPath}
                canCreateEntries={canCreateEntries}
                canEditPath={canEditPath}
                expandedFolders={expandedFoldersWithActiveFile}
                onToggleFolder={(folderPath) =>
                  setExpandedFolders((currentFolders) => ({
                    ...currentFolders,
                    [folderPath]: currentFolders[folderPath] === false,
                  }))
                }
                onSelectFile={onSelectFile}
                onCreateFile={(parentPath) => openCreateDialog("file", parentPath)}
                onCreateFolder={(parentPath) => openCreateDialog("folder", parentPath)}
                onRename={openRenameDialog}
                onDelete={handleDeleteNode}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
              The explorer is empty. Create a file or folder to start building.
            </div>
          )}
        </div>
      </ScrollArea>

      <ExplorerDialog
        state={dialogState}
        onClose={() => setDialogState(null)}
        value={dialogValue}
        onValueChange={setDialogValue}
        onSubmit={handleSubmitDialog}
      />
    </aside>
  );
}
