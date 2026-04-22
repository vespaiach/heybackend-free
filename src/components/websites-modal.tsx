"use client";

import { Copy, PlusIcon, PowerOff, SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { deactivateWebsite } from "@/app/dashboard/websites/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WebsiteFormModal } from "@/components/website-form-modal";

type Website = { id: string; name: string; url: string; key: string; isActive: boolean };

interface WebsitesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websites: Website[];
}

export function WebsitesModal({ open, onOpenChange, websites }: WebsitesModalProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<Website | null>(null);

  async function handleDeactivate(id: string) {
    await deactivateWebsite(id);
    router.refresh();
  }

  async function handleCopyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      toast("Website ID copied!");
    } catch {
      // clipboard not available
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Websites</DialogTitle>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              Add Website
            </Button>
          </DialogHeader>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Website ID</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {websites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No websites yet. Click &quot;Add Website&quot; to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  websites.map((website) => (
                    <TableRow key={website.id}>
                      <TableCell
                        className={website.isActive ? undefined : "text-muted-foreground line-through"}>
                        {website.name}
                      </TableCell>
                      <TableCell>
                        <a
                          href={website.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:underline">
                          {website.url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {website.id.slice(0, 8)}…
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyId(website.id)}>
                            <Copy className="h-3 w-3" />
                            <span className="sr-only">Copy website ID</span>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setRenameTarget(website)}>
                            <SquarePen className="h-4 w-4" />
                            <span className="sr-only">Rename website</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={!website.isActive}
                            onClick={() => handleDeactivate(website.id)}>
                            <PowerOff className="h-4 w-4" />
                            <span className="sr-only">Deactivate website</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <WebsiteFormModal open={addOpen} onOpenChange={setAddOpen} />
      <WebsiteFormModal
        open={!!renameTarget}
        onOpenChange={(o) => {
          if (!o) setRenameTarget(null);
        }}
        website={renameTarget}
        nameOnly
      />
    </>
  );
}
