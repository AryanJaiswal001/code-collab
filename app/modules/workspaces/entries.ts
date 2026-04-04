import type { TemplateFile, TemplateFolder, TemplateItem } from "../playground/types";
import { isTemplateFolder } from "../playground/types";
import type { WorkspaceEntryTypeValue } from "./types";

type WorkspaceEntryLike = {
  path: string;
  parentPath: string | null;
  name: string;
  type: WorkspaceEntryTypeValue;
  fileExtension: string | null;
  content: string | null;
};

export type WorkspaceEntrySeed = {
  path: string;
  parentPath: string | null;
  name: string;
  type: WorkspaceEntryTypeValue;
  fileExtension?: string | null;
  content?: string | null;
};

function normalizePath(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join("/");
}

function getItemName(item: TemplateItem) {
  if (isTemplateFolder(item)) {
    return item.folderName;
  }

  return item.fileExtension ? `${item.filename}.${item.fileExtension}` : item.filename;
}

function parseFileName(name: string): TemplateFile {
  if (name.startsWith(".") && !name.slice(1).includes(".")) {
    return {
      filename: name,
      fileExtension: "",
      content: "",
    };
  }

  const lastDotIndex = name.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0 && lastDotIndex < name.length - 1;

  return {
    filename: hasExtension ? name.slice(0, lastDotIndex) : name,
    fileExtension: hasExtension ? name.slice(lastDotIndex + 1) : "",
    content: "",
  };
}

function sortTemplateItems(items: TemplateItem[]) {
  return [...items].sort((left, right) => {
    const leftIsFolder = isTemplateFolder(left);
    const rightIsFolder = isTemplateFolder(right);

    if (leftIsFolder !== rightIsFolder) {
      return leftIsFolder ? -1 : 1;
    }

    return getItemName(left).localeCompare(getItemName(right));
  });
}

function buildFolderItemMap(rootName: string, entries: WorkspaceEntryLike[]) {
  const folders = new Map<string, TemplateFolder>();
  folders.set("", {
    folderName: rootName,
    items: [],
  });

  const folderEntries = entries
    .filter((entry) => entry.type === "FOLDER")
    .sort((left, right) => left.path.split("/").length - right.path.split("/").length);

  for (const entry of folderEntries) {
    folders.set(entry.path, {
      folderName: entry.name,
      items: [],
    });
  }

  for (const entry of folderEntries) {
    const parentFolder = folders.get(entry.parentPath ?? "");
    const currentFolder = folders.get(entry.path);

    if (!parentFolder || !currentFolder) {
      continue;
    }

    parentFolder.items.push(currentFolder);
  }

  return folders;
}

export function buildTemplateFromWorkspaceEntries(
  rootName: string,
  entries: WorkspaceEntryLike[],
): TemplateFolder {
  const folders = buildFolderItemMap(rootName, entries);
  const rootFolder = folders.get("");

  if (!rootFolder) {
    return {
      folderName: rootName,
      items: [],
    };
  }

  const fileEntries = entries
    .filter((entry) => entry.type === "FILE")
    .sort((left, right) => left.path.localeCompare(right.path));

  for (const entry of fileEntries) {
    const parentFolder = folders.get(entry.parentPath ?? "");

    if (!parentFolder) {
      continue;
    }

    const templateFile = parseFileName(entry.name);
    parentFolder.items.push({
      ...templateFile,
      content: entry.content ?? "",
    });
  }

  function sortFolder(folder: TemplateFolder): TemplateFolder {
    return {
      folderName: folder.folderName,
      items: sortTemplateItems(
        folder.items.map((item) => (isTemplateFolder(item) ? sortFolder(item) : item)),
      ),
    };
  }

  return sortFolder(rootFolder);
}

export function createWorkspaceEntrySeeds(template: TemplateFolder) {
  const entries: WorkspaceEntrySeed[] = [];

  function walkFolder(folder: TemplateFolder, parentPath: string | null) {
    for (const item of folder.items) {
      const nextPath = normalizePath([parentPath, getItemName(item)]);

      if (isTemplateFolder(item)) {
        entries.push({
          path: nextPath,
          parentPath,
          name: item.folderName,
          type: "FOLDER",
        });
        walkFolder(item, nextPath);
        continue;
      }

      entries.push({
        path: nextPath,
        parentPath,
        name: getItemName(item),
        type: "FILE",
        fileExtension: item.fileExtension || null,
        content: item.content,
      });
    }
  }

  walkFolder(template, null);
  return entries;
}
