"use client";

import { useCallback, useMemo, useState } from "react";
import type { FlattenedTemplateFile, TemplateFolder } from "../types";
import {
  findFileById,
  flattenTemplateFiles,
  getFirstTemplateFile,
  updateTemplateFileContent,
} from "../lib/file-tree";

export function useFileExplorer(initialTemplate: TemplateFolder) {
  const [templateData, setTemplateData] = useState(initialTemplate);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    () => getFirstTemplateFile(initialTemplate)?.id ?? null,
  );

  const flattenedFiles = useMemo(
    () => flattenTemplateFiles(templateData),
    [templateData],
  );

  const activeFileId =
    selectedFileId &&
    flattenedFiles.some((file) => file.id === selectedFileId)
      ? selectedFileId
      : (flattenedFiles[0]?.id ?? null);

  const activeFile = useMemo<FlattenedTemplateFile | null>(() => {
    if (!activeFileId) {
      return null;
    }

    return findFileById(templateData, activeFileId);
  }, [activeFileId, templateData]);

  const selectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  const updateActiveFileContent = useCallback(
    (nextContent: string) => {
      setTemplateData((currentTemplate) => {
        if (!activeFileId) {
          return currentTemplate;
        }

        return updateTemplateFileContent(
          currentTemplate,
          activeFileId,
          nextContent,
        );
      });
    },
    [activeFileId],
  );

  return {
    templateData,
    setTemplateData,
    flattenedFiles,
    activeFileId,
    activeFile,
    selectFile,
    updateActiveFileContent,
  };
}
