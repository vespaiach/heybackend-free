import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SubscriberAge {
  seedlings: number;
  sprouts: number;
  saplings: number;
  evergreens: number;
}

interface SubscriberAgeCardProps {
  subscriberAge: SubscriberAge;
  totalActive: number;
}

const COHORTS = [
  { key: "seedlings" as const, emoji: "🌱", label: "Seedlings", description: "≤ 30 days" },
  { key: "sprouts" as const, emoji: "🌿", label: "Sprouts", description: "30d – 3 months" },
  { key: "saplings" as const, emoji: "🌳", label: "Saplings", description: "3 – 6 months" },
  { key: "evergreens" as const, emoji: "🌲", label: "Evergreens", description: "> 6 months" },
];

export function SubscriberAgeCard({ subscriberAge, totalActive }: SubscriberAgeCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Subscriber Age</CardTitle>
        <CardDescription>Loyalty cohorts</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {COHORTS.map(({ key, emoji, label, description }) => {
          const count = subscriberAge[key];
          const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{emoji}</span>
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-muted-foreground">{count.toLocaleString()}</span>
                  <span className="font-semibold w-8 text-right">{pct}%</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
