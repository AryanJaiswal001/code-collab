"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LoadingStep from "@/modules/playground/components/loader";
import { PlaygroundEditor } from "@/modules/playground/components/playground-editor";
import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";
import ToggleAI from "@/modules/playground/components/toggle-ai";
import { useAISuggestions } from "@/modules/playground/hooks/useAISuggestion";
import { useFileExplorer } from "@/modules/playground/hooks/useFileExplorer";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import { findFilePath } from "@/modules/playground/lib";
import {
  TemplateFile,
  TemplateFolder,
} from "@/modules/playground/lib/path-to-json";
import WebContainerPreview from "@/modules/webcontainers/components/webcontainer-preview";
import { useWebContainer } from "@/modules/webcontainers/hooks/useWebContainer";
import {
  AlertCircle,
  Cloud,
  FileText,
  FolderOpen,
  Github,
  PanelRightOpen,
  Save,
  Settings,
  X,
} from "lucide-react";
import CollabPanel from "@/modules/collaboration/components/collab-panel";
import { LoadUpdateDialog } from "@/modules/collaboration/components/load-update-dialog";
import { useCollabPanel } from "@/modules/collaboration/hooks/use-collab-panel";
import { useChatStore } from "@/modules/collaboration/hooks/use-chat-store";
import { useFilePushStore } from "@/modules/collaboration/hooks/use-file-push-store";
import { usePresenceStore } from "@/modules/collaboration/hooks/use-presence-store";
import { useVoiceStore } from "@/modules/collaboration/hooks/use-voice-store";
import { useWorkspaceSocket } from "@/modules/collaboration/hooks/useWorkspaceSocket";
import { useFilePush } from "@/modules/collaboration/hooks/useFilePush";
import { useWorkspaceActivity } from "@/modules/collaboration/hooks/useWorkspaceActivity";
import { PendingFileUpdate } from "@/modules/collaboration/hooks/use-file-push-store";
import { useActiveEditorsStore } from "@/modules/collaboration/hooks/use-active-editors-store";
import { useCurrentUser } from "@/modules/auth/hooks/use-current-user";
import { pushGithubWorkspace } from "@/modules/workspace/actions";
import { useParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const COLLAB_PANEL_DEFAULT_WIDTH = 340;
const COLLAB_PANEL_MIN_WIDTH = 280;
const COLLAB_PANEL_MAX_WIDTH = 420;

interface WorkspacePermissionFile {
  id: string;
  name: string;
  path: string;
  assignedUsers: Array<{
    userId: string;
    name: string;
  }>;
  canEdit: boolean;
}

interface WorkspacePermissionsPayload {
  mode: "STRICT" | "LENIENT";
  files: WorkspacePermissionFile[];
}

const MainPlaygroundPage = () => {
  const { id } = useParams<{ id: string }>();
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [loadUpdateDialog, setLoadUpdateDialog] = useState<{
    open: boolean;
    update: PendingFileUpdate | null;
  }>({ open: false, update: null });
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Update workspace files");
  const [isPushingToGithub, setIsPushingToGithub] = useState(false);
  const { panelOpen, activeTab, togglePanel } = useCollabPanel();
  const user = useCurrentUser();
  const activeEditors = useActiveEditorsStore((s) => s.activeEditors);
  const presenceUsers = usePresenceStore((s) => s.users);
  const chatMessages = useChatStore((s) => s.messages);
  const activities = useFilePushStore((s) => s.activities);
  const voiceParticipants = useVoiceStore((s) => s.participants);
  const [collabPanelWidth, setCollabPanelWidth] = useState(
    COLLAB_PANEL_DEFAULT_WIDTH,
  );
  const isResizingCollabPanel = useRef(false);
  const resizeAnimationFrameRef = useRef<number | null>(null);
  const [isCollabPanelDragging, setIsCollabPanelDragging] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const [voiceUnreadCount, setVoiceUnreadCount] = useState(0);
  const [workspacePermissions, setWorkspacePermissions] =
    useState<WorkspacePermissionsPayload | null>(null);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const previousChatCountRef = useRef<number | null>(null);
  const previousActivityCountRef = useRef<number | null>(null);
  const previousVoiceCountRef = useRef<number | null>(null);

  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);

  const workspaceMemberRole =
    playgroundData?.workspace?.members?.[0]?.role ?? null;
  const workspaceMode =
    workspacePermissions?.mode ?? playgroundData?.workspace?.mode ?? "LENIENT";

  const refreshWorkspacePermissions = useCallback(async () => {
    const workspaceId = playgroundData?.workspace?.id;
    if (!workspaceId) {
      setWorkspacePermissions(null);
      return;
    }

    setIsPermissionsLoading(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/permissions`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch workspace permissions");
      }

      const payload = (await response.json()) as WorkspacePermissionsPayload;
      setWorkspacePermissions(payload);
    } catch (error) {
      console.error("Failed to fetch workspace permissions:", error);
      setWorkspacePermissions(null);
    } finally {
      setIsPermissionsLoading(false);
    }
  }, [playgroundData?.workspace?.id]);

  useEffect(() => {
    void refreshWorkspacePermissions();
  }, [refreshWorkspacePermissions]);

  const socketOptions = React.useMemo(
    () =>
      user?.id && user?.name
        ? {
            workspaceId: id,
            userId: user.id,
            name: user.name,
            avatar: user.image ?? null,
            role: workspaceMemberRole,
          }
        : null,
    [id, user?.id, user?.name, user?.image, workspaceMemberRole],
  );
  const { emitFileOpen, emitFileInactive, emitActivity } =
    useWorkspaceSocket(socketOptions);

  // Initialize activity listener
  useWorkspaceActivity();

  const aiSuggestions = useAISuggestions();

  const {
    setTemplateData,
    setActiveFileId,
    setPlaygroundId,
    setOpenFiles,
    activeFileId,
    closeAllFiles,
    closeFile,
    openFile,
    openFiles,

    handleAddFile,
    handleAddFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleRenameFile,
    handleRenameFolder,
    updateFileContent,
  } = useFileExplorer();

  // Handle loading file updates from collaborators
  const handleLoadUpdate = useCallback(
    (update: PendingFileUpdate) => {
      // Check if this file is currently open and has unsaved changes
      const openFile = openFiles.find((f) => {
        const filePath = `${f.filename}.${f.fileExtension}`;
        return (
          filePath === update.filePath || update.filePath.endsWith(filePath)
        );
      });

      if (openFile?.hasUnsavedChanges) {
        // Show confirmation dialog
        setLoadUpdateDialog({ open: true, update });
      } else {
        // Apply update directly (deferred to avoid setState during render)
        setTimeout(() => {
          applyFileUpdate(update);
        }, 0);
      }
    },
    [openFiles],
  );

  // Apply file update to editor
  const applyFileUpdate = useCallback(
    (update: PendingFileUpdate) => {
      const matchingFile = openFiles.find((f) => {
        const filePath = `${f.filename}.${f.fileExtension}`;
        return (
          filePath === update.filePath || update.filePath.endsWith(filePath)
        );
      });

      if (matchingFile) {
        // Update the open file content
        updateFileContent(matchingFile.id, update.fileContent);
        toast.success(`Loaded update from ${update.updatedBy.name}`);
      } else {
        // File not open - just show a notice
        toast.info(
          `File ${update.filePath} was updated. Open it to see changes.`,
        );
      }
    },
    [openFiles, updateFileContent],
  );

  const { pushFile } = useFilePush({
    onLoadUpdate: handleLoadUpdate,
  });

  const {
    serverUrl,
    isLoading: containerLoading,
    error: containerError,
    instance,
    writeFileSync,
    // @ts-ignore
  } = useWebContainer({ templateData });

  const lastSyncedContent = useRef<Map<string, string>>(new Map());

  const startCollabPanelResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      isResizingCollabPanel.current = true;
      setIsCollabPanelDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingCollabPanel.current) return;

      const nextWidth = Math.min(
        COLLAB_PANEL_MAX_WIDTH,
        Math.max(COLLAB_PANEL_MIN_WIDTH, window.innerWidth - event.clientX),
      );

      if (resizeAnimationFrameRef.current !== null) {
        cancelAnimationFrame(resizeAnimationFrameRef.current);
      }

      resizeAnimationFrameRef.current = requestAnimationFrame(() => {
        setCollabPanelWidth(nextWidth);
      });
    };

    const stopResizing = () => {
      if (!isResizingCollabPanel.current) return;
      isResizingCollabPanel.current = false;
      setIsCollabPanelDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
      if (resizeAnimationFrameRef.current !== null) {
        cancelAnimationFrame(resizeAnimationFrameRef.current);
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  useEffect(() => {
    setPlaygroundId(id);
  }, [id, setPlaygroundId]);

  // Notify workspace when user navigates away from playground
  useEffect(() => {
    return () => {
      emitFileInactive();
    };
  }, [emitFileInactive]);

  useEffect(() => {
    if (previousChatCountRef.current === null) {
      previousChatCountRef.current = chatMessages.length;
      return;
    }

    const delta = chatMessages.length - previousChatCountRef.current;
    previousChatCountRef.current = chatMessages.length;

    if (delta > 0 && !(panelOpen && activeTab === "chat")) {
      setChatUnreadCount((count) => count + delta);
    }
  }, [chatMessages.length, panelOpen, activeTab]);

  useEffect(() => {
    if (previousActivityCountRef.current === null) {
      previousActivityCountRef.current = activities.length;
      return;
    }

    const delta = activities.length - previousActivityCountRef.current;
    previousActivityCountRef.current = activities.length;

    if (delta > 0 && !(panelOpen && activeTab === "activity")) {
      setActivityUnreadCount((count) => count + delta);
    }
  }, [activities.length, panelOpen, activeTab]);

  useEffect(() => {
    if (previousVoiceCountRef.current === null) {
      previousVoiceCountRef.current = voiceParticipants.length;
      return;
    }

    const delta = voiceParticipants.length - previousVoiceCountRef.current;
    previousVoiceCountRef.current = voiceParticipants.length;

    if (delta > 0 && !(panelOpen && activeTab === "voice")) {
      setVoiceUnreadCount((count) => count + delta);
    }
  }, [voiceParticipants.length, panelOpen, activeTab]);

  useEffect(() => {
    if (panelOpen && activeTab === "chat" && chatUnreadCount > 0) {
      setChatUnreadCount(0);
    }
  }, [panelOpen, activeTab, chatUnreadCount]);

  useEffect(() => {
    if (panelOpen && activeTab === "activity" && activityUnreadCount > 0) {
      setActivityUnreadCount(0);
    }
  }, [panelOpen, activeTab, activityUnreadCount]);

  useEffect(() => {
    if (panelOpen && activeTab === "voice" && voiceUnreadCount > 0) {
      setVoiceUnreadCount(0);
    }
  }, [panelOpen, activeTab, voiceUnreadCount]);

  useEffect(() => {
    if (templateData && !openFiles.length) {
      setTemplateData(templateData);
    }
  }, [templateData, setTemplateData, openFiles.length]);

  // Create wrapper functions that pass saveTemplateData
  const wrappedHandleAddFile = useCallback(
    (newFile: TemplateFile, parentPath: string) => {
      return handleAddFile(
        newFile,
        parentPath,
        writeFileSync!,
        instance,
        saveTemplateData,
      );
    },
    [handleAddFile, writeFileSync, instance, saveTemplateData],
  );

  const wrappedHandleAddFolder = useCallback(
    (newFolder: TemplateFolder, parentPath: string) => {
      return handleAddFolder(newFolder, parentPath, instance, saveTemplateData);
    },
    [handleAddFolder, instance, saveTemplateData],
  );

  const wrappedHandleDeleteFile = useCallback(
    (file: TemplateFile, parentPath: string) => {
      return handleDeleteFile(file, parentPath, saveTemplateData);
    },
    [handleDeleteFile, saveTemplateData],
  );

  const wrappedHandleDeleteFolder = useCallback(
    (folder: TemplateFolder, parentPath: string) => {
      return handleDeleteFolder(folder, parentPath, saveTemplateData);
    },
    [handleDeleteFolder, saveTemplateData],
  );

  const wrappedHandleRenameFile = useCallback(
    (
      file: TemplateFile,
      newFilename: string,
      newExtension: string,
      parentPath: string,
    ) => {
      return handleRenameFile(
        file,
        newFilename,
        newExtension,
        parentPath,
        saveTemplateData,
      );
    },
    [handleRenameFile, saveTemplateData],
  );

  const wrappedHandleRenameFolder = useCallback(
    (folder: TemplateFolder, newFolderName: string, parentPath: string) => {
      return handleRenameFolder(
        folder,
        newFolderName,
        parentPath,
        saveTemplateData,
      );
    },
    [handleRenameFolder, saveTemplateData],
  );

  const activeFile = openFiles.find((file) => file.id === activeFileId);
  const activeFilePath =
    activeFile && templateData ? findFilePath(activeFile, templateData) : null;
  const fileAccessByPath = useMemo(() => {
    const files = workspacePermissions?.files ?? [];
    return files.reduce(
      (acc, file) => {
        acc[file.path] = {
          canEdit: file.canEdit,
          assignedUserNames: file.assignedUsers.map(
            (assignee) => assignee.name,
          ),
        };
        return acc;
      },
      {} as Record<string, { canEdit: boolean; assignedUserNames: string[] }>,
    );
  }, [workspacePermissions?.files]);
  const canEditActiveFile =
    workspaceMode === "LENIENT" ||
    !activeFilePath ||
    fileAccessByPath[activeFilePath]?.canEdit === true;
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);
  const unreadCommsCount =
    chatUnreadCount + activityUnreadCount + voiceUnreadCount;
  const collaboratorCount = presenceUsers.length;
  const showCollaboratorIndicator = collaboratorCount > 1;
  const canPushToGithub =
    playgroundData?.workspace?.source === "GITHUB" &&
    (workspaceMemberRole === "OWNER" || workspaceMemberRole === "ADMIN");

  // Push current file to workspace
  const handlePushFile = useCallback(() => {
    if (!activeFileId || !user?.name) return;

    const currentFile = openFiles.find((f) => f.id === activeFileId);
    if (!currentFile) return;

    if (!canEditActiveFile) {
      toast.error("You only have read-only access to this file");
      return;
    }

    const resolvedPath =
      activeFilePath || `${currentFile.filename}.${currentFile.fileExtension}`;
    pushFile(resolvedPath, currentFile.content, user.name);
  }, [
    activeFileId,
    activeFilePath,
    canEditActiveFile,
    openFiles,
    pushFile,
    user?.name,
  ]);

  const handleFileSelect = (file: TemplateFile) => {
    const filePath = `${file.filename}.${file.fileExtension}`;
    const currentEditor = activeEditors[filePath];
    // Show non-blocking overlay if another user is actively editing this file
    if (currentEditor && currentEditor.userId !== user?.id) {
      toast.warning(
        `${currentEditor.name} is currently working on ${filePath}`,
        { duration: 4000 },
      );
    }
    openFile(file);
    emitFileOpen(filePath);
  };

  const handleTabChange = useCallback(
    (fileId: string) => {
      setActiveFileId(fileId);
      const file = openFiles.find((f) => f.id === fileId);
      if (file) {
        emitFileOpen(`${file.filename}.${file.fileExtension}`);
      }
    },
    [setActiveFileId, openFiles, emitFileOpen],
  );

  const handleSave = useCallback(
    async (fileId?: string) => {
      const targetFileId = fileId || activeFileId;
      if (!targetFileId) return;

      const fileToSave = openFiles.find((f) => f.id === targetFileId);

      if (!fileToSave) return;

      const latestTemplateData = useFileExplorer.getState().templateData;
      if (!latestTemplateData) return;

      try {
        const filePath = findFilePath(fileToSave, latestTemplateData);
        if (!filePath) {
          toast.error(
            `Could not find path for file: ${fileToSave.filename}.${fileToSave.fileExtension}`,
          );
          return;
        }

        const updatedTemplateData = JSON.parse(
          JSON.stringify(latestTemplateData),
        );

        // @ts-ignore
        const updateFileContent = (items: any[]) =>
          // @ts-ignore
          items.map((item) => {
            if ("folderName" in item) {
              return { ...item, items: updateFileContent(item.items) };
            } else if (
              item.filename === fileToSave.filename &&
              item.fileExtension === fileToSave.fileExtension
            ) {
              return { ...item, content: fileToSave.content };
            }
            return item;
          });
        updatedTemplateData.items = updateFileContent(
          updatedTemplateData.items,
        );

        // Sync with WebContainer
        if (writeFileSync) {
          await writeFileSync(filePath, fileToSave.content);
          lastSyncedContent.current.set(fileToSave.id, fileToSave.content);
          if (instance && instance.fs) {
            await instance.fs.writeFile(filePath, fileToSave.content);
          }
        }

        await saveTemplateData(updatedTemplateData);
        setTemplateData(updatedTemplateData);
        // Update open files
        const updatedOpenFiles = openFiles.map((f) =>
          f.id === targetFileId
            ? {
                ...f,
                content: fileToSave.content,
                originalContent: fileToSave.content,
                hasUnsavedChanges: false,
              }
            : f,
        );
        setOpenFiles(updatedOpenFiles);

        toast.success(
          `Saved ${fileToSave.filename}.${fileToSave.fileExtension}`,
        );
      } catch (error) {
        console.error("Error saving file:", error);
        toast.error(
          `Failed to save ${fileToSave.filename}.${fileToSave.fileExtension}`,
        );
        throw error;
      }
    },
    [
      activeFileId,
      openFiles,
      writeFileSync,
      instance,
      saveTemplateData,
      setTemplateData,
      setOpenFiles,
    ],
  );

  const handleSaveAll = useCallback(async () => {
    const unsavedFiles = openFiles.filter((f) => f.hasUnsavedChanges);

    if (unsavedFiles.length === 0) {
      toast.info("No unsaved changes");
      return;
    }

    try {
      await Promise.all(unsavedFiles.map((f) => handleSave(f.id)));
      toast.success(`Saved ${unsavedFiles.length} file(s)`);
    } catch (error) {
      toast.error("Failed to save some files");
      throw error;
    }
  }, [handleSave, openFiles]);

  const handlePushToGithub = useCallback(async () => {
    if (!playgroundData?.id) {
      toast.error("Unable to push changes right now");
      return;
    }

    setIsPushingToGithub(true);

    try {
      if (hasUnsavedChanges) {
        await handleSaveAll();
      }

      const result = await pushGithubWorkspace({
        playgroundId: playgroundData.id,
        commitMessage,
      });

      if (result.changedFiles === 0) {
        toast.info(result.message);
        setIsPushDialogOpen(false);
        return;
      }

      emitActivity({
        type: "github-push",
        message: "User pushed changes to GitHub",
        data: {
          changedFiles: result.changedFiles,
          repoOwner: playgroundData.workspace?.repoOwner ?? undefined,
          repoName: playgroundData.workspace?.repoName ?? undefined,
          branch: playgroundData.workspace?.repoBranch ?? undefined,
        },
      });

      toast.success("Changes successfully pushed to GitHub.");
      setIsPushDialogOpen(false);
    } catch (error) {
      console.error("Error pushing changes to GitHub:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to push changes to GitHub",
      );
    } finally {
      setIsPushingToGithub(false);
    }
  }, [
    commitMessage,
    emitActivity,
    handleSaveAll,
    hasUnsavedChanges,
    playgroundData?.id,
    playgroundData?.workspace?.repoBranch,
    playgroundData?.workspace?.repoName,
    playgroundData?.workspace?.repoOwner,
  ]);

  const handleAssignmentsChanged = useCallback(
    (message: string) => {
      emitActivity({
        type: "file-assignment",
        message,
      });
      void refreshWorkspacePermissions();
    },
    [emitActivity, refreshWorkspacePermissions],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="destructive">
          Try Again
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Loading Playground
          </h2>
          <div className="mb-8">
            <LoadingStep
              currentStep={1}
              step={1}
              label="Loading playground data"
            />
            <LoadingStep
              currentStep={2}
              step={2}
              label="Setting up environment"
            />
            <LoadingStep currentStep={3} step={3} label="Ready to code" />
          </div>
        </div>
      </div>
    );
  }

  // No template data
  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <FolderOpen className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-amber-600 mb-2">
          No template data available
        </h2>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload Template
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <>
        <TemplateFileTree
          data={templateData!}
          onFileSelect={handleFileSelect}
          selectedFile={activeFile}
          title="File Explorer"
          onAddFile={wrappedHandleAddFile}
          onAddFolder={wrappedHandleAddFolder}
          onDeleteFile={wrappedHandleDeleteFile}
          onDeleteFolder={wrappedHandleDeleteFolder}
          onRenameFile={wrappedHandleRenameFile}
          onRenameFolder={wrappedHandleRenameFolder}
          activeEditors={activeEditors}
          workspaceMode={workspaceMode}
          fileAccessByPath={fileAccessByPath}
        />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <h1 className="text-sm font-medium">
                  {playgroundData?.title || "Code Playground"}
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  {openFiles.length} File(s) Open
                  {hasUnsavedChanges && " • Unsaved changes"}
                </p>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave()}
                      disabled={
                        !activeFile ||
                        !activeFile.hasUnsavedChanges ||
                        !canEditActiveFile
                      }
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save (Ctrl+S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveAll}
                      disabled={!hasUnsavedChanges}
                    >
                      <Save className="h-4 w-4" /> All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save All (Ctrl+Shift+S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePushFile}
                      disabled={!activeFile || !canEditActiveFile}
                      className="gap-1"
                    >
                      <Cloud className="h-4 w-4" />
                      Push
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Push to Workspace</TooltipContent>
                </Tooltip>

                {playgroundData?.workspace?.source === "GITHUB" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPushDialogOpen(true)}
                        disabled={!canPushToGithub || isPushingToGithub}
                        className="gap-1"
                      >
                        <Github className="h-4 w-4" />
                        Push to GitHub
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {canPushToGithub
                        ? "Push workspace changes to GitHub"
                        : "Only workspace owners and admins can push to GitHub"}
                    </TooltipContent>
                  </Tooltip>
                )}

                {showCollaboratorIndicator && (
                  <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground md:flex">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{collaboratorCount} collaborators online</span>
                  </div>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Button
                        size="sm"
                        variant={panelOpen ? "default" : "ghost"}
                        onClick={() => togglePanel()}
                        className="relative"
                      >
                        <PanelRightOpen className="h-4 w-4" />
                      </Button>
                      {unreadCommsCount > 0 && (
                        <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white shadow-sm">
                          {Math.min(unreadCommsCount, 99)}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Collaboration Panel</TooltipContent>
                </Tooltip>

                <ToggleAI
                  isEnabled={aiSuggestions.isEnabled}
                  onToggle={aiSuggestions.toggleEnabled}
                  suggestionLoading={aiSuggestions.isLoading}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                    >
                      {isPreviewVisible ? "Hide" : "Show"} Preview
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={closeAllFiles}>
                      Close All Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="h-[calc(100vh-4rem)]">
            <div className="h-full flex flex-col">
              {openFiles.length > 0 && (
                <div className="border-b bg-muted/30">
                  <Tabs
                    value={activeFileId || ""}
                    onValueChange={handleTabChange}
                  >
                    <div className="flex items-center justify-between px-4 py-2">
                      <TabsList className="h-8 bg-transparent p-0">
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className="relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              <span>
                                {file.filename}.{file.fileExtension}
                              </span>
                              {file.hasUnsavedChanges && (
                                <span className="text-xs font-semibold leading-none text-amber-500">
                                  *
                                </span>
                              )}
                              <span
                                className="ml-2 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeFile(file.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {openFiles.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={closeAllFiles}
                          className="h-6 px-2 text-xs"
                        >
                          Close All
                        </Button>
                      )}
                    </div>
                  </Tabs>
                </div>
              )}
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 min-w-0">
                  <ResizablePanelGroup
                    direction="horizontal"
                    className="h-full"
                  >
                    <ResizablePanel defaultSize={isPreviewVisible ? 50 : 100}>
                      {openFiles.length > 0 && activeFile ? (
                        <PlaygroundEditor
                          activeFile={activeFile}
                          content={activeFile?.content || ""}
                          readOnly={!canEditActiveFile || isPermissionsLoading}
                          onContentChange={(value) =>
                            activeFileId &&
                            canEditActiveFile &&
                            updateFileContent(activeFileId, value)
                          }
                          suggestion={aiSuggestions.suggestions[0] || null}
                          suggestionLoading={aiSuggestions.isLoading}
                          suggestionPosition={aiSuggestions.position}
                          onAcceptSuggestion={(editor, monaco) =>
                            aiSuggestions.acceptSuggestion(editor, monaco)
                          }
                          onRejectSuggestion={(editor) =>
                            aiSuggestions.rejectSuggestion(editor)
                          }
                          onTriggerSuggestion={(type, editor) =>
                            aiSuggestions.fetchSuggestions(type, editor)
                          }
                        />
                      ) : (
                        <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4">
                          <FileText className="h-16 w-16 text-gray-300" />
                          <div className="text-center">
                            <p className="text-lg font-medium">No files open</p>
                            <p className="text-sm text-gray-500">
                              Select a file from the sidebar to start editing
                            </p>
                          </div>
                        </div>
                      )}
                    </ResizablePanel>

                    {isPreviewVisible && (
                      <>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={50}>
                          <WebContainerPreview
                            templateData={templateData}
                            instance={instance}
                            writeFileSync={writeFileSync}
                            isLoading={containerLoading}
                            error={containerError?.message || null}
                            serverUrl={serverUrl!}
                            forceResetup={false}
                          />
                        </ResizablePanel>
                      </>
                    )}
                  </ResizablePanelGroup>
                </div>

                <div
                  className={`relative shrink-0 h-full overflow-hidden ${
                    isCollabPanelDragging
                      ? "transition-none"
                      : "transition-[width] duration-300 ease-out"
                  }`}
                  style={{ width: panelOpen ? `${collabPanelWidth}px` : "0px" }}
                >
                  {panelOpen && (
                    <>
                      <div
                        className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize bg-transparent hover:bg-border/80"
                        onMouseDown={startCollabPanelResize}
                      />
                      <div
                        className="h-full w-full translate-x-0 opacity-100 transition-transform duration-200 ease-in-out"
                        style={{
                          borderLeft: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <CollabPanel
                          currentUserId={user?.id}
                          currentUserRole={workspaceMemberRole}
                          workspaceId={playgroundData?.workspace?.id}
                          workspaceMode={workspaceMode}
                          workspaceFiles={workspacePermissions?.files}
                          onAssignmentsChanged={handleAssignmentsChanged}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>

        {/* Load Update Confirmation Dialog */}
        <LoadUpdateDialog
          open={loadUpdateDialog.open}
          onOpenChange={(open) =>
            setLoadUpdateDialog({
              open,
              update: open ? loadUpdateDialog.update : null,
            })
          }
          fileName={loadUpdateDialog.update?.filePath || ""}
          pushedBy={loadUpdateDialog.update?.updatedBy.name || ""}
          hasUnsavedChanges={true}
          onConfirm={() => {
            if (loadUpdateDialog.update) {
              setTimeout(() => {
                applyFileUpdate(loadUpdateDialog.update!);
                setLoadUpdateDialog({ open: false, update: null });
              }, 0);
            } else {
              setLoadUpdateDialog({ open: false, update: null });
            }
          }}
        />

        <Dialog open={isPushDialogOpen} onOpenChange={setIsPushDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Push to GitHub</DialogTitle>
              <DialogDescription>
                Commit the current workspace changes to the connected GitHub
                branch.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="commit-message">
                Commit message
              </label>
              <Input
                id="commit-message"
                value={commitMessage}
                onChange={(event) => setCommitMessage(event.target.value)}
                placeholder="Update workspace files"
                disabled={isPushingToGithub}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPushDialogOpen(false)}
                disabled={isPushingToGithub}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePushToGithub}
                disabled={
                  !commitMessage.trim() || isPushingToGithub || !canPushToGithub
                }
                className="gap-1"
              >
                <Github className="h-4 w-4" />
                Push to GitHub
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;
