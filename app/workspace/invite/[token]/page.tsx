import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import {
  acceptWorkspaceInviteToken,
  getWorkspaceInvitePreview,
  WorkspaceServiceError,
} from "@/app/modules/workspaces/server";
import { emitWorkspaceMembersChanged } from "@/lib/collaboration/realtime";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

type WorkspaceInvitePageProps = {
  params: Promise<{ token: string }>;
};

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function WorkspaceInvitePage({
  params,
}: WorkspaceInvitePageProps) {
  const { token } = await params;
  const session = await auth();

  if (!session) {
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/workspace/invite/${token}`)}`,
    );
  }

  let invitePreview: Awaited<ReturnType<typeof getWorkspaceInvitePreview>> | null =
    null;
  let inviteError: string | null = null;

  try {
    invitePreview = await getWorkspaceInvitePreview(token);
  } catch (error) {
    inviteError =
      error instanceof WorkspaceServiceError
        ? error.message
        : "Invalid or expired invite.";
  }

  async function acceptInvite() {
    "use server";

    const invite = await acceptWorkspaceInviteToken(token);
    emitWorkspaceMembersChanged(invite.workspaceLink, "invite-accepted");
    redirect(`/workspace/${invite.workspaceLink}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_30%),#050816] px-4 py-10 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#08101f] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-8">
        {invitePreview ? (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-200/80">
              Workspace Invite
            </p>

            <div className="mt-5 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-lg font-semibold text-emerald-100">
                {getInitials(invitePreview.workspaceName) || "W"}
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-semibold sm:text-3xl">
                  {invitePreview.workspaceName}
                </h1>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {invitePreview.workspaceDescription ??
                    "Accept the invite to join this shared coding workspace."}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/10">
                  <AvatarImage
                    src={invitePreview.inviter.image ?? undefined}
                    alt={invitePreview.inviter.name}
                  />
                  <AvatarFallback>
                    {getInitials(invitePreview.inviter.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    Invited by {invitePreview.inviter.name}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {invitePreview.inviter.email ?? "Workspace collaborator"}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-white/60 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-white/35">
                    Role
                  </dt>
                  <dd className="mt-1 text-white">{invitePreview.role}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-white/35">
                    Expires
                  </dt>
                  <dd className="mt-1 text-white">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                    }).format(new Date(invitePreview.expiresAt))}
                  </dd>
                </div>
              </dl>
            </div>

            <form action={acceptInvite} className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                type="submit"
                className="rounded-xl bg-white text-black hover:bg-white/90"
                aria-label="Accept workspace invite"
              >
                {invitePreview.alreadyMember ? "Open Workspace" : "Accept Invite"}
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/dashboard" aria-label="Reject workspace invite">
                  Reject
                </Link>
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-red-200/80">
              Workspace Invite
            </p>
            <h1 className="mt-4 text-2xl font-semibold">
              Invalid or expired invite
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/65">
              {inviteError ??
                "This invite could not be loaded. Ask the workspace owner for a new link."}
            </p>
            <Button
              asChild
              className="mt-6 w-full rounded-xl bg-white text-black hover:bg-white/90"
            >
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
