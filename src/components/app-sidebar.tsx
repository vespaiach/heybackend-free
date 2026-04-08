"use client";

import { BarChart3, Code2, Mails, MessageSquareIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { WebsiteSwitcher } from "@/components/website-switcher";

const data = {
  newsletter: [
    {
      title: "Subscribers",
      url: "/dashboard/subscribers",
      icon: <Mails />,
      isActive: true,
      items: [],
    },

    {
      title: "Analytics",
      url: "/dashboard/subscriber-analytics",
      icon: <BarChart3 />,
      isActive: false,
      items: [],
    },
    {
      title: "Integration",
      url: "/dashboard/subscriber-integration",
      icon: <Code2 />,
      isActive: false,
      items: [],
    },
  ],
  contacts: [
    {
      title: "Contacts",
      url: "/dashboard/contacts",
      icon: <MessageSquareIcon />,
      isActive: false,
      items: [],
    },
  ],
};

type Website = { id: string; name: string; url: string; key: string; isActive: boolean };

export function AppSidebar({
  user,
  websites,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name?: string | null; email?: string | null; image?: string | null };
  websites: Website[];
}) {
  const searchParams = useSearchParams();
  const wid = searchParams.get("wid");

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WebsiteSwitcher websites={websites} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.newsletter} selectedWebsiteId={wid ?? undefined} category="Newsletter" />
        <NavMain items={data.contacts} selectedWebsiteId={wid ?? undefined} category="Contacts" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
