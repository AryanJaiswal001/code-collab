import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Code Collab",
  description: "Privacy policy for Code Collab.",
};

function PolicySection({
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

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12 sm:px-8">
      <div className="space-y-3 border-b border-border/70 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Code Collab
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          This page explains what data Code Collab uses to provide authentication,
          collaboration, workspace access, and invite workflows.
        </p>
      </div>

      <div className="space-y-8 py-8">
        <PolicySection title="Information we use">
          <p>
            Code Collab stores account information returned by the configured
            OAuth providers, such as name, email address, and profile image.
          </p>
          <p>
            The application also stores workspace data such as workspace names,
            repository selections, file content, collaboration activity, chat
            messages, member roles, and invite records.
          </p>
        </PolicySection>

        <PolicySection title="Why we use that information">
          <p>
            This information is used only to authenticate users, protect private
            workspaces, power realtime collaboration, and make shared coding
            features work as expected.
          </p>
          <p>
            Invite email addresses are used only for workspace access flows.
            When SMTP is configured, Code Collab can send invitation emails on
            behalf of the workspace owner or manager.
          </p>
        </PolicySection>

        <PolicySection title="Third-party services">
          <p>
            Depending on your deployment, Code Collab may communicate with
            GitHub, Google, MongoDB, Render, Vercel, and your SMTP provider.
            Those services may process data according to their own privacy
            policies.
          </p>
        </PolicySection>

        <PolicySection title="Data retention">
          <p>
            Workspace data remains in the project database until it is deleted
            by the application or by an authorized project operator. Invite
            records may remain for audit and access tracking purposes unless
            removed with the related workspace.
          </p>
        </PolicySection>

        <PolicySection title="Security">
          <p>
            Code Collab uses authenticated sessions, role-based workspace access,
            signed realtime tokens, and invite token hashing. Even so, operators
            should use strong secrets, secure database credentials, and HTTPS in
            production.
          </p>
        </PolicySection>

        <PolicySection title="Contact and updates">
          <p>
            If you are distributing this project, you should replace this page
            with your organization&apos;s final legal language and contact details.
          </p>
        </PolicySection>
      </div>

      <div className="border-t border-border/70 pt-6 text-sm text-muted-foreground">
        <Link href="/auth/sign-in" className="underline underline-offset-4 hover:text-foreground">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
