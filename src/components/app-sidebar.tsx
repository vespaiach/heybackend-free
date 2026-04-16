"use client";

import { BarChart3, Code2, Mails, MessageSquareIcon } from "lucide-react";
import { useMemo } from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { WebsiteSwitcher } from "@/components/website-switcher";

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
      url: `/dashboard/${websiteId}/integration`,
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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WebsiteSwitcher websites={websites} websiteId={websiteId} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={menu.newsletter} category="Newsletter" />
        <NavMain items={menu.contacts} category="Contacts" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
