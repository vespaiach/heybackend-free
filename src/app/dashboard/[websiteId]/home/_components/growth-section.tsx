import { GrowthChart } from "@/app/dashboard/[websiteId]/subscriber-analytics/_components/growth-chart";
import { subscriberService } from "@/lib/domain";
import type { GrowthDataPoint } from "@/lib/domain/types";

export function GrowthSectionView({ data }: { data: GrowthDataPoint[] }) {
  return <GrowthChart data={data} rangeLabel="Last 30 days" />;
}

export default async function GrowthSection({ websiteId }: { websiteId: string }) {
  const analytics = await subscriberService.getAnalytics(websiteId, "30d");
  return <GrowthSectionView data={analytics.growth} />;
}
