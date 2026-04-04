"use client";

import { useState } from "react";
import { ChevronRight, FileCode2, FileJson2, FolderClosed, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateFolder, TemplateItem } from "../types";
import { isTemplateFolder } from "../types";

type FileExplorerProps = {
  templateData: TemplateFolder;
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
};

function getFileId(item: TemplateItem, parentPath: string) {
  if (isTemplateFolder(item)) {
    return parentPath ? `${parentPath}/${item.folderName}` : item.folderName;
  }

  const fileName = item.fileExtension
    ? `${item.filename}.${item.fileExtension}`
    : item.filename;

  return parentPath ? `${parentPath}/${fileName}` : fileName;
}

function FileIcon({ extension }: { extension: string }) {
  if (extension === "json") {
    return <FileJson2 className="h-4 w-4 text-amber-300" />;
  }

  return <FileCode2 className="h-4 w-4 text-sky-300" />;
}

function TreeNode({
  item,
  parentPath,
  activeFileId,
  onSelectFile,
}: {
  item: TemplateItem;
  parentPath: string;
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
}) {
  const nodeId = getFileId(item, parentPath);
  const [expanded, setExpanded] = useState(true);

  if (isTemplateFolder(item)) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 transition hover:bg-white/5"
        >
          <ChevronRight
            className={cn("h-4 w-4 text-slate-500 transition", expanded && "rotate-90")}
          />
          {expanded ? (
            <FolderOpen className="h-4 w-4 text-emerald-300" />
          ) : (
            <FolderClosed className="h-4 w-4 text-slate-400" />
          )}
          <span className="truncate">{item.folderName}</span>
        </button>

        {expanded ? (
          <div className="ml-4 space-y-1 border-l border-white/5 pl-2">
            {item.items.map((child) => (
              <TreeNode
                key={getFileId(child, nodeId)}
                item={child}
                parentPath={nodeId}
                activeFileId={activeFileId}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectFile(nodeId)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
        activeFileId === nodeId
          ? "bg-emerald-400/10 text-white"
          : "text-slate-300 hover:bg-white/5",
      )}
    >
      <FileIcon extension={item.fileExtension} />
      <span className="truncate">
        {item.filename}
        {item.fileExtension ? `.${item.fileExtension}` : ""}
      </span>
    </button>
  );
}

export function FileExplorer({
  templateData,
  activeFileId,
  onSelectFile,
}: FileExplorerProps) {
  return (
    <aside className="flex h-full flex-col border-r border-white/10 bg-[#060b16]">
      <div className="border-b border-white/10 px-3 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
          Files
        </p>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-1">
          {templateData.items.map((item) => (
            <TreeNode
              key={getFileId(item, "")}
              item={item}
              parentPath=""
              activeFileId={activeFileId}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
