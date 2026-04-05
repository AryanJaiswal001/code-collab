import type { TemplateFolder } from "../playground/types";

export type WorkspaceModeValue = "PERSONAL" | "COLLABORATION";
export type WorkspaceRulesModeValue = "STRICT" | "LENIENT";
export type WorkspaceSetupTypeValue = "TEMPLATE" | "GITHUB";
export type WorkspaceTemplateValue =
  | "REACT"
  | "NEXTJS"
  | "EXPRESS"
  | "VUE"
  | "HONO"
  | "ANGULAR"
  | "GITHUB";
export type WorkspaceMemberRoleValue = "OWNER" | "ADMIN" | "MEMBER";
export type WorkspaceEntryTypeValue = "FILE" | "FOLDER";
export type WorkspaceInviteStatusValue =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";
export type WorkspaceActivityTypeValue =
  | "MEMBER_JOINED"
  | "MEMBER_LEFT"
  | "FILE_OPENED"
  | "FILE_PUSHED"
  | "VOICE_JOINED"
  | "VOICE_LEFT"
  | "FILE_ASSIGNED"
  | "REPOSITORY_SYNCED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_REMOVED"
  | "INVITE_CREATED"
  | "INVITE_ACCEPTED";

export type WorkspaceActor = {
  userId: string;
  name: string;
  email: string | null;
  image: string | null;
  username: string | null;
};

export type WorkspaceMember = WorkspaceActor & {
  id: string;
  role: WorkspaceMemberRoleValue;
  isVoiceMuted: boolean;
  joinedAt: string;
};

export type WorkspaceFileState = {
  path: string;
  parentPath: string | null;
  name: string;
  type: WorkspaceEntryTypeValue;
  fileExtension: string | null;
  revision: number;
  updatedAt: string;
  updatedBy: WorkspaceActor | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  assignedUserImage: string | null;
};

export type WorkspaceChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  author: WorkspaceActor;
};

export type WorkspaceActivity = {
  id: string;
  type: WorkspaceActivityTypeValue;
  message: string;
  filePath: string | null;
  createdAt: string;
  actor: WorkspaceActor | null;
};

export type WorkspaceInvite = {
  id: string;
  email: string | null;
  role: WorkspaceMemberRoleValue;
  status: WorkspaceInviteStatusValue;
  expiresAt: string;
  createdAt: string;
  lastSentAt: string | null;
  urlPath: string | null;
};

export type WorkspaceCurrentUser = WorkspaceActor & {
  role: WorkspaceMemberRoleValue;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canManageInvites: boolean;
  canAssignFiles: boolean;
  canImportRepository: boolean;
  canModerateVoice: boolean;
};

export type WorkspaceSnapshot = {
  id: string;
  name: string;
  description: string | null;
  mode: WorkspaceModeValue;
  rules: WorkspaceRulesModeValue;
  setupType: WorkspaceSetupTypeValue;
  template: WorkspaceTemplateValue;
  repositoryFullName: string | null;
  updatedAt: string;
  templateData: TemplateFolder;
  fileStates: WorkspaceFileState[];
  members: WorkspaceMember[];
  chatMessages: WorkspaceChatMessage[];
  activities: WorkspaceActivity[];
  invites: WorkspaceInvite[];
  currentUser: WorkspaceCurrentUser;
};

export type WorkspacePresence = WorkspaceActor & {
  socketId: string;
  role: WorkspaceMemberRoleValue;
  activeFilePath: string | null;
};

export type WorkspaceVoiceParticipant = WorkspaceActor & {
  socketId: string;
  role: WorkspaceMemberRoleValue;
  isSpeaking: boolean;
  isMutedByModerator: boolean;
};

export type FilePushEvent = {
  workspaceId: string;
  path: string;
  content: string;
  revision: number;
  pushedAt: string;
  author: WorkspaceActor & { role: WorkspaceMemberRoleValue };
};

export type WorkspaceTreeUpdateEvent = {
  workspaceId: string;
  reason: string;
  summary: string;
  triggeredAt: string;
  actor: WorkspaceActor & { role: WorkspaceMemberRoleValue };
};

export type WorkspaceChatEvent = {
  workspaceId: string;
  message: WorkspaceChatMessage;
};

export type WorkspaceActivityEvent = {
  workspaceId: string;
  activity: WorkspaceActivity;
};

export type WorkspaceUserJoinedEvent = {
  workspaceId: string;
  member: WorkspacePresence;
  activity: WorkspaceActivity | null;
};
