"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Database,
  GitPullRequestArrow,
  LayoutTemplate,
  UsersRound,
} from "lucide-react";
import { collaborationCards } from "./landing-data";
import { SectionHeading } from "./section-heading";

const networkNodes = [
  { label: "Developers", icon: UsersRound, className: "left-[6%] top-[16%]" },
  { label: "Repositories", icon: Database, className: "right-[8%] top-[15%]" },
  { label: "AI assistant", icon: Bot, className: "left-1/2 top-[40%] -translate-x-1/2" },
  { label: "Pull requests", icon: GitPullRequestArrow, className: "left-[12%] bottom-[12%]" },
  { label: "Templates", icon: LayoutTemplate, className: "right-[12%] bottom-[12%]" },
];

const beamPaths = [
  "M140 105 C260 70 360 170 500 250",
  "M860 105 C740 70 640 170 500 250",
  "M180 410 C310 470 410 340 500 250",
  "M820 410 C690 470 590 340 500 250",
  "M500 250 C500 178 500 128 500 72",
];

export function LiveCollaborationSection() {
  return (
    <section id="collaboration" className="relative z-10 px-6 py-28 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Live Collaboration"
          title="Every signal moves through one shared graph"
          description="Animated workstreams connect teammates, repositories, AI review, pull requests, and reusable templates without context switching."
        />

        <div className="relative mt-16 overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_30px_140px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.14),transparent_34%)]" />
          <div className="relative hidden h-[520px] lg:block">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 520" fill="none">
              <defs>
                <linearGradient id="beam-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.05" />
                  <stop offset="45%" stopColor="#a78bfa" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              {beamPaths.map((path) => (
                <path key={`static-${path}`} d={path} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              ))}
              {beamPaths.map((path, index) => (
                <motion.path
                  key={path}
                  d={path}
                  stroke="url(#beam-gradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  pathLength={0.28}
                  strokeDasharray="0.28 1"
                  animate={{ strokeDashoffset: [1, 0] }}
                  transition={{
                    duration: 2.8,
                    delay: index * 0.24,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              ))}
            </svg>

            {networkNodes.map(({ label, icon: Icon, className }, index) => (
              <motion.div
                key={label}
                className={`absolute ${className} w-48 rounded-[8px] border border-white/10 bg-zinc-950/80 p-4 shadow-2xl backdrop-blur-xl`}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                whileHover={{ y: -5, borderColor: "rgba(103,232,249,0.35)" }}
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                  <Icon className="size-5" />
                </div>
                <p className="font-medium text-white">{label}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Synced across branches, comments, terminals, and previews.
                </p>
              </motion.div>
            ))}

          </div>

          <div className="relative grid gap-4 lg:hidden">
            {networkNodes.map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-[8px] border border-white/10 bg-zinc-950/80 p-4">
                <div className="mb-3 flex items-center gap-3 text-white">
                  <Icon className="size-5 text-cyan-300" />
                  {label}
                </div>
                <p className="text-sm leading-6 text-zinc-400">Connected to the live collaboration graph.</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {collaborationCards.map(({ title, description, icon: Icon, metric }, index) => (
            <motion.div
              key={title}
              className="group rounded-[8px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl transition-colors hover:border-cyan-300/30 hover:bg-white/[0.06]"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, delay: index * 0.06 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-[8px] border border-white/10 bg-black/30 text-cyan-200">
                  <Icon className="size-5" />
                </div>
                <span className="font-mono text-[11px] text-emerald-300">{metric}</span>
              </div>
              <h3 className="font-medium text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
