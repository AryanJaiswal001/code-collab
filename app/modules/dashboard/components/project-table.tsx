"use client";

import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import ProjectRowActions from "./project-row-actions";
import type { DashboardProject } from "../types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProjectTableProps {
  projects: DashboardProject[];
  onRenameProject: (projectId: string) => void;
  onToggleStarProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export default function ProjectTable({
  projects,
  onRenameProject,
  onToggleStarProject,
  onDeleteProject,
}: ProjectTableProps) {
  const router = useRouter();

  if (!projects || projects.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-12 text-center text-muted-foreground">
        No workspaces available.
      </div>
    );
  }

  return (
    <div
      id="projects"
      className="w-full overflow-hidden rounded-[1.75rem] border bg-card/90 shadow-sm"
    >
      <Table>
        <TableHeader className="bg-muted/35">
          <TableRow className="hover:bg-muted/35">
            <TableHead className="pl-5">Workspace</TableHead>
            <TableHead>Tech Stack</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-16 pr-5 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow
              key={project.id}
              className="transition-colors hover:bg-primary/5"
            >
              <TableCell className="max-w-[320px] pl-5">
                <div className="space-y-1">
                  <button
                    type="button"
                    className="truncate text-left font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                    onClick={() => router.push(`/workspace/${project.id}`)}
                  >
                    {project.name}
                  </button>
                  <p className="truncate text-xs text-muted-foreground">
                    {project.description}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{project.techStack}</Badge>
                  {project.isStarred ? (
                    <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-300">
                      Starred
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(project.updatedAt), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="pr-5 text-right">
                <div className="flex justify-end">
                  <ProjectRowActions
                    isStarred={project.isStarred}
                    onRenameProject={() => onRenameProject(project.id)}
                    onToggleStar={() => onToggleStarProject(project.id)}
                    onDeleteProject={() => onDeleteProject(project.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
