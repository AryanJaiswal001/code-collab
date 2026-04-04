"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

const MinimalPlaygroundShell = dynamic(
  () =>
    import("../modules/playground/components/minimal-playground-shell").then(
      (module) => module.MinimalPlaygroundShell,
    ),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <Spinner className="h-4 w-4" />
          <span className="text-sm text-white/75">Loading playground...</span>
        </div>
      </main>
    ),
  },
);

export function PlaygroundClientPage() {
  return (
    <MinimalPlaygroundShell
      projectId="demo-playground"
      projectName="Demo Playground"
    />
  );
}
