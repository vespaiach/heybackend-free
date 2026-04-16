import { MonitorIcon, SmartphoneIcon, TabletIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface DeviceBreakdown {
  mobile: number;
  tablet: number;
  desktop: number;
  unknown: number;
}

interface DevicesPlatformsCardProps {
  deviceBreakdown: DeviceBreakdown;
  topOS: { os: string; count: number }[];
}

function BarRow({
  label,
  count,
  total,
  icon,
}: {
  label: string;
  count: number;
  total: number;
  icon?: ReactNode;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DevicesPlatformsCard({ deviceBreakdown, topOS }: DevicesPlatformsCardProps) {
  const { mobile, tablet, desktop, unknown: _unknown } = deviceBreakdown;
  const deviceTotal = mobile + tablet + desktop;
  const osTotal = topOS.reduce((s, r) => s + r.count, 0);
  const noDeviceData = deviceTotal === 0;
  const noOSData = topOS.length === 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Devices &amp; Platforms</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        {/* Devices */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Devices</p>
          {noDeviceData ? (
            <p className="text-sm text-muted-foreground">No device data yet</p>
          ) : (
            <div className="space-y-3">
              <BarRow
                label="Mobile"
                count={mobile}
                total={deviceTotal}
                icon={<SmartphoneIcon className="h-3.5 w-3.5" />}
              />
              <BarRow
                label="Tablet"
                count={tablet}
                total={deviceTotal}
                icon={<TabletIcon className="h-3.5 w-3.5" />}
              />
              <BarRow
                label="Desktop"
                count={desktop}
                total={deviceTotal}
                icon={<MonitorIcon className="h-3.5 w-3.5" />}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Platforms */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platforms</p>
          {noOSData ? (
            <p className="text-sm text-muted-foreground">No platform data yet</p>
          ) : (
            <div className="space-y-3">
              {topOS.slice(0, 5).map(({ os, count }) => (
                <BarRow key={os} label={os} count={count} total={osTotal} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
