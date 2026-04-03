"use client";

import { FolderOpenDot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Project } from "../types";
import AddNewButton from "./add-new";

const EmptyState = ({
  onCreateProject,
}: {
  onCreateProject: (project: Project) => Promise<void>;
}) => {
  return (
    <Card className="w-full rounded-[2rem] border-dashed bg-card/80 shadow-sm">
      <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FolderOpenDot className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">No projects yet</h2>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Create your first collaborative project to start sharing code,
            reviews, and live editing sessions with your team.
          </p>
        </div>
        <AddNewButton onCreateProject={onCreateProject} />
      </CardContent>
    </Card>
  );
};

export default EmptyState;
