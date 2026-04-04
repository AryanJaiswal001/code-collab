"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { Project, TemplateKind } from "../types";

let mockProjects: Project[] = [];

function makeProjectId(title: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "project"}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getAllPlaygroundForUser(): Promise<Project[]> {
  return [...mockProjects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function toggleStarMarked(id: string, markedForRevision: boolean) {
  mockProjects = mockProjects.map((project) =>
    project.id === id
      ? {
          ...project,
          Starmark: markedForRevision ? [{ isMarked: true }] : [],
          updatedAt: new Date().toISOString(),
        }
      : project,
  );

  revalidatePath("/dashboard");
  return { success: true, isMarked: markedForRevision };
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
  const session = await auth();
  const sessionUser = session?.user;
  const ownerId =
    (sessionUser as { id?: string } | undefined)?.id ??
    sessionUser?.email ??
    "anonymous-user";

  const project: Project = {
    id: data.id ?? makeProjectId(data.title),
    title: data.title.trim(),
    description: data.description?.trim() || "No description provided yet.",
    template: data.template,
    workspaceMode: data.workspaceMode,
    projectSetupMode: data.projectSetupMode,
    workspaceRules: data.workspaceRules,
    repositoryFullName: data.repositoryFullName,
    collaborators: data.collaborators ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: ownerId,
    Starmark: [],
    user: {
      name: sessionUser?.name ?? "Code Collab Team",
      email: sessionUser?.email ?? "team@codecollab.dev",
      image: sessionUser?.image ?? "",
    },
  };

  mockProjects = [project, ...mockProjects];
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
  return createPlayground({
    id: data.id,
    title: data.name,
    template: data.template,
    description: data.description,
    workspaceMode: data.mode,
    projectSetupMode: data.setupType,
    workspaceRules: data.rules,
    repositoryFullName: data.repositoryFullName,
    collaborators: data.collaborators,
  });
}

export async function getProjectById(id: string) {
  return mockProjects.find((project) => project.id === id) ?? null;
}

export async function deleteProjectById(id: string) {
  mockProjects = mockProjects.filter((project) => project.id !== id);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function editProjectById(
  id: string,
  data: { title: string; description: string },
) {
  mockProjects = mockProjects.map((project) =>
    project.id === id
      ? {
          ...project,
          title: data.title.trim(),
          description: data.description.trim(),
          updatedAt: new Date().toISOString(),
        }
      : project,
  );

  revalidatePath("/dashboard");
  return mockProjects.find((project) => project.id === id) ?? null;
}

export async function duplicateProjectById(id: string) {
  const originalProject = mockProjects.find((project) => project.id === id);

  if (!originalProject) {
    throw new Error("Original playground not found");
  }

  const duplicatedProject: Project = {
    ...originalProject,
    id: makeProjectId(`${originalProject.title}-copy`),
    title: `${originalProject.title} Copy`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    Starmark: [],
  };

  mockProjects = [duplicatedProject, ...mockProjects];
  revalidatePath("/dashboard");
  return duplicatedProject;
}
