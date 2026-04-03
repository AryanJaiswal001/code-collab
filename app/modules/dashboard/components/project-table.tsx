"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "../types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import MarkedToggleButton from "./marked-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ProjectTableProps {
  projects: Project[];
  onUpdateProject?: (
    id: string,
    data: { title: string; description: string },
  ) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  onDuplicateProject?: (id: string) => Promise<unknown>;
}

interface EditProjectData {
  title: string;
  description: string;
}

export default function ProjectTable({
  projects,
  onUpdateProject,
  onDeleteProject,
  onDuplicateProject,
}: ProjectTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editData, setEditData] = useState<EditProjectData>({
    title: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleEditClick = (project: Project) => {
    setSelectedProject(project);
    setEditData({
      title: project.title,
      description: project.description || "",
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !onUpdateProject) return;
    if (isLoading) return;
    setIsLoading(true);

    try {
      await onUpdateProject(selectedProject.id, editData);
      setEditDialogOpen(false);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject || !onDeleteProject) return;
    if (isLoading) return;

    setIsLoading(true);
    try {
      await onDeleteProject(selectedProject.id);
      setDeleteDialogOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    if (!onDuplicateProject) return;
    if (isLoading) return;

    setIsLoading(true);
    try {
      await onDuplicateProject(project.id);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyProjectUrl = (projectId: string) => {
    const url = `${window.location.origin}/editor/${projectId}`;
    navigator.clipboard.writeText(url);
    toast.success("Project URL copied to clipboard");
  };

  if (!projects || projects.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-12 text-center text-muted-foreground">
        No projects available.
      </div>
    );
  }

  return (
    <>
      <div
        id="projects"
        className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {projects.map((project) => (
          <Card
            key={project.id}
            className="group rounded-[1.75rem] border-border/70 bg-card/90 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{project.template}</Badge>
                    {project.Starmark[0]?.isMarked ? (
                      <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-300">
                        Favorite
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle className="text-xl">{project.title}</CardTitle>
                  <CardDescription className="line-clamp-3 leading-6">
                    {project.description}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild>
                      <MarkedToggleButton
                        markedForRevision={!!project.Starmark[0]?.isMarked}
                        id={project.id}
                      />
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/editor/${project.id}`}
                        className="flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Open Project
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/editor/${project.id}`}
                        target="_blank"
                        className="flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleEditClick(project)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Project
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicateProject(project)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => copyProjectUrl(project.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(project)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                Updated{" "}
                {formatDistanceToNow(new Date(project.updatedAt), {
                  addSuffix: true,
                })}
              </div>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {project.user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{project.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.user.email}
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Open collaborative editor
              </span>
              <Button asChild size="sm" className="rounded-full">
                <Link href={`/editor/${project.id}`}>
                  Open
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Make changes to your project details here. Click save when you
              &apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={editData.title}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter project title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter project description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateProject}
              disabled={isLoading || !editData.title.trim()}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedProject?.title}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
