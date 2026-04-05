import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

type WorkspacePageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/workspace/${id}`)}`);
  }

  redirect(`/editor/${id}`);
}
