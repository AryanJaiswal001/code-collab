"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { Project } from "../types";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import emptyIllustration from "@/app/dashboard/empty.svg";

const EmptyState = ({
  onCreateProject,
}: {
  onCreateProject: (project: Project) => Promise<void>;
}) => {
  return (
    <Card className="w-full rounded-[2rem] border-dashed bg-card/80 shadow-sm">
      <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-5 p-8 text-center">
        <Image
          src={emptyIllustration}
          alt="Empty dashboard illustration"
          width={240}
          height={180}
          className="h-auto w-full max-w-[240px]"
          priority
        />
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">No workspaces yet</h2>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Create your first workspace to start collaborating
          </p>
        </div>
        <CreateWorkspaceModal onCreateProject={onCreateProject} />
      </CardContent>
    </Card>
  );
};

export default EmptyState;
