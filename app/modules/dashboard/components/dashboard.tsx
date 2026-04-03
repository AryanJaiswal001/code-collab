"use client";

import { useState } from "react";
import { toast } from "sonner";
import AddNewButton from "./add-new";
import EmptyState from "./empty-state";
import ProjectTable from "./project-table";
import type { DashboardProject, Project, TemplateKind } from "../types";
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
};

const toDashboardProject = (project: Project): DashboardProject => ({
  id: project.id,
  name: project.title,
  description: project.description?.trim() || "No description",
  techStack: templateLabels[project.template],
  updatedAt: project.updatedAt,
  isStarred: project.Starmark[0]?.isMarked ?? false,
});

const Dashboard = ({
  projects: initialProjects,
  initialError,
}: DashboardProps) => {
  const [projects, setProjects] = useState<DashboardProject[]>(
    () => initialProjects?.map(toDashboardProject) ?? []
  );
  const error = initialError ?? null;

  const hasProjects = projects.length > 0;

  const handleCreateProject = async (project: Project) => {
    setProjects((prev) => [toDashboardProject(project), ...prev]);
    toast.success("Project created successfully");
  };

  const handleRenameProject = (projectId: string) => {
    const currentProject = projects.find((project) => project.id === projectId);
    if (!currentProject) return;

    const renamed = window.prompt("Rename project", currentProject.name)?.trim();
    if (!renamed || renamed === currentProject.name) return;

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, name: renamed } : project
      )
    );
    toast.success("Project renamed");
  };

  const handleToggleStarProject = (projectId: string) => {
    let nextStarState = false;

    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        nextStarState = !project.isStarred;
        return {
          ...project,
          isStarred: nextStarState,
        };
      })
    );

    toast.success(nextStarState ? "Project starred" : "Project unstarred");
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    toast.success("Project deleted");
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
            Organize shared coding projects, jump into editor sessions, and keep
            your team work visible in one focused place.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <ThemeToggle />
          <AddNewButton onCreateProject={handleCreateProject} />
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
