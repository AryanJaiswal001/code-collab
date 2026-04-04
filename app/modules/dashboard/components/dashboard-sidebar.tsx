"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Code2,
  Database,
  FlameIcon,
  FolderKanban,
  Globe,
  Home,
  LayoutDashboard,
  Settings,
  Star,
  Terminal,
  type LucideIcon,
  Zap,
} from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PlaygroundData {
  id: string;
  name: string;
  icon: string;
  starred: boolean;
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

export function DashboardSidebar({
  initialPlaygroundData,
}: {
  initialPlaygroundData: PlaygroundData[];
}) {
  const pathname = usePathname();
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData[]>(
    () => initialPlaygroundData,
  );

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
                  isActive={pathname === "/"}
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
                  isActive={pathname === "/dashboard"}
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
                  isActive={pathname.startsWith("/editor")}
                  tooltip="My Projects"
                >
                  <Link href="/dashboard#projects">
                    <FolderKanban className="h-4 w-4" />
                    <span>My Projects</span>
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
                  No starred projects yet
                </div>
              ) : (
                starredPlaygrounds.map((playground) => {
                  const IconComponent = lucideIconMap[playground.icon] || Code2;

                  return (
                    <SidebarMenuItem key={playground.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/editor/${playground.id}`}
                        tooltip={playground.name}
                      >
                        <Link href={`/editor/${playground.id}`}>
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
            Recent Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {playgroundData.map((playground) => {
                const IconComponent = lucideIconMap[playground.icon] || Code2;

                return (
                  <SidebarMenuItem key={playground.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/editor/${playground.id}`}
                      tooltip={playground.name}
                    >
                      <Link href={`/editor/${playground.id}`}>
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
                      View all projects
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
              <div className="flex items-center gap-3 rounded-xl border px-3 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                <Avatar className="size-9">
                  <AvatarFallback>CC</AvatarFallback>
                </Avatar>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-sm font-medium">
                    Code Collab Team
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Signed in
                  </p>
                </div>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <Link href="/dashboard#settings">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
