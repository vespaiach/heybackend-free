import TopPageBreadcrumb from "@/components/ui/breadcrumbs/top-breadcrumb";
import { checkSessionAndGetWebsiteData } from "@/lib/route-helpers";
import { IntegrationTabs } from "./_components/integration-tabs";

export const metadata = {
  title: "Integration | Dashboard",
  description: "Integrate your subscriber form with the SDK",
};

interface IntegrationPageProps {
  params: Promise<{ websiteId: string }>;
}

export default async function IntegrationPage({ params }: IntegrationPageProps) {
  const [website, websites] = await checkSessionAndGetWebsiteData((await params).websiteId);

  return (
    <>
      <TopPageBreadcrumb
        website={website}
        websites={websites}
        category="Subscribers"
        pageTitle="Integration"
      />
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Subscriber SDK Integration</h1>
          <p className="text-muted-foreground mt-1">Add a subscriber form to your website using our SDK.</p>
        </div>
        <IntegrationTabs websiteId={website.id} />
      </div>
    </>
  );
}
