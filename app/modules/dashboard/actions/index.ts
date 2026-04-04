"use server";

import { revalidatePath } from "next/cache";
import {
  createWorkspaceRecord,
  deleteWorkspace,
  getAllWorkspaceProjectsForCurrentUser,
  getWorkspaceProjectByLink,
  renameWorkspace,
  toggleWorkspaceStar,
} from "@/app/modules/workspaces/server";
import type { TemplateKind } from "../types";

export async function getAllPlaygroundForUser() {
  return getAllWorkspaceProjectsForCurrentUser();
}

export async function toggleStarMarked(id: string, markedForRevision: boolean) {
  const result = await toggleWorkspaceStar({
    workspaceLink: id,
    isStarred: markedForRevision,
  });

  revalidatePath("/dashboard");
  return result;
}

export async function createPlayground(data: {
  title: string;
  template: TemplateKind;
  description?: string;
  id?: string;
  workspaceMode?: "PERSONAL" | "COLLABORATION";
  projectSetupMode?: "TEMPLATE" | "GITHUB";
  workspaceRules?: "STRICT" | "LENIENT";
  repositoryFullName?: string;
  collaborators?: string[];
}) {
  const project = await createWorkspaceRecord({
    id: data.id ?? data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: data.title,
    description: data.description,
    mode: data.workspaceMode ?? "PERSONAL",
    setupType: data.projectSetupMode ?? "TEMPLATE",
    rules: data.workspaceRules ?? "STRICT",
    template: data.template,
    repositoryFullName: data.repositoryFullName,
    collaborators: data.collaborators,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/workspace/${project.id}`);
  return project;
}

export async function createWorkspace(data: {
  id?: string;
  name: string;
  description?: string;
  mode: "PERSONAL" | "COLLABORATION";
  setupType: "TEMPLATE" | "GITHUB";
  rules: "STRICT" | "LENIENT";
  template: TemplateKind;
  repositoryFullName?: string;
  collaborators?: string[];
}) {
  const project = await createWorkspaceRecord({
    id: data.id ?? data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: data.name,
    description: data.description,
    mode: data.mode,
    setupType: data.setupType,
    rules: data.rules,
    template: data.template,
    repositoryFullName: data.repositoryFullName,
    collaborators: data.collaborators,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/workspace/${project.id}`);
  return project;
}

export async function getProjectById(id: string) {
  return getWorkspaceProjectByLink(id);
}

export async function deleteProjectById(id: string) {
  const result = await deleteWorkspace(id);
  revalidatePath("/dashboard");
  return result;
}

export async function editProjectById(
  id: string,
  data: { title: string; description: string },
) {
  const project = await renameWorkspace({
    workspaceLink: id,
    title: data.title,
    description: data.description,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/workspace/${id}`);
  return project;
}

export async function duplicateProjectById() {
  throw new Error("Workspace duplication is not available yet.");
}
