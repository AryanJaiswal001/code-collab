"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  GitBranch,
  GitFork,
  MessageSquare,
  Mic2,
  Radio,
  SquareTerminal,
  UsersRound,
  Zap,
} from "lucide-react";

const collaborators = [
  { name: "Ava", role: "Frontend", color: "bg-cyan-300", x: "66%", y: "31%" },
  { name: "Milo", role: "API", color: "bg-violet-300", x: "54%", y: "58%" },
  { name: "Noor", role: "Review", color: "bg-emerald-300", x: "75%", y: "67%" },
];

const codeLines = [
  { no: "08", text: "const workspace = await importRepo(\"acme/app\")", tone: "text-sky-300" },
  { no: "09", text: "await workspace.invite([\"ava\", \"milo\", \"noor\"])", tone: "text-emerald-200" },
  { no: "10", text: "room.sync({ editor: monaco, runtime: webcontainer })", tone: "text-violet-200" },
  { no: "11", text: "presence.broadcast(cursor, activeFile)", tone: "text-cyan-200" },
];

const terminalLines = [
  "$ npm run dev",
  "workspace synced via Socket.IO",
  "webcontainer preview ready :3000",
  "voice room opened for 3 members",
];

const workspaceCards = [
  { label: "Repo", value: "github.com/acme/app", icon: GitFork },
  { label: "Runtime", value: "WebContainer active", icon: Zap },
  { label: "Presence", value: "3 live editors", icon: Radio },
];

export function AuthVisualPanel() {
  return (
    <section className="relative order-2 flex min-h-[560px] overflow-hidden border-t border-white/10 px-5 py-8 sm:px-8 lg:order-1 lg:min-h-screen lg:border-r lg:border-t-0 lg:px-10 lg:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.26]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(125,211,252,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.13) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            maskImage:
              "radial-gradient(circle at 42% 36%, black 0%, black 42%, transparent 78%)",
          }}
        />
        <div className="absolute left-16 top-16 h-80 w-80 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-violet-500/12 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")",
          }}
        />
        <motion.div
          className="absolute left-[8%] top-[22%] h-px w-72 bg-gradient-to-r from-transparent via-cyan-200/75 to-transparent"
          animate={{ x: ["-16%", "112%"], opacity: [0, 1, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[24%] right-[4%] h-px w-64 bg-gradient-to-r from-transparent via-violet-200/75 to-transparent"
          animate={{ x: ["12%", "-112%"], opacity: [0, 1, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col justify-center">
        <motion.div
          className="mb-8 max-w-2xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-100">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
            Workspace OS online
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Enter the room where the code is already moving.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg">
            Open a shared editor, see teammates arrive, boot the runtime, and
            keep every decision close to the code.
          </p>
        </motion.div>

        <div className="relative min-h-[380px]">
          <motion.div
            className="absolute left-0 top-6 w-[86%] overflow-hidden rounded-[14px] border border-white/12 bg-[#080b13]/92 shadow-[0_34px_120px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:w-[74%]"
            initial={{ opacity: 0, y: 24, rotate: -1.5 }}
            animate={{ opacity: 1, y: [0, -8, 0], rotate: -1.5 }}
            transition={{
              opacity: { duration: 0.7, delay: 0.12 },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <WindowChrome label="workspace/live-checkout" />
            <div className="p-4 font-mono text-[11px] sm:text-xs">
              {codeLines.map((line, index) => (
                <div
                  key={line.no}
                  className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 leading-7"
                >
                  <span className="text-right text-zinc-600">{line.no}</span>
                  <span className={`truncate ${line.tone}`}>{line.text}</span>
                  {index === 2 ? (
                    <motion.span
                      className="col-start-2 h-4 w-px bg-cyan-200"
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.1, repeat: Infinity }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="absolute right-0 top-28 w-[72%] overflow-hidden rounded-[14px] border border-white/12 bg-[#090d17]/95 shadow-[0_34px_110px_rgba(0,0,0,0.58)] backdrop-blur-2xl sm:w-[48%]"
            initial={{ opacity: 0, y: 24, rotate: 1.5 }}
            animate={{ opacity: 1, y: [0, 10, 0], rotate: 1.5 }}
            transition={{
              opacity: { duration: 0.7, delay: 0.24 },
              y: { duration: 6.8, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <WindowChrome label="terminal" compact />
            <div className="space-y-2 p-4 font-mono text-[11px]">
              {terminalLines.map((line, index) => (
                <motion.p
                  key={line}
                  className={index === 0 ? "text-cyan-200" : "text-zinc-400"}
                  animate={{ opacity: [0.45, 1, 0.72] }}
                  transition={{ duration: 3, delay: index * 0.32, repeat: Infinity }}
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-8 left-8 grid w-[78%] gap-2 rounded-[14px] border border-white/12 bg-white/[0.045] p-3 backdrop-blur-2xl sm:w-[52%]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { duration: 0.7, delay: 0.32 },
              y: { duration: 5.8, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                <UsersRound className="size-3.5 text-cyan-300" />
                Active contributors
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 font-mono text-[10px] text-emerald-200">
                live
              </span>
            </div>
            {collaborators.map((person) => (
              <div key={person.name} className="flex items-center justify-between gap-3 rounded-[8px] bg-black/20 px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${person.color}`} />
                  <span className="text-xs text-zinc-200">{person.name}</span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                  {person.role}
                </span>
              </div>
            ))}
          </motion.div>

          {collaborators.map((person, index) => (
            <motion.div
              key={person.name}
              className="absolute hidden rounded-[7px] border border-white/12 bg-black/50 px-2 py-1 font-mono text-[11px] text-zinc-200 shadow-2xl backdrop-blur-xl sm:block"
              style={{ left: person.x, top: person.y }}
              animate={{ x: [0, 12, -5, 0], y: [0, -8, 5, 0] }}
              transition={{
                duration: 5 + index * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <span className={`mr-2 inline-block size-1.5 rounded-full ${person.color}`} />
              {person.name} cursor
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {workspaceCards.map((card) => (
            <WorkspaceSignal key={card.label} {...card} />
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <CollabMetric icon={MessageSquare} label="Chat" value="Context in flow" />
          <CollabMetric icon={Mic2} label="Voice" value="Room attached" />
          <CollabMetric icon={CheckCircle2} label="Review" value="Changes ready" />
        </div>
      </div>
    </section>
  );
}

function WindowChrome({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-white/10 bg-white/[0.035] px-3">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-rose-400" />
        <span className="size-2 rounded-full bg-amber-300" />
        <span className="size-2 rounded-full bg-emerald-400" />
      </div>
      <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
        {!compact ? <GitBranch className="size-3 text-cyan-300" /> : <SquareTerminal className="size-3 text-cyan-300" />}
        {label}
      </div>
    </div>
  );
}

function WorkspaceSignal({
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
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        <Icon className="size-3.5 text-cyan-300" />
        {label}
      </div>
      <p className="font-mono text-xs text-zinc-200">{value}</p>
    </div>
  );
}

function CollabMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-black/20 px-3 py-2.5">
      <Icon className="size-4 text-violet-200" />
      <div>
        <p className="text-xs font-medium text-zinc-200">{label}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          {value}
        </p>
      </div>
    </div>
  );
}
