import { Suspense } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getWebsite } from "@/lib/route-helpers";
import ActivityFeed from "./_components/activity-feed";
import GrowthSection from "./_components/growth-section";
import KpiCards from "./_components/kpi-cards";
import { QuickActions } from "./_components/quick-actions";

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full" />
      </CardContent>
    </Card>
  );
}

function FeedSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function HomePage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;
  const website = await getWebsite(websiteId);

  return (
    <>
      <header className="border-b flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>{website.name}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Home</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">Mission Control</h2>
          <p className="text-muted-foreground">Your application's health and activity at a glance.</p>
        </div>

        <div className="flex flex-col gap-4">
          <Suspense fallback={<KpiSkeleton />}>
            <KpiCards websiteId={websiteId} />
          </Suspense>

          <Suspense fallback={<ChartSkeleton />}>
            <GrowthSection websiteId={websiteId} />
          </Suspense>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Suspense fallback={<FeedSkeleton />}>
                <ActivityFeed websiteId={websiteId} />
              </Suspense>
            </div>
            <QuickActions websiteId={websiteId} />
          </div>
        </div>
      </main>
    </>
  );
}
