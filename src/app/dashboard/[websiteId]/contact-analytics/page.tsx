import TopPageBreadcrumb from "@/components/ui/breadcrumbs/top-breadcrumb";
import { contactRequestService } from "@/lib/domain";
import { checkSessionAndGetWebsiteData } from "@/lib/route-helpers";
import { ActivityHeatmap } from "./_components/activity-heatmap";
import { CompanyChart } from "./_components/company-chart";
import { StatCards } from "./_components/stat-cards";
import { TrendChart } from "./_components/trend-chart";

export default async function ContactAnalyticsPage({ params }: { params: Promise<{ websiteId: string }> }) {
  const [website, websites] = await checkSessionAndGetWebsiteData((await params).websiteId);
  const analytics = await contactRequestService.getContactAnalytics(website.id);

  return (
    <>
      <TopPageBreadcrumb website={website} websites={websites} category="Contacts" pageTitle="Analytics" />

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
