"use client";

import { BarChart3, Code2, Mails, MessageSquareIcon } from "lucide-react";
import type * as React from "react";
import { useMemo, useState } from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { WebsitesModal } from "@/components/websites-modal";
import Logo from "./logo";

const data = (websiteId: string) => ({
  newsletter: [
    {
      title: "Subscribers",
      url: `/dashboard/${websiteId}/subscribers-list`,
      icon: <Mails />,
      isActive: true,
      items: [],
    },

    {
      title: "Analytics",
      url: `/dashboard/${websiteId}/subscriber-analytics`,
      icon: <BarChart3 />,
      isActive: false,
      items: [],
    },
    {
      title: "Integration",
      url: `/dashboard/${websiteId}/subscriber-integration`,
      icon: <Code2 />,
      isActive: false,
      items: [],
    },
  ],
  contacts: [
    {
      title: "Contacts",
      url: `/dashboard/${websiteId}/contacts-list`,
      icon: <MessageSquareIcon />,
      isActive: false,
      items: [],
    },
    {
      title: "Analytics",
      url: `/dashboard/${websiteId}/contact-analytics`,
      icon: <BarChart3 />,
      isActive: false,
      items: [],
    },
  ],
});

type Website = { id: string; name: string; url: string; key: string; isActive: boolean };

export function AppSidebar({
  user,
  websites,
  websiteId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name?: string | null; email?: string | null; image?: string | null };
  websites: Website[];
  websiteId: string;
}) {
  const menu = useMemo(() => data(websiteId), [websiteId]);
  const [websitesOpen, setWebsitesOpen] = useState(false);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
                <a href="/dashboard" className="flex items-center mt-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Logo className="size-6" width="100%" height="100%" />
                  </div>
                  <span className="text-base font-semibold">Hey Backend!</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={menu.newsletter} category="Newsletter" />
        <NavMain items={menu.contacts} category="Contacts" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onOpenWebsites={() => setWebsitesOpen(true)} />
      </SidebarFooter>
      <SidebarRail />
      <WebsitesModal open={websitesOpen} onOpenChange={setWebsitesOpen} websites={websites} />
    </Sidebar>
  );
}
