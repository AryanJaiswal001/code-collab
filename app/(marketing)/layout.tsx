import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Code2, GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import { landingLinks, navItems } from "./_components/landing-data";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark min-h-screen bg-[#03050b] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#03050b]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
              <Code2 className="size-4" />
            </span>
            <span className="font-semibold tracking-tight text-white">Code Collab</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-400 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden rounded-full text-zinc-300 hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <Link href={landingLinks.github} target="_blank" rel="noreferrer">
                <GitFork className="size-4" />
                GitHub
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-white text-black hover:bg-cyan-100"
            >
              <Link href={landingLinks.start}>
                Start
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
