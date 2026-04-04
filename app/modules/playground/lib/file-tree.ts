import type {
  CreateTemplateNodeKind,
  FlattenedTemplateFile,
  TemplateFile,
  TemplateFileNode,
  TemplateFolder,
  TemplateFolderNode,
  TemplateItem,
  TemplateTreeNode,
} from "../types";
import { isTemplateFolder } from "../types";
import { getLanguageFromPath } from "./editor-config";

type LocatedTemplateFile = {
  kind: "file";
  path: string;
  parentPath: string | null;
  name: string;
  file: TemplateFile;
};

type LocatedTemplateFolder = {
  kind: "folder";
  path: string;
  parentPath: string | null;
  name: string;
  folder: TemplateFolder;
};

type LocatedTemplateNode = LocatedTemplateFile | LocatedTemplateFolder;

function sortTemplateItems(items: TemplateItem[]) {
  return [...items].sort((left, right) => {
    if (isTemplateFolder(left) && !isTemplateFolder(right)) {
      return -1;
    }

    if (!isTemplateFolder(left) && isTemplateFolder(right)) {
      return 1;
    }

    return getItemName(left).localeCompare(getItemName(right));
  });
}

function assertValidNodeName(name: string) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Name cannot be empty.");
  }

  if (normalizedName.includes("/")) {
    throw new Error("Names cannot contain '/'.");
  }

  if (normalizedName === "." || normalizedName === "..") {
    throw new Error("Reserved names cannot be used here.");
  }

  return normalizedName;
}

function createDefaultFileContent(extension: string) {
  switch (extension) {
    case "css":
      return "/* Add styles here */\n";
    case "html":
      return "<div></div>\n";
    case "json":
      return "{\n  \n}\n";
    case "md":
      return "# New file\n";
    case "ts":
      return "export {};\n";
    case "tsx":
      return "export function NewComponent() {\n  return <div />;\n}\n";
    default:
      return "";
  }
}

function parseFileName(name: string): TemplateFile {
  const normalizedName = assertValidNodeName(name);

  if (normalizedName.startsWith(".") && normalizedName.indexOf(".", 1) === -1) {
    return {
      filename: normalizedName,
      fileExtension: "",
      content: "",
    };
  }

  const lastDotIndex = normalizedName.lastIndexOf(".");
  const hasExtension =
    lastDotIndex > 0 && lastDotIndex < normalizedName.length - 1;

  const filename = hasExtension
    ? normalizedName.slice(0, lastDotIndex)
    : normalizedName;
  const fileExtension = hasExtension
    ? normalizedName.slice(lastDotIndex + 1)
    : "";

  return {
    filename,
    fileExtension,
    content: createDefaultFileContent(fileExtension),
  };
}

function buildFileNode(
  file: TemplateFile,
  parentPath: string | null,
  depth: number,
): TemplateFileNode {
  const path = normalizePath([parentPath, getFileName(file)]);

  return {
    kind: "file",
    id: path,
    path,
    name: getFileName(file),
    parentPath,
    depth,
    extension: file.fileExtension,
    language: getFileLanguage(file.fileExtension || path),
    file,
  };
}

function buildFolderNode(
  folder: TemplateFolder,
  parentPath: string | null,
  depth: number,
): TemplateFolderNode {
  const path = normalizePath([parentPath, folder.folderName]);
  const children = buildTemplateTree(folder, path, depth + 1);

  return {
    kind: "folder",
    id: path,
    path,
    name: folder.folderName,
    parentPath,
    depth,
    folder,
    children,
  };
}

function findFolderByPath(
  folder: TemplateFolder,
  folderPath: string | null,
): TemplateFolder | null {
  if (!folderPath) {
    return folder;
  }

  const segments = folderPath.split("/").filter(Boolean);
  let currentFolder = folder;

  for (const segment of segments) {
    const nextFolder = currentFolder.items.find(
      (item): item is TemplateFolder =>
        isTemplateFolder(item) && item.folderName === segment,
    );

    if (!nextFolder) {
      return null;
    }

    currentFolder = nextFolder;
  }

  return currentFolder;
}

function updateFolderAtPath(
  folder: TemplateFolder,
  folderPath: string | null,
  updater: (currentFolder: TemplateFolder) => TemplateFolder,
): TemplateFolder {
  if (!folderPath) {
    return updater(folder);
  }

  const [segment, ...rest] = folderPath.split("/").filter(Boolean);

  return {
    ...folder,
    items: folder.items.map((item) => {
      if (!isTemplateFolder(item) || item.folderName !== segment) {
        return item;
      }

      return updateFolderAtPath(item, rest.join("/") || null, updater);
    }),
  };
}

function getNodeNameFromPath(nodePath: string) {
  return nodePath.split("/").filter(Boolean).at(-1) ?? nodePath;
}

function itemMatchesPath(item: TemplateItem, itemName: string) {
  return getItemName(item) === itemName;
}

function replaceNodePath(
  value: string,
  previousPath: string,
  nextPath: string,
) {
  if (value === previousPath) {
    return nextPath;
  }

  if (!value.startsWith(`${previousPath}/`)) {
    return value;
  }

  return `${nextPath}${value.slice(previousPath.length)}`;
}

export function normalizePath(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join("/");
}

export function getFileLanguage(extensionOrPath: string) {
  return getLanguageFromPath(extensionOrPath);
}

export function getFileName(file: TemplateFile) {
  return file.fileExtension
    ? `${file.filename}.${file.fileExtension}`
    : file.filename;
}

export function getItemName(item: TemplateItem) {
  return isTemplateFolder(item) ? item.folderName : getFileName(item);
}

export function getPathAncestors(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments
    .slice(0, -1)
    .map((_, index) => segments.slice(0, index + 1).join("/"));
}

export function remapPathPrefix(
  value: string,
  previousPath: string,
  nextPath: string,
) {
  return replaceNodePath(value, previousPath, nextPath);
}

export function remapRecordKeysByPrefix<T>(
  record: Record<string, T>,
  previousPath: string,
  nextPath: string,
) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      replaceNodePath(key, previousPath, nextPath),
      value,
    ]),
  );
}

export function buildTemplateTree(
  folder: TemplateFolder,
  parentPath: string | null = null,
  depth = 0,
): TemplateTreeNode[] {
  return folder.items.map((item) =>
    isTemplateFolder(item)
      ? buildFolderNode(item, parentPath, depth)
      : buildFileNode(item, parentPath, depth),
  );
}

export function flattenTemplateFiles(
  folder: TemplateFolder,
  parentPath: string | null = null,
  depth = 0,
): FlattenedTemplateFile[] {
  return folder.items.flatMap((item) => {
    if (isTemplateFolder(item)) {
      return flattenTemplateFiles(
        item,
        normalizePath([parentPath, item.folderName]),
        depth + 1,
      );
    }

    return [buildFileNode(item, parentPath, depth)];
  });
}

export function findNodeByPath(
  folder: TemplateFolder,
  nodePath: string,
  parentPath: string | null = null,
): LocatedTemplateNode | null {
  for (const item of folder.items) {
    const path = normalizePath([parentPath, getItemName(item)]);

    if (path === nodePath) {
      if (isTemplateFolder(item)) {
        return {
          kind: "folder",
          path,
          parentPath,
          name: item.folderName,
          folder: item,
        };
      }

      return {
        kind: "file",
        path,
        parentPath,
        name: getFileName(item),
        file: item,
      };
    }

    if (isTemplateFolder(item)) {
      const match = findNodeByPath(item, nodePath, path);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

export function findFileById(folder: TemplateFolder, fileId: string) {
  const match = findNodeByPath(folder, fileId);

  if (!match || match.kind !== "file") {
    return null;
  }

  return buildFileNode(
    match.file,
    match.parentPath,
    getPathAncestors(fileId).length,
  );
}

export function getFirstTemplateFile(folder: TemplateFolder) {
  return flattenTemplateFiles(folder)[0] ?? null;
}

export function getTemplateFileContentMap(folder: TemplateFolder) {
  return Object.fromEntries(
    flattenTemplateFiles(folder).map((file) => [file.id, file.file.content]),
  );
}

export function updateTemplateFileContent(
  folder: TemplateFolder,
  fileId: string,
  nextContent: string,
  parentPath: string | null = null,
): TemplateFolder {
  return {
    ...folder,
    items: folder.items.map((item) => {
      const path = normalizePath([parentPath, getItemName(item)]);

      if (isTemplateFolder(item)) {
        return updateTemplateFileContent(item, fileId, nextContent, path);
      }

      if (path !== fileId) {
        return item;
      }

      return {
        ...item,
        content: nextContent,
      };
    }),
  };
}

export function createTemplateNode(
  folder: TemplateFolder,
  parentPath: string | null,
  kind: CreateTemplateNodeKind,
  name: string,
) {
  const normalizedName = assertValidNodeName(name);
  const targetFolder = findFolderByPath(folder, parentPath);

  if (!targetFolder) {
    throw new Error("The selected folder could not be found.");
  }

  if (targetFolder.items.some((item) => getItemName(item) === normalizedName)) {
    throw new Error("An item with that name already exists.");
  }

  const nextItem: TemplateItem =
    kind === "folder"
      ? {
          folderName: normalizedName,
          items: [],
        }
      : parseFileName(normalizedName);

  const nextTemplate = updateFolderAtPath(folder, parentPath, (currentFolder) => ({
    ...currentFolder,
    items: sortTemplateItems([...currentFolder.items, nextItem]),
  }));
  const createdPath = normalizePath([parentPath, getItemName(nextItem)]);

  return {
    template: nextTemplate,
    createdPath,
    kind,
  };
}

export function renameTemplateNode(
  folder: TemplateFolder,
  nodePath: string,
  nextName: string,
) {
  const locatedNode = findNodeByPath(folder, nodePath);

  if (!locatedNode) {
    throw new Error("The selected item could not be found.");
  }

  const normalizedName = assertValidNodeName(nextName);
  const parentFolder = findFolderByPath(folder, locatedNode.parentPath);

  if (!parentFolder) {
    throw new Error("The parent folder could not be found.");
  }

  if (
    parentFolder.items.some(
      (item) =>
        getItemName(item) === normalizedName &&
        normalizePath([locatedNode.parentPath, getItemName(item)]) !== nodePath,
    )
  ) {
    throw new Error("An item with that name already exists.");
  }

  const currentItemName = getNodeNameFromPath(nodePath);
  const nextItemName =
    locatedNode.kind === "folder"
      ? normalizedName
      : getFileName(parseFileName(normalizedName));
  const nextTemplate = updateFolderAtPath(
    folder,
    locatedNode.parentPath,
    (currentFolder) => ({
      ...currentFolder,
      items: sortTemplateItems(
        currentFolder.items.map((item) => {
          if (!itemMatchesPath(item, currentItemName)) {
            return item;
          }

          if (locatedNode.kind === "folder" && isTemplateFolder(item)) {
            return {
              ...item,
              folderName: normalizedName,
            };
          }

          if (locatedNode.kind === "file" && !isTemplateFolder(item)) {
            const nextFile = parseFileName(normalizedName);
            return {
              ...item,
              filename: nextFile.filename,
              fileExtension: nextFile.fileExtension,
            };
          }

          return item;
        }),
      ),
    }),
  );
  const nextPath = normalizePath([locatedNode.parentPath, nextItemName]);

  return {
    template: nextTemplate,
    kind: locatedNode.kind,
    previousPath: nodePath,
    nextPath,
  };
}

export function deleteTemplateNode(folder: TemplateFolder, nodePath: string) {
  const locatedNode = findNodeByPath(folder, nodePath);

  if (!locatedNode) {
    throw new Error("The selected item could not be found.");
  }

  const currentItemName = getNodeNameFromPath(nodePath);
  const nextTemplate = updateFolderAtPath(
    folder,
    locatedNode.parentPath,
    (currentFolder) => ({
      ...currentFolder,
      items: currentFolder.items.filter(
        (item) => !itemMatchesPath(item, currentItemName),
      ),
    }),
  );

  return {
    template: nextTemplate,
    kind: locatedNode.kind,
    deletedPath: nodePath,
  };
}
