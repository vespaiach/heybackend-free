import { TrendingDownIcon, TrendingUpIcon, UserMinusIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardsProps {
  totalActive: number;
  newThisPeriod: number;
  unsubscribedThisPeriod: number;
  growthRate: number | null;
}

function formatGrowthRate(rate: number | null): string {
  if (rate === null) return "—";
  return rate >= 0 ? `+${rate}%` : `${rate}%`;
}

export function StatCards({ totalActive, newThisPeriod, unsubscribedThisPeriod, growthRate }: StatCardsProps) {
  const GrowthIcon = growthRate !== null && growthRate < 0 ? TrendingDownIcon : TrendingUpIcon;
  const growthColor = growthRate !== null && growthRate < 0 ? "text-destructive" : "text-green-600";

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Active</CardTitle>
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActive.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">active subscribers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">New This Period</CardTitle>
          <UserPlusIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{newThisPeriod.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">joined in range</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unsubscribed</CardTitle>
          <UserMinusIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unsubscribedThisPeriod.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">left in range</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Growth Rate</CardTitle>
          <GrowthIcon className={`h-4 w-4 ${growthColor}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${growthColor}`}>{formatGrowthRate(growthRate)}</div>
          <p className="text-xs text-muted-foreground">vs previous period</p>
        </CardContent>
      </Card>
    </div>
  );
}
