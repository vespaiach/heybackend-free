"use client";

import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import WebsiteIcon from "./ui/website-icon";

type Website = { id: string; name: string; url: string; key: string; isActive: boolean };

export function WebsiteSwitcher({
  websites,
  websiteId,
  onAddWebsite,
}: {
  websites: Website[];
  websiteId: string;
  onAddWebsite: () => void;
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const activeWebsite = websites.find((w) => w.id === websiteId) ?? null;

  function handleSelect(site: Website) {
    router.push(`/dashboard/${site.id}/home`);
  }

  if (!activeWebsite) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <WebsiteIcon />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-muted-foreground">No websites yet</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex size-6 items-center justify-center rounded-md border">
                <WebsiteIcon />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeWebsite.name}</span>
                <span className="truncate text-xs">{activeWebsite.url}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Websites</DropdownMenuLabel>
            {websites.map((site) => (
              <DropdownMenuItem key={site.id} onClick={() => handleSelect(site)} className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <WebsiteIcon />
                </div>
                <div className="flex flex-col">
                  <span className="capitalize">{site.name}</span>
                  <span className="text-xs text-muted-foreground">{site.url}</span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={onAddWebsite}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <PlusIcon className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add website</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
