import { TemplateFile, TemplateFolder } from "./path-to-json";

export function findFilePath(
  file: TemplateFile,
  folder: TemplateFolder,
  pathSoFar: string[] = [],
): string | null {
  for (const item of folder.items) {
    if ("folderName" in item) {
      const res = findFilePath(file, item, [...pathSoFar, item.folderName]);
      if (res) return res;
    } else {
      if (
        item.filename === file.filename &&
        item.fileExtension?.trim() === file.fileExtension?.trim()
      ) {
        return [
          ...pathSoFar,
          item.filename +
            (item.fileExtension ? `.${item.fileExtension.trim()}` : ""),
        ].join("/");
      }
    }
  }
  return null;
}

/**
 * @param file The file to open
 * @param rootFolder The root folder of the template
 * @returns The content of the file if it exists, otherwise null
 */
export const generateFileId = (
  file: TemplateFile,
  rootFolder: TemplateFolder,
) => {
  const path = findFilePath(file, rootFolder)?.replace(/^\//, "") || "";
  const extension = file.fileExtension?.trim();
  const extensionSuffix = extension ? `.${extension}` : "";

  return path
    ? `${path}${extensionSuffix}`
    : `${file.filename}${extensionSuffix}`;
};
