import Link from "next/link";
import { ArrowLeft, ExternalLink, Github, Shield, Users2 } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProjectById } from "@/app/modules/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatWorkspaceName(workspaceId: string) {
  return workspaceId
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/auth/sign-in?callbackUrl=${encodeURIComponent(`/workspace/${id}`)}`);
  }

  const workspace = await getProjectById(id);
  const workspaceName = workspace?.title ?? formatWorkspaceName(id);
  const shareablePath = `/workspace/${id}`;
  const workspaceModeLabel =
    workspace?.workspaceMode === "PERSONAL"
      ? "Personal"
      : workspace?.workspaceMode === "COLLABORATION"
        ? "Collaboration"
        : "Workspace";
  const workspaceRulesLabel =
    workspace?.workspaceRules === "STRICT"
      ? "Strict rules"
      : workspace?.workspaceRules === "LENIENT"
        ? "Lenient rules"
        : "Access protected";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_35%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-[2rem] border-border/70 bg-card/90 shadow-none">
          <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <Button asChild variant="ghost" className="w-fit rounded-2xl px-0">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to dashboard
                </Link>
              </Button>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Shared Workspace
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {workspaceName}
                </h1>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <Users2 className="mr-1 h-3 w-3" />
                    {workspaceModeLabel}
                  </Badge>
                  <Badge variant="outline">
                    <Shield className="mr-1 h-3 w-3" />
                    {workspaceRulesLabel}
                  </Badge>
                  <Badge variant="outline">{shareablePath}</Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" className="rounded-2xl px-5">
                <Link href={`/editor/${id}`}>
                  Open editor
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button className="rounded-2xl px-5">Share Session</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="rounded-[2rem] border-border/70 bg-card/95 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Workspace overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                {workspace?.description ??
                  "This workspace is ready for shared coding sessions, invites, and repository-driven collaboration."}
              </p>
              <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-4">
                <p className="font-medium text-foreground">Shareable link</p>
                <p className="mt-2 break-all">{shareablePath}</p>
              </div>
              {workspace?.repositoryFullName ? (
                <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-4">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Github className="h-4 w-4" />
                    Imported repository
                  </div>
                  <p className="mt-2">{workspace.repositoryFullName}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/70 bg-card/90 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Access snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Authenticated users are redirected back to this workspace after
                signing in.
              </p>
              <div className="space-y-2 rounded-[1.5rem] border border-border/70 bg-muted/25 p-4">
                <p className="font-medium text-foreground">Collaborators</p>
                {workspace?.collaborators?.length ? (
                  workspace.collaborators.map((email) => (
                    <p key={email}>{email}</p>
                  ))
                ) : (
                  <p>No invites sent yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
