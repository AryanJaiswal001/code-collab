import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createStarterTemplate } from "../playground/lib";
import type { TemplateFolder } from "../playground/types";
import { importGitHubRepository } from "../github/server";
import type { Project, ProjectUser, TemplateKind } from "../dashboard/types";
import {
  buildTemplateFromWorkspaceEntries,
  createWorkspaceEntrySeeds,
} from "./entries";
import { isInviteEmailConfigured, sendWorkspaceInviteEmails } from "./email";
import type {
  FilePushEvent,
  WorkspaceActivity,
  WorkspaceActivityTypeValue,
  WorkspaceActor,
  WorkspaceChatMessage,
  WorkspaceCurrentUser,
  WorkspaceFileState,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceMemberRoleValue,
  WorkspacePresence,
  WorkspaceRulesModeValue,
  WorkspaceSnapshot,
  WorkspaceTreeUpdateEvent,
  WorkspaceVoiceParticipant,
} from "./types";

const CHAT_MESSAGE_LIMIT = 40;
const ACTIVITY_LIMIT = 60;
const INVITE_LIST_LIMIT = 12;
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const globalForActivityDedupe = globalThis as typeof globalThis & {
  __workspaceActivityDedupe?: Map<string, number>;
};

const activityDedupe =
  globalForActivityDedupe.__workspaceActivityDedupe ??
  new Map<string, number>();

if (process.env.NODE_ENV !== "production") {
  globalForActivityDedupe.__workspaceActivityDedupe = activityDedupe;
}

export class WorkspaceServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "WorkspaceServiceError";
  }
}

type SessionUserActor = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
};

type RealtimeMemberProfile = {
  actor: WorkspaceActor;
  role: WorkspaceMemberRoleValue;
  isVoiceMuted: boolean;
};

type ActorRecord = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username?: string | null;
};

type WorkspaceMemberRecord = {
  id: string;
  role: WorkspaceMemberRoleValue;
  isVoiceMuted: boolean | null;
  createdAt: Date;
  user: ActorRecord;
};

type WorkspaceEntryRecord = {
  path: string;
  parentPath: string | null;
  name: string;
  type: WorkspaceFileState["type"];
  fileExtension: string | null;
  revision: number | null;
  updatedAt: Date;
  updatedBy: ActorRecord | null;
  assignedUserId: string | null;
  assignedUser: ActorRecord | null;
};

type WorkspaceChatMessageRecord = {
  id: string;
  content: string;
  createdAt: Date;
  author: ActorRecord;
};

type WorkspaceActivityRecord = {
  id: string;
  type: WorkspaceActivityTypeValue;
  message: string;
  filePath: string | null;
  createdAt: Date;
  actor: ActorRecord | null;
};

type WorkspaceInviteRecord = {
  id: string;
  email: string | null;
  role: WorkspaceMemberRoleValue;
  status: WorkspaceInvite["status"];
  expiresAt: Date;
  createdAt: Date;
  lastSentAt: Date | null;
};

type WorkspaceAccessPlayground = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  mode: Project["workspaceMode"];
  rules: WorkspaceRulesModeValue;
  setupType: Project["projectSetupMode"];
  template: TemplateKind;
  workspaceLink: string;
  repositoryFullName: string | null;
  collaborators: string[] | null;
  starredByIds: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

type DashboardPlaygroundRecord = WorkspaceAccessPlayground & {
  owner: ActorRecord;
};

function getEmailHandle(email?: string | null) {
  if (!email) {
    return null;
  }

  const [localPart] = email.split("@");
  return localPart?.trim() || null;
}

function inferActorName(user: { name?: string | null; email?: string | null }) {
  return user.name?.trim() || getEmailHandle(user.email) || "Collaborator";
}

function mapUserToActor(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
}): WorkspaceActor {
  return {
    userId: user.id,
    name: inferActorName(user),
    email: user.email ?? null,
    image: user.image ?? null,
    username: user.username ?? getEmailHandle(user.email) ?? null,
  };
}

function normalizeWorkspaceName(name: string) {
  const normalized = name.trim();

  if (!normalized) {
    throw new WorkspaceServiceError("Workspace name is required.", 400);
  }

  return normalized;
}

function normalizeWorkspaceDescription(description?: string) {
  const normalized = description?.trim();
  return normalized || null;
}

function normalizeFileOrFolderName(name: string) {
  const normalized = name.trim();

  if (!normalized) {
    throw new WorkspaceServiceError("A name is required.", 400);
  }

  if (normalized.includes("/")) {
    throw new WorkspaceServiceError("Names cannot contain '/'.", 400);
  }

  if (normalized === "." || normalized === "..") {
    throw new WorkspaceServiceError("That name is reserved.", 400);
  }

  return normalized;
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInviteToken() {
  return randomBytes(32).toString("hex");
}

function buildInviteUrlPath(token: string) {
  return `/workspace/invite/${token}`;
}

function getAppOrigin() {
  const configuredOrigin =
    process.env.AUTH_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || process.env.NEXTAUTH_URL?.trim();

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      return process.env.NEXT_PUBLIC_API_URL || process.env.NEXTAUTH_URL || "";
    }
  }

  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXTAUTH_URL || "";
}

function formatInviteUrl(token: string) {
  return `${getAppOrigin()}${buildInviteUrlPath(token)}`;
}

function isManagerRole(role: WorkspaceMemberRoleValue) {
  return role === "OWNER" || role === "ADMIN";
}

function canManageRoles(role: WorkspaceMemberRoleValue) {
  return role === "OWNER";
}

function canAssignFiles(
  role: WorkspaceMemberRoleValue,
  rules: WorkspaceRulesModeValue,
) {
  return rules === "STRICT" && isManagerRole(role);
}

function canImportRepository(role: WorkspaceMemberRoleValue) {
  return isManagerRole(role);
}

function canModerateVoice(role: WorkspaceMemberRoleValue) {
  return isManagerRole(role);
}

function canCreateEntries(
  role: WorkspaceMemberRoleValue,
  rules: WorkspaceRulesModeValue,
) {
  if (isManagerRole(role)) {
    return true;
  }

  return rules === "LENIENT";
}

function canEditEntry(params: {
  role: WorkspaceMemberRoleValue;
  rules: WorkspaceRulesModeValue;
  userId: string;
  entry: {
    type: "FILE" | "FOLDER";
    assignedUserId?: string | null;
  };
}) {
  const { role, rules, userId, entry } = params;

  if (isManagerRole(role)) {
    return true;
  }

  if (rules === "LENIENT") {
    return true;
  }

  return entry.type === "FILE" && entry.assignedUserId === userId;
}

function canManageTargetMember(params: {
  actorRole: WorkspaceMemberRoleValue;
  targetRole: WorkspaceMemberRoleValue;
}) {
  const { actorRole, targetRole } = params;

  if (actorRole === "OWNER") {
    return targetRole !== "OWNER";
  }

  if (actorRole === "ADMIN") {
    return targetRole === "MEMBER";
  }

  return false;
}

function buildCurrentUserCapabilities(params: {
  actor: WorkspaceActor;
  role: WorkspaceMemberRoleValue;
  rules: WorkspaceRulesModeValue;
}): WorkspaceCurrentUser {
  const { actor, role, rules } = params;

  return {
    ...actor,
    role,
    canManageMembers: isManagerRole(role),
    canManageRoles: canManageRoles(role),
    canManageInvites: isManagerRole(role),
    canAssignFiles: canAssignFiles(role, rules),
    canImportRepository: canImportRepository(role),
    canModerateVoice: canModerateVoice(role),
  };
}

function serializeMember(member: WorkspaceMemberRecord): WorkspaceMember {
  return {
    id: member.id,
    role: member.role,
    isVoiceMuted: Boolean(member.isVoiceMuted),
    joinedAt: member.createdAt.toISOString(),
    ...mapUserToActor(member.user),
  };
}

function serializeFileState(entry: WorkspaceEntryRecord): WorkspaceFileState {
  return {
    path: entry.path,
    parentPath: entry.parentPath ?? null,
    name: entry.name,
    type: entry.type,
    fileExtension: entry.fileExtension ?? null,
    revision: entry.revision ?? 1,
    updatedAt: entry.updatedAt.toISOString(),
    updatedBy: entry.updatedBy ? mapUserToActor(entry.updatedBy) : null,
    assignedUserId: entry.assignedUserId ?? null,
    assignedUserName: entry.assignedUser
      ? inferActorName(entry.assignedUser)
      : null,
    assignedUserImage: entry.assignedUser?.image ?? null,
  };
}

function serializeChatMessage(
  message: WorkspaceChatMessageRecord,
): WorkspaceChatMessage {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    author: mapUserToActor(message.author),
  };
}

function serializeActivity(
  activity: WorkspaceActivityRecord,
): WorkspaceActivity {
  return {
    id: activity.id,
    type: activity.type,
    message: activity.message,
    filePath: activity.filePath ?? null,
    createdAt: activity.createdAt.toISOString(),
    actor: activity.actor ? mapUserToActor(activity.actor) : null,
  };
}

function serializeInvite(invite: WorkspaceInviteRecord): WorkspaceInvite {
  return {
    id: invite.id,
    email: invite.email ?? null,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
    lastSentAt: invite.lastSentAt ? invite.lastSentAt.toISOString() : null,
    urlPath: null,
  };
}

async function requireCurrentUser() {
  const session = await auth();

  if (!session?.user) {
    throw new WorkspaceServiceError("Sign in to continue.", 401);
  }

  const sessionUser = session.user;

  if (sessionUser.id) {
    return {
      id: sessionUser.id,
      name: sessionUser.name ?? null,
      email: sessionUser.email ?? null,
      image: sessionUser.image ?? null,
      username:
        sessionUser.username ?? getEmailHandle(sessionUser.email) ?? null,
    } satisfies SessionUserActor;
  }

  if (!sessionUser.email) {
    throw new WorkspaceServiceError("Unable to resolve the current user.", 401);
  }

  const user = await prisma.user.findUnique({
    where: {
      email: sessionUser.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  if (!user) {
    throw new WorkspaceServiceError("Unable to resolve the current user.", 401);
  }

  return {
    ...user,
    username: getEmailHandle(user.email) ?? null,
  } satisfies SessionUserActor;
}

async function ensureWorkspaceMember(
  playground: Pick<WorkspaceAccessPlayground, "id" | "ownerId">,
  user: SessionUserActor,
) {
  let member = await prisma.playgroundMember.findFirst({
    where: {
      playgroundId: playground.id,
      userId: user.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!member && playground.ownerId === user.id) {
    member = await prisma.playgroundMember.create({
      data: {
        playgroundId: playground.id,
        userId: user.id,
        role: "OWNER",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
  }

  if (!member) {
    throw new WorkspaceServiceError(
      "You do not have access to that workspace.",
      403,
    );
  }

  return member;
}

async function getWorkspaceAccess(
  workspaceLink: string,
  user?: SessionUserActor,
) {
  const currentUser = user ?? (await requireCurrentUser());
  const playground = await prisma.playground.findUnique({
    where: {
      workspaceLink,
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
      description: true,
      mode: true,
      rules: true,
      setupType: true,
      template: true,
      workspaceLink: true,
      repositoryFullName: true,
      collaborators: true,
      starredByIds: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!playground) {
    throw new WorkspaceServiceError("Workspace not found.", 404);
  }

  const member = await ensureWorkspaceMember(playground, currentUser);

  return {
    playground,
    member,
    user: currentUser,
  };
}

async function fetchWorkspaceWithRelations(workspaceLink: string) {
  return prisma.playground.findUnique({
    where: {
      workspaceLink,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      entries: {
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          path: "asc",
        },
      },
      chatMessages: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: CHAT_MESSAGE_LIMIT,
      },
      activities: {
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: ACTIVITY_LIMIT,
      },
      invites: {
        orderBy: {
          createdAt: "desc",
        },
        take: INVITE_LIST_LIMIT,
      },
    },
  });
}

async function createActivityRecord(params: {
  playgroundId: string;
  actorId?: string | null;
  type: WorkspaceActivityTypeValue;
  message: string;
  filePath?: string | null;
  dedupeKey?: string | null;
  dedupeWindowMs?: number;
}) {
  const dedupeKey = params.dedupeKey?.trim();

  if (dedupeKey) {
    const cacheKey = `${params.playgroundId}:${dedupeKey}`;
    const now = Date.now();
    const lastSeen = activityDedupe.get(cacheKey) ?? 0;
    const windowMs = params.dedupeWindowMs ?? 20_000;

    if (lastSeen && now - lastSeen < windowMs) {
      return null;
    }

    activityDedupe.set(cacheKey, now);
  }

  const created = await prisma.playgroundActivity.create({
    data: {
      playgroundId: params.playgroundId,
      actorId: params.actorId ?? null,
      type: params.type,
      message: params.message,
      filePath: params.filePath ?? null,
      dedupeKey: dedupeKey ?? null,
    },
  });

  const activity = await prisma.playgroundActivity.findUnique({
    where: {
      id: created.id,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return activity ? serializeActivity(activity) : null;
}

async function replaceWorkspaceEntries(params: {
  playgroundId: string;
  templateData: TemplateFolder;
  updatedById: string;
}) {
  await prisma.playgroundEntry.deleteMany({
    where: {
      playgroundId: params.playgroundId,
    },
  });

  const seeds = createWorkspaceEntrySeeds(params.templateData);

  for (const seed of seeds) {
    await prisma.playgroundEntry.create({
      data: {
        playgroundId: params.playgroundId,
        path: seed.path,
        parentPath: seed.parentPath,
        name: seed.name,
        type: seed.type,
        fileExtension: seed.fileExtension ?? null,
        content: seed.content ?? null,
        revision: 1,
        updatedById: params.updatedById,
      },
    });
  }
}

function toProjectUser(owner: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}): ProjectUser {
  return {
    name: inferActorName(owner),
    email: owner.email ?? "",
    image: owner.image ?? "",
  };
}

function toDashboardProject(
  playground: DashboardPlaygroundRecord,
  currentUserId: string,
): Project {
  return {
    id: playground.workspaceLink,
    title: playground.name,
    description: playground.description ?? "No description provided yet.",
    template: playground.template as TemplateKind,
    workspaceMode: playground.mode,
    projectSetupMode: playground.setupType,
    workspaceRules: playground.rules,
    repositoryFullName: playground.repositoryFullName ?? undefined,
    collaborators: playground.collaborators ?? [],
    createdAt: playground.createdAt.toISOString(),
    updatedAt: playground.updatedAt.toISOString(),
    userId: playground.ownerId,
    Starmark: playground.starredByIds?.includes(currentUserId)
      ? [{ isMarked: true }]
      : [],
    user: toProjectUser(playground.owner),
  };
}

async function createInviteRecords(params: {
  playgroundId: string;
  createdById: string;
  emails: string[];
  role?: WorkspaceMemberRoleValue;
}) {
  const uniqueEmails = [
    ...new Set(
      params.emails.map((email) => email.trim().toLowerCase()).filter(Boolean),
    ),
  ];

  const invites: Array<WorkspaceInvite & { email: string; inviteUrl: string }> =
    [];

  for (const email of uniqueEmails) {
    const token = createInviteToken();
    const created = await prisma.playgroundInvite.create({
      data: {
        playgroundId: params.playgroundId,
        email,
        role: params.role ?? "MEMBER",
        tokenHash: hashInviteToken(token),
        createdById: params.createdById,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        lastSentAt: isInviteEmailConfigured() ? new Date() : null,
      },
    });

    invites.push({
      ...serializeInvite(created),
      email,
      urlPath: buildInviteUrlPath(token),
      inviteUrl: formatInviteUrl(token),
    });
  }

  return invites;
}

export async function getAllWorkspaceProjectsForCurrentUser(): Promise<
  Project[]
> {
  const currentUser = await requireCurrentUser();
  const playgrounds = await prisma.playground.findMany({
    where: {
      OR: [
        {
          ownerId: currentUser.id,
        },
        {
          members: {
            some: {
              userId: currentUser.id,
            },
          },
        },
      ],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return playgrounds.map((playground) =>
    toDashboardProject(playground, currentUser.id),
  );
}

export async function getWorkspaceProjectByLink(workspaceLink: string) {
  const currentUser = await requireCurrentUser();
  const playground = await prisma.playground.findUnique({
    where: {
      workspaceLink,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!playground) {
    return null;
  }

  await ensureWorkspaceMember(playground, currentUser);
  return toDashboardProject(playground, currentUser.id);
}

export async function createWorkspaceRecord(data: {
  id: string;
  name: string;
  description?: string;
  mode: "PERSONAL" | "COLLABORATION";
  setupType: "TEMPLATE" | "GITHUB";
  rules: "STRICT" | "LENIENT";
  template: TemplateKind;
  repositoryFullName?: string;
  collaborators?: string[];
}) {
  const currentUser = await requireCurrentUser();
  const workspaceLink = data.id.trim();

  if (!workspaceLink) {
    throw new WorkspaceServiceError("Workspace id is required.", 400);
  }

  const existingWorkspace = await prisma.playground.findUnique({
    where: {
      workspaceLink,
    },
    select: {
      id: true,
    },
  });

  if (existingWorkspace) {
    throw new WorkspaceServiceError(
      "That workspace id is already in use.",
      409,
    );
  }

  let templateData = createStarterTemplate(normalizeWorkspaceName(data.name));

  if (data.setupType === "GITHUB" && data.repositoryFullName) {
    const importedRepository = await importGitHubRepository(
      data.repositoryFullName,
    );
    templateData = importedRepository.templateData;
  }

  const createdWorkspace = await prisma.playground.create({
    data: {
      name: normalizeWorkspaceName(data.name),
      description: normalizeWorkspaceDescription(data.description),
      mode: data.mode,
      setupType: data.setupType,
      rules: data.rules,
      template: data.template,
      workspaceLink,
      repositoryFullName: data.repositoryFullName ?? null,
      collaborators: data.collaborators ?? [],
      starredByIds: [],
      ownerId: currentUser.id,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  await prisma.playgroundMember.create({
    data: {
      playgroundId: createdWorkspace.id,
      userId: currentUser.id,
      role: "OWNER",
    },
  });

  await replaceWorkspaceEntries({
    playgroundId: createdWorkspace.id,
    templateData,
    updatedById: currentUser.id,
  });

  if (data.setupType === "GITHUB" && data.repositoryFullName) {
    await createActivityRecord({
      playgroundId: createdWorkspace.id,
      actorId: currentUser.id,
      type: "REPOSITORY_SYNCED",
      message: `${inferActorName(currentUser)} synced ${data.repositoryFullName} into the workspace.`,
    });
  }

  if (data.collaborators?.length) {
    const invites = await createInviteRecords({
      playgroundId: createdWorkspace.id,
      createdById: currentUser.id,
      emails: data.collaborators,
    });

    if (invites.length && isInviteEmailConfigured()) {
      await sendWorkspaceInviteEmails({
        workspaceName: createdWorkspace.name,
        sentByName: inferActorName(currentUser),
        invites: invites.map((invite) => ({
          email: invite.email,
          inviteUrl: invite.inviteUrl,
        })),
      });
    }
  }

  return toDashboardProject(createdWorkspace, currentUser.id);
}

export async function getWorkspaceSnapshot(
  workspaceLink: string,
): Promise<WorkspaceSnapshot> {
  const currentUser = await requireCurrentUser();
  const fullWorkspace = await fetchWorkspaceWithRelations(workspaceLink);

  if (!fullWorkspace) {
    throw new WorkspaceServiceError("Workspace not found.", 404);
  }

  const member = await ensureWorkspaceMember(fullWorkspace, currentUser);
  const templateData = buildTemplateFromWorkspaceEntries(
    fullWorkspace.name,
    fullWorkspace.entries.map((entry) => ({
      path: entry.path,
      parentPath: entry.parentPath ?? null,
      name: entry.name,
      type: entry.type,
      fileExtension: entry.fileExtension ?? null,
      content: entry.content ?? null,
    })),
  );

  const canSeeInvites = isManagerRole(member.role);

  return {
    id: fullWorkspace.workspaceLink,
    name: fullWorkspace.name,
    description: fullWorkspace.description ?? null,
    mode: fullWorkspace.mode,
    rules: fullWorkspace.rules,
    setupType: fullWorkspace.setupType,
    template: fullWorkspace.template,
    repositoryFullName: fullWorkspace.repositoryFullName ?? null,
    updatedAt: fullWorkspace.updatedAt.toISOString(),
    templateData,
    fileStates: fullWorkspace.entries.map(serializeFileState),
    members: fullWorkspace.members.map(serializeMember),
    chatMessages: [...fullWorkspace.chatMessages]
      .reverse()
      .map(serializeChatMessage),
    activities: fullWorkspace.activities.map(serializeActivity),
    invites: canSeeInvites ? fullWorkspace.invites.map(serializeInvite) : [],
    currentUser: buildCurrentUserCapabilities({
      actor: mapUserToActor(currentUser),
      role: member.role,
      rules: fullWorkspace.rules,
    }),
  };
}

export async function getRealtimeWorkspaceMember(
  workspaceLink: string,
  userId: string,
): Promise<RealtimeMemberProfile> {
  const playground = await prisma.playground.findUnique({
    where: {
      workspaceLink,
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
    },
  });

  if (!playground) {
    throw new WorkspaceServiceError("Workspace not found.", 404);
  }

  const member = await prisma.playgroundMember.findFirst({
    where: {
      playgroundId: playground.id,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!member) {
    throw new WorkspaceServiceError(
      "You do not have access to that workspace.",
      403,
    );
  }

  return {
    actor: mapUserToActor(member.user),
    role: member.role,
    isVoiceMuted: Boolean(member.isVoiceMuted),
  };
}

export async function recordWorkspacePresenceActivity(params: {
  workspaceLink: string;
  userId: string;
  type: Extract<
    WorkspaceActivityTypeValue,
    | "MEMBER_JOINED"
    | "MEMBER_LEFT"
    | "FILE_OPENED"
    | "VOICE_JOINED"
    | "VOICE_LEFT"
  >;
  message: string;
  filePath?: string | null;
  dedupeKey: string;
  dedupeWindowMs?: number;
}) {
  const playground = await prisma.playground.findUnique({
    where: {
      workspaceLink: params.workspaceLink,
    },
    select: {
      id: true,
    },
  });

  if (!playground) {
    throw new WorkspaceServiceError("Workspace not found.", 404);
  }

  return createActivityRecord({
    playgroundId: playground.id,
    actorId: params.userId,
    type: params.type,
    message: params.message,
    filePath: params.filePath ?? null,
    dedupeKey: params.dedupeKey,
    dedupeWindowMs: params.dedupeWindowMs,
  });
}

export async function pushWorkspaceFile(params: {
  workspaceLink: string;
  path: string;
  content: string;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);
  const entry = await prisma.playgroundEntry.findFirst({
    where: {
      playgroundId: access.playground.id,
      path: params.path,
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!entry || entry.type !== "FILE") {
    throw new WorkspaceServiceError("That file could not be found.", 404);
  }

  if (
    !canEditEntry({
      role: access.member.role,
      rules: access.playground.rules,
      userId: access.user.id,
      entry,
    })
  ) {
    throw new WorkspaceServiceError(
      "You do not have permission to push that file.",
      403,
    );
  }

  const updated = await prisma.playgroundEntry.update({
    where: {
      id: entry.id,
    },
    data: {
      content: params.content,
      revision: (entry.revision ?? 1) + 1,
      updatedById: access.user.id,
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  await prisma.playground.update({
    where: {
      id: access.playground.id,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "FILE_PUSHED",
    message: `${inferActorName(access.user)} pushed ${params.path}.`,
    filePath: params.path,
    dedupeKey: `file-push:${access.user.id}:${params.path}:${updated.revision}`,
    dedupeWindowMs: 5_000,
  });

  return {
    fileState: serializeFileState(updated),
    activity,
    event: {
      workspaceId: access.playground.workspaceLink,
      path: updated.path,
      content: updated.content ?? "",
      revision: updated.revision ?? 1,
      pushedAt: updated.updatedAt.toISOString(),
      author: {
        ...mapUserToActor(access.user),
        role: access.member.role,
      },
    } satisfies FilePushEvent,
  };
}

export async function createWorkspaceEntry(params: {
  workspaceLink: string;
  parentPath: string | null;
  kind: "file" | "folder";
  name: string;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);

  if (!canCreateEntries(access.member.role, access.playground.rules)) {
    throw new WorkspaceServiceError(
      "You cannot create files in this workspace.",
      403,
    );
  }

  if (params.parentPath) {
    const parentEntry = await prisma.playgroundEntry.findFirst({
      where: {
        playgroundId: access.playground.id,
        path: params.parentPath,
      },
    });

    if (!parentEntry || parentEntry.type !== "FOLDER") {
      throw new WorkspaceServiceError(
        "The parent folder could not be found.",
        404,
      );
    }
  }

  const normalizedName = normalizeFileOrFolderName(params.name);
  const nextPath = [params.parentPath, normalizedName]
    .filter(Boolean)
    .join("/");

  const existingEntry = await prisma.playgroundEntry.findFirst({
    where: {
      playgroundId: access.playground.id,
      path: nextPath,
    },
    select: {
      id: true,
    },
  });

  if (existingEntry) {
    throw new WorkspaceServiceError(
      "An item with that name already exists.",
      409,
    );
  }

  let fileExtension: string | null = null;
  let content: string | null = null;

  if (params.kind === "file") {
    const lastDotIndex = normalizedName.lastIndexOf(".");
    fileExtension =
      lastDotIndex > 0 && lastDotIndex < normalizedName.length - 1
        ? normalizedName.slice(lastDotIndex + 1)
        : "";
    content = "";
  }

  await prisma.playgroundEntry.create({
    data: {
      playgroundId: access.playground.id,
      path: nextPath,
      parentPath: params.parentPath,
      name: normalizedName,
      type: params.kind === "folder" ? "FOLDER" : "FILE",
      fileExtension,
      content,
      updatedById: access.user.id,
    },
  });

  await prisma.playground.update({
    where: {
      id: access.playground.id,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "FILE_PUSHED",
    message: `${inferActorName(access.user)} created ${nextPath}.`,
    filePath: nextPath,
    dedupeKey: `tree-create:${access.user.id}:${nextPath}`,
    dedupeWindowMs: 5_000,
  });

  return {
    activity,
    event: {
      workspaceId: access.playground.workspaceLink,
      reason: "create",
      summary: `${inferActorName(access.user)} created ${nextPath}.`,
      triggeredAt: new Date().toISOString(),
      actor: {
        ...mapUserToActor(access.user),
        role: access.member.role,
      },
    } satisfies WorkspaceTreeUpdateEvent,
  };
}

export async function renameWorkspaceEntry(params: {
  workspaceLink: string;
  path: string;
  nextName: string;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);
  const entry = await prisma.playgroundEntry.findFirst({
    where: {
      playgroundId: access.playground.id,
      path: params.path,
    },
  });

  if (!entry) {
    throw new WorkspaceServiceError("That item could not be found.", 404);
  }

  if (
    !canEditEntry({
      role: access.member.role,
      rules: access.playground.rules,
      userId: access.user.id,
      entry,
    })
  ) {
    throw new WorkspaceServiceError("You cannot rename that item.", 403);
  }

  const normalizedName = normalizeFileOrFolderName(params.nextName);
  const nextPath = [entry.parentPath, normalizedName].filter(Boolean).join("/");

  const conflictingEntry = await prisma.playgroundEntry.findFirst({
    where: {
      playgroundId: access.playground.id,
      path: nextPath,
      NOT: {
        id: entry.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (conflictingEntry) {
    throw new WorkspaceServiceError(
      "An item with that name already exists.",
      409,
    );
  }

  const descendants =
    entry.type === "FOLDER"
      ? await prisma.playgroundEntry.findMany({
          where: {
            playgroundId: access.playground.id,
            path: {
              startsWith: `${entry.path}/`,
            },
          },
        })
      : [];

  await prisma.playgroundEntry.update({
    where: {
      id: entry.id,
    },
    data: {
      path: nextPath,
      name: normalizedName,
      fileExtension:
        entry.type === "FILE"
          ? (() => {
              const dotIndex = normalizedName.lastIndexOf(".");
              return dotIndex > 0 && dotIndex < normalizedName.length - 1
                ? normalizedName.slice(dotIndex + 1)
                : "";
            })()
          : null,
      updatedById: access.user.id,
      revision: (entry.revision ?? 1) + 1,
    },
  });

  for (const descendant of descendants) {
    const updatedPath = `${nextPath}${descendant.path.slice(entry.path.length)}`;
    const updatedParentPath = descendant.parentPath
      ? `${nextPath}${descendant.parentPath.slice(entry.path.length)}`
      : null;

    await prisma.playgroundEntry.update({
      where: {
        id: descendant.id,
      },
      data: {
        path: updatedPath,
        parentPath: updatedParentPath,
        updatedById: access.user.id,
        revision: (descendant.revision ?? 1) + 1,
      },
    });
  }

  await prisma.playground.update({
    where: {
      id: access.playground.id,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  const summary = `${inferActorName(access.user)} renamed ${params.path} to ${nextPath}.`;
  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "FILE_PUSHED",
    message: summary,
    filePath: nextPath,
    dedupeKey: `tree-rename:${access.user.id}:${params.path}:${nextPath}`,
    dedupeWindowMs: 5_000,
  });

  return {
    activity,
    event: {
      workspaceId: access.playground.workspaceLink,
      reason: "rename",
      summary,
      triggeredAt: new Date().toISOString(),
      actor: {
        ...mapUserToActor(access.user),
        role: access.member.role,
      },
    } satisfies WorkspaceTreeUpdateEvent,
  };
}

export async function deleteWorkspaceEntry(params: {
  workspaceLink: string;
  path: string;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);
  const entry = await prisma.playgroundEntry.findFirst({
    where: {
      playgroundId: access.playground.id,
      path: params.path,
    },
  });

  if (!entry) {
    throw new WorkspaceServiceError("That item could not be found.", 404);
  }

  if (
    !canEditEntry({
      role: access.member.role,
      rules: access.playground.rules,
      userId: access.user.id,
      entry,
    })
  ) {
    throw new WorkspaceServiceError("You cannot delete that item.", 403);
  }

  if (entry.type === "FOLDER") {
    await prisma.playgroundEntry.deleteMany({
      where: {
        playgroundId: access.playground.id,
        OR: [
          {
            path: entry.path,
          },
          {
            path: {
              startsWith: `${entry.path}/`,
            },
          },
        ],
      },
    });
  } else {
    await prisma.playgroundEntry.delete({
      where: {
        id: entry.id,
      },
    });
  }

  await prisma.playground.update({
    where: {
      id: access.playground.id,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  const summary = `${inferActorName(access.user)} deleted ${params.path}.`;
  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "FILE_PUSHED",
    message: summary,
    filePath: params.path,
    dedupeKey: `tree-delete:${access.user.id}:${params.path}`,
    dedupeWindowMs: 5_000,
  });

  return {
    activity,
    event: {
      workspaceId: access.playground.workspaceLink,
      reason: "delete",
      summary,
      triggeredAt: new Date().toISOString(),
      actor: {
        ...mapUserToActor(access.user),
        role: access.member.role,
      },
    } satisfies WorkspaceTreeUpdateEvent,
  };
}

export async function assignWorkspaceFile(params: {
  workspaceLink: string;
  path: string;
  assignedUserId: string | null;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);

  if (!canAssignFiles(access.member.role, access.playground.rules)) {
    throw new WorkspaceServiceError(
      "File assignment is only available to managers in strict mode.",
      403,
    );
  }

  const entry = await prisma.playgroundEntry.findFirst({
    where: {
      playgroundId: access.playground.id,
      path: params.path,
    },
  });

  if (!entry || entry.type !== "FILE") {
    throw new WorkspaceServiceError("That file could not be found.", 404);
  }

  if (params.assignedUserId) {
    const targetMember = await prisma.playgroundMember.findFirst({
      where: {
        playgroundId: access.playground.id,
        userId: params.assignedUserId,
      },
      select: {
        id: true,
      },
    });

    if (!targetMember) {
      throw new WorkspaceServiceError(
        "That collaborator is not part of this workspace.",
        404,
      );
    }
  }

  const updated = await prisma.playgroundEntry.update({
    where: {
      id: entry.id,
    },
    data: {
      assignedUserId: params.assignedUserId,
      updatedById: access.user.id,
      revision: (entry.revision ?? 1) + 1,
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  const assignedName = updated.assignedUser
    ? inferActorName(updated.assignedUser)
    : "nobody";
  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "FILE_ASSIGNED",
    message: `${inferActorName(access.user)} assigned ${params.path} to ${assignedName}.`,
    filePath: params.path,
    dedupeKey: `assign:${params.path}:${params.assignedUserId ?? "unassigned"}`,
    dedupeWindowMs: 5_000,
  });

  return {
    fileState: serializeFileState(updated),
    activity,
    event: {
      workspaceId: access.playground.workspaceLink,
      reason: "assign",
      summary: `${inferActorName(access.user)} updated the assignment for ${params.path}.`,
      triggeredAt: new Date().toISOString(),
      actor: {
        ...mapUserToActor(access.user),
        role: access.member.role,
      },
    } satisfies WorkspaceTreeUpdateEvent,
  };
}

export async function createWorkspaceChatEntry(params: {
  workspaceLink: string;
  content: string;
  user?: WorkspaceActor;
}) {
  const access = await getWorkspaceAccess(
    params.workspaceLink,
    params.user
      ? {
          id: params.user.userId,
          name: params.user.name,
          email: params.user.email,
          image: params.user.image,
          username: params.user.username,
        }
      : undefined,
  );
  const content = params.content.trim();

  if (!content) {
    throw new WorkspaceServiceError("Message content cannot be empty.", 400);
  }

  const created = await prisma.playgroundChatMessage.create({
    data: {
      playgroundId: access.playground.id,
      authorId: access.user.id,
      content,
    },
  });

  const message = await prisma.playgroundChatMessage.findUnique({
    where: {
      id: created.id,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!message) {
    throw new WorkspaceServiceError("Unable to save that message.", 500);
  }

  return serializeChatMessage(message);
}

export async function createWorkspaceInviteLink(params: {
  workspaceLink: string;
  email?: string | null;
  role?: WorkspaceMemberRoleValue;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);

  if (!isManagerRole(access.member.role)) {
    throw new WorkspaceServiceError(
      "You cannot create invites for this workspace.",
      403,
    );
  }

  const token = createInviteToken();
  const invite = await prisma.playgroundInvite.create({
    data: {
      playgroundId: access.playground.id,
      email: params.email?.trim().toLowerCase() || null,
      role: params.role ?? "MEMBER",
      tokenHash: hashInviteToken(token),
      createdById: access.user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "INVITE_CREATED",
    message: `${inferActorName(access.user)} created a workspace invite.`,
    dedupeKey: `invite-create:${invite.id}`,
    dedupeWindowMs: 5_000,
  });

  return {
    invite: {
      ...serializeInvite(invite),
      urlPath: buildInviteUrlPath(token),
    },
    inviteUrl: formatInviteUrl(token),
    activity,
  };
}

export async function sendWorkspaceEmailInviteBatch(params: {
  workspaceLink: string;
  emails: string[];
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);

  if (!isManagerRole(access.member.role)) {
    throw new WorkspaceServiceError(
      "You cannot send invites for this workspace.",
      403,
    );
  }

  const invites = await createInviteRecords({
    playgroundId: access.playground.id,
    createdById: access.user.id,
    emails: params.emails,
  });

  const emailResult = await sendWorkspaceInviteEmails({
    workspaceName: access.playground.name,
    sentByName: inferActorName(access.user),
    invites: invites.map((invite) => ({
      email: invite.email,
      inviteUrl: invite.inviteUrl,
    })),
  });

  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "INVITE_CREATED",
    message: `${inferActorName(access.user)} prepared ${invites.length} invite${invites.length === 1 ? "" : "s"}.`,
    dedupeKey: `invite-batch:${access.user.id}:${invites.length}:${Date.now()}`,
    dedupeWindowMs: 5_000,
  });

  return {
    invites,
    emailResult,
    activity,
  };
}

export async function acceptWorkspaceInviteToken(token: string) {
  const currentUser = await requireCurrentUser();
  const invite = await prisma.playgroundInvite.findFirst({
    where: {
      tokenHash: hashInviteToken(token),
    },
    include: {
      playground: {
        select: {
          id: true,
          workspaceLink: true,
          name: true,
        },
      },
    },
  });

  if (!invite) {
    throw new WorkspaceServiceError("That invite link is invalid.", 404);
  }

  if (invite.status !== "PENDING") {
    throw new WorkspaceServiceError(
      "That invite link is no longer active.",
      410,
    );
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    await prisma.playgroundInvite.update({
      where: {
        id: invite.id,
      },
      data: {
        status: "EXPIRED",
      },
    });

    throw new WorkspaceServiceError("That invite link has expired.", 410);
  }

  if (invite.email && invite.email !== currentUser.email?.toLowerCase()) {
    throw new WorkspaceServiceError(
      "This invite is tied to a different email address.",
      403,
    );
  }

  const existingMember = await prisma.playgroundMember.findFirst({
    where: {
      playgroundId: invite.playgroundId,
      userId: currentUser.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingMember) {
    await prisma.playgroundMember.create({
      data: {
        playgroundId: invite.playgroundId,
        userId: currentUser.id,
        role: invite.role,
      },
    });
  }

  await prisma.playgroundInvite.update({
    where: {
      id: invite.id,
    },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      acceptedById: currentUser.id,
    },
  });

  await createActivityRecord({
    playgroundId: invite.playgroundId,
    actorId: currentUser.id,
    type: "INVITE_ACCEPTED",
    message: `${inferActorName(currentUser)} joined the workspace through an invite.`,
    dedupeKey: `invite-accepted:${invite.id}`,
    dedupeWindowMs: 5_000,
  });

  return {
    workspaceLink: invite.playground.workspaceLink,
    workspaceName: invite.playground.name,
  };
}

export async function updateWorkspaceMemberRole(params: {
  workspaceLink: string;
  memberId: string;
  role: Extract<WorkspaceMemberRoleValue, "ADMIN" | "MEMBER">;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);

  if (!canManageRoles(access.member.role)) {
    throw new WorkspaceServiceError(
      "Only the workspace owner can change roles.",
      403,
    );
  }

  const targetMember = await prisma.playgroundMember.findFirst({
    where: {
      playgroundId: access.playground.id,
      userId: params.memberId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!targetMember) {
    throw new WorkspaceServiceError(
      "That collaborator could not be found.",
      404,
    );
  }

  if (targetMember.role === "OWNER") {
    throw new WorkspaceServiceError(
      "The workspace owner role cannot be changed.",
      400,
    );
  }

  const updated = await prisma.playgroundMember.update({
    where: {
      id: targetMember.id,
    },
    data: {
      role: params.role,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "MEMBER_ROLE_CHANGED",
    message: `${inferActorName(access.user)} changed ${inferActorName(updated.user)} to ${params.role}.`,
    dedupeKey: `role:${updated.userId}:${params.role}`,
    dedupeWindowMs: 5_000,
  });

  return {
    member: serializeMember(updated),
    activity,
  };
}

export async function removeWorkspaceMember(params: {
  workspaceLink: string;
  memberId: string;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);
  const targetMember = await prisma.playgroundMember.findFirst({
    where: {
      playgroundId: access.playground.id,
      userId: params.memberId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!targetMember) {
    throw new WorkspaceServiceError(
      "That collaborator could not be found.",
      404,
    );
  }

  if (
    !canManageTargetMember({
      actorRole: access.member.role,
      targetRole: targetMember.role,
    })
  ) {
    throw new WorkspaceServiceError(
      "You cannot remove that collaborator.",
      403,
    );
  }

  await prisma.playgroundEntry.updateMany({
    where: {
      playgroundId: access.playground.id,
      assignedUserId: targetMember.userId,
    },
    data: {
      assignedUserId: null,
    },
  });

  await prisma.playgroundMember.delete({
    where: {
      id: targetMember.id,
    },
  });

  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "MEMBER_REMOVED",
    message: `${inferActorName(access.user)} removed ${inferActorName(targetMember.user)} from the workspace.`,
    dedupeKey: `member-remove:${targetMember.userId}`,
    dedupeWindowMs: 5_000,
  });

  return {
    removedUserId: targetMember.userId,
    activity,
  };
}

export async function setWorkspaceMemberVoiceMute(params: {
  workspaceLink: string;
  memberId: string;
  isVoiceMuted: boolean;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);

  if (!canModerateVoice(access.member.role)) {
    throw new WorkspaceServiceError(
      "You cannot moderate voice for this workspace.",
      403,
    );
  }

  const targetMember = await prisma.playgroundMember.findFirst({
    where: {
      playgroundId: access.playground.id,
      userId: params.memberId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!targetMember) {
    throw new WorkspaceServiceError(
      "That collaborator could not be found.",
      404,
    );
  }

  if (
    !canManageTargetMember({
      actorRole: access.member.role,
      targetRole: targetMember.role,
    })
  ) {
    throw new WorkspaceServiceError(
      "You cannot change voice moderation for that collaborator.",
      403,
    );
  }

  const updated = await prisma.playgroundMember.update({
    where: {
      id: targetMember.id,
    },
    data: {
      isVoiceMuted: params.isVoiceMuted,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return serializeMember(updated);
}

export async function importWorkspaceRepository(params: {
  workspaceLink: string;
  repositoryFullName: string;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);

  if (!canImportRepository(access.member.role)) {
    throw new WorkspaceServiceError(
      "You cannot sync a repository into this workspace.",
      403,
    );
  }

  const imported = await importGitHubRepository(params.repositoryFullName);

  await replaceWorkspaceEntries({
    playgroundId: access.playground.id,
    templateData: imported.templateData,
    updatedById: access.user.id,
  });

  await prisma.playground.update({
    where: {
      id: access.playground.id,
    },
    data: {
      repositoryFullName: params.repositoryFullName,
      setupType: "GITHUB",
      template: "GITHUB",
      updatedAt: new Date(),
    },
  });

  const activity = await createActivityRecord({
    playgroundId: access.playground.id,
    actorId: access.user.id,
    type: "REPOSITORY_SYNCED",
    message: `${inferActorName(access.user)} synced ${params.repositoryFullName} into the workspace.`,
    dedupeKey: `repo-sync:${params.repositoryFullName}:${Date.now()}`,
    dedupeWindowMs: 5_000,
  });

  return {
    templateData: imported.templateData,
    repository: imported.repository,
    projectType: imported.projectType,
    preferredOpenPath: imported.preferredOpenPath,
    activity,
    event: {
      workspaceId: access.playground.workspaceLink,
      reason: "repository-sync",
      summary: `${inferActorName(access.user)} synced ${params.repositoryFullName}.`,
      triggeredAt: new Date().toISOString(),
      actor: {
        ...mapUserToActor(access.user),
        role: access.member.role,
      },
    } satisfies WorkspaceTreeUpdateEvent,
  };
}

export async function toggleWorkspaceStar(params: {
  workspaceLink: string;
  isStarred: boolean;
}) {
  const currentUser = await requireCurrentUser();
  const playground = await prisma.playground.findUnique({
    where: {
      workspaceLink: params.workspaceLink,
    },
    select: {
      id: true,
      ownerId: true,
      starredByIds: true,
    },
  });

  if (!playground) {
    throw new WorkspaceServiceError("Workspace not found.", 404);
  }

  await ensureWorkspaceMember(playground, currentUser);
  const nextStarredByIds = params.isStarred
    ? [...new Set([...(playground.starredByIds ?? []), currentUser.id])]
    : (playground.starredByIds ?? []).filter(
        (value) => value !== currentUser.id,
      );

  await prisma.playground.update({
    where: {
      id: playground.id,
    },
    data: {
      starredByIds: nextStarredByIds,
    },
  });

  return {
    success: true,
    isMarked: params.isStarred,
  };
}

export async function renameWorkspace(params: {
  workspaceLink: string;
  title: string;
  description: string;
}) {
  const access = await getWorkspaceAccess(params.workspaceLink);

  if (!isManagerRole(access.member.role)) {
    throw new WorkspaceServiceError("You cannot rename this workspace.", 403);
  }

  const updated = await prisma.playground.update({
    where: {
      id: access.playground.id,
    },
    data: {
      name: normalizeWorkspaceName(params.title),
      description: normalizeWorkspaceDescription(params.description),
      updatedAt: new Date(),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return toDashboardProject(updated, access.user.id);
}

export async function deleteWorkspace(workspaceLink: string) {
  const access = await getWorkspaceAccess(workspaceLink);

  if (access.member.role !== "OWNER") {
    throw new WorkspaceServiceError(
      "Only the workspace owner can delete this workspace.",
      403,
    );
  }

  await Promise.all([
    prisma.playgroundActivity.deleteMany({
      where: {
        playgroundId: access.playground.id,
      },
    }),
    prisma.playgroundChatMessage.deleteMany({
      where: {
        playgroundId: access.playground.id,
      },
    }),
    prisma.playgroundInvite.deleteMany({
      where: {
        playgroundId: access.playground.id,
      },
    }),
    prisma.playgroundEntry.deleteMany({
      where: {
        playgroundId: access.playground.id,
      },
    }),
    prisma.playgroundMember.deleteMany({
      where: {
        playgroundId: access.playground.id,
      },
    }),
  ]);

  await prisma.playground.delete({
    where: {
      id: access.playground.id,
    },
  });

  return {
    success: true,
  };
}

export function createPresenceSummary(params: {
  members: WorkspaceMember[];
  connections: Array<WorkspacePresence>;
}) {
  const memberByUserId = new Map(
    params.members.map((member) => [member.userId, member]),
  );
  const latestConnectionByUserId = new Map<string, WorkspacePresence>();

  for (const connection of params.connections) {
    latestConnectionByUserId.set(connection.userId, connection);
  }

  return Array.from(latestConnectionByUserId.values())
    .map((connection) => {
      const member = memberByUserId.get(connection.userId);

      if (!member) {
        return null;
      }

      return {
        ...connection,
        role: member.role,
      };
    })
    .filter((value): value is WorkspacePresence => Boolean(value));
}

export function createVoiceSummary(params: {
  members: WorkspaceMember[];
  participants: Array<WorkspaceVoiceParticipant>;
}) {
  const memberByUserId = new Map(
    params.members.map((member) => [member.userId, member]),
  );

  return params.participants
    .map((participant) => {
      const member = memberByUserId.get(participant.userId);

      if (!member) {
        return null;
      }

      return {
        ...participant,
        role: member.role,
        isMutedByModerator: member.isVoiceMuted,
      };
    })
    .filter((value): value is WorkspaceVoiceParticipant => Boolean(value));
}
