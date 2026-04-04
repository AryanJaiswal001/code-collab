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

export interface FlattenedTemplateFile {
  id: string;
  path: string;
  name: string;
  language: string;
  file: TemplateFile;
}

export function isTemplateFolder(item: TemplateItem): item is TemplateFolder {
  return "folderName" in item;
}

export function isTemplateFile(item: TemplateItem): item is TemplateFile {
  return "filename" in item;
}
