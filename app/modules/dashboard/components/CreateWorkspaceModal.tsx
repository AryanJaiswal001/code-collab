"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight, LayoutGrid, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { createWorkspace } from "../actions";
import type { Project, TemplateKind } from "../types";
import { AccessSharingStep } from "./workspace-wizard/AccessSharingStep";
import { ProjectBasicsStep } from "./workspace-wizard/ProjectBasicsStep";
import { ProjectSetupStep } from "./workspace-wizard/ProjectSetupStep";
import {
  TOTAL_WORKSPACE_STEPS,
  initialWorkspaceDraft,
  type WorkspaceDraft,
} from "./workspace-wizard/types";
import { WorkspaceModeStep } from "./workspace-wizard/WorkspaceModeStep";
import { WorkspaceRulesStep } from "./workspace-wizard/WorkspaceRulesStep";

const WORKSPACE_WIZARD_STORAGE_KEY = "code-collab:create-workspace";

type CreateWorkspaceModalProps = {
  onCreateProject?: (project: Project) => Promise<void>;
};

type PersistedWorkspaceWizard = {
  currentStep: number;
  draft: WorkspaceDraft;
};

function getStepLabel(step: number) {
  switch (step) {
    case 1:
      return "Project basics";
    case 2:
      return "Workspace mode";
    case 3:
      return "Project setup";
    case 4:
      return "Workspace rules";
    case 5:
      return "Access & sharing";
    default:
      return "Create workspace";
  }
}

function generateWorkspaceId(draft: WorkspaceDraft) {
  const sourceName =
    draft.projectName.trim() ||
    draft.selectedRepository?.name ||
    (draft.workspaceMode === "COLLABORATION"
      ? "team-workspace"
      : "personal-workspace");

  const slug = sourceName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "workspace"}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildShareableLink(workspaceId: string) {
  if (typeof window === "undefined") {
    return `/workspace/${workspaceId}`;
  }

  return new URL(
    `/workspace/${workspaceId}`,
    window.location.origin,
  ).toString();
}

function buildWorkspaceObject(draft: WorkspaceDraft): {
  id: string;
  name: string;
  description: string;
  mode: NonNullable<WorkspaceDraft["workspaceMode"]>;
  setupType: NonNullable<WorkspaceDraft["projectSetupMode"]>;
  rules: NonNullable<WorkspaceDraft["workspaceRules"]>;
  collaborators: string[];
} {
  const name =
    draft.projectName.trim() ||
    draft.selectedRepository?.name ||
    (draft.workspaceMode === "COLLABORATION"
      ? "Collaboration workspace"
      : "Personal workspace");

  const descriptionParts = [
    draft.projectSetupMode === "GITHUB"
      ? `Imported from ${draft.selectedRepository?.full_name ?? "GitHub"}`
      : "Started from a template",
    draft.workspaceRules === "STRICT"
      ? "Strict permission model"
      : "Lenient collaboration model",
  ];

  const description =
    draft.projectDescription.trim() || descriptionParts.join(" | ");

  return {
    id: draft.workspaceId ?? generateWorkspaceId(draft),
    name,
    description,
    mode: draft.workspaceMode ?? "PERSONAL",
    setupType: draft.projectSetupMode ?? "TEMPLATE",
    rules: draft.workspaceRules ?? "STRICT",
    collaborators: draft.inviteEmails,
  };
}

function buildWorkspacePayload(draft: WorkspaceDraft): {
  id: string;
  name: string;
  description: string;
  mode: NonNullable<WorkspaceDraft["workspaceMode"]>;
  setupType: NonNullable<WorkspaceDraft["projectSetupMode"]>;
  rules: NonNullable<WorkspaceDraft["workspaceRules"]>;
  template: TemplateKind;
  repositoryFullName?: string;
  collaborators: string[];
} {
  const workspace = buildWorkspaceObject(draft);

  return {
    ...workspace,
    template:
      draft.projectSetupMode === "GITHUB"
        ? "GITHUB"
        : (draft.selectedTemplate ?? "NEXTJS"),
    repositoryFullName: draft.selectedRepository?.full_name,
  };
}

export default function CreateWorkspaceModal({
  onCreateProject,
}: CreateWorkspaceModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draft, setDraft] = useState<WorkspaceDraft>(initialWorkspaceDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  const progressValue = useMemo(
    () => (currentStep / TOTAL_WORKSPACE_STEPS) * 100,
    [currentStep],
  );

  useEffect(() => {
    const safePathname = pathname ?? "/dashboard";
    const shouldRestore = searchParams?.get("createWorkspace") === "1";
    const githubConnected = searchParams?.get("github") === "connected";

    if (!shouldRestore && !githubConnected) {
      return;
    }

    const storedDraft = window.sessionStorage.getItem(
      WORKSPACE_WIZARD_STORAGE_KEY,
    );

    if (storedDraft) {
      try {
        const parsed = JSON.parse(storedDraft) as PersistedWorkspaceWizard;
        const nextDraft: WorkspaceDraft = {
          ...initialWorkspaceDraft,
          ...parsed.draft,
          githubConnected: githubConnected || parsed.draft.githubConnected,
        };

        setDraft(nextDraft);
        setCurrentStep(githubConnected ? 3 : parsed.currentStep || 1);
        setOpen(true);
      } catch {
        window.sessionStorage.removeItem(WORKSPACE_WIZARD_STORAGE_KEY);
      }
    }

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("createWorkspace");
    params.delete("github");

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${safePathname}?${nextQuery}` : safePathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const resetWizard = () => {
    setCurrentStep(1);
    setDraft(initialWorkspaceDraft);
    setIsSubmitting(false);
    setIsSendingInvites(false);
    window.sessionStorage.removeItem(WORKSPACE_WIZARD_STORAGE_KEY);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetWizard();
    }
  };

  const persistWizardState = (nextDraft: WorkspaceDraft, nextStep: number) => {
    const payload: PersistedWorkspaceWizard = {
      currentStep: nextStep,
      draft: nextDraft,
    };

    window.sessionStorage.setItem(
      WORKSPACE_WIZARD_STORAGE_KEY,
      JSON.stringify(payload),
    );
  };

  const handleConnectGitHub = async () => {
    const nextDraft = {
      ...draft,
      projectSetupMode: "GITHUB" as const,
    };

    persistWizardState(nextDraft, 3);
    await signIn("github", {
      callbackUrl: `${pathname}?createWorkspace=1&github=connected`,
    });
  };

  const goToNextStep = () => {
    if (currentStep === 1 && !draft.projectName.trim()) {
      toast.error("Project name is required to continue.");
      return;
    }

    if (currentStep === 2 && !draft.workspaceMode) {
      toast.error("Choose a workspace mode to continue.");
      return;
    }

    if (currentStep === 3) {
      if (!draft.projectSetupMode) {
        toast.error("Choose how you want to set up the workspace.");
        return;
      }

      if (draft.projectSetupMode === "TEMPLATE" && !draft.selectedTemplate) {
        toast.error("Choose a template to continue.");
        return;
      }

      if (draft.projectSetupMode === "GITHUB" && !draft.githubConnected) {
        toast.error("Connect GitHub before importing a repository.");
        return;
      }

      if (draft.projectSetupMode === "GITHUB" && !draft.selectedRepository) {
        toast.error("Select a repository to continue.");
        return;
      }
    }

    if (currentStep === 4) {
      if (!draft.workspaceRules) {
        toast.error("Choose a rule mode to continue.");
        return;
      }

      const workspaceId = generateWorkspaceId(draft);
      const shareableLink = buildShareableLink(workspaceId);

      setDraft((prev) => ({
        ...prev,
        workspaceId,
        shareableLink,
      }));
      setCurrentStep(5);
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_WORKSPACE_STEPS));
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAddInvite = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Enter an email address first.");
      return false;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!isValidEmail) {
      toast.error("Enter a valid email address.");
      return false;
    }

    if (draft.inviteEmails.includes(normalizedEmail)) {
      toast.error("That email is already added.");
      return false;
    }

    setDraft((prev) => ({
      ...prev,
      inviteEmails: [...prev.inviteEmails, normalizedEmail],
    }));
    return true;
  };

  const handleRemoveInvite = (email: string) => {
    setDraft((prev) => ({
      ...prev,
      inviteEmails: prev.inviteEmails.filter((invite) => invite !== email),
    }));
  };

  const handleCopyLink = async () => {
    if (!draft.shareableLink) {
      toast.error("Generate the workspace link first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(draft.shareableLink);
      toast.success("Workspace link copied.");
    } catch {
      toast.error("Unable to copy the link right now.");
    }
  };

  const handleSendInvites = async () => {
    if (draft.inviteEmails.length === 0) {
      toast.error("Add at least one collaborator email.");
      return;
    }

    setIsSendingInvites(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success(
        `Invite list is ready. Emails will be created when the workspace is opened.`,
      );
    } finally {
      setIsSendingInvites(false);
    }
  };

  const handleCreateWorkspace = async () => {
    const workspaceObject = buildWorkspaceObject(draft);

    if (!workspaceObject.id) {
      toast.error("Workspace details are not ready yet.");
      return;
    }

    setIsSubmitting(true);

    try {
      const createdWorkspace = await createWorkspace(
        buildWorkspacePayload(draft),
      );

      if (createdWorkspace && onCreateProject) {
        await onCreateProject(createdWorkspace);
      }

      toast.success("Workspace created successfully.");
      handleOpenChange(false);
      router.push(`/editor/${workspaceObject.id}`);
    } catch {
      toast.error("Failed to create workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNextDisabled = useMemo(() => {
    if (currentStep === 1) {
      return !draft.projectName.trim();
    }

    return false;
  }, [currentStep, draft.projectName]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProjectBasicsStep
            projectName={draft.projectName}
            projectDescription={draft.projectDescription}
            onProjectNameChange={(projectName) =>
              setDraft((prev) => ({
                ...prev,
                projectName,
                workspaceId: null,
                shareableLink: "",
              }))
            }
            onProjectDescriptionChange={(projectDescription) =>
              setDraft((prev) => ({
                ...prev,
                projectDescription,
                workspaceId: null,
                shareableLink: "",
              }))
            }
          />
        );
      case 2:
        return (
          <WorkspaceModeStep
            value={draft.workspaceMode}
            onChange={(workspaceMode) =>
              setDraft((prev) => ({
                ...prev,
                workspaceMode,
                workspaceId: null,
                shareableLink: "",
              }))
            }
          />
        );
      case 3:
        return (
          <ProjectSetupStep
            value={draft.projectSetupMode}
            githubConnected={draft.githubConnected}
            selectedRepository={draft.selectedRepository}
            selectedTemplate={draft.selectedTemplate}
            onChange={(projectSetupMode) =>
              setDraft((prev) => ({
                ...prev,
                projectSetupMode,
                githubConnected: prev.githubConnected,
                selectedTemplate:
                  projectSetupMode === "TEMPLATE"
                    ? prev.selectedTemplate
                    : null,
                selectedRepository:
                  projectSetupMode === "GITHUB"
                    ? prev.selectedRepository
                    : null,
                workspaceId: null,
                shareableLink: "",
              }))
            }
            onConnectGitHub={() => void handleConnectGitHub()}
            onSelectTemplate={(selectedTemplate) =>
              setDraft((prev) => ({
                ...prev,
                selectedTemplate,
                workspaceId: null,
                shareableLink: "",
              }))
            }
            onSelectRepository={(selectedRepository) =>
              setDraft((prev) => ({
                ...prev,
                projectName: prev.projectName.trim() || selectedRepository.name,
                selectedRepository,
                githubConnected: true,
                workspaceId: null,
                shareableLink: "",
              }))
            }
          />
        );
      case 4:
        return (
          <WorkspaceRulesStep
            value={draft.workspaceRules}
            onChange={(workspaceRules) =>
              setDraft((prev) => ({
                ...prev,
                workspaceRules,
                workspaceId: null,
                shareableLink: "",
              }))
            }
          />
        );
      case 5:
        return (
          <AccessSharingStep
            draft={draft}
            onAddInvite={handleAddInvite}
            onRemoveInvite={handleRemoveInvite}
            onCopyLink={handleCopyLink}
            onSendInvites={handleSendInvites}
            isSendingInvites={isSendingInvites}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-2xl px-5">
          <Rocket className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] sm:max-w-4xl">
        <DialogHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Step {currentStep}/{TOTAL_WORKSPACE_STEPS}
              </Badge>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <LayoutGrid className="h-5 w-5 text-primary" />
                {getStepLabel(currentStep)}
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm leading-6">
                Build a workspace with the right setup, collaboration rules, and
                access flow before anyone joins.
              </DialogDescription>
            </div>
            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progressValue)}%</span>
              </div>
              <Progress value={progressValue} className="h-2.5" />
            </div>
          </div>
        </DialogHeader>

        <div
          key={currentStep}
          className="animate-in fade-in-0 slide-in-from-right-2 duration-300"
        >
          {renderStep()}
        </div>

        <DialogFooter className="border-t border-border/70 pt-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={
                currentStep === 1
                  ? () => handleOpenChange(false)
                  : goToPreviousStep
              }
              className="rounded-2xl px-5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentStep === 1 ? "Cancel" : "Back"}
            </Button>

            {currentStep < TOTAL_WORKSPACE_STEPS ? (
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={isNextDisabled}
                className="rounded-2xl px-5"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void handleCreateWorkspace()}
                disabled={isSubmitting || isSendingInvites}
                className="rounded-2xl px-5"
              >
                {isSubmitting ? "Creating..." : "Open Workspace"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
