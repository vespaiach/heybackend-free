import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { contactRequestService } from "@/lib/domain";
import { getWebsite } from "@/lib/route-helpers";
import { ActivityHeatmap } from "./_components/activity-heatmap";
import { CompanyChart } from "./_components/company-chart";
import { StatCards } from "./_components/stat-cards";
import { TrendChart } from "./_components/trend-chart";

export default async function ContactAnalyticsPage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;
  const website = await getWebsite(websiteId);
  const analytics = await contactRequestService.getContactAnalytics(websiteId);

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
                <BreadcrumbPage>Analytics</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">Contact Analytics</h2>
          <p className="text-muted-foreground">Understand your contact request patterns and trends.</p>
        </div>

        <div className="flex flex-col gap-4">
          <StatCards
            total={analytics.total}
            read={analytics.read}
            unread={analytics.unread}
            momChange={analytics.momChange}
          />

          <ActivityHeatmap dailyActivity={analytics.dailyActivity} />

          <TrendChart dailyActivity={analytics.dailyActivity} monthlyTrend={analytics.monthlyTrend} />

          <CompanyChart companyBreakdown={analytics.companyBreakdown} />
        </div>
      </main>
    </>
  );
}
