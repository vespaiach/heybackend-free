"use client";

import { ChevronsUpDownIcon, GlobeIcon, PlusIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

type Website = { id: string; name: string; url: string; key: string; isActive: boolean };

export function WebsiteSwitcher({ websites }: { websites: Website[] }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeWebsite = websites.find((w) => w.id === searchParams.get("wid")) ?? null;

  function handleSelect(site: Website) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("wid", site.id);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!activeWebsite) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <GlobeIcon className="size-4" />
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
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GlobeIcon className="size-4" />
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    width="24"
                    height="24">
                    <path
                      fill="currentColor"
                      d="M4 8C4.55228 8 5 7.55228 5 7C5 6.44772 4.55228 6 4 6C3.44772 6 3 6.44772 3 7C3 7.55228 3.44772 8 4 8Z"
                    />
                    <path
                      fill="currentColor"
                      d="M8 7C8 7.55228 7.55228 8 7 8C6.44772 8 6 7.55228 6 7C6 6.44772 6.44772 6 7 6C7.55228 6 8 6.44772 8 7Z"
                    />
                    <path
                      fill="currentColor"
                      d="M10 8C10.5523 8 11 7.55228 11 7C11 6.44772 10.5523 6 10 6C9.44771 6 9 6.44772 9 7C9 7.55228 9.44771 8 10 8Z"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      fill="currentColor"
                      d="M3 3C1.34315 3 0 4.34315 0 6V18C0 19.6569 1.34315 21 3 21H21C22.6569 21 24 19.6569 24 18V6C24 4.34315 22.6569 3 21 3H3ZM21 5H3C2.44772 5 2 5.44772 2 6V9H22V6C22 5.44772 21.5523 5 21 5ZM2 18V11H22V18C22 18.5523 21.5523 19 21 19H3C2.44772 19 2 18.5523 2 18Z"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="capitalize">{site.name}</span>
                  <span className="text-xs text-muted-foreground">{site.url}</span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={() => router.push("/dashboard/websites?add=1")}>
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
