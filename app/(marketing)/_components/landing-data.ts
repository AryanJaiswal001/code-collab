import type { LucideIcon } from "lucide-react";
import {
  Atom,
  Bot,
  Braces,
  Boxes,
  Code2,
  Container,
  Database,
  GitBranch,
  GitFork,
  GitPullRequestArrow,
  LayoutTemplate,
  MessagesSquare,
  Network,
  Rocket,
  Sparkles,
  Triangle,
  UsersRound,
  Workflow,
  Zap,
} from "lucide-react";

export const landingLinks = {
  start: "/auth/sign-in",
  github: "https://github.com/your-org/code-collab",
};

export const navItems = [
  { label: "Collaboration", href: "#collaboration" },
  { label: "Review", href: "#review" },
  { label: "Templates", href: "#templates" },
  { label: "Stack", href: "#stack" },
];

export const trustedBy = [
  "Open source teams",
  "Hackathon squads",
  "Campus clubs",
  "AI product labs",
  "Remote dev teams",
];

export const floatingBadges = [
  { label: "Live cursors", x: "6%", y: "18%", delay: 0 },
  { label: "WebContainers boot", x: "72%", y: "12%", delay: 0.2 },
  { label: "Voice sync", x: "3%", y: "68%", delay: 0.4 },
  { label: "Monaco powered", x: "67%", y: "74%", delay: 0.6 },
];

export const collaborators = [
  { name: "Ava", color: "bg-cyan-400", role: "Frontend" },
  { name: "Milo", color: "bg-violet-400", role: "Backend" },
  { name: "Noor", color: "bg-emerald-400", role: "Review" },
];

export type FeatureCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  metric: string;
};

export const collaborationCards: FeatureCard[] = [
  {
    title: "WebContainers Enabled",
    description:
      "Instantly boot Node.js environments directly in the browser—no local setup.",
    icon: Rocket,
    metric: "0s local setup",
  },
  {
    title: "In-Browser IDE",
    description:
      "A powerful code editor built with Monaco, syntax highlighting, and an interactive file tree.",
    icon: Code2,
    metric: "100% familiar",
  },
  {
    title: "Voice & Presence",
    description:
      "Integrated voice session controls and member presence tracking powered by Socket.IO.",
    icon: Network,
    metric: "Live sync",
  },
  {
    title: "Live pair programming",
    description:
      "Synchronized file editing, jump to teammates' cursors, and build together.",
    icon: UsersRound,
    metric: "24ms sync",
  },
  {
    title: "30+ Framework Starters",
    description:
      "Launch Next.js, React, Vue, SvelteKit, Astro, and more with pre-configured templates.",
    icon: Zap,
    metric: "Instant boot",
  },
];

export const templateCards = [
  {
    name: "Next.js template",
    description:
      "App Router, auth, workspace shell, and deploy previews ready to remix.",
    icon: Code2,
    accent: "from-cyan-400 to-blue-500",
    tags: ["Next 16", "RSC", "Tailwind"],
  },
  {
    name: "AI SaaS starter",
    description:
      "Billing hooks, AI routes, usage telemetry, and model playground patterns.",
    icon: Sparkles,
    accent: "from-violet-400 to-fuchsia-500",
    tags: ["AI SDK", "Stripe", "Queues"],
  },
  {
    name: "Hackathon boilerplate",
    description:
      "Fast team onboarding, realtime rooms, project boards, and judging demos.",
    icon: Rocket,
    accent: "from-amber-300 to-rose-500",
    tags: ["Realtime", "Demo", "Teams"],
  },
  {
    name: "Portfolio starter",
    description:
      "Polished showcase sections with MDX stories and animated code reveals.",
    icon: LayoutTemplate,
    accent: "from-emerald-300 to-teal-500",
    tags: ["MDX", "Motion", "SEO"],
  },
  {
    name: "Backend API starter",
    description:
      "Typed routes, Prisma models, workers, and deploy-grade observability.",
    icon: Workflow,
    accent: "from-sky-300 to-indigo-500",
    tags: ["Prisma", "Jobs", "OpenAPI"],
  },
  {
    name: "Github repo template",
    description:
      "A template to kickstart your next open source library with CI and docs.",
    icon: GitFork,
    accent: "from-zinc-400 to-gray-600",
    tags: ["Library", "CI", "Docs"],
  }
];

export type TechIcon = {
  name: string;
  icon: LucideIcon;
  color: string;
};

export const techIcons: TechIcon[] = [
  { name: "React", icon: Atom, color: "text-cyan-300" },
  { name: "Next.js", icon: Triangle, color: "text-zinc-100" },
  { name: "TypeScript", icon: Braces, color: "text-blue-300" },
  { name: "Docker", icon: Container, color: "text-sky-300" },
  { name: "Prisma", icon: Database, color: "text-emerald-300" },
  { name: "Node.js", icon: Boxes, color: "text-lime-300" },
  { name: "MongoDB", icon: Database, color: "text-green-300" },
  { name: "GitHub", icon: GitFork, color: "text-white" },
  { name: "OpenAI", icon: Bot, color: "text-violet-300" },
];

export const oldCodeLines = [
  {
    no: 12,
    code: "export async function merge(projectId: string) {",
    kind: "muted",
  },
  {
    no: 13,
    code: "  const branch = await getBranch(projectId)",
    kind: "neutral",
  },
  { no: 14, code: "  await applyPatch(branch.head)", kind: "removed" },
  { no: 15, code: "  return createMergeCommit(branch)", kind: "removed" },
  { no: 16, code: "}", kind: "muted" },
];

export const newCodeLines = [
  {
    no: 12,
    code: "export async function merge(projectId: string) {",
    kind: "muted",
  },
  {
    no: 13,
    code: "  const branch = await getBranch(projectId)",
    kind: "neutral",
  },
  {
    no: 14,
    code: "  const preview = await createMergePreview(branch)",
    kind: "added",
  },
  { no: 15, code: "  await requireApproval(preview.reviewers)", kind: "added" },
  { no: 16, code: "  return squashAndMerge(preview)", kind: "added" },
  { no: 17, code: "}", kind: "muted" },
];

export const reviewStates = [
  { label: "AI reviewer", value: "3 suggestions", icon: Bot },
  { label: "Maintainers", value: "2 approved", icon: GitPullRequestArrow },
  { label: "Branch status", value: "Ready to merge", icon: GitBranch },
  { label: "Conversation", value: "Resolved", icon: MessagesSquare },
];

export const terminalLines = [
  "$ npm run test:preview",
  "PASS src/merge-preview.spec.ts",
  "PASS src/realtime-sync.spec.ts",
  "merge preview generated in 1.8s",
];
