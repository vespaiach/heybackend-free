import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: number | null; // percentage, positive = up, negative = down, null = no data
}

export function StatCard({ title, value, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {trend !== undefined && (
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-sm",
              trend === null ? "text-muted-foreground" : trend >= 0 ? "text-green-600" : "text-red-500",
            )}>
            {trend === null ? (
              <Minus className="h-4 w-4" />
            ) : trend >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>
              {trend === null ? "No prior data" : `${trend > 0 ? "+" : ""}${trend}% vs previous period`}
            </span>
          </div>
        )}
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
