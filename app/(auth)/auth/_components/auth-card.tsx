"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  GitFork,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Access was denied. Please try again.",
  CallbackRouteError: "The sign-in callback failed. Please try again.",
  Configuration: "Authentication is not configured correctly yet.",
  Default: "Sign-in failed. Please try again.",
  OAuthAccountNotLinked:
    "That email is already linked to another sign-in method.",
};

const benefits = [
  { label: "Spin up collaborative workspaces instantly", icon: Boxes },
  { label: "Code together with realtime presence", icon: Radio },
  { label: "Import repositories from GitHub", icon: GitFork },
];

function SignInCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingProvider, setPendingProvider] = useState<"github" | "google" | null>(null);
  const requestedCallbackUrl = searchParams?.get("callbackUrl") ?? null;
  const errorCode = searchParams?.get("error") ?? null;
  const callbackUrl =
    requestedCallbackUrl && requestedCallbackUrl.startsWith("/")
      ? requestedCallbackUrl
      : "/dashboard";
  const errorMessage = errorCode
    ? AUTH_ERROR_MESSAGES[errorCode] ?? AUTH_ERROR_MESSAGES.Default
    : null;

  useEffect(() => {
    let cancelled = false;

    async function redirectAuthenticatedUser() {
      const session = await getSession();

      if (!cancelled && session?.user) {
        router.replace(callbackUrl);
        router.refresh();
      }
    }

    void redirectAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, [callbackUrl, router]);

  const handleSignIn = (provider: "github" | "google") => {
    setPendingProvider(provider);
    void signIn(provider, { callbackUrl });
  };

  return (
    <div className="w-full max-w-[430px]">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-8 w-fit rounded-full px-0 text-zinc-400 transition hover:bg-transparent hover:text-white"
      >
        <Link href="/">
          <ArrowLeft className="mr-2 size-4" />
          Back to home
        </Link>
      </Button>

      <div className="relative overflow-hidden rounded-[18px] border border-white/12 bg-white/[0.055] p-1 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div
          aria-hidden="true"
          className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent"
        />
        <div className="rounded-[14px] border border-white/[0.06] bg-[#080b13]/88 p-6 sm:p-7">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                <Sparkles className="size-3.5 text-cyan-300" />
                Code Collab access
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Sign in to your workspace.
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Continue into the collaborative IDE where repositories,
                teammates, terminals, and previews stay in sync.
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-5 rounded-[10px] border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-sm leading-6 text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-3">
            <OAuthButton
              provider="github"
              label="Continue with GitHub"
              description="Import repos and create shared workspaces"
              pending={pendingProvider === "github"}
              disabled={pendingProvider !== null}
              onClick={() => handleSignIn("github")}
              icon={<GitHubMark />}
            />
            <OAuthButton
              provider="google"
              label="Continue with Google"
              description="Use your team identity to enter Code Collab"
              pending={pendingProvider === "google"}
              disabled={pendingProvider !== null}
              onClick={() => handleSignIn("google")}
              icon={<GoogleMark />}
            />
          </div>

          <div className="my-7 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

          <div className="space-y-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div key={benefit.label} className="flex items-center gap-3 text-sm text-zinc-300">
                  <span className="grid size-8 place-items-center rounded-[8px] border border-white/10 bg-white/[0.04]">
                    <Icon className="size-4 text-cyan-300" />
                  </span>
                  {benefit.label}
                </div>
              );
            })}
          </div>

          <div className="mt-7 rounded-[10px] border border-emerald-300/15 bg-emerald-300/[0.07] p-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              <p className="text-xs leading-5 text-emerald-50/75">
                OAuth access is used only to authenticate and connect workspace
                flows you choose, such as GitHub repository import.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-sm text-center text-xs leading-5 text-zinc-500">
        By signing in, you agree to our{" "}
        <Link href="/terms" className="text-zinc-300 underline-offset-4 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-zinc-300 underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-600">
        <ShieldCheck className="size-3.5 text-zinc-500" />
        Auth.js secured onboarding
      </div>
    </div>
  );
}

function OAuthButton({
  label,
  description,
  pending,
  disabled,
  onClick,
  icon,
}: {
  provider: "github" | "google";
  label: string;
  description: string;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-4 rounded-[12px] border border-white/10 bg-white/[0.045] px-4 py-3.5 text-left text-white shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/25 hover:bg-white/[0.075] hover:shadow-[0_18px_56px_rgba(34,211,238,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 disabled:pointer-events-none disabled:opacity-60"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-white/10 bg-black/24 text-zinc-100 transition group-hover:border-white/18 group-hover:bg-black/35">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{pending ? "Opening provider..." : label}</span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500">
            {description}
          </span>
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-200" />
    </button>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#EA4335"
        d="M12 10.2v4.1h5.8c-.3 1.4-1.7 4-5.8 4-3.5 0-6.3-2.9-6.3-6.3S8.5 5.7 12 5.7c2 0 3.3.8 4 1.6l2.7-2.6C17 3.1 14.7 2.1 12 2.1 6.5 2.1 2.1 6.5 2.1 12s4.4 9.9 9.9 9.9c5.7 0 9.5-4 9.5-9.7 0-.7-.1-1.2-.2-1.7H12z"
      />
      <path
        fill="#4285F4"
        d="M21.3 10.5H12v3.8h5.3c-.5 2.4-2.6 4-5.3 4v3.6c5.7 0 9.5-4 9.5-9.7 0-.7-.1-1.2-.2-1.7z"
      />
      <path
        fill="#34A853"
        d="M5.7 14.2 5.1 16l-1.5 1.1C5.4 20 8.5 21.9 12 21.9v-3.6c-2.7 0-5-1.7-5.9-4.1z"
      />
      <path
        fill="#FBBC05"
        d="M5.7 9.8C6.6 7.4 8.9 5.7 12 5.7V2.1C8.5 2.1 5.4 4 3.6 6.9L5.1 8l.6 1.8z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
      <path d="M12 2.2c-5.5 0-9.9 4.4-9.9 9.9 0 4.4 2.8 8.1 6.8 9.4.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 2.9.8.1-.7.4-1.1.7-1.4-2.2-.3-4.5-1.1-4.5-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1 .8-.2 1.5-.3 2.3-.3s1.6.1 2.3.3c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.5 4.9.4.3.7 1 .7 2v3c0 .3.2.6.7.5 4-1.3 6.8-5 6.8-9.4.1-5.5-4.4-10.3-9.8-10.3z" />
    </svg>
  );
}

export function AuthCardSkeleton() {
  return (
    <div className="w-full max-w-[430px] rounded-[18px] border border-white/12 bg-white/[0.055] p-7 backdrop-blur-2xl">
      <div className="h-8 w-36 rounded-full bg-white/10" />
      <div className="mt-7 h-9 w-64 rounded-lg bg-white/10" />
      <div className="mt-4 h-16 rounded-lg bg-white/10" />
      <div className="mt-8 space-y-3">
        <div className="h-16 rounded-[12px] bg-white/10" />
        <div className="h-16 rounded-[12px] bg-white/10" />
      </div>
    </div>
  );
}

export function AuthCard() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <SignInCardContent />
    </Suspense>
  );
}
