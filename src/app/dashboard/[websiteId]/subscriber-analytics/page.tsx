import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { tenantService, subscriberService } from "@/lib/domain";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { AnalyticsRange } from "@/lib/domain/types";
import { RangeSelector } from "./components/range-selector";
import { StatCard } from "./components/stat-card";
import { GrowthChart } from "./components/growth-chart";
import { StatusDonut } from "./components/status-donut";
import { TopCountriesChart } from "./components/top-countries-chart";
import { DeviceChart } from "./components/device-chart";
import { TimezoneChart } from "./components/timezone-chart";

const VALID_RANGES = ["7d", "30d", "90d", "all"] as const;

export default async function SubscriberAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const wid = typeof params["wid"] === "string" ? params["wid"] : undefined;
  const rangeRaw = typeof params["range"] === "string" ? params["range"] : "30d";
  const range = (VALID_RANGES as readonly string[]).includes(rangeRaw) ? (rangeRaw as AnalyticsRange) : "30d";

  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);
  if (!tenant) redirect("/onboarding");

  const resolvedId = tenant.websites.find((w) => w.id === wid)?.id;

  if (!resolvedId) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Analytics</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 p-4">
          <p className="text-muted-foreground">Select a website to view analytics.</p>
        </main>
      </>
    );
  }

  const analytics = await subscriberService.getAnalytics(resolvedId, range);

  const rangeLabel = range === "all" ? "all time" : `last ${range}`;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 space-y-6 p-4">
        {/* Range selector */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Subscriber Analytics</h1>
          <Suspense>
            <RangeSelector current={range} />
          </Suspense>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Total Active" value={analytics.totalActive.toLocaleString()} />
          <StatCard
            title={`New (${rangeLabel})`}
            value={analytics.newThisPeriod.toLocaleString()}
            trend={analytics.growthRate}
          />
          <StatCard
            title={`Unsubscribed (${rangeLabel})`}
            value={analytics.unsubscribedThisPeriod.toLocaleString()}
          />
          <StatCard
            title="Churn Rate"
            value={
              analytics.totalActive + analytics.statusBreakdown.unsubscribed > 0
                ? `${Math.round((analytics.statusBreakdown.unsubscribed / (analytics.totalActive + analytics.statusBreakdown.unsubscribed)) * 100)}%`
                : "0%"
            }
            description="All-time unsubscribed / total"
          />
        </div>

        {/* Growth chart — full width */}
        <GrowthChart data={analytics.growth} />

        {/* Second row: donut + device */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatusDonut
            active={analytics.statusBreakdown.active}
            unsubscribed={analytics.statusBreakdown.unsubscribed}
          />
          <DeviceChart data={analytics.deviceBreakdown} />
        </div>

        {/* Third row: countries + timezones */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {analytics.topCountries.length > 0 ? (
            <TopCountriesChart data={analytics.topCountries} />
          ) : (
            <EmptyCard title="Top Countries" message="No location data yet." />
          )}
          {analytics.topTimezones.length > 0 ? (
            <TimezoneChart data={analytics.topTimezones} />
          ) : (
            <EmptyCard title="Timezone Distribution" message="No timezone data yet." />
          )}
        </div>
      </main>
    </>
  );
}

function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
