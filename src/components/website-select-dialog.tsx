"use client";

import { GlobeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialogs";

type Website = { id: string; name: string; url: string };

export function WebsiteSelectDialog({ websites }: { websites: Website[] }) {
  const router = useRouter();

  function handleSelect(id: string) {
    router.push(`/dashboard/${id}/home`);
  }

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Select a website</DialogTitle>
          <DialogDescription>Choose a website to continue.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {websites.map((site) => (
            <Button
              key={site.id}
              variant="outline"
              className="h-auto justify-start gap-3 px-3 py-3"
              onClick={() => handleSelect(site.id)}>
              <div className="flex size-8 items-center justify-center rounded-md border">
                <GlobeIcon className="size-4" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="font-medium">{site.name}</span>
                <span className="text-xs text-muted-foreground">{site.url}</span>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
