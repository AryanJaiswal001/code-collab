"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  FolderGit2,
  Link2,
  MailPlus,
  Shield,
  Trash2,
  Users2,
} from "lucide-react";
import type { WorkspaceDraft } from "./types";

type AccessSharingStepProps = {
  draft: WorkspaceDraft;
  onAddInvite: (email: string) => boolean;
  onRemoveInvite: (email: string) => void;
  onCopyLink: () => Promise<void>;
  onSendInvites: () => Promise<void>;
  isSendingInvites: boolean;
};

export function AccessSharingStep({
  draft,
  onAddInvite,
  onRemoveInvite,
  onCopyLink,
  onSendInvites,
  isSendingInvites,
}: AccessSharingStepProps) {
  const [emailInput, setEmailInput] = useState("");

  const handleAddInvite = () => {
    const didAdd = onAddInvite(emailInput);

    if (didAdd) {
      setEmailInput("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-card/70 p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Link2 className="h-4 w-4" />
              Shareable workspace link
            </div>
            <h3 className="text-base font-semibold text-foreground">
              /workspace/{draft.workspaceId}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Share this link with collaborators. Visiting it will require
              authentication before access is granted.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Input
              readOnly
              value={draft.shareableLink}
              className="h-11 rounded-2xl bg-background"
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl px-5"
              onClick={() => void onCopyLink()}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </Button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-muted/20 p-5">
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Workspace summary</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                <Users2 className="mr-1 h-3 w-3" />
                {draft.workspaceMode === "PERSONAL"
                  ? "Personal"
                  : "Collaboration"}
              </Badge>
              <Badge variant="outline">
                {draft.projectSetupMode === "GITHUB" ? (
                  <FolderGit2 className="mr-1 h-3 w-3" />
                ) : (
                  <Link2 className="mr-1 h-3 w-3" />
                )}
                {draft.projectSetupMode === "GITHUB"
                  ? "GitHub import"
                  : "Template"}
              </Badge>
              <Badge variant="outline">
                <Shield className="mr-1 h-3 w-3" />
                {draft.workspaceRules === "STRICT" ? "Strict" : "Lenient"}
              </Badge>
            </div>
            {draft.selectedRepository ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Repository:{" "}
                <span className="font-medium text-foreground">
                  {draft.selectedRepository.full_name}
                </span>
              </p>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Workspace source: starter template
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4 rounded-[1.75rem] border border-border/80 bg-card/70 p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <MailPlus className="h-4 w-4" />
            Collaborator invites
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Add one or more email addresses now. The workspace will create the
            invite links on launch, and managers can send more from the
            collaboration panel later.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddInvite();
              }
            }}
            placeholder="teammate@company.com"
            className="h-11 rounded-2xl bg-background"
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-2xl px-5"
            onClick={handleAddInvite}
          >
            Add collaborator
          </Button>
        </div>

        {draft.inviteEmails.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {draft.inviteEmails.map((email) => (
              <Badge
                key={email}
                variant="secondary"
                className="h-auto rounded-full px-3 py-2"
              >
                {email}
                <button
                  type="button"
                  onClick={() => onRemoveInvite(email)}
                  className="ml-2 inline-flex"
                  aria-label={`Remove ${email}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No invitees added yet.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          className="rounded-2xl px-5"
          disabled={isSendingInvites}
          onClick={() => void onSendInvites()}
        >
          {isSendingInvites ? "Preparing..." : "Review Invite List"}
        </Button>
      </div>
    </div>
  );
}
