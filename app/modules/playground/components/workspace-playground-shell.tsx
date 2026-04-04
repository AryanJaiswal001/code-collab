"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  startTransition,
} from "react";
import {
  ArrowLeft,
  FolderGit2,
  RefreshCw,
  Save,
  Share2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { GitHubRepositoryPicker } from "@/app/modules/github/components/github-repository-picker";
import { useGitHubRepositories } from "@/app/modules/github/hooks/useGitHubRepositories";
import type {
  GitHubRepoFilesResponse,
  GitHubRepositorySummary,
} from "@/app/modules/github/types";
import { CollaborationPanel } from "./collaboration-panel";
import { useWorkspaceVoice } from "../hooks/useWorkspaceVoice";
import { useFileExplorer } from "../hooks/useFileExplorer";
import { getTemplateFileContentMap } from "../lib";
import type { CreateTemplateNodeInput } from "../types";
import type {
  FilePushEvent,
  WorkspaceActivity,
  WorkspaceChatMessage,
  WorkspaceCurrentUser,
  WorkspaceFileState,
  WorkspacePresence,
  WorkspaceSnapshot,
  WorkspaceTreeUpdateEvent,
} from "@/app/modules/workspaces/types";
import { getWorkspaceSocket } from "@/lib/collaboration/client";
import { Badge } from "@/components/ui/badge";
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { PlaygroundEditor } from "./playground-editor";
import { PlaygroundExplorer } from "./playground-explorer";
import { useWebContainer } from "../../webcontainers/hooks/useWebContainer";
import WebContainerPreview from "../../webcontainers/components/webcontainer-preview";

type WorkspacePlaygroundShellProps = {
  initialSnapshot: WorkspaceSnapshot;
  backHref?: string;
};

type PendingWorkspaceUpdate = {
  summary: string;
};

type MemberActionBody =
  | { action: "set-role"; role: "ADMIN" | "MEMBER" }
  | { action: "remove" }
  | { action: "set-voice-mute"; isVoiceMuted: boolean };

function buildFileStateMap(fileStates: WorkspaceFileState[]) {
  return new Map(fileStates.map((fileState) => [fileState.path, fileState]));
}

function buildActiveCollaboratorNamesByPath(
  presence: WorkspacePresence[],
  currentUserId: string,
) {
  return presence
    .filter((item) => item.userId !== currentUserId && item.activeFilePath)
    .reduce<Record<string, string[]>>((result, item) => {
      const path = item.activeFilePath as string;
      result[path] = [...(result[path] ?? []), item.name];
      return result;
    }, {});
}

function getRouteErrorMessage(payload: unknown, fallbackMessage: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error
  ) {
    return payload.error;
  }

  return fallbackMessage;
}

async function fetchWorkspaceSnapshot(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | WorkspaceSnapshot
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(payload, "Unable to load the workspace."));
  }

  return payload as WorkspaceSnapshot;
}

async function postWorkspaceJson<T>(workspaceId: string, segment: string, body: unknown) {
  const response = await fetch(`/api/workspaces/${workspaceId}/${segment}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(payload, "Workspace request failed."));
  }

  return payload as T;
}

export function WorkspacePlaygroundShell({
  initialSnapshot,
  backHref = "/dashboard",
}: WorkspacePlaygroundShellProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [members, setMembers] = useState(initialSnapshot.members);
  const [currentUser, setCurrentUser] = useState<WorkspaceCurrentUser>(
    initialSnapshot.currentUser,
  );
  const [fileStates, setFileStates] = useState(initialSnapshot.fileStates);
  const [chatMessages, setChatMessages] = useState(initialSnapshot.chatMessages);
  const [activities, setActivities] = useState(initialSnapshot.activities);
  const [presence, setPresence] = useState<WorkspacePresence[]>([]);
  const [workspaceSyncedContents, setWorkspaceSyncedContents] = useState(
    () => getTemplateFileContentMap(initialSnapshot.templateData),
  );
  const [pendingFileUpdates, setPendingFileUpdates] = useState<
    Record<string, FilePushEvent>
  >({});
  const [pendingWorkspaceUpdate, setPendingWorkspaceUpdate] =
    useState<PendingWorkspaceUpdate | null>(null);
  const [activePanelTab, setActivePanelTab] = useState<
    "chat" | "members" | "voice" | "activity"
  >("chat");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadActivityCount, setUnreadActivityCount] = useState(0);
  const [chatDraft, setChatDraft] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [inviteEmailDraft, setInviteEmailDraft] = useState("");
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [memberActionInFlightId, setMemberActionInFlightId] = useState<string | null>(null);
  const [isLoadingRemoteUpdate, setIsLoadingRemoteUpdate] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("__unassigned__");
  const [restartKey, setRestartKey] = useState(0);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedImportRepository, setSelectedImportRepository] =
    useState<GitHubRepositorySummary | null>(null);
  const [isImportingRepository, setIsImportingRepository] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Awaited<ReturnType<typeof getWorkspaceSocket>> | null>(null);

  const fileStateMap = useMemo(() => buildFileStateMap(fileStates), [fileStates]);
  const activeCollaboratorNamesByPath = useMemo(
    () => buildActiveCollaboratorNamesByPath(presence, currentUser.userId),
    [currentUser.userId, presence],
  );

  const {
    templateData,
    tree,
    flattenedFiles,
    openFiles,
    activeFile,
    activeFileId,
    dirtyFileIds,
    hasDirtyFiles,
    selectFile,
    closeAllFiles,
    closeFile,
    updateFileContent,
    replaceFileContent,
    prepareSaveFile,
    prepareSaveAllFiles,
    markFilesSaved,
    loadTemplate,
  } = useFileExplorer(initialSnapshot.templateData);

  const {
    repositories: githubRepositories,
    isLoading: isLoadingRepositories,
    error: githubRepositoriesError,
    fetchRepositories,
  } = useGitHubRepositories({
    enabled: isImportDialogOpen,
  });

  const {
    instance,
    isLoading,
    error,
    writeFile,
    createDirectory,
    renameEntry,
    deleteEntry,
  } = useWebContainer();

  const voice = useWorkspaceVoice({
    workspaceId: snapshot.id,
    currentUser,
    socket,
  });

  const workspaceDirtyFileIds = useMemo(
    () =>
      flattenedFiles
        .filter((file) => file.file.content !== (workspaceSyncedContents[file.id] ?? ""))
        .map((file) => file.id),
    [flattenedFiles, workspaceSyncedContents],
  );

  const canEditPath = (path: string, kind: "file" | "folder") => {
    if (currentUser.role === "OWNER" || currentUser.role === "ADMIN") {
      return true;
    }

    if (snapshot.rules === "LENIENT") {
      return true;
    }

    if (kind !== "file") {
      return false;
    }

    return fileStateMap.get(path)?.assignedUserId === currentUser.userId;
  };

  const activeFileState = activeFile ? fileStateMap.get(activeFile.path) ?? null : null;
  const activeFileAssigneeName = activeFileState?.assignedUserName ?? null;
  const activeFileCollaborators = activeFile
    ? activeCollaboratorNamesByPath[activeFile.path] ?? []
    : [];
  const activeFilePendingUpdate = activeFile ? pendingFileUpdates[activeFile.path] ?? null : null;
  const isActiveFileReadOnly = activeFile ? !canEditPath(activeFile.path, "file") : false;

  const workspaceStatus = useMemo(() => {
    if (activeFilePendingUpdate) {
      return {
        tone: "warning" as const,
        label: `New push from ${activeFilePendingUpdate.author.name} is ready to load.`,
      };
    }

    if (activeFile && workspaceDirtyFileIds.includes(activeFile.path)) {
      return {
        tone: "warning" as const,
        label: "Local changes are ready to push to the workspace.",
      };
    }

    if (isActiveFileReadOnly) {
      return {
        tone: "warning" as const,
        label: "Strict mode is active. This file is read only for your role.",
      };
    }

    return {
      tone: "success" as const,
      label: "Workspace sync is up to date.",
    };
  }, [activeFile, activeFilePendingUpdate, isActiveFileReadOnly, workspaceDirtyFileIds]);

  const mergeTimelineItem = useEffectEvent((
    message: WorkspaceActivity | WorkspaceChatMessage,
    kind: "chat" | "activity",
  ) => {
    if (kind === "chat") {
      setChatMessages((currentMessages) => {
        const typedMessage = message as WorkspaceChatMessage;
        if (currentMessages.some((currentMessage) => currentMessage.id === typedMessage.id)) {
          return currentMessages;
        }

        return [...currentMessages, typedMessage];
      });
      return;
    }

    setActivities((currentActivities) => {
      const typedActivity = message as WorkspaceActivity;
      if (currentActivities.some((currentActivity) => currentActivity.id === typedActivity.id)) {
        return currentActivities;
      }

      return [typedActivity, ...currentActivities];
    });
  });

  const applySnapshotMetadata = (nextSnapshot: WorkspaceSnapshot) => {
    setSnapshot(nextSnapshot);
    setMembers(nextSnapshot.members);
    setCurrentUser(nextSnapshot.currentUser);
    setFileStates(nextSnapshot.fileStates);
    setActivities(nextSnapshot.activities);
    setChatMessages(nextSnapshot.chatMessages);
  };

  async function fetchAndApplyMetadata() {
    try {
      const nextSnapshot = await fetchWorkspaceSnapshot(snapshot.id);
      applySnapshotMetadata(nextSnapshot);
    } catch (error) {
      if (error instanceof Error && /access/i.test(error.message)) {
        toast.error("You no longer have access to this workspace.");
        router.push("/dashboard");
      }
    }
  }

  async function replaceWorkspaceState(nextSnapshot: WorkspaceSnapshot) {
    applySnapshotMetadata(nextSnapshot);
    setWorkspaceSyncedContents(getTemplateFileContentMap(nextSnapshot.templateData));
    setPendingFileUpdates({});
    setPendingWorkspaceUpdate(null);
    loadTemplate(nextSnapshot.templateData, {
      activeFileId: activeFileId && nextSnapshot.fileStates.some((fileState) => fileState.path === activeFileId)
        ? activeFileId
        : nextSnapshot.fileStates.find((fileState) => fileState.type === "FILE")?.path ?? null,
      openFileIds: openFiles
        .map((file) => file.id)
        .filter((fileId) => nextSnapshot.fileStates.some((fileState) => fileState.path === fileId)),
    });
  }

  async function handleSaveFile(fileId?: string) {
    const savedFile = prepareSaveFile(fileId);

    if (!savedFile) {
      toast.message("Nothing to save.");
      return;
    }

    try {
      await writeFile(savedFile.path, savedFile.content);
      markFilesSaved([savedFile]);
      toast.success(`Saved ${savedFile.path}`);
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : "Unable to save that file.",
      );
    }
  }

  async function handleSaveAllFiles() {
    const savedFiles = prepareSaveAllFiles();

    if (!savedFiles.length) {
      toast.message("Nothing to save.");
      return;
    }

    const results = await Promise.allSettled(
      savedFiles.map((file) => writeFile(file.path, file.content)),
    );
    const successfulFiles = savedFiles.filter(
      (_file, index) => results[index]?.status === "fulfilled",
    );

    if (successfulFiles.length) {
      markFilesSaved(successfulFiles);
      toast.success(
        `Saved ${successfulFiles.length} file${successfulFiles.length === 1 ? "" : "s"}.`,
      );
    }
  }

  async function handlePushFile(fileId?: string) {
    const targetFileId = fileId ?? activeFileId ?? null;

    if (!targetFileId) {
      toast.error("Select a file first.");
      return;
    }

    const targetFile = flattenedFiles.find((file) => file.id === targetFileId);

    if (!targetFile) {
      toast.error("That file is no longer available.");
      return;
    }

    if (!canEditPath(targetFile.path, "file")) {
      toast.error("You do not have permission to push that file.");
      return;
    }

    try {
      const result = await postWorkspaceJson<{
        fileState: WorkspaceFileState;
      }>(snapshot.id, "files", {
        action: "push",
        path: targetFile.path,
        content: targetFile.file.content,
      });

      setFileStates((currentStates) => {
        const nextStates = currentStates.filter((state) => state.path !== result.fileState.path);
        return [...nextStates, result.fileState].sort((left, right) => left.path.localeCompare(right.path));
      });
      setWorkspaceSyncedContents((currentContents) => ({
        ...currentContents,
        [targetFile.path]: targetFile.file.content,
      }));
      setPendingFileUpdates((currentUpdates) => {
        const nextUpdates = { ...currentUpdates };
        delete nextUpdates[targetFile.path];
        return nextUpdates;
      });
      toast.success(`Pushed ${targetFile.path} to the workspace.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to push that file.");
    }
  }

  async function handleLoadPendingUpdate() {
    if (!activeFile || !activeFilePendingUpdate) {
      return;
    }

    const hasUnsavedLocalChanges = workspaceDirtyFileIds.includes(activeFile.path);

    if (
      hasUnsavedLocalChanges &&
      !window.confirm(
        "This file has local changes that are not pushed to the workspace. Replace it with the incoming update?",
      )
    ) {
      return;
    }

    setIsLoadingRemoteUpdate(true);

    try {
      replaceFileContent(activeFile.path, activeFilePendingUpdate.content, {
        activate: true,
        markSaved: true,
        openIfNeeded: true,
      });
      await writeFile(activeFile.path, activeFilePendingUpdate.content);
      setWorkspaceSyncedContents((currentContents) => ({
        ...currentContents,
        [activeFile.path]: activeFilePendingUpdate.content,
      }));
      setPendingFileUpdates((currentUpdates) => {
        const nextUpdates = { ...currentUpdates };
        delete nextUpdates[activeFile.path];
        return nextUpdates;
      });
      toast.success(`Loaded the latest update for ${activeFile.path}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load that update.");
    } finally {
      setIsLoadingRemoteUpdate(false);
    }
  }

  async function handleCreateNode(input: CreateTemplateNodeInput) {
    if (!input.name.trim()) {
      return;
    }

    const result = await postWorkspaceJson(snapshot.id, "files", {
      action: "create",
      parentPath: input.parentPath,
      kind: input.kind,
      name: input.name,
    });

    if (input.kind === "folder") {
      const createdPath = [input.parentPath, input.name.trim()].filter(Boolean).join("/");
      await createDirectory(createdPath);
    } else {
      const createdPath = [input.parentPath, input.name.trim()].filter(Boolean).join("/");
      await writeFile(createdPath, "");
    }

    const nextSnapshot = await fetchWorkspaceSnapshot(snapshot.id);
    void replaceWorkspaceState(nextSnapshot);
    toast.success(`Created ${input.name.trim()}.`);
    return result;
  }

  async function handleRenameNode(nodePath: string, nextName: string) {
    await postWorkspaceJson(snapshot.id, "files", {
      action: "rename",
      path: nodePath,
      nextName,
    });

    const nextPath = [nodePath.split("/").slice(0, -1).join("/"), nextName.trim()]
      .filter(Boolean)
      .join("/");
    await renameEntry(nodePath, nextPath);
    const nextSnapshot = await fetchWorkspaceSnapshot(snapshot.id);
    void replaceWorkspaceState(nextSnapshot);
    toast.success(`Renamed to ${nextName.trim()}.`);
  }

  async function handleDeleteNode(nodePath: string) {
    await postWorkspaceJson(snapshot.id, "files", {
      action: "delete",
      path: nodePath,
    });

    await deleteEntry(nodePath);
    const nextSnapshot = await fetchWorkspaceSnapshot(snapshot.id);
    void replaceWorkspaceState(nextSnapshot);
    toast.success(`Deleted ${nodePath}.`);
  }

  async function handleAssignActiveFile() {
    if (!activeFile) {
      return;
    }

    const assignedUserId = selectedAssigneeId === "__unassigned__" ? null : selectedAssigneeId;

    try {
      const result = await postWorkspaceJson<{
        fileState: WorkspaceFileState;
      }>(snapshot.id, "files", {
        action: "assign",
        path: activeFile.path,
        assignedUserId,
      });

      setFileStates((currentStates) => {
        const nextStates = currentStates.filter((fileState) => fileState.path !== result.fileState.path);
        return [...nextStates, result.fileState].sort((left, right) => left.path.localeCompare(right.path));
      });
      setIsAssignDialogOpen(false);
      toast.success(`Updated the assignment for ${activeFile.path}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign that file.");
    }
  }

  async function handleSendChat() {
    if (!chatDraft.trim()) {
      return;
    }

    setIsSendingChat(true);

    try {
      await postWorkspaceJson(snapshot.id, "chat", {
        content: chatDraft,
      });
      setChatDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send that message.");
    } finally {
      setIsSendingChat(false);
    }
  }

  async function handleCreateInviteLink() {
    try {
      const result = await postWorkspaceJson<{
        inviteUrl: string;
      }>(snapshot.id, "invites", {
        action: "create-link",
      });

      setLatestInviteUrl(result.inviteUrl);
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create an invite link.");
    }
  }

  async function handleSendEmailInvites() {
    const emails = inviteEmailDraft
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!emails.length) {
      toast.error("Add at least one email first.");
      return;
    }

    setIsSendingInvites(true);

    try {
      const result = await postWorkspaceJson<{
        emailResult: { sentCount: number; skipped: boolean };
        invites: Array<{ inviteUrl: string }>;
      }>(snapshot.id, "invites", {
        action: "send-email-batch",
        emails,
      });

      setInviteEmailDraft("");
      setLatestInviteUrl(result.invites[0]?.inviteUrl ?? null);
      toast.success(
        result.emailResult.skipped
          ? "Invite links were created. SMTP is not configured, so email delivery was skipped."
          : `Sent ${result.emailResult.sentCount} invite email${result.emailResult.sentCount === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send invite emails.");
    } finally {
      setIsSendingInvites(false);
    }
  }

  async function runMemberAction(memberId: string, body: MemberActionBody) {
    setMemberActionInFlightId(memberId);

    try {
      const result = await postWorkspaceJson(snapshot.id, "members", {
        memberId,
        ...body,
      });

      startTransition(() => {
        void fetchAndApplyMetadata();
      });

      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update that collaborator.");
      return null;
    } finally {
      setMemberActionInFlightId(null);
    }
  }

  async function handlePromoteMember(memberId: string) {
    const result = await runMemberAction(memberId, {
      action: "set-role",
      role: "ADMIN",
    });

    if (result) {
      toast.success("Collaborator promoted to admin.");
    }
  }

  async function handleDemoteMember(memberId: string) {
    const result = await runMemberAction(memberId, {
      action: "set-role",
      role: "MEMBER",
    });

    if (result) {
      toast.success("Admin access removed.");
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!window.confirm("Remove this collaborator from the workspace?")) {
      return;
    }

    const result = await runMemberAction(memberId, {
      action: "remove",
    });

    if (result) {
      toast.success("Collaborator removed.");
    }
  }

  async function handleToggleVoiceMute(memberId: string, isVoiceMuted: boolean) {
    const result = await runMemberAction(memberId, {
      action: "set-voice-mute",
      isVoiceMuted,
    });

    if (result) {
      toast.success(isVoiceMuted ? "Voice access muted." : "Voice access restored.");
    }
  }

  async function handleImportRepository() {
    if (!selectedImportRepository) {
      toast.error("Select a repository to import.");
      return;
    }

    if (
      (workspaceDirtyFileIds.length || hasDirtyFiles) &&
      !window.confirm(
        "Importing a repository will replace the current workspace files. Continue?",
      )
    ) {
      return;
    }

    setIsImportingRepository(true);
    setImportError(null);

    try {
      const repositoryFullName = selectedImportRepository.full_name;
      const result = await postWorkspaceJson<GitHubRepoFilesResponse & {
        templateData: WorkspaceSnapshot["templateData"];
        preferredOpenPath: string | null;
      }>(snapshot.id, "sync", {
        repositoryFullName,
      });

      const nextSnapshot = await fetchWorkspaceSnapshot(snapshot.id);
      void replaceWorkspaceState(nextSnapshot);
      setSelectedImportRepository(null);
      setIsImportDialogOpen(false);
      setRestartKey((currentKey) => currentKey + 1);
      toast.success(`${repositoryFullName} synced into the workspace.`);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to import that repository.";
      setImportError(message);
      toast.error(message);
      return null;
    } finally {
      setIsImportingRepository(false);
    }
  }

  useEffect(() => {
    let active = true;

    void getWorkspaceSocket().then((connectedSocket) => {
      if (!active) {
        return;
      }

      setSocket(connectedSocket);
    });

    return () => {
      active = false;
    };
  }, []);

  const joinWorkspaceRoom = useEffectEvent((connectedSocket: NonNullable<typeof socket>) => {
    connectedSocket.emit("workspace:join", {
      workspaceId: snapshot.id,
      activeFilePath: activeFileId,
    });
  });

  const handleSaveFileShortcut = useEffectEvent((fileId?: string) => {
    void handleSaveFile(fileId);
  });

  const handleSaveAllFilesShortcut = useEffectEvent(() => {
    void handleSaveAllFiles();
  });

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleConnect = () => {
      joinWorkspaceRoom(socket);
    };

    const handlePresence = (nextPresence: WorkspacePresence[]) => {
      setPresence(nextPresence);
    };

    const handleFilePush = (event: FilePushEvent) => {
      if (event.author.userId === currentUser.userId) {
        return;
      }

      setPendingFileUpdates((currentUpdates) => ({
        ...currentUpdates,
        [event.path]: event,
      }));
      toast.message(`${event.author.name} pushed ${event.path}.`, {
        action: {
          label: "Review",
          onClick: () => {
            selectFile(event.path);
          },
        },
      });
    };

      const handleTreeUpdate = (event: WorkspaceTreeUpdateEvent) => {
        if (event.actor.userId === currentUser.userId) {
          return;
        }

      setPendingWorkspaceUpdate({
        summary: event.summary,
      });
    };

      const handleChat = (message: WorkspaceChatMessage) => {
        mergeTimelineItem(message, "chat");

        if (message.author.userId !== currentUser.userId && activePanelTab !== "chat") {
          setUnreadChatCount((currentCount) => currentCount + 1);
      }
    };

      const handleActivity = (activityItem: WorkspaceActivity) => {
        mergeTimelineItem(activityItem, "activity");

        if (activePanelTab !== "activity") {
          setUnreadActivityCount((currentCount) => currentCount + 1);
      }
    };

      const handleMembersChanged = () => {
        startTransition(() => {
          void fetchWorkspaceSnapshot(snapshot.id)
            .then((nextSnapshot) => {
              applySnapshotMetadata(nextSnapshot);
            })
            .catch((error) => {
              if (error instanceof Error && /access/i.test(error.message)) {
                toast.error("You no longer have access to this workspace.");
                router.push("/dashboard");
              }
            });
        });
      };

    handleConnect();
    socket.on("connect", handleConnect);
    socket.on("workspace:presence", handlePresence);
    socket.on("workspace:file-pushed", handleFilePush);
    socket.on("workspace:tree-updated", handleTreeUpdate);
    socket.on("workspace:chat:new", handleChat);
    socket.on("workspace:activity:new", handleActivity);
    socket.on("workspace:members-changed", handleMembersChanged);

    return () => {
      socket.emit("workspace:leave", {
        workspaceId: snapshot.id,
      });
      socket.off("connect", handleConnect);
      socket.off("workspace:presence", handlePresence);
      socket.off("workspace:file-pushed", handleFilePush);
      socket.off("workspace:tree-updated", handleTreeUpdate);
      socket.off("workspace:chat:new", handleChat);
      socket.off("workspace:activity:new", handleActivity);
      socket.off("workspace:members-changed", handleMembersChanged);
    };
  }, [
    activePanelTab,
    currentUser.userId,
    router,
    selectFile,
    snapshot.id,
    socket,
  ]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.emit("workspace:active-file", {
      workspaceId: snapshot.id,
      activeFilePath: activeFileId,
    });
  }, [activeFileId, snapshot.id, socket]);

  useEffect(() => {
    if (activePanelTab === "chat") {
      setUnreadChatCount(0);
    }

    if (activePanelTab === "activity") {
      setUnreadActivityCount(0);
    }
  }, [activePanelTab]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isMonacoTarget = Boolean(target?.closest(".monaco-editor"));
      const isEditableField = Boolean(
        target?.closest("input, textarea, [contenteditable='true']"),
      );

      if (isMonacoTarget || isEditableField) {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        handleSaveAllFilesShortcut();
        return;
      }

      handleSaveFileShortcut(activeFileId ?? undefined);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeFileId]);

  return (
    <>
      <Dialog
        open={isImportDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsImportDialogOpen(nextOpen);

          if (nextOpen) {
            setImportError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sync from GitHub</DialogTitle>
            <DialogDescription>
              Replace the current workspace files with a repository import and notify the team.
            </DialogDescription>
          </DialogHeader>

          <GitHubRepositoryPicker
            repositories={githubRepositories}
            selectedRepository={selectedImportRepository}
            isLoading={isLoadingRepositories}
            error={githubRepositoriesError}
            onRefresh={() => {
              void fetchRepositories(true).catch(() => undefined);
            }}
            onSelectRepository={setSelectedImportRepository}
          />

          {importError ? (
            <div className="rounded-[1.25rem] border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {importError}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              disabled={isImportingRepository}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedImportRepository || isImportingRepository}
              onClick={() => void handleImportRepository()}
            >
              {isImportingRepository ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <FolderGit2 className="mr-2 h-4 w-4" />
              )}
              {isImportingRepository ? "Syncing..." : "Sync repository"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Active File</DialogTitle>
            <DialogDescription>
              In strict mode, members can edit only files assigned to them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <button
              type="button"
              className={cn(
                "w-full rounded-2xl border px-4 py-3 text-left text-sm",
                selectedAssigneeId === "__unassigned__"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/70",
              )}
              onClick={() => setSelectedAssigneeId("__unassigned__")}
            >
              Unassigned
            </button>
            {members.map((member) => (
              <button
                key={member.userId}
                type="button"
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left text-sm",
                  selectedAssigneeId === member.userId
                    ? "border-emerald-400/30 bg-emerald-400/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/70",
                )}
                onClick={() => setSelectedAssigneeId(member.userId)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{member.name}</span>
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">
                    {member.role}
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleAssignActiveFile()}>
              Save assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="h-screen overflow-hidden bg-[#050816] text-white">
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#050816]/95 px-4 py-3 backdrop-blur sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={backHref}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">
                    {snapshot.name}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-white/10 bg-white/5 text-white/70"
                  >
                    {snapshot.rules}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-white/10 bg-white/5 text-white/70"
                  >
                    {snapshot.mode}
                  </Badge>
                </div>
                <p className="truncate text-xs text-white/45">
                  Workspace {snapshot.id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 lg:flex">
                <Users className="h-4 w-4" />
                {presence.length} online
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                onClick={() => void handleSaveAllFiles()}
                disabled={!hasDirtyFiles}
              >
                <Save className="h-4 w-4" />
                Save all
              </Button>
              {currentUser.canImportRepository ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                  onClick={() => setIsImportDialogOpen(true)}
                >
                  <FolderGit2 className="h-4 w-4" />
                  Sync GitHub
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                onClick={() => setActivePanelTab("members")}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button
                type="button"
                className="bg-white text-black hover:bg-white/90"
                onClick={() => setRestartKey((value) => value + 1)}
              >
                <RefreshCw className="h-4 w-4" />
                Restart preview
              </Button>
            </div>
          </header>

          {pendingWorkspaceUpdate ? (
            <div className="flex items-center justify-between gap-3 border-b border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-50">
              <span>{pendingWorkspaceUpdate.summary}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-100/20 bg-white/10 text-amber-50 hover:bg-white/20"
                onClick={() => {
                  void (async () => {
                    if (
                      (workspaceDirtyFileIds.length || hasDirtyFiles) &&
                      !window.confirm(
                        "Loading the latest workspace tree will replace your local file state. Continue?",
                      )
                    ) {
                      return;
                    }

                    const nextSnapshot = await fetchWorkspaceSnapshot(snapshot.id);
                    await replaceWorkspaceState(nextSnapshot);
                  })().catch((loadError) => {
                    toast.error(
                      loadError instanceof Error
                        ? loadError.message
                        : "Unable to load the latest workspace state.",
                    );
                  });
                }}
              >
                Load workspace update
              </Button>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-b border-white/10 bg-[#060b16] px-4 py-2 text-xs text-white/45">
            <span>
              {openFiles.length} open tab{openFiles.length === 1 ? "" : "s"} and{" "}
              {dirtyFileIds.length} unsaved change{dirtyFileIds.length === 1 ? "" : "s"}
            </span>
            <span>
              {workspaceDirtyFileIds.length} file{workspaceDirtyFileIds.length === 1 ? "" : "s"} waiting to be pushed to the workspace
            </span>
          </div>

          <div className="min-h-0 flex-1">
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              <ResizablePanel defaultSize={18} minSize={14}>
                <PlaygroundExplorer
                  tree={tree}
                  activeFileId={activeFileId}
                  dirtyFileIds={dirtyFileIds}
                  assignedUserNames={Object.fromEntries(
                    fileStates.map((fileState) => [fileState.path, fileState.assignedUserName]),
                  )}
                  activeCollaboratorNamesByPath={activeCollaboratorNamesByPath}
                  canCreateEntries={currentUser.role !== "MEMBER" || snapshot.rules === "LENIENT"}
                  canEditPath={canEditPath}
                  onSelectFile={selectFile}
                  onCreateNode={(input) => void handleCreateNode(input)}
                  onRenameNode={(nodePath, nextName) => void handleRenameNode(nodePath, nextName)}
                  onDeleteNode={(nodePath) => void handleDeleteNode(nodePath)}
                />
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-white/10" />

              <ResizablePanel defaultSize={34} minSize={26}>
                <PlaygroundEditor
                  openFiles={openFiles}
                  activeFile={activeFile}
                  hasDirtyFiles={hasDirtyFiles}
                  isReadOnly={isActiveFileReadOnly}
                  workspaceStatusLabel={workspaceStatus.label}
                  workspaceStatusTone={workspaceStatus.tone}
                  activeCollaboratorNames={activeFileCollaborators}
                  activeFileAssigneeName={activeFileAssigneeName}
                  canAssignActiveFile={currentUser.canAssignFiles}
                  pendingRemoteUpdateLabel={
                    activeFilePendingUpdate
                      ? `${activeFilePendingUpdate.author.name} pushed a newer version of this file.`
                      : null
                  }
                  isLoadingRemoteUpdate={isLoadingRemoteUpdate}
                  onSelectFile={selectFile}
                  onCloseAllFiles={closeAllFiles}
                  onCloseFile={closeFile}
                  onChange={updateFileContent}
                  onSaveFile={(fileId) => void handleSaveFile(fileId)}
                  onSaveAllFiles={() => void handleSaveAllFiles()}
                  onPushFile={(fileId) => void handlePushFile(fileId)}
                  onLoadPendingUpdate={() => void handleLoadPendingUpdate()}
                  onRequestAssignActiveFile={() => {
                    setSelectedAssigneeId(activeFileState?.assignedUserId ?? "__unassigned__");
                    setIsAssignDialogOpen(true);
                  }}
                />
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-white/10" />

              <ResizablePanel defaultSize={28} minSize={20}>
                <WebContainerPreview
                  templateData={templateData}
                  instance={instance}
                  isLoading={isLoading}
                  error={error?.message ?? null}
                  restartKey={restartKey}
                  onRestart={() => setRestartKey((value) => value + 1)}
                  runtimeKey={snapshot.id}
                />
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-white/10" />

              <ResizablePanel defaultSize={20} minSize={18}>
                <CollaborationPanel
                  activeTab={activePanelTab}
                  unreadChatCount={unreadChatCount}
                  unreadActivityCount={unreadActivityCount}
                  currentUser={currentUser}
                  members={members}
                  presence={presence}
                  chatMessages={chatMessages}
                  chatDraft={chatDraft}
                  isSendingChat={isSendingChat}
                  activities={activities}
                  voiceParticipants={voice.participants}
                  remoteAudio={voice.remoteAudio}
                  isVoiceJoined={voice.isVoiceJoined}
                  isJoiningVoice={voice.isJoiningVoice}
                  isSelfMuted={voice.isSelfMuted}
                  voiceError={voice.voiceError}
                  inviteEmailDraft={inviteEmailDraft}
                  latestInviteUrl={latestInviteUrl}
                  isSendingInvites={isSendingInvites}
                  memberActionInFlightId={memberActionInFlightId}
                  onTabChange={setActivePanelTab}
                  onChatDraftChange={setChatDraft}
                  onSendChat={() => void handleSendChat()}
                  onJoinVoice={() => void voice.joinVoice()}
                  onLeaveVoice={() => voice.leaveVoice()}
                  onToggleSelfMuted={voice.toggleSelfMuted}
                  onClearVoiceError={voice.clearVoiceError}
                  onInviteEmailDraftChange={setInviteEmailDraft}
                  onCreateInviteLink={() => void handleCreateInviteLink()}
                  onSendEmailInvites={() => void handleSendEmailInvites()}
                  onPromoteMember={(memberId) => void handlePromoteMember(memberId)}
                  onDemoteMember={(memberId) => void handleDemoteMember(memberId)}
                  onRemoveMember={(memberId) => void handleRemoveMember(memberId)}
                  onToggleVoiceMute={(memberId, isVoiceMuted) =>
                    void handleToggleVoiceMute(memberId, isVoiceMuted)
                  }
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </main>
    </>
  );
}
