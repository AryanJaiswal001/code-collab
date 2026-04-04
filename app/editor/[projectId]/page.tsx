import Link from "next/link";
import { ArrowLeft, Play, Share2 } from "lucide-react";
import { getProjectById } from "@/app/modules/dashboard/actions";

function formatProjectName(projectId: string) {
  return projectId
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default async function EditorPage({
  params,
}: PageProps<"/editor/[projectId]">) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  const projectName = project?.title ?? formatProjectName(projectId);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to dashboard</span>
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {projectName}
              </p>
              <p className="text-xs text-white/45">Demo playground</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
            >
              <Play className="h-4 w-4" />
              Live
            </button>
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-5xl rounded-[28px] border border-white/10 bg-white/[0.03] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-200">
                Demo
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                /editor/{projectId}
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/10 bg-[#0b1020] p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-white/40">
                  Playground Placeholder
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                  {projectName}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
                  The previous playground utilities have been removed. This
                  route is now a lightweight demo destination so you can wire up
                  a fresh editor experience whenever you are ready.
                </p>

                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <pre className="overflow-x-auto text-sm leading-7 text-cyan-200/90">
                    <code>{`// demo-playground.ts
export const workspace = {
  id: "${projectId}",
  name: "${projectName}",
  status: "ready-for-rebuild",
};`}</code>
                  </pre>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/40">
                    Next Step
                  </p>
                  <p className="mt-4 text-sm leading-7 text-white/65">
                    Build your new playground on top of this route or replace
                    it entirely with your next editor implementation.
                  </p>
                </div>

                <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/40">
                    Project Route
                  </p>
                  <p className="mt-4 break-all text-sm text-white/75">
                    /workspace/{projectId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
