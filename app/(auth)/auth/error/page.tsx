import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AUTH_ERROR_MESSAGES: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  AccessDenied: {
    title: "Access denied",
    description:
      "The provider denied access or the account does not have permission to continue.",
  },
  CallbackRouteError: {
    title: "Authentication callback failed",
    description:
      "The sign-in flow could not be completed. Try again and confirm your provider configuration.",
  },
  Configuration: {
    title: "Authentication is not configured correctly",
    description:
      "One or more authentication settings are missing or invalid for this environment.",
  },
  OAuthAccountNotLinked: {
    title: "Account already linked differently",
    description:
      "That email address is already connected to another sign-in method.",
  },
  Verification: {
    title: "Verification failed",
    description:
      "The verification request was not accepted. Try signing in again from the start.",
  },
  Default: {
    title: "Unable to sign in",
    description:
      "Something went wrong during authentication. Please try again.",
  },
};

type AuthErrorPageProps = {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
  }>;
};

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const params = await searchParams;
  const errorCode = params.error ?? "Default";
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : "/dashboard";
  const message =
    AUTH_ERROR_MESSAGES[errorCode] ?? AUTH_ERROR_MESSAGES.Default;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">{message.title}</CardTitle>
            <CardDescription className="text-sm leading-6">
              {message.description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Error code: <span className="font-medium text-foreground">{errorCode}</span></p>
          <p>
            If this keeps happening, re-check your OAuth callback URLs, auth
            secrets, and environment configuration.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Try sign in again
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/home#home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
