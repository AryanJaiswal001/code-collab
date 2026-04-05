import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { acceptWorkspaceInviteToken } from "@/app/modules/workspaces/server";
import { emitWorkspaceMembersChanged } from "@/lib/collaboration/realtime";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type WorkspaceInvitePageProps = {
  params: Promise<{ token: string }>;
};

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

  console.log("WorkspaceInvitePage rendered with token:", token);

  async function acceptInvite() {
    "use server";

    const invite = await acceptWorkspaceInviteToken(token);
    emitWorkspaceMembersChanged(invite.workspaceLink, "invite-accepted");
    redirect(`/workspace/${invite.workspaceLink}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_30%),#050816] px-4 py-10 text-white">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-200/80">
          Workspace Invite
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Join This Workspace</h1>
        <p className="mt-4 text-sm leading-7 text-white/65">
          Accept the invite to become a workspace member and open the shared
          editor.
        </p>

        <form action={acceptInvite} className="mt-8">
          <Button
            type="submit"
            className="w-full rounded-2xl bg-white text-black hover:bg-white/90"
          >
            Accept Invite
          </Button>
        </form>
      </div>
    </main>
  );
}
