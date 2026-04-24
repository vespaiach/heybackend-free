"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import type { Website } from "@/lib/domain";
import { WebsitesModal } from "../../websites-modal";
import { Badge } from "../badge";
import DropdownMenu from "../dropdown-menus/dropdown-menu";
import DropdownMenuContent from "../dropdown-menus/dropdown-menu-content";
import DropdownMenuItem from "../dropdown-menus/dropdown-menu-item";
import DropdownMenuLabel from "../dropdown-menus/dropdown-menu-label";
import DropdownMenuSeparator from "../dropdown-menus/dropdown-menu-separator";
import DropdownMenuTrigger from "../dropdown-menus/dropdown-menu-trigger";
import { Separator } from "../separator";
import { SidebarTrigger } from "../sidebar";
import WebsiteIcon from "../website-icon";
import BreadcrumbItem from "./breadcrumb-item";
import BreadcrumbList from "./breadcrumb-list";
import BreadcrumbPage from "./breadcrumb-page";
import BreadcrumbRoot from "./breadcrumb-root";
import BreadcrumbSeparator from "./breadcrumb-separator";

export default function TopPageBreadcrumb({
  pageTitle,
  website,
  websites,
  category,
}: {
  website: Website;
  websites: Array<Website>;
  category: "Subscribers" | "Contacts";
  pageTitle: string;
}) {
  const [websitesOpen, setWebsitesOpen] = useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <BreadcrumbRoot>
        <BreadcrumbList>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge asChild className="bg-secondary text-secondary-foreground">
                <a
                  href={website.url}
                  className="flex gap-1"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={website.name}>
                  <WebsiteIcon /> {website.name}
                </a>
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={"right"}
              sideOffset={4}>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Websites</DropdownMenuLabel>
              {websites.map((site) => (
                <DropdownMenuItem asChild key={site.id} className="gap-2 p-2">
                  <a href={`/dashboard/${site.id}/home`} className="flex gap-2">
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <WebsiteIcon />
                    </div>
                    <div className="flex flex-col">
                      <span className="capitalize">{site.name}</span>
                      <span className="text-xs text-muted-foreground">{site.url}</span>
                    </div>
                  </a>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => {
                  setWebsitesOpen(true);
                }}>
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Add website</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <BreadcrumbSeparator />
          <BreadcrumbItem>{category}</BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </BreadcrumbRoot>
      <WebsitesModal open={websitesOpen} onOpenChange={setWebsitesOpen} websites={websites} />
    </header>
  );
}
