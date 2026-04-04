"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ChevronsUpDown,
  Code2,
  Database,
  FlameIcon,
  FolderKanban,
  Globe,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  Star,
  Terminal,
  UserCircle2,
  type LucideIcon,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PlaygroundData {
  id: string;
  name: string;
  icon: string;
  starred: boolean;
}

export interface DashboardSidebarUser {
  name: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
}

const lucideIconMap: Record<string, LucideIcon> = {
  Zap,
  LightBulb: Globe,
  Lightbulb: Globe,
  Database,
  Compass: FolderKanban,
  FlameIcon,
  Terminal,
  Code2,
  Code: Code2,
};

function getDisplayName(user: DashboardSidebarUser | null) {
  return user?.name?.trim() || user?.username || user?.email || "Not signed in";
}

function getDisplayHandle(user: DashboardSidebarUser | null) {
  if (user?.username) {
    return `@${user.username}`;
  }

  return user?.email || "Not signed in";
}

function getSupplementaryEmail(user: DashboardSidebarUser | null) {
  if (!user?.email || user.email === getDisplayHandle(user)) {
    return null;
  }

  return user.email;
}

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) {
    return "NA";
  }

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export function DashboardSidebar({
  initialPlaygroundData,
  currentUser,
}: {
  initialPlaygroundData: PlaygroundData[];
  currentUser: DashboardSidebarUser | null;
}) {
  const pathname = usePathname();
  const safePathname = pathname ?? "";
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData[]>(
    () => initialPlaygroundData,
  );
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName = getDisplayName(currentUser);
  const displayHandle = getDisplayHandle(currentUser);
  const supplementaryEmail = getSupplementaryEmail(currentUser);
  const avatarFallback = getInitials(displayName);

  useEffect(() => {
    const handleProjectCreated = (event: Event) => {
      const { detail } = event as CustomEvent<PlaygroundData>;
      if (!detail?.id) return;

      setPlaygroundData((prev) => {
        const exists = prev.some((project) => project.id === detail.id);
        if (exists) {
          return prev.map((project) =>
            project.id === detail.id ? { ...project, ...detail } : project,
          );
        }

        return [detail, ...prev];
      });
    };

    const handleProjectRenamed = (event: Event) => {
      const { detail } = event as CustomEvent<{ id: string; name: string }>;
      if (!detail?.id || !detail.name) return;

      setPlaygroundData((prev) =>
        prev.map((project) =>
          project.id === detail.id
            ? { ...project, name: detail.name }
            : project,
        ),
      );
    };

    const handleProjectStarToggled = (event: Event) => {
      const { detail } = event as CustomEvent<{ id: string; starred: boolean }>;
      if (!detail?.id) return;

      setPlaygroundData((prev) =>
        prev.map((project) =>
          project.id === detail.id
            ? { ...project, starred: detail.starred }
            : project,
        ),
      );
    };

    const handleProjectDeleted = (event: Event) => {
      const { detail } = event as CustomEvent<{ id: string }>;
      if (!detail?.id) return;

      setPlaygroundData((prev) =>
        prev.filter((project) => project.id !== detail.id),
      );
    };

    window.addEventListener("dashboard:project-created", handleProjectCreated);
    window.addEventListener("dashboard:project-renamed", handleProjectRenamed);
    window.addEventListener(
      "dashboard:project-star-toggled",
      handleProjectStarToggled,
    );
    window.addEventListener("dashboard:project-deleted", handleProjectDeleted);

    return () => {
      window.removeEventListener(
        "dashboard:project-created",
        handleProjectCreated,
      );
      window.removeEventListener(
        "dashboard:project-renamed",
        handleProjectRenamed,
      );
      window.removeEventListener(
        "dashboard:project-star-toggled",
        handleProjectStarToggled,
      );
      window.removeEventListener(
        "dashboard:project-deleted",
        handleProjectDeleted,
      );
    };
  }, []);

  const starredPlaygrounds = useMemo(
    () => playgroundData.filter((project) => project.starred),
    [playgroundData],
  );

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ redirectTo: "/auth/sign-in" });
    } catch {
      setIsSigningOut(false);
      window.location.assign("/auth/sign-in");
    }
  };

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Code2 className="h-5 w-5" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium text-muted-foreground">
              Workspace
            </p>
            <h2 className="text-lg font-semibold">Code Collab</h2>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={safePathname === "/"}
                  tooltip="Home"
                >
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={safePathname === "/dashboard"}
                  tooltip="Dashboard"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={safePathname.startsWith("/workspace")}
                  tooltip="My Workspaces"
                >
                  <Link href="/dashboard#projects">
                    <FolderKanban className="h-4 w-4" />
                    <span>My Workspaces</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <Star className="mr-2 h-4 w-4" />
            Starred
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {starredPlaygrounds.length === 0 ? (
                <div className="w-full py-4 text-center text-muted-foreground">
                  No starred workspaces yet
                </div>
              ) : (
                starredPlaygrounds.map((playground) => {
                  const IconComponent = lucideIconMap[playground.icon] || Code2;

                  return (
                    <SidebarMenuItem key={playground.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/workspace/${playground.id}`}
                        tooltip={playground.name}
                      >
                        <Link href={`/workspace/${playground.id}`}>
                          <IconComponent className="h-4 w-4" />
                          <span>{playground.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <FolderKanban className="mr-2 h-4 w-4" />
            Recent Workspaces
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {playgroundData.map((playground) => {
                const IconComponent = lucideIconMap[playground.icon] || Code2;

                return (
                  <SidebarMenuItem key={playground.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/workspace/${playground.id}`}
                      tooltip={playground.name}
                    >
                      <Link href={`/workspace/${playground.id}`}>
                        <IconComponent className="h-4 w-4" />
                        <span>{playground.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View all">
                  <Link href="/dashboard#projects">
                    <span className="text-sm text-muted-foreground">
                      View all workspaces
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 px-3 py-3 text-left transition hover:border-sidebar-accent hover:bg-sidebar-accent/55 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2",
                      )}
                    >
                      <Avatar className="size-9 ring-1 ring-white/10">
                        <AvatarImage src={currentUser.avatarUrl ?? undefined} alt={displayName} />
                        <AvatarFallback>{avatarFallback}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                        <p className="truncate text-sm font-medium">
                          {displayName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {displayHandle}
                        </p>
                      </div>

                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    side="top"
                    align="start"
                    sideOffset={8}
                    className="w-64 min-w-64 rounded-2xl border border-white/10 bg-[#0b1020] p-1.5 text-white shadow-[0_24px_60px_rgba(2,6,23,0.55)]"
                  >
                    <DropdownMenuLabel className="px-3 py-3 text-left text-white/70">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 ring-1 ring-white/10">
                          <AvatarImage
                            src={currentUser.avatarUrl ?? undefined}
                            alt={displayName}
                          />
                          <AvatarFallback>{avatarFallback}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {displayName}
                          </p>
                          <p className="truncate text-xs text-white/55">
                            {displayHandle}
                          </p>
                          {supplementaryEmail ? (
                            <p className="truncate text-xs text-white/40">
                              {supplementaryEmail}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="bg-white/10" />

                    <DropdownMenuItem
                      asChild
                      className="text-white/85 focus:bg-white/10 focus:text-white"
                    >
                      <Link href="/dashboard#settings">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      variant="destructive"
                      disabled={isSigningOut}
                      onSelect={() => {
                        void handleSignOut();
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{isSigningOut ? "Logging out..." : "Logout"}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/20 px-3 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                  <Avatar className="size-9 ring-1 ring-white/10">
                    <AvatarFallback>
                      <UserCircle2 className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium">
                      Not signed in
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Account unavailable
                    </p>
                  </div>
                </div>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
