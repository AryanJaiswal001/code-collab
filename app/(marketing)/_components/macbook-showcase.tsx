"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Code2,
  GitBranch,
  GitPullRequestArrow,
  MessagesSquare,
  Terminal,
} from "lucide-react";
import { collaborators, terminalLines } from "./landing-data";

const editorLines = [
  { no: "01", text: "import { room } from \"@/lib/realtime\"", color: "text-sky-300" },
  { no: "02", text: "import { createMergePreview } from \"@/lib/git\"", color: "text-violet-300" },
  { no: "03", text: "", color: "text-zinc-500" },
  { no: "04", text: "export async function collaborate() {", color: "text-fuchsia-200" },
  { no: "05", text: "  const session = await room.join(\"ship-room\")", color: "text-zinc-200" },
  { no: "06", text: "  session.broadcast({ type: \"cursor\", file: \"app/page.tsx\" })", color: "text-emerald-200" },
  { no: "07", text: "  return createMergePreview(session.branch)", color: "text-cyan-200" },
  { no: "08", text: "}", color: "text-fuchsia-200" },
];

const fileTree = [
  "app/page.tsx",
  "app/modules/playground",
  "components/ui/button.tsx",
  "lib/realtime.ts",
  "prisma/schema.prisma",
];

export function MacbookShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.45, 1], [0.92, 1.03, 0.96]);
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 1], [16, 0, -7]);
  const y = useTransform(scrollYProgress, [0, 1], [90, -40]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.45, 1], [0.22, 0.65, 0.28]);

  return (
    <div ref={sectionRef} className="relative mx-auto mt-16 h-[760px] w-full max-w-7xl sm:mt-24">
      <div className="sticky top-24 flex min-h-[620px] items-center justify-center [perspective:1800px]">
        <motion.div
          className="relative w-full max-w-6xl"
          style={{ scale, rotateX, y, transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="absolute -inset-10 rounded-full bg-cyan-400/20 blur-3xl"
            style={{ opacity: glowOpacity }}
          />
          <div className="relative rounded-[32px] border border-white/15 bg-gradient-to-b from-zinc-700/40 via-zinc-950 to-black p-2 shadow-[0_40px_160px_rgba(0,0,0,0.85)]">
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#070a12]">
              <div className="flex h-9 items-center justify-between border-b border-white/10 bg-white/[0.03] px-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-rose-400" />
                  <span className="size-2.5 rounded-full bg-amber-300" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[11px] text-zinc-400 sm:flex">
                  <GitBranch className="size-3 text-cyan-300" />
                  feature/live-merge-preview
                </div>
                <div className="font-mono text-[11px] text-zinc-500">Code Collab</div>
              </div>

              <div className="grid min-h-[500px] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
                <aside className="hidden border-r border-white/10 bg-white/[0.025] p-4 lg:block">
                  <div className="mb-4 flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <Code2 className="size-4 text-cyan-300" />
                    Workspace
                  </div>
                  <div className="space-y-1.5">
                    {fileTree.map((file, index) => (
                      <motion.div
                        key={file}
                        className="rounded-[6px] px-2 py-2 font-mono text-[11px] text-zinc-400"
                        animate={{
                          backgroundColor:
                            index === 0 ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.02)",
                          color: index === 0 ? "rgb(165,243,252)" : "rgb(161,161,170)",
                        }}
                        transition={{ duration: 2.4, repeat: Infinity, repeatType: "reverse" }}
                      >
                        {file}
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-8 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-emerald-200">
                      <CheckCircle2 className="size-3.5" />
                      Tests passing
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-emerald-950">
                      <motion.div
                        className="h-full rounded-full bg-emerald-300"
                        animate={{ width: ["28%", "100%", "76%"] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                </aside>

                <main className="relative min-h-[500px] overflow-hidden bg-[#080b13] p-4 sm:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs text-cyan-300">app/modules/playground/collaboration-panel.tsx</p>
                      <p className="mt-1 text-xs text-zinc-500">3 collaborators editing this branch</p>
                    </div>
                    <div className="flex -space-x-2">
                      {collaborators.map((person) => (
                        <div
                          key={person.name}
                          className="relative grid size-8 place-items-center rounded-full border border-black/60 bg-zinc-900 text-[11px] font-semibold text-white"
                        >
                          <span className={`absolute size-2 rounded-full ${person.color} translate-x-3 translate-y-3`} />
                          {person.name.slice(0, 1)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[8px] border border-white/10 bg-black/40 p-4 font-mono text-xs shadow-2xl">
                    {editorLines.map((line, index) => (
                      <motion.div
                        key={`${line.no}-${index}`}
                        className="grid grid-cols-[32px_1fr] gap-4 leading-7"
                        initial={{ opacity: 0.35 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: false, amount: 0.65 }}
                        transition={{ delay: index * 0.04 }}
                      >
                        <span className="text-right text-zinc-600">{line.no}</span>
                        <span className={line.color}>{line.text || " "}</span>
                      </motion.div>
                    ))}
                    <motion.div
                      className="absolute left-[45%] top-[44%] rounded-[6px] border border-cyan-200/40 bg-cyan-400/15 px-2 py-1 text-[11px] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.35)]"
                      animate={{ x: [0, 18, 4, 28], y: [0, -8, 12, 2] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      Ava editing
                    </motion.div>
                    <motion.div
                      className="absolute left-[63%] top-[63%] rounded-[6px] border border-violet-200/40 bg-violet-400/15 px-2 py-1 text-[11px] text-violet-100 shadow-[0_0_22px_rgba(167,139,250,0.35)]"
                      animate={{ x: [0, -20, -4, -28], y: [0, 10, -10, 6] }}
                      transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      Milo cursor
                    </motion.div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {["Presence locked", "Preview built", "Conflict free"].map((label, index) => (
                      <motion.div
                        key={label}
                        className="rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <span className="mr-2 inline-block size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
                        {label}
                      </motion.div>
                    ))}
                  </div>
                </main>

                <aside className="grid gap-4 border-t border-white/10 bg-white/[0.025] p-4 lg:border-l lg:border-t-0">
                  <Panel title="Terminal" icon={Terminal}>
                    <div className="space-y-2 font-mono text-[11px]">
                      {terminalLines.map((line, index) => (
                        <motion.p
                          key={line}
                          className={index === 0 ? "text-cyan-200" : "text-zinc-400"}
                          initial={{ opacity: 0.25 }}
                          animate={{ opacity: [0.35, 1, 0.65] }}
                          transition={{ duration: 3, delay: index * 0.45, repeat: Infinity }}
                        >
                          {line}
                        </motion.p>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Team chat" icon={MessagesSquare}>
                    <div className="space-y-3 text-xs">
                      <ChatLine name="Noor" text="Preview shows only config drift." />
                      <ChatLine name="Ava" text="Resolving the typed event mismatch now." />
                    </div>
                  </Panel>
                  <Panel title="Merge preview" icon={GitPullRequestArrow}>
                    <div className="space-y-2 text-xs text-zinc-400">
                      <div className="flex justify-between">
                        <span>Files changed</span>
                        <span className="text-white">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk score</span>
                        <span className="text-emerald-300">Low</span>
                      </div>
                      <div className="rounded-[6px] bg-emerald-300/10 px-2 py-1.5 text-emerald-200">
                        Ready after approval
                      </div>
                    </div>
                  </Panel>
                </aside>
              </div>
            </div>
          </div>

          <div className="mx-auto h-7 w-[72%] rounded-b-[40px] bg-gradient-to-b from-zinc-700 to-zinc-950 shadow-[0_22px_80px_rgba(0,0,0,0.75)]" />
        </motion.div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-black/30 p-3">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-300">
        <Icon className="size-3.5 text-cyan-300" />
        {title}
      </div>
      {children}
    </div>
  );
}

function ChatLine({ name, text }: { name: string; text: string }) {
  return (
    <div className="rounded-[8px] bg-white/[0.04] p-2">
      <div className="mb-1 font-medium text-zinc-200">{name}</div>
      <div className="leading-5 text-zinc-400">{text}</div>
    </div>
  );
}
