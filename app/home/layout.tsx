import type { ReactNode } from "react";
import Link from "next/link";
import { Code2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 w-full items-center justify-between px-4 md:px-8">
          <Link href="/home#home" className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Code Collab</span>
          </Link>
          <nav className="flex items-center">
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative">
        {/* Abstract background gradient details */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 -z-10 pointer-events-none"></div>
        {children}
      </main>
    </div>
  );
}
