import type { FileSystemTree } from "@webcontainer/api";
import type {
  TemplateFolder,
  TemplateItem,
} from "../../playground/types";
import { isTemplateFolder } from "../../playground/types";

function getItemName(item: TemplateItem) {
  if (isTemplateFolder(item)) {
    return item.folderName;
  }

  return item.fileExtension
    ? `${item.filename}.${item.fileExtension}`
    : item.filename;
}

function toNode(item: TemplateItem): FileSystemTree[string] {
  if (isTemplateFolder(item)) {
    return {
      directory: item.items.reduce<FileSystemTree>((tree, child) => {
        tree[getItemName(child)] = toNode(child);
        return tree;
      }, {}),
    };
  }

  return {
    file: {
      contents: item.content,
    },
  };
}

export function transformToWebContainerFormat(
  template: TemplateFolder,
): FileSystemTree {
  return template.items.reduce<FileSystemTree>((tree, item) => {
    tree[getItemName(item)] = toNode(item);
    return tree;
  }, {});
}
