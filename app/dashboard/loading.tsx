import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <Card className="mb-8 rounded-[2rem]">
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-10 w-48 rounded-full" />
          <Skeleton className="h-4 w-80 rounded-full" />
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="rounded-[1.75rem]">
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-44 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-10 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
