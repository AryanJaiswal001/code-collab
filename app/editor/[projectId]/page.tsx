import Link from "next/link";
import { ArrowLeft, Clock3, Code2, MessagesSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatProjectName(projectId: string) {
  return projectId
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const projectName = formatProjectName(projectId);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_35%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-[2rem] border-border/70 bg-card/90 shadow-none">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <Button asChild variant="ghost" className="w-fit rounded-2xl px-0">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to dashboard
                </Link>
              </Button>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Collaborative Editor
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {projectName}
                </h1>
              </div>
            </div>

            <Button className="rounded-2xl px-5">Share Session</Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
          <Card className="overflow-hidden rounded-[2rem] border-border/70 bg-card/95 shadow-none">
            <CardHeader className="border-b border-border/70 bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-base">
                <Code2 className="h-4 w-4" />
                editor.tsx
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="overflow-x-auto p-6 text-sm leading-7 text-foreground/85">
                <code>{`export function CollaborationSession() {
  return {
    project: "${projectId}",
    status: "connected",
    focus: "shared editing",
    collaborators: ["alice", "sam", "you"],
  };
}`}</code>
              </pre>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-card/90 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Presence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>3 collaborators are active in this workspace.</p>
                <p>Cursor sync, chat, and file history can plug in here next.</p>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-card/90 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessagesSquare className="h-4 w-4" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  Last sync a few seconds ago
                </div>
                <p>
                  This placeholder editor is ready for real-time collaboration
                  features when you hook up the backend.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
