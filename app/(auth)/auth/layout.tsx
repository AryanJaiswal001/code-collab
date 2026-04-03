import Image from "next/image";
import signinImage from "./signin.svg";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen w-full grid lg:grid-cols-2 relative">
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
        <ThemeToggle />
      </div>

      {/* Left side - Illustration */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-10 lg:p-20 transition-colors duration-300">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center">
          <div className="mb-10 space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-900 dark:text-zinc-100 transition-colors">
              Glad to have you back!
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md mx-auto transition-colors">
              Sign in to manage your workspace, seamlessly collaborate with your
              team, and build great software.
            </p>
          </div>

          <div className="bg-white/50 dark:bg-white/5 p-8 rounded-3xl shadow-sm backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
            <Image
              src={signinImage}
              alt="Sign In Illustration"
              width={889}
              height={459}
              className="w-full h-auto object-contain drop-shadow-md"
              priority
            />
          </div>
        </div>
      </div>

      {/* Right side - Form/Children */}
      <div className="flex flex-col relative bg-white dark:bg-zinc-900 transition-colors duration-300 items-center justify-center p-6 sm:p-12 lg:p-20 w-full h-full">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
