import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function WorkspacePage({
  params,
}: PageProps<"/workspace/[id]">) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/auth/sign-in?callbackUrl=${encodeURIComponent(`/workspace/${id}`)}`);
  }

  redirect(`/editor/${id}`);
}
