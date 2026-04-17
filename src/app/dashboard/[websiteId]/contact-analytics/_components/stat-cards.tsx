import { InboxIcon, MailCheckIcon, MessageSquareIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardsProps = {
  total: number;
  read: number;
  unread: number;
  momChange: number | null;
};

export function StatCards({ total, read, unread, momChange }: StatCardsProps) {
  const momPositive = momChange !== null && momChange >= 0;
  const momNegative = momChange !== null && momChange < 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquareIcon className="h-4 w-4" />
            Total Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">all time</p>
        </CardContent>
      </Card>

      <Card className={cn(unread > 0 && "border-amber-400 dark:border-amber-500")}>
        <CardHeader className="pb-2">
          <CardTitle
            className={cn(
              "flex items-center gap-2 text-sm font-medium",
              unread > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
            )}>
            <InboxIcon className="h-4 w-4" />
            Unread
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-2xl font-bold", unread > 0 && "text-amber-600 dark:text-amber-400")}>
            {unread.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">awaiting review</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MailCheckIcon className="h-4 w-4" />
            Read
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{read.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">reviewed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle
            className={cn(
              "flex items-center gap-2 text-sm font-medium",
              momPositive
                ? "text-green-600 dark:text-green-400"
                : momNegative
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}>
            {momPositive ? (
              <TrendingUpIcon className="h-4 w-4" />
            ) : momNegative ? (
              <TrendingDownIcon className="h-4 w-4" />
            ) : (
              <TrendingUpIcon className="h-4 w-4" />
            )}
            Month-over-Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-2xl font-bold",
              momPositive ? "text-green-600 dark:text-green-400" : momNegative ? "text-destructive" : "",
            )}>
            {momChange === null ? "—" : `${momChange >= 0 ? "+" : ""}${momChange}%`}
          </p>
          <p className="text-xs text-muted-foreground">vs last month</p>
        </CardContent>
      </Card>
    </div>
  );
}
