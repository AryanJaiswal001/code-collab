import type {
  FlattenedTemplateFile,
  TemplateFile,
  TemplateFolder,
  TemplateItem,
} from "../types";
import { isTemplateFolder } from "../types";

function normalizePath(parts: string[]) {
  return parts.filter(Boolean).join("/");
}

export function getFileLanguage(extension: string) {
  switch (extension) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

export function getFileName(file: TemplateFile) {
  return file.fileExtension
    ? `${file.filename}.${file.fileExtension}`
    : file.filename;
}

export function flattenTemplateFiles(
  folder: TemplateFolder,
  parentPath: string[] = [],
): FlattenedTemplateFile[] {
  return folder.items.flatMap((item: TemplateItem) => {
    if (isTemplateFolder(item)) {
      return flattenTemplateFiles(item, [...parentPath, item.folderName]);
    }

    const path = normalizePath([...parentPath, getFileName(item)]);
    return [
      {
        id: path,
        path,
        name: getFileName(item),
        language: getFileLanguage(item.fileExtension),
        file: item,
      },
    ];
  });
}

export function findFileById(
  folder: TemplateFolder,
  fileId: string,
  parentPath: string[] = [],
): FlattenedTemplateFile | null {
  for (const item of folder.items) {
    if (isTemplateFolder(item)) {
      const match = findFileById(item, fileId, [...parentPath, item.folderName]);
      if (match) {
        return match;
      }
      continue;
    }

    const path = normalizePath([...parentPath, getFileName(item)]);
    if (path === fileId) {
      return {
        id: path,
        path,
        name: getFileName(item),
        language: getFileLanguage(item.fileExtension),
        file: item,
      };
    }
  }

  return null;
}

export function getFirstTemplateFile(
  folder: TemplateFolder,
): FlattenedTemplateFile | null {
  const files = flattenTemplateFiles(folder);
  return files[0] ?? null;
}

export function updateTemplateFileContent(
  folder: TemplateFolder,
  fileId: string,
  nextContent: string,
  parentPath: string[] = [],
): TemplateFolder {
  return {
    ...folder,
    items: folder.items.map((item) => {
      if (isTemplateFolder(item)) {
        return updateTemplateFileContent(
          item,
          fileId,
          nextContent,
          [...parentPath, item.folderName],
        );
      }

      const path = normalizePath([...parentPath, getFileName(item)]);
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
