"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  CreateTemplateNodeInput,
  FlattenedTemplateFile,
  OpenFileTab,
  TemplateFolder,
} from "../types";
import {
  buildTemplateTree,
  createTemplateNode,
  deleteTemplateNode,
  findFileById,
  flattenTemplateFiles,
  getFirstTemplateFile,
  getTemplateFileContentMap,
  remapPathPrefix,
  remapRecordKeysByPrefix,
  renameTemplateNode,
  updateTemplateFileContent,
} from "../lib";

function dedupeFileIds(fileIds: string[]) {
  return [...new Set(fileIds)];
}

function removeMatchingPaths(paths: string[], targetPath: string) {
  return paths.filter(
    (value) => value !== targetPath && !value.startsWith(`${targetPath}/`),
  );
}

function getNextActiveFileId(
  openFileIds: string[],
  currentActiveFileId: string | null,
) {
  if (!openFileIds.length) {
    return null;
  }

  if (!currentActiveFileId || !openFileIds.includes(currentActiveFileId)) {
    return openFileIds[openFileIds.length - 1] ?? null;
  }

  return currentActiveFileId;
}

type SaveTarget = {
  path: string;
  content: string;
};

type LoadTemplateOptions = {
  activeFileId?: string | null;
  openFileIds?: string[];
};

type ExplorerStateSnapshot = {
  templateData: TemplateFolder;
  savedContents: Record<string, string>;
  dirtyFileIds: string[];
  openFileIds: string[];
  activeFileId: string | null;
};

export function useFileExplorer(initialTemplate: TemplateFolder) {
  const [templateData, setTemplateData] = useState(initialTemplate);
  const [savedContents, setSavedContents] = useState(() =>
    getTemplateFileContentMap(initialTemplate),
  );
  const [dirtyFileIds, setDirtyFileIds] = useState<string[]>([]);
  const [openFileIds, setOpenFileIds] = useState<string[]>(() => {
    const firstFile = getFirstTemplateFile(initialTemplate);
    return firstFile ? [firstFile.id] : [];
  });
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    return getFirstTemplateFile(initialTemplate)?.id ?? null;
  });

  const templateRef = useRef(templateData);
  const savedContentsRef = useRef(savedContents);
  const dirtyFileIdsRef = useRef(dirtyFileIds);
  const openFileIdsRef = useRef(openFileIds);
  const activeFileIdRef = useRef(activeFileId);

  useLayoutEffect(() => {
    templateRef.current = templateData;
    savedContentsRef.current = savedContents;
    dirtyFileIdsRef.current = dirtyFileIds;
    openFileIdsRef.current = openFileIds;
    activeFileIdRef.current = activeFileId;
  }, [activeFileId, dirtyFileIds, openFileIds, savedContents, templateData]);

  const tree = useMemo(() => buildTemplateTree(templateData), [templateData]);
  const flattenedFiles = useMemo(
    () => flattenTemplateFiles(templateData),
    [templateData],
  );

  const resolvedActiveFileId =
    activeFileId &&
    openFileIds.includes(activeFileId) &&
    flattenedFiles.some((file) => file.id === activeFileId)
      ? activeFileId
      : (openFileIds.find((fileId) =>
          flattenedFiles.some((file) => file.id === fileId),
        ) ?? null);

  const activeFile = useMemo<FlattenedTemplateFile | null>(() => {
    if (!resolvedActiveFileId) {
      return null;
    }

    return findFileById(templateData, resolvedActiveFileId);
  }, [resolvedActiveFileId, templateData]);

  const openFiles = useMemo<OpenFileTab[]>(() => {
    return openFileIds
      .map((fileId) => flattenedFiles.find((file) => file.id === fileId))
      .filter((file): file is FlattenedTemplateFile => Boolean(file))
      .map((file) => ({
        id: file.id,
        path: file.path,
        name: file.name,
        language: file.language,
        isDirty: dirtyFileIds.includes(file.id),
      }));
  }, [dirtyFileIds, flattenedFiles, openFileIds]);

  const selectFile = useCallback((fileId: string) => {
    setOpenFileIds((currentFileIds) => dedupeFileIds([...currentFileIds, fileId]));
    setActiveFileId(fileId);
  }, []);

  const closeAllFiles = useCallback(() => {
    setOpenFileIds([]);
    setActiveFileId(null);
  }, []);

  const closeFile = useCallback((fileId: string) => {
    const currentOpenFileIds = openFileIdsRef.current;
    const nextOpenFileIds = currentOpenFileIds.filter((id) => id !== fileId);
    const closingActiveFile = activeFileIdRef.current === fileId;

    setOpenFileIds(nextOpenFileIds);

    if (!closingActiveFile) {
      return;
    }

    const currentIndex = currentOpenFileIds.indexOf(fileId);
    const fallbackFileId =
      nextOpenFileIds[currentIndex] ??
      nextOpenFileIds[currentIndex - 1] ??
      null;

    setActiveFileId(fallbackFileId);
  }, []);

  const updateFileContent = useCallback((fileId: string, nextContent: string) => {
    setTemplateData((currentTemplate) =>
      updateTemplateFileContent(currentTemplate, fileId, nextContent),
    );

    setDirtyFileIds((currentDirtyFileIds) => {
      const isDirty = nextContent !== (savedContentsRef.current[fileId] ?? "");

      if (!isDirty) {
        return currentDirtyFileIds.filter((currentFileId) => currentFileId !== fileId);
      }

      if (currentDirtyFileIds.includes(fileId)) {
        return currentDirtyFileIds;
      }

      return [...currentDirtyFileIds, fileId];
    });
  }, []);

  const getStateSnapshot = useCallback((): ExplorerStateSnapshot => {
    return {
      templateData: templateRef.current,
      savedContents: savedContentsRef.current,
      dirtyFileIds: dirtyFileIdsRef.current,
      openFileIds: openFileIdsRef.current,
      activeFileId: activeFileIdRef.current,
    };
  }, []);

  const restoreSnapshot = useCallback((snapshot: ExplorerStateSnapshot) => {
    setTemplateData(snapshot.templateData);
    setSavedContents(snapshot.savedContents);
    setDirtyFileIds(snapshot.dirtyFileIds);
    setOpenFileIds(snapshot.openFileIds);
    setActiveFileId(snapshot.activeFileId);
  }, []);

  const prepareSaveFile = useCallback((fileId?: string) => {
    const targetFileId = fileId ?? activeFileIdRef.current;

    if (!targetFileId) {
      return null;
    }

    const file = findFileById(templateRef.current, targetFileId);
    if (!file) {
      return null;
    }

    return {
      path: targetFileId,
      content: file.file.content,
    };
  }, []);

  const prepareSaveAllFiles = useCallback(() => {
    return dirtyFileIdsRef.current
      .map((fileId) => {
        const file = findFileById(templateRef.current, fileId);
        if (!file) {
          return null;
        }

        return {
          path: fileId,
          content: file.file.content,
        };
      })
      .filter((file): file is SaveTarget => Boolean(file));
  }, []);

  const markFilesSaved = useCallback((filesToSave: SaveTarget[]) => {
    if (!filesToSave.length) {
      return;
    }

    const savedPaths = new Set(filesToSave.map((file) => file.path));
    setSavedContents((currentSavedContents) => ({
      ...currentSavedContents,
      ...Object.fromEntries(filesToSave.map((file) => [file.path, file.content])),
    }));
    setDirtyFileIds((currentDirtyFileIds) =>
      currentDirtyFileIds.filter((fileId) => !savedPaths.has(fileId)),
    );
  }, []);

  const loadTemplate = useCallback((
    nextTemplate: TemplateFolder,
    options: LoadTemplateOptions = {},
  ) => {
    const availableFileIds = flattenTemplateFiles(nextTemplate).map((file) => file.id);
    const nextSavedContents = getTemplateFileContentMap(nextTemplate);
    const requestedOpenFileIds = options.openFileIds?.filter((fileId) =>
      availableFileIds.includes(fileId),
    ) ?? [];
    const preferredActiveFileId =
      options.activeFileId && availableFileIds.includes(options.activeFileId)
        ? options.activeFileId
        : null;
    const fallbackActiveFileId = availableFileIds[0] ?? null;
    const nextActiveFileId =
      preferredActiveFileId ??
      requestedOpenFileIds[0] ??
      fallbackActiveFileId;
    const nextOpenFileIds = dedupeFileIds(
      requestedOpenFileIds.length
        ? requestedOpenFileIds
        : nextActiveFileId
          ? [nextActiveFileId]
          : [],
    );

    setTemplateData(nextTemplate);
    setSavedContents(nextSavedContents);
    setDirtyFileIds([]);
    setOpenFileIds(nextOpenFileIds);
    setActiveFileId(nextActiveFileId);
  }, []);

  const createNode = useCallback((input: CreateTemplateNodeInput) => {
    const snapshot = getStateSnapshot();
    const result = createTemplateNode(
      templateRef.current,
      input.parentPath,
      input.kind,
      input.name,
    );

    setTemplateData(result.template);

    if (input.kind === "file") {
      const createdFile = findFileById(result.template, result.createdPath);
      if (createdFile) {
        setSavedContents((currentSavedContents) => ({
          ...currentSavedContents,
          [createdFile.id]: createdFile.file.content,
        }));
        setOpenFileIds((currentFileIds) =>
          dedupeFileIds([...currentFileIds, createdFile.id]),
        );
        setActiveFileId(createdFile.id);
      }
    }

    return {
      ...result,
      rollback: () => restoreSnapshot(snapshot),
    };
  }, [getStateSnapshot, restoreSnapshot]);

  const renameNode = useCallback((nodePath: string, nextName: string) => {
    const snapshot = getStateSnapshot();
    const result = renameTemplateNode(templateRef.current, nodePath, nextName);

    setTemplateData(result.template);
    setSavedContents((currentSavedContents) =>
      remapRecordKeysByPrefix(
        currentSavedContents,
        result.previousPath,
        result.nextPath,
      ),
    );
    setDirtyFileIds((currentDirtyFileIds) =>
      currentDirtyFileIds.map((fileId) =>
        remapPathPrefix(fileId, result.previousPath, result.nextPath),
      ),
    );
    setOpenFileIds((currentFileIds) =>
      dedupeFileIds(
        currentFileIds.map((fileId) =>
          remapPathPrefix(fileId, result.previousPath, result.nextPath),
        ),
      ),
    );
    setActiveFileId((currentActiveFileId) =>
      currentActiveFileId
        ? remapPathPrefix(currentActiveFileId, result.previousPath, result.nextPath)
        : null,
    );

    return {
      ...result,
      rollback: () => restoreSnapshot(snapshot),
    };
  }, [getStateSnapshot, restoreSnapshot]);

  const deleteNode = useCallback((nodePath: string) => {
    const snapshot = getStateSnapshot();
    const result = deleteTemplateNode(templateRef.current, nodePath);
    const nextTemplate = result.template;
    const remainingFiles = flattenTemplateFiles(nextTemplate).map((file) => file.id);

    setTemplateData(nextTemplate);
    setSavedContents((currentSavedContents) =>
      Object.fromEntries(
        Object.entries(currentSavedContents).filter(
          ([fileId]) =>
            fileId !== nodePath && !fileId.startsWith(`${nodePath}/`),
        ),
      ),
    );
    setDirtyFileIds((currentDirtyFileIds) =>
      removeMatchingPaths(currentDirtyFileIds, nodePath),
    );
    setOpenFileIds((currentFileIds) => {
      const nextOpenFileIds = removeMatchingPaths(currentFileIds, nodePath).filter(
        (fileId) => remainingFiles.includes(fileId),
      );

      return nextOpenFileIds;
    });
    setActiveFileId((currentActiveFileId) => {
      if (!currentActiveFileId) {
        return null;
      }

      const nextActiveFileId =
        removeMatchingPaths([currentActiveFileId], nodePath)[0] ?? null;

      if (nextActiveFileId && remainingFiles.includes(nextActiveFileId)) {
        return nextActiveFileId;
      }

      const fallbackOpenFileIds = removeMatchingPaths(
        openFileIdsRef.current,
        nodePath,
      ).filter((fileId) => remainingFiles.includes(fileId));

      return (
        getNextActiveFileId(fallbackOpenFileIds, nextActiveFileId) ??
        null
      );
    });

    return {
      ...result,
      rollback: () => restoreSnapshot(snapshot),
    };
  }, [getStateSnapshot, restoreSnapshot]);

  return {
    templateData,
    tree,
    flattenedFiles,
    openFiles,
    activeFileId: resolvedActiveFileId,
    activeFile,
    dirtyFileIds,
    hasDirtyFiles: dirtyFileIds.length > 0,
    selectFile,
    closeAllFiles,
    closeFile,
    updateFileContent,
    prepareSaveFile,
    prepareSaveAllFiles,
    markFilesSaved,
    loadTemplate,
    createNode,
    renameNode,
    deleteNode,
  };
}
