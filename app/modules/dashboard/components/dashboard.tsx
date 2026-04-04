"use client";

import { useState } from "react";
import { toast } from "sonner";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import EmptyState from "./empty-state";
import ProjectTable from "./project-table";
import type {
  DashboardProject,
  Project,
  SidebarProject,
  TemplateKind,
} from "../types";
import {
  deleteProjectById,
  editProjectById,
  toggleStarMarked,
} from "../actions";
import { ThemeToggle } from "@/components/theme-toggle";

interface DashboardProps {
  projects: Project[] | null;
  initialError?: string | null;
}

const templateLabels: Record<TemplateKind, string> = {
  NEXTJS: "Next.js",
  REACT: "React",
  EXPRESS: "Express",
  VUE: "Vue",
  HONO: "Hono",
  ANGULAR: "Angular",
  GITHUB: "GitHub Import",
};

const templateIcons: Record<TemplateKind, string> = {
  NEXTJS: "LightBulb",
  REACT: "Zap",
  EXPRESS: "Database",
  VUE: "Compass",
  HONO: "FlameIcon",
  ANGULAR: "Terminal",
  GITHUB: "Code2",
};

const toDashboardProject = (project: Project): DashboardProject => ({
  id: project.id,
  name: project.title,
  description: project.description?.trim() || "No description",
  techStack: templateLabels[project.template],
  updatedAt: project.updatedAt,
  isStarred: project.Starmark[0]?.isMarked ?? false,
});

const toSidebarProject = (project: Project): SidebarProject => ({
  id: project.id,
  name: project.title,
  starred: project.Starmark[0]?.isMarked ?? false,
  icon: templateIcons[project.template] || "Code",
});

const Dashboard = ({
  projects: initialProjects,
  initialError,
}: DashboardProps) => {
  const [projects, setProjects] = useState<DashboardProject[]>(
    () => initialProjects?.map(toDashboardProject) ?? [],
  );
  const error = initialError ?? null;

  const hasProjects = projects.length > 0;

  const handleCreateProject = async (project: Project) => {
    setProjects((prev) => [toDashboardProject(project), ...prev]);
    window.dispatchEvent(
      new CustomEvent("dashboard:project-created", {
        detail: toSidebarProject(project),
      }),
    );
  };

  const handleRenameProject = async (projectId: string) => {
    const currentProject = projects.find((project) => project.id === projectId);
    if (!currentProject) return;

    const renamed = window
      .prompt("Rename workspace", currentProject.name)
      ?.trim();
    if (!renamed || renamed === currentProject.name) return;

    const updatedProject = await editProjectById(projectId, {
      title: renamed,
      description: currentProject.description,
    }).catch(() => null);

    if (!updatedProject) {
      toast.error("Unable to rename the workspace.");
      return;
    }

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, name: updatedProject.title } : project,
      ),
    );
    window.dispatchEvent(
      new CustomEvent("dashboard:project-renamed", {
        detail: { id: projectId, name: renamed },
      }),
    );
    toast.success("Workspace renamed");
  };

  const handleToggleStarProject = async (projectId: string) => {
    const currentProject = projects.find((project) => project.id === projectId);
    if (!currentProject) return;

    const nextStarState = !currentProject.isStarred;

    const result = await toggleStarMarked(projectId, nextStarState).catch(() => null);

    if (!result) {
      toast.error("Unable to update the workspace star.");
      return;
    }

    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        return {
          ...project,
          isStarred: nextStarState,
        };
      }),
    );

    window.dispatchEvent(
      new CustomEvent("dashboard:project-star-toggled", {
        detail: { id: projectId, starred: nextStarState },
      }),
    );

    toast.success(nextStarState ? "Workspace starred" : "Workspace unstarred");
  };

  const handleDeleteProject = async (projectId: string) => {
    const projectExists = projects.some((project) => project.id === projectId);
    if (!projectExists) return;

    const result = await deleteProjectById(projectId).catch(() => null);

    if (!result?.success) {
      toast.error("Unable to delete the workspace.");
      return;
    }

    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    window.dispatchEvent(
      new CustomEvent("dashboard:project-deleted", {
        detail: { id: projectId },
      }),
    );
    toast.success("Workspace deleted");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 rounded-[2rem] border bg-card/90 p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">
            Collaboration Workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Organize shared workspaces, jump into live sessions, and keep your
            team work visible in one focused place.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <ThemeToggle />
          <CreateWorkspaceModal onCreateProject={handleCreateProject} />
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center">
        {error ? (
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <h2 className="text-lg font-semibold text-destructive">{error}</h2>
            <p className="text-sm text-muted-foreground">
              Refresh the page or try again in a moment.
            </p>
          </div>
        ) : null}
        {!hasProjects ? (
          <EmptyState onCreateProject={handleCreateProject} />
        ) : (
          <ProjectTable
            projects={projects}
            onRenameProject={handleRenameProject}
            onToggleStarProject={handleToggleStarProject}
            onDeleteProject={handleDeleteProject}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
