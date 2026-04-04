export interface TemplateFile {
  filename: string;
  fileExtension: string;
  content: string;
}

export interface TemplateFolder {
  folderName: string;
  items: TemplateItem[];
}

export type TemplateItem = TemplateFile | TemplateFolder;

export interface TemplateFileNode {
  kind: "file";
  id: string;
  path: string;
  name: string;
  parentPath: string | null;
  depth: number;
  extension: string;
  language: string;
  file: TemplateFile;
}

export interface TemplateFolderNode {
  kind: "folder";
  id: string;
  path: string;
  name: string;
  parentPath: string | null;
  depth: number;
  folder: TemplateFolder;
  children: TemplateTreeNode[];
}

export type TemplateTreeNode = TemplateFileNode | TemplateFolderNode;

export type FlattenedTemplateFile = TemplateFileNode;

export interface OpenFileTab {
  id: string;
  path: string;
  name: string;
  language: string;
  isDirty: boolean;
}

export type CreateTemplateNodeKind = "file" | "folder";

export interface CreateTemplateNodeInput {
  parentPath: string | null;
  kind: CreateTemplateNodeKind;
  name: string;
}

export function isTemplateFolder(item: TemplateItem): item is TemplateFolder {
  return "folderName" in item;
}

export function isTemplateFile(item: TemplateItem): item is TemplateFile {
  return "filename" in item;
}
