import Image from "next/image";
import signinImage from "./signin.svg";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen w-full grid lg:grid-cols-2">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-muted/20 p-10 lg:p-20">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center">
          <div className="mb-10 space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Glad to have you back!
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Sign in to manage your workspace, seamlessly collaborate with your
              team, and build great software.
            </p>
          </div>

          <Image
            src={signinImage}
            alt="Sign In Illustration"
            width={889}
            height={459}
            className="w-full h-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* Right side - Form/Children */}
      <div className="flex flex-col relative bg-background items-center justify-center p-6 sm:p-12 lg:p-20 w-full h-full">
        {children}
      </div>
    </main>
  );
}
