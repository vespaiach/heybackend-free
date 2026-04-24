"use client";

import { Code2Icon, DownloadIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { exportSubscribers } from "@/app/dashboard/[websiteId]/subscribers-list/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WebsiteFormModal } from "@/components/website-form-modal";
import { downloadCsv } from "@/lib/export-csv";

export function QuickActions({ websiteId }: { websiteId: string }) {
  const [addWebsiteOpen, setAddWebsiteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportSubscribers({ websiteId, status: "active" });
      if ("subscribers" in result) {
        downloadCsv(
          result.subscribers.map((s) => ({
            email: s.email,
            firstName: s.firstName ?? "",
            lastName: s.lastName ?? "",
            createdAt: s.createdAt,
            status: s.unsubscribedAt ? "unsubscribed" : "active",
          })),
          "subscribers.csv",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button variant="outline" className="justify-start" onClick={handleExport} disabled={isPending}>
          <DownloadIcon className="mr-2 h-4 w-4" />
          {isPending ? "Exporting..." : "Export Subscriber List (CSV)"}
        </Button>

        <Button variant="outline" className="justify-start" onClick={() => setAddWebsiteOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add New Website
        </Button>

        <Button variant="outline" className="justify-start" asChild>
          <Link href={`/dashboard/${websiteId}/subscriber-integration`}>
            <Code2Icon className="mr-2 h-4 w-4" />
            Go to Integration
          </Link>
        </Button>
      </CardContent>

      <WebsiteFormModal open={addWebsiteOpen} onOpenChange={setAddWebsiteOpen} />
    </Card>
  );
}
