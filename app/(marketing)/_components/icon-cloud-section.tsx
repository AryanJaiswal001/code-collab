"use client";

import { motion } from "framer-motion";
import { techIcons } from "./landing-data";
import { SectionHeading } from "./section-heading";

export function IconCloudSection() {
  return (
    <section id="stack" className="relative z-10 px-6 py-28 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionHeading
          align="left"
          eyebrow="Technology Cloud"
          title="Built for Modern Developers"
          description="Code Collab feels native to the tools teams already use, from React and Next.js to containers, databases, and AI-assisted review."
        />

        <div className="relative min-h-[560px] overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.035] shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl [perspective:1100px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_64%_32%,rgba(168,85,247,0.14),transparent_24%)]" />
          <motion.div
            className="absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 size-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
            animate={{ rotate: -360 }}
            transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
          />

          <motion.div
            className="absolute left-1/2 top-1/2 h-1 w-1 [transform-style:preserve-3d]"
            animate={{ rotateY: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            {techIcons.map(({ name, icon: Icon, color }, index) => {
              const angle = (360 / techIcons.length) * index;
              const radius = 230;

              return (
                <motion.div
                  key={name}
                  className="absolute -left-14 -top-14 grid size-28 place-items-center rounded-[8px] border border-white/10 bg-zinc-950/80 p-3 text-center shadow-2xl backdrop-blur-xl"
                  style={{
                    transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                  }}
                  whileHover={{ scale: 1.08 }}
                >
                  <Icon className={`mb-2 size-8 ${color}`} />
                  <span className="font-mono text-[11px] text-zinc-300">{name}</span>
                </motion.div>
              );
            })}
          </motion.div>

          <div className="absolute left-1/2 top-1/2 grid size-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-center shadow-[0_0_90px_rgba(34,211,238,0.22)] backdrop-blur-xl">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-200">Code Collab</p>
              <p className="mt-2 text-sm text-zinc-300">Unified stack</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
