"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Command, UsersRound } from "lucide-react";
import { templateCards } from "./landing-data";
import { SectionHeading } from "./section-heading";

const templateBeamPaths = [
  "M150 96 C300 80 360 44 520 64",
  "M150 140 C310 150 370 130 520 132",
  "M150 184 C315 220 380 210 520 200",
  "M150 228 C315 292 380 285 520 268",
  "M150 272 C300 365 392 358 520 336",
];

export function TemplateEcosystemSection() {
  return (
    <section id="templates" className="relative z-10 px-6 py-28 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Template Ecosystem"
          title="Start from the shape of the product you want"
          description="Reusable workspaces give teams the right file structure, scripts, reviews, and deploy expectations before the first commit."
        />

        <div className="relative mt-16 overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(168,85,247,0.16),transparent_26%),radial-gradient(circle_at_78%_70%,rgba(34,211,238,0.13),transparent_30%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[320px_1fr] lg:items-center">
            <div className="relative rounded-[8px] border border-white/10 bg-black/30 p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                  <UsersRound className="size-6" />
                </div>
                <div>
                  <p className="font-medium text-white">Team launchpad</p>
                  <p className="text-sm text-zinc-500">Developers join with context</p>
                </div>
              </div>

              <div className="space-y-3">
                {["Fork template", "Invite teammates", "Open shared IDE"].map((step, index) => (
                  <motion.div
                    key={step}
                    className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 3.2, delay: index * 0.35, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-white/10 font-mono text-[10px] text-cyan-200">
                      {index + 1}
                    </span>
                    {step}
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                <Command className="size-4" />
                Templates sync into every workspace
              </div>
            </div>

            <svg className="pointer-events-none absolute left-[260px] top-10 hidden h-[410px] w-[600px] lg:block" viewBox="0 0 700 420" fill="none">
              <defs>
                <linearGradient id="template-beam" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.05" />
                  <stop offset="55%" stopColor="#67e8f9" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              {templateBeamPaths.map((path, index) => (
                <g key={path}>
                  <path d={path} stroke="rgba(255,255,255,0.11)" strokeWidth="1" />
                  <motion.path
                    d={path}
                    stroke="url(#template-beam)"
                    strokeLinecap="round"
                    strokeWidth="2"
                    strokeDasharray="0.18 1"
                    pathLength={0.18}
                    animate={{ strokeDashoffset: [1, 0] }}
                    transition={{ duration: 2.7, delay: index * 0.22, repeat: Infinity, ease: "linear" }}
                  />
                </g>
              ))}
            </svg>

            <div className="relative grid gap-4 md:grid-cols-2">
              {templateCards.map(({ name, description, icon: Icon, accent, tags }, index) => (
                <motion.article
                  key={name}
                  className="group relative overflow-hidden rounded-[8px] border border-white/10 bg-zinc-950/75 p-5 shadow-2xl backdrop-blur-xl"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.55, delay: index * 0.06 }}
                  whileHover={{ y: -6, borderColor: "rgba(103,232,249,0.36)" }}
                >
                  <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent} opacity-80`} />
                  <div className="mb-5 flex items-start justify-between">
                    <div className={`grid size-11 place-items-center rounded-[8px] bg-gradient-to-br ${accent} text-black shadow-[0_0_35px_rgba(103,232,249,0.18)]`}>
                      <Icon className="size-5" />
                    </div>
                    <ArrowUpRight className="size-4 text-zinc-500 transition-colors group-hover:text-cyan-200" />
                  </div>
                  <h3 className="text-lg font-medium text-white">{name}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-zinc-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
