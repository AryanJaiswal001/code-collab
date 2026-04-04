import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Code Collab",
  description: "Terms of service for Code Collab.",
};

function TermsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12 sm:px-8">
      <div className="space-y-3 border-b border-border/70 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Code Collab
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          These terms describe the baseline expectations for using Code Collab
          as a shared coding and collaboration workspace.
        </p>
      </div>

      <div className="space-y-8 py-8">
        <TermsSection title="Use of the service">
          <p>
            Code Collab is intended for software development, learning,
            collaboration, and workspace coordination. You agree to use it only
            for lawful and authorized purposes.
          </p>
        </TermsSection>

        <TermsSection title="Accounts and access">
          <p>
            Access depends on valid authentication through the configured OAuth
            providers. You are responsible for maintaining control of the
            account used to access your workspaces.
          </p>
          <p>
            Workspace owners and administrators are responsible for how they
            invite collaborators and assign permissions inside shared workspaces.
          </p>
        </TermsSection>

        <TermsSection title="Workspace content">
          <p>
            Users are responsible for the code, files, messages, and repository
            data they place into Code Collab. Do not upload content you do not
            have permission to use or share.
          </p>
        </TermsSection>

        <TermsSection title="Collaboration features">
          <p>
            Realtime collaboration, presence, voice, invites, preview, terminal,
            and repository import features are provided on a best-effort basis.
            Availability may depend on external services and deployment setup.
          </p>
        </TermsSection>

        <TermsSection title="Project operators">
          <p>
            If you deploy this project for internal or public use, you are
            responsible for your production configuration, legal review,
            acceptable use rules, and data handling practices.
          </p>
        </TermsSection>

        <TermsSection title="No warranty">
          <p>
            This project is provided as-is. You should test your deployment,
            secure your secrets, back up important data, and review changes
            before using it in production environments.
          </p>
        </TermsSection>
      </div>

      <div className="border-t border-border/70 pt-6 text-sm text-muted-foreground">
        <Link href="/auth/sign-in" className="underline underline-offset-4 hover:text-foreground">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
