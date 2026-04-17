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

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Integration</h1>
        <p className="text-muted-foreground mt-1">Add a subscriber form to your website using our SDK.</p>
      </div>
      <IntegrationTabs websiteId={websiteId} />
    </div>
  );
}
