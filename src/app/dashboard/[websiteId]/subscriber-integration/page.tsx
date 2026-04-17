import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getWebsite } from "@/lib/route-helpers";
import { IntegrationTabs } from "./_components/integration-tabs";

export const metadata = {
  title: "Integration | Dashboard",
  description: "Integrate your subscriber form with the SDK",
};

interface IntegrationPageProps {
  params: Promise<{ websiteId: string }>;
}

export default async function IntegrationPage({ params }: IntegrationPageProps) {
  const { websiteId } = await params;
  const website = await getWebsite(websiteId);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>{website.name}</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Subscribers Integration</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Subscriber SDK Integration</h1>
          <p className="text-muted-foreground mt-1">Add a subscriber form to your website using our SDK.</p>
        </div>
        <IntegrationTabs websiteId={websiteId} />
      </div>
    </>
  );
}
