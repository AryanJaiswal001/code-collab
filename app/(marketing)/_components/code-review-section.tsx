"use client";

import { motion } from "framer-motion";
import { CheckCircle2, GitMerge, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { newCodeLines, oldCodeLines, reviewStates } from "./landing-data";
import { SectionHeading } from "./section-heading";

const lineStyles: Record<string, string> = {
  added: "bg-emerald-400/10 text-emerald-100",
  removed: "bg-rose-400/10 text-rose-100",
  muted: "text-zinc-500",
  neutral: "text-zinc-300",
};

export function CodeReviewSection() {
  return (
    <section id="review" className="relative z-10 px-6 py-28 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Code Review"
            title="Review Changes Without Friction"
            description="Powerful merge workflows designed for modern developer teams."
          />

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {reviewStates.map(({ label, value, icon: Icon }, index) => (
              <motion.div
                key={label}
                className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
              >
                <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                  <Icon className="size-4 text-cyan-300" />
                  {label}
                </div>
                <div className="font-mono text-sm text-white">{value}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 p-4">
            <div className="flex items-center gap-3 text-sm font-medium text-emerald-100">
              <CheckCircle2 className="size-5" />
              Merge approval state
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-100/70">
              All conversations resolved, checks passing, and owners approved.
            </p>
          </div>
        </div>

        <motion.div
          className="relative rounded-[8px] border border-white/10 bg-[#060912]/90 p-3 shadow-[0_32px_120px_rgba(0,0,0,0.62)] backdrop-blur-xl sm:p-4"
          initial={{ opacity: 0, y: 30, rotateX: 5 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-rose-400" />
              <span className="size-2.5 rounded-full bg-amber-300" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
            </div>
            <Badge variant="outline" className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              <GitMerge className="size-3.5" />
              merge-preview.ts
            </Badge>
          </div>

          <div className="grid gap-3 pt-4 xl:grid-cols-2">
            <DiffPanel title="Old code" tone="old" lines={oldCodeLines} />
            <DiffPanel title="New code" tone="new" lines={newCodeLines} />
          </div>

          <motion.div
            className="right-6 top-36 mt-4 rounded-[8px] border border-cyan-300/20 bg-cyan-950/80 p-4 shadow-[0_0_60px_rgba(34,211,238,0.18)] xl:absolute xl:mt-0 xl:w-64"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.55, delay: 0.35 }}
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-100">
              <MessageSquareText className="size-4" />
              Inline review
            </div>
            <p className="text-sm leading-6 text-cyan-100/70">
              Approval required before squash. Preview includes owner context and
              affected tests.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function DiffPanel({
  title,
  tone,
  lines,
}: {
  title: string;
  tone: "old" | "new";
  lines: typeof oldCodeLines;
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-white/10 bg-black/30">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-medium text-white">{title}</span>
        <span
          className={
            tone === "new"
              ? "font-mono text-xs text-emerald-300"
              : "font-mono text-xs text-rose-300"
          }
        >
          {tone === "new" ? "+3 additions" : "-2 removed"}
        </span>
      </div>
      <div className="py-3 font-mono text-[12px]">
        {lines.map((line, index) => (
          <motion.div
            key={`${title}-${line.no}-${line.code}`}
            className={`grid grid-cols-[34px_22px_1fr] gap-2 px-3 leading-8 ${lineStyles[line.kind]}`}
            initial={{ opacity: 0, x: tone === "new" ? 12 : -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
          >
            <span className="text-right text-zinc-600">{line.no}</span>
            <span className={tone === "new" ? "text-emerald-300" : "text-rose-300"}>
              {line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {highlightCode(line.code)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function highlightCode(code: string) {
  const parts = code.split(/(\bexport\b|\basync\b|\bfunction\b|\bconst\b|\bawait\b|\breturn\b|".*?")/g);

  return parts.map((part, index) => {
    if (/^".*"$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="text-amber-200">
          {part}
        </span>
      );
    }

    if (/^(export|async|function|const|await|return)$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="text-violet-300">
          {part}
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}
