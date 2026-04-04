"use server";

import { revalidatePath } from "next/cache";
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
}) {
  const project: Project = {
    id: makeProjectId(data.title),
    title: data.title.trim(),
    description: data.description?.trim() || "No description provided yet.",
    template: data.template,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "user-1",
    Starmark: [],
    user: {
      name: "Code Collab Team",
      email: "team@codecollab.dev",
      image: "",
    },
  };

  mockProjects = [project, ...mockProjects];
  revalidatePath("/dashboard");
  return project;
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
