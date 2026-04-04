"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Access was denied. Please try again.",
  CallbackRouteError: "The sign-in callback failed. Please try again.",
  Configuration: "Authentication is not configured correctly yet.",
  Default: "Sign-in failed. Please try again.",
  OAuthAccountNotLinked:
    "That email is already linked to another sign-in method.",
};

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCallbackUrl = searchParams.get("callbackUrl");
  const errorCode = searchParams.get("error");
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="w-fit px-0">
          <Link href="/home#home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </Button>
        <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
        <CardDescription className="text-center">
          Choose your preferred sign-in method
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl })}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          <span>Sign in with Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("github", { callbackUrl })}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          <span>Sign in with GitHub</span>
        </Button>
      </CardContent>

      <CardFooter>
        <p className="w-full text-center text-sm text-gray-500 dark:text-gray-400">
          By signing in, you agree to our{" "}
          <a href="#" className="underline hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-primary">
            Privacy Policy
          </a>
          .
        </p>
      </CardFooter>
    </Card>
  );
}
