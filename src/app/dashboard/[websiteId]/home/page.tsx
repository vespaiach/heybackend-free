import { Suspense } from "react";
import TopPageBreadcrumb from "@/components/ui/top-breadcrumb";
import { checkSessionAndGetWebsiteData } from "@/lib/route-helpers";
import ActivityFeed from "./_components/activity-feed";
import { ChartSkeleton } from "./_components/chart-skeleton";
import { FeedSkeleton } from "./_components/feed-skeleton";
import GrowthSection from "./_components/growth-section";
import KpiCards from "./_components/kpi-cards";
import { KpiSkeleton } from "./_components/kpi-skeleton";
import { QuickActions } from "./_components/quick-actions";

export default async function HomePage({ params }: { params: Promise<{ websiteId: string }> }) {
  const [website, websites] = await checkSessionAndGetWebsiteData((await params).websiteId);

  return (
    <>
      <TopPageBreadcrumb website={website} websites={websites} category="Subscribers" pageTitle="Home" />

      <main className="flex-1 p-4">
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">Mission Control</h2>
          <p className="text-muted-foreground">Your application's health and activity at a glance.</p>
        </div>

        <div className="flex flex-col gap-4">
          <Suspense fallback={<KpiSkeleton />}>
            <KpiCards websiteId={website.id} />
          </Suspense>

          <Suspense fallback={<ChartSkeleton />}>
            <GrowthSection websiteId={website.id} />
          </Suspense>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Suspense fallback={<FeedSkeleton />}>
                <ActivityFeed websiteId={website.id} />
              </Suspense>
            </div>
            <QuickActions websiteId={website.id} />
          </div>
        </div>
      </main>
    </>
  );
}
