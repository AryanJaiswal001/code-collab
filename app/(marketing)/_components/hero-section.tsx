"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  GitFork,
  MessageSquare,
  Mic2,
  Play,
  Radio,
  SquareTerminal,
  UsersRound,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collaborators, landingLinks } from "./landing-data";

const workflowSignals = [
  { label: "GitHub repo imported", value: "acme/payments-api", icon: GitFork },
  { label: "WebContainer runtime", value: "Preview listening :3000", icon: Zap },
  { label: "Socket.IO room", value: "3 editors online", icon: Radio },
];

const proofPoints = [
  "30+ framework starters",
  "Monaco editor",
  "Invite links",
  "Voice rooms",
  "Merge discussions",
];

const fileTree = [
  { name: "app/api/checkout/route.ts", active: false },
  { name: "app/workspace/[id]/page.tsx", active: true },
  { name: "components/ui/button.tsx", active: false },
  { name: "lib/collaboration/realtime.ts", active: false },
];

const codeLines = [
  { no: "21", text: "const room = await workspace.join({", tone: "text-sky-300" },
  { no: "22", text: "  transport: \"socket.io\",", tone: "text-zinc-300" },
  { no: "23", text: "  presence: [\"cursor\", \"voice\", \"chat\"],", tone: "text-emerald-200" },
  { no: "24", text: "  runtime: await webcontainer.boot(),", tone: "text-violet-200" },
  { no: "25", text: "})", tone: "text-sky-300" },
  { no: "26", text: "await room.broadcastFileChange(activeFile)", tone: "text-cyan-200" },
];

const terminalLines = [
  "$ npm run dev",
  "WebContainer booted in browser",
  "Socket room synced: workspace_live_42",
  "Local preview ready on port 3000",
];

export function HeroSection() {
  return (
    <section className="relative z-10 overflow-hidden px-6 pt-28 pb-20 sm:px-8 sm:pb-24 lg:px-10 lg:pt-36">
      <HeroAtmosphere />

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <Badge
              variant="outline"
              className="h-8 rounded-full border-cyan-300/20 bg-cyan-300/10 px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.16)]"
            >
              <Radio className="size-3.5 animate-pulse" />
              Multiplayer workspace live
            </Badge>
          </motion.div>

          <motion.h1
            className="mt-7 max-w-4xl text-balance text-5xl font-semibold leading-[0.94] tracking-tight text-white sm:text-7xl lg:text-8xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease: "easeOut" }}
          >
            The browser IDE where teams build in the same room.
          </motion.h1>

          <motion.p
            className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-zinc-300 sm:text-xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.18, ease: "easeOut" }}
          >
            Import a GitHub repo or launch a starter, invite your team, edit in
            Monaco, run Node in WebContainers, and keep presence, chat, voice,
            terminal, and preview synced inside one workspace.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.28, ease: "easeOut" }}
          >
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_0_42px_rgba(255,255,255,0.22)] hover:bg-cyan-100"
            >
              <Link href={landingLinks.start}>
                Start Collaborating
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/12 bg-white/[0.04] px-6 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/10"
            >
              <Link href={landingLinks.github} target="_blank" rel="noreferrer">
                <GitFork className="size-4" />
                View GitHub
              </Link>
            </Button>
          </motion.div>

          <motion.div
            className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.38, ease: "easeOut" }}
          >
            {workflowSignals.map((signal) => (
              <SignalCard key={signal.label} {...signal} />
            ))}
          </motion.div>
        </div>

        <motion.div
          className="relative min-w-0"
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.18, ease: "easeOut" }}
        >
          <WorkspaceHeroVisual />
        </motion.div>
      </div>

      <motion.div
        className="mx-auto mt-14 max-w-7xl border-y border-white/10 py-5"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.46, ease: "easeOut" }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          {proofPoints.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function HeroAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-20 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-cyan-400/12 blur-3xl" />
      <div className="absolute right-0 top-56 h-80 w-80 rounded-full bg-violet-500/12 blur-3xl" />
      <div
        className="absolute inset-x-0 top-0 h-[36rem] opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(103,232,249,0.24) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 48%, transparent 100%)",
        }}
      />
      <motion.div
        className="absolute left-[12%] top-52 h-px w-64 bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent"
        animate={{ x: ["-20%", "120%"], opacity: [0, 1, 0] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[8%] top-36 h-px w-56 bg-gradient-to-r from-transparent via-violet-200/70 to-transparent"
        animate={{ x: ["20%", "-120%"], opacity: [0, 1, 0] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function SignalCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.035] p-3 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        <Icon className="size-3.5 text-cyan-300" />
        {label}
      </div>
      <div className="font-mono text-xs leading-5 text-zinc-200">{value}</div>
    </div>
  );
}

function WorkspaceHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[720px]">
      <div className="absolute -inset-6 rounded-full bg-cyan-400/12 blur-3xl" />
      <div className="relative overflow-hidden rounded-[18px] border border-white/14 bg-[#070a12]/95 shadow-[0_42px_160px_rgba(0,0,0,0.78)] backdrop-blur-2xl">
        <div className="flex h-11 items-center justify-between border-b border-white/10 bg-white/[0.035] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-rose-400" />
            <span className="size-2.5 rounded-full bg-amber-300" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[11px] text-zinc-400 sm:flex">
            <GitBranch className="size-3 text-cyan-300" />
            workspace/live-checkout
          </div>
          <div className="flex -space-x-2">
            {collaborators.map((person) => (
              <div
                key={person.name}
                className="relative grid size-7 place-items-center rounded-full border border-black/70 bg-zinc-900 text-[10px] font-semibold text-white"
              >
                <span
                  className={`absolute bottom-0 right-0 size-2 rounded-full ${person.color}`}
                />
                {person.name.slice(0, 1)}
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[176px_minmax(0,1fr)]">
          <aside className="hidden border-r border-white/10 bg-white/[0.025] p-3 md:block">
            <div className="mb-3 flex items-center gap-2 px-2 text-xs font-medium text-zinc-300">
              <UsersRound className="size-3.5 text-cyan-300" />
              Workspace
            </div>
            <div className="space-y-1">
              {fileTree.map((file) => (
                <div
                  key={file.name}
                  className={`truncate rounded-[6px] px-2 py-2 font-mono text-[11px] ${
                    file.active
                      ? "bg-cyan-300/10 text-cyan-100"
                      : "text-zinc-500"
                  }`}
                >
                  {file.name}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-emerald-200">
                <CheckCircle2 className="size-3.5" />
                Rules active
              </div>
              <p className="text-[11px] leading-5 text-emerald-50/70">
                Strict mode keeps file ownership clear while admins review
                changes.
              </p>
            </div>
          </aside>

          <main className="grid min-w-0 grid-rows-[1fr_auto] bg-[#080b13]">
            <div className="relative min-h-[320px] overflow-hidden p-3 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-cyan-300">
                    app/workspace/[id]/page.tsx
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ava, Milo, and Noor are editing this workspace
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] text-emerald-200">
                  <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                  Synced
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[8px] border border-white/10 bg-black/45 p-3 font-mono text-[11px] shadow-2xl sm:p-4 sm:text-xs">
                {codeLines.map((line, index) => (
                  <motion.div
                    key={line.no}
                    className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 leading-7 sm:grid-cols-[34px_minmax(0,1fr)]"
                    initial={{ opacity: 0.4 }}
                    animate={{ opacity: [0.55, 1, 0.75] }}
                    transition={{
                      duration: 3.8,
                      delay: index * 0.16,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <span className="text-right text-zinc-600">{line.no}</span>
                    <span className={`truncate ${line.tone}`}>{line.text}</span>
                  </motion.div>
                ))}

                <CursorLabel
                  className="left-[46%] top-[35%]"
                  color="cyan"
                  label="Ava editing"
                />
                <CursorLabel
                  className="left-[58%] top-[69%]"
                  color="violet"
                  label="Milo cursor"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniPanel icon={MessageSquare} label="Chat" value="Need review on route.ts" />
                <MiniPanel icon={Mic2} label="Voice" value="2 teammates speaking" />
                <MiniPanel icon={Play} label="Preview" value="Checkout flow running" />
              </div>
            </div>

            <div className="grid border-t border-white/10 bg-white/[0.025] md:grid-cols-[1fr_220px]">
              <div className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-300">
                  <SquareTerminal className="size-3.5 text-cyan-300" />
                  Terminal
                </div>
                <div className="space-y-2 font-mono text-[11px]">
                  {terminalLines.map((line, index) => (
                    <motion.p
                      key={line}
                      className={index === 0 ? "text-cyan-200" : "text-zinc-400"}
                      animate={{ opacity: [0.42, 1, 0.7] }}
                      transition={{ duration: 3, delay: index * 0.35, repeat: Infinity }}
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <div className="mb-3 text-xs font-medium text-zinc-300">
                  Activity
                </div>
                <div className="space-y-2 text-xs text-zinc-400">
                  <ActivityLine tone="bg-cyan-300" text="Repo imported from GitHub" />
                  <ActivityLine tone="bg-violet-300" text="Invite link copied" />
                  <ActivityLine tone="bg-emerald-300" text="Merge request opened" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function CursorLabel({
  className,
  color,
  label,
}: {
  className: string;
  color: "cyan" | "violet";
  label: string;
}) {
  const styles =
    color === "cyan"
      ? "border-cyan-200/40 bg-cyan-400/15 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.35)]"
      : "border-violet-200/40 bg-violet-400/15 text-violet-100 shadow-[0_0_22px_rgba(167,139,250,0.35)]";

  return (
    <motion.div
      className={`absolute hidden rounded-[6px] border px-2 py-1 text-[11px] ${styles} sm:block ${className}`}
      animate={{ x: [0, 16, -4, 10], y: [0, -8, 6, 0] }}
      transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
    >
      {label}
    </motion.div>
  );
}

function MiniPanel({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        <Icon className="size-3.5 text-cyan-300" />
        {label}
      </div>
      <p className="text-xs leading-5 text-zinc-300">{value}</p>
    </div>
  );
}

function ActivityLine({ tone, text }: { tone: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1.5 size-1.5 rounded-full ${tone}`} />
      <span className="leading-5">{text}</span>
    </div>
  );
}
