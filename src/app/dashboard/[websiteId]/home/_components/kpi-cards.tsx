import { MailOpenIcon, MessageSquareIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactRequestService, subscriberService } from "@/lib/domain";

interface KpiCardsViewProps {
  totalActive: number;
  newThisPeriod: number;
  growthRate: number | null;
  totalContacts: number;
  unreadContacts: number;
}

export function KpiCardsView({
  totalActive,
  newThisPeriod,
  growthRate,
  totalContacts,
  unreadContacts,
}: KpiCardsViewProps) {
  const isPositive = growthRate !== null && growthRate >= 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscribers</CardTitle>
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActive.toLocaleString()}</div>
          {growthRate !== null ? (
            <p className={`text-xs ${isPositive ? "text-green-600" : "text-destructive"}`}>
              {isPositive ? `+${growthRate}%` : `${growthRate}%`} last 30 days
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">active subscribers</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">New This Period</CardTitle>
          <UserPlusIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{newThisPeriod.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">joined last 30 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
          <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalContacts.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">all time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unread Contacts</CardTitle>
          <MailOpenIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${unreadContacts > 0 ? "text-amber-600" : ""}`}>
            {unreadContacts.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">awaiting review</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function KpiCards({ websiteId }: { websiteId: string }) {
  const [subAnalytics, contactAnalytics] = await Promise.all([
    subscriberService.getAnalytics(websiteId, "30d"),
    contactRequestService.getContactAnalytics(websiteId),
  ]);

  return (
    <KpiCardsView
      totalActive={subAnalytics.totalActive}
      newThisPeriod={subAnalytics.newThisPeriod}
      growthRate={subAnalytics.growthRate}
      totalContacts={contactAnalytics.total}
      unreadContacts={contactAnalytics.unread}
    />
  );
}
