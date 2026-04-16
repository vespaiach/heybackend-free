import { FirstWebsiteSetup } from "@/components/first-website-setup";
import { Toaster } from "@/components/ui/sonner";
import { getLoggedInTenant } from "@/lib/route-helpers";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await getLoggedInTenant();

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
