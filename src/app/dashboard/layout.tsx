import { FirstWebsiteSetup } from "@/components/first-website-setup";
import { Toaster } from "@/components/ui/sonner";
import { getLoggedInTenant, getSession } from "@/lib/route-helpers";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const tenant = await getLoggedInTenant(session.user.id);

  if (tenant.websites.length === 0) {
    return (
      <>
        <FirstWebsiteSetup />
        <Toaster />
      </>
    );
  }

  return children;
}
