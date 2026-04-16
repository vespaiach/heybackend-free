import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { subscriberService, tenantService } from "@/lib/domain";
import type { AnalyticsRange } from "@/lib/domain/types";
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);
  if (!tenant) redirect("/onboarding");

  const { websiteId } = await params;
  const website = tenant.websites.find((w) => w.id === websiteId);
  if (!website) redirect(`/dashboard/${tenant.websites[0]?.id ?? ""}/subscriber-analytics`);

  const { range: rawRange } = await searchParams;
  const range: AnalyticsRange = VALID_RANGES.includes(rawRange as AnalyticsRange)
    ? (rawRange as AnalyticsRange)
    : "30d";

  const analytics = await subscriberService.getAnalytics(websiteId, range);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>{website.name}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Analytics</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Analytics</h1>
          <RangeSelector />
        </div>

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
    </>
  );
}
