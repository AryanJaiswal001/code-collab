import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/auth";
import { getAllPlaygroundForUser } from "@/app/modules/dashboard/actions";
import { DashboardSidebar } from "@/app/modules/dashboard/components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const playgroundData = await getAllPlaygroundForUser();
  const technologyIconMap: Record<string, string> = {
    REACT: "Zap",
    NEXTJS: "LightBulb",
    EXPRESS: "Database",
    VUE: "Compass",
    HONO: "FlameIcon",
    ANGULAR: "Terminal",
    GITHUB: "Code2",
  };

  const formattedPlaygroundData = playgroundData.map((item) => ({
    id: item.id,
    name: item.title,
    starred: item.Starmark?.length > 0 && item.Starmark[0]?.isMarked === true,
    icon: technologyIconMap[item.template] || "Code",
  }));
  const currentUser = session?.user
    ? {
        name: session.user.name ?? null,
        username: session.user.username ?? null,
        email: session.user.email ?? null,
        avatarUrl: session.user.image ?? null,
      }
    : null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <DashboardSidebar
          initialPlaygroundData={formattedPlaygroundData}
          currentUser={currentUser}
        />
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
}
