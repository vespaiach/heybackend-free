import TopPageBreadcrumb from "@/components/ui/breadcrumbs/top-breadcrumb";
import { subscriberService } from "@/lib/domain";
import type { AnalyticsRange } from "@/lib/domain/types";
import { checkSessionAndGetWebsiteData } from "@/lib/route-helpers";
import { CountriesCard } from "./_components/countries-card";
import { DevicesPlatformsCard } from "./_components/devices-platforms-card";
import { GrowthChart } from "./_components/growth-chart";
import { RangeSelector } from "./_components/range-selector";
import { StatCards } from "./_components/stat-cards";
import { SubscriberAgeCard } from "./_components/subscriber-age-card";

const VALID_RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "all"];
const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

export default async function SubscriberAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const [website, websites] = await checkSessionAndGetWebsiteData((await params).websiteId);

  const { range: rawRange } = await searchParams;
  const range: AnalyticsRange = VALID_RANGES.includes(rawRange as AnalyticsRange)
    ? (rawRange as AnalyticsRange)
    : "30d";

  const analytics = await subscriberService.getAnalytics(website.id, range);

  return (
    <>
      <TopPageBreadcrumb website={website} websites={websites} category="Subscribers" pageTitle="Analytics" />

      <main className="flex-1 p-4">
        <div className="flex flex-col md:flex-row items-start md:items-end md:justify-between gap-2 mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Subscriber Analytics</h2>
            <p className="text-muted-foreground">Monitor your audience growth and engagement trends.</p>
          </div>
          <RangeSelector />
        </div>

        <div className="flex flex-col gap-4">
          <GrowthChart data={analytics.growth} rangeLabel={RANGE_LABELS[range]} />

          <StatCards
            totalActive={analytics.totalActive}
            newThisPeriod={analytics.newThisPeriod}
            unsubscribedThisPeriod={analytics.unsubscribedThisPeriod}
            growthRate={analytics.growthRate}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CountriesCard countries={analytics.topCountries} />
            <DevicesPlatformsCard deviceBreakdown={analytics.deviceBreakdown} topOS={analytics.topOS} />
            <SubscriberAgeCard subscriberAge={analytics.subscriberAge} totalActive={analytics.totalActive} />
          </div>
        </div>
      </main>
    </>
  );
}
