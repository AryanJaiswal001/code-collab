"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LayoutGrid, Plus } from "lucide-react";
import { toast } from "sonner";
import { createPlayground } from "../actions";
import type { Project, TemplateKind } from "../types";

const AddNewButton = ({
  onCreateProject,
}: {
  onCreateProject?: (project: Project) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProject = async () => {
    if (!title.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const createdProject = await createPlayground({
        title,
        description,
        template: "NEXTJS" satisfies TemplateKind,
      });

      if (createdProject && onCreateProject) {
        await onCreateProject(createdProject);
      }

      toast.success("Project created successfully");
      setTitle("");
      setDescription("");
      setOpen(false);
    } catch {
      toast.error("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-2xl px-5">
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2rem] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Create a new project
          </DialogTitle>
          <DialogDescription>
            Start a new collaboration space for your editor sessions and team
            work.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="project-title">Project name</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Realtime collaboration workspace"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the project, team focus, or upcoming work."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateProject} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewButton;
