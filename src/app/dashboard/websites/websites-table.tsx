"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MoreHorizontalIcon,
  Plus,
  SquarePen,
  PowerOff,
  Copy,
  Code2,
  LayoutListIcon,
} from "lucide-react";
import { toast } from "sonner";
import { deactivateWebsite } from "./actions";
import { WebsiteFormModal } from "@/components/website-form-modal";
import { WebsiteIntegrationModal } from "@/components/website-integration-modal";
import { WebsiteFieldsSheet } from "@/components/website-fields-sheet";

type Website = {
  id: string;
  name: string;
  url: string;
  key: string;
  isActive: boolean;
  createdAt: Date;
};

type SortField = "name" | "createdAt";
type SortDir = "asc" | "desc";

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (field !== sortField) return <ArrowUpDownIcon className="ml-1 inline-block h-3 w-3 opacity-50" />;
  return sortDir === "asc" ? (
    <ArrowUpIcon className="ml-1 inline-block h-3 w-3" />
  ) : (
    <ArrowDownIcon className="ml-1 inline-block h-3 w-3" />
  );
}

export function WebsitesTable({ websites }: { websites: Website[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortField, setSortField] = React.useState<SortField>("createdAt");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingWebsite, setEditingWebsite] = React.useState<Website | null>(null);
  const [integrationModalOpen, setIntegrationModalOpen] = React.useState(false);
  const [integrationWebsite, setIntegrationWebsite] = React.useState<Website | null>(null);
  const [fieldsSheetOpen, setFieldsSheetOpen] = React.useState(false);
  const [fieldsWebsite, setFieldsWebsite] = React.useState<Website | null>(null);

  React.useEffect(() => {
    if (searchParams.get("add") === "1") {
      setEditingWebsite(null);
      setModalOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("add");
      const newUrl = params.size > 0 ? `/dashboard/websites?${params.toString()}` : "/dashboard/websites";
      router.replace(newUrl);
    }
  }, [searchParams, router]);

  const sorted = React.useMemo(() => {
    return [...websites].sort((a, b) => {
      let cmp: number;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = a.createdAt.getTime() - b.createdAt.getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [websites, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function openAdd() {
    setEditingWebsite(null);
    setModalOpen(true);
  }

  function openEdit(website: Website) {
    setEditingWebsite(website);
    setModalOpen(true);
  }

  function openIntegration(website: Website) {
    setIntegrationWebsite(website);
    setIntegrationModalOpen(true);
  }

  function openFields(website: Website) {
    setFieldsWebsite(website);
    setFieldsSheetOpen(true);
  }

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

  async function handleCopyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      toast("Copied!");
    } catch {
      // clipboard not available
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Websites</h2>
          <p className="text-muted-foreground">
            Manage the domains you want to power with our backend services. Add a new site to generate a
            dedicated API key.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus />
          Add Website
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => toggleSort("name")}>
                  Name
                  <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Website ID</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => toggleSort("createdAt")}>
                  Created At
                  <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No websites yet. Click &quot;Add Website&quot; to get started.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((website) => (
                <TableRow key={website.id}>
                  <TableCell className={website.isActive ? undefined : "text-muted-foreground line-through"}>
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
                      <span className="font-mono text-muted-foreground">•••••••••</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyKey(website.key)}>
                        <Copy className="h-3 w-3" />
                        <span className="sr-only">Copy API key</span>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {website.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontalIcon className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(website)}>
                          <SquarePen />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openIntegration(website)}>
                          <Code2 />
                          Integration Snippet
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openFields(website)}>
                          <LayoutListIcon />
                          Manage fields
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyKey(website.key)}>
                          <Copy />
                          Copy Key
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeactivate(website.id)}
                          disabled={!website.isActive}
                          className="text-destructive focus:text-destructive">
                          <PowerOff />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WebsiteFormModal open={modalOpen} onOpenChange={setModalOpen} website={editingWebsite} />
      <WebsiteIntegrationModal
        open={integrationModalOpen}
        onOpenChange={setIntegrationModalOpen}
        website={integrationWebsite}
      />
      {fieldsWebsite && (
        <WebsiteFieldsSheet
          websiteId={fieldsWebsite.id}
          websiteName={fieldsWebsite.name}
          open={fieldsSheetOpen}
          onOpenChange={setFieldsSheetOpen}
        />
      )}
    </>
  );
}
