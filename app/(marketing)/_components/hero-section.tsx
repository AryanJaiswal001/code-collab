"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GitFork, Radio, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  collaborators,
  floatingBadges,
  landingLinks,
  trustedBy,
} from "./landing-data";
import { MacbookShowcase } from "./macbook-showcase";

export function HeroSection() {
  return (
    <section className="relative z-10 overflow-hidden px-6 pt-28 sm:px-8 lg:px-10 lg:pt-36">
      <div className="mx-auto max-w-7xl">
        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <Badge
              variant="outline"
              className="mx-auto h-8 border-cyan-300/20 bg-cyan-300/10 px-4 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.16)]"
            >
              <Sparkles className="size-3.5" />
              Open collaboration, live by default
            </Badge>
          </motion.div>

          <motion.h1
            className="mt-8 text-balance text-5xl font-semibold tracking-tight text-white sm:text-7xl lg:text-8xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease: "easeOut" }}
          >
            Build Together.
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">
              Merge Faster.
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-7 max-w-3xl text-pretty text-lg leading-8 text-zinc-300 sm:text-xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.18, ease: "easeOut" }}
          >
            Code Collab is a real-time collaborative coding platform for teams,
            hackathons, and open-source developers.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.28, ease: "easeOut" }}
          >
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_0_38px_rgba(255,255,255,0.22)] hover:bg-cyan-100"
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
              className="h-12 rounded-full border-white/12 bg-white/5 px-6 text-sm font-semibold text-white hover:bg-white/10"
            >
              <Link href={landingLinks.github} target="_blank" rel="noreferrer">
                <GitFork className="size-4" />
                View GitHub
              </Link>
            </Button>
          </motion.div>

          <motion.div
            className="mx-auto mt-9 flex max-w-2xl flex-col items-center justify-center gap-4 rounded-full border border-white/10 bg-white/[0.035] px-4 py-3 backdrop-blur-xl sm:flex-row"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.38, ease: "easeOut" }}
          >
            <div className="flex -space-x-2">
              {collaborators.map((person) => (
                <div
                  key={person.name}
                  className="relative grid size-9 place-items-center rounded-full border border-black/60 bg-zinc-900 text-xs font-semibold text-white"
                >
                  <span className={`absolute bottom-0 right-0 size-2.5 rounded-full ${person.color}`} />
                  {person.name.slice(0, 1)}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
              <Radio className="size-3.5 animate-pulse text-emerald-300" />
              3 live editors, 1 merge preview, 0 conflicts
            </div>
          </motion.div>

          {floatingBadges.map((badge) => (
            <motion.div
              key={badge.label}
              className="pointer-events-none absolute hidden rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-mono text-[11px] text-zinc-300 shadow-2xl backdrop-blur-xl md:block"
              style={{ left: badge.x, top: badge.y }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: [0.35, 1, 0.35], y: [0, -10, 0] }}
              transition={{
                duration: 4.5,
                delay: badge.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <span className="mr-2 inline-block size-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
              {badge.label}
            </motion.div>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-5xl border-y border-white/10 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            {trustedBy.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        <MacbookShowcase />
      </div>
    </section>
  );
}
