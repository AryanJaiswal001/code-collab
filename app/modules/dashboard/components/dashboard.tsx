"use client";

import { useState } from "react";
import { toast } from "sonner";
import AddNewButton from "./add-new";
import EmptyState from "./empty-state";
import ProjectTable from "./project-table";
import type { Project } from "../types";

interface DashboardProps {
  projects: Project[] | null;
  initialError?: string | null;
}

const Dashboard = ({
  projects: initialProjects,
  initialError,
}: DashboardProps) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects ?? []);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const hasProjects = projects.length > 0;

  const handleCreateProject = async (project: Project) => {
    setProjects((prev) => [project, ...prev]);
    toast.success("Project created successfully");
  };

  const handleDeleteProject = async (id: string) => {
    setError(null);

    try {
      setProjects((prev) => prev.filter((project) => project.id !== id));
      toast.success("Project deleted successfully");
    } catch (fetchError) {
      setError("Failed to delete project. Please try again.");
      toast.error("Failed to delete project");
      throw fetchError;
    }
  };

  const handleUpdateProject = async (
    id: string,
    data: { title: string; description: string },
  ) => {
    setError(null);

    try {
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id
            ? {
                ...project,
                title: data.title,
                description: data.description,
                updatedAt: new Date().toISOString(),
              }
            : project,
        ),
      );

      toast.success("Project updated successfully");
    } catch (fetchError) {
      setError("Failed to update project. Please try again.");
      toast.error("Failed to update project");
      throw fetchError;
    }
  };

  const handleDuplicateProject = async (id: string) => {
    setError(null);

    try {
      const projectToDuplicate = projects.find((project) => project.id === id);

      if (projectToDuplicate) {
        const duplicatedProject: Project = {
          ...projectToDuplicate,
          id: `${projectToDuplicate.id}-copy-${Math.random().toString(36).slice(2, 6)}`,
          title: `${projectToDuplicate.title} Copy`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          Starmark: [],
        };
        setProjects((prev) => [duplicatedProject, ...prev]);
        toast.success("Project duplicated successfully");
      } else {
        throw new Error("Missing project data");
      }
    } catch (fetchError) {
      setError("Failed to duplicate project. Please try again.");
      toast.error("Failed to duplicate project");
      throw fetchError;
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 rounded-[2rem] border bg-card/90 p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
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
        <AddNewButton onCreateProject={handleCreateProject} />
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
            onDeleteProject={handleDeleteProject}
            onUpdateProject={handleUpdateProject}
            onDuplicateProject={handleDuplicateProject}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
