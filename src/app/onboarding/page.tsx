import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tenantService } from "@/lib/domain";
import { OnboardingForm } from "./_components/onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const tenant = await tenantService.getTenantByUserId(session.user.id);

  if (tenant) {
    redirect("/dashboard/home");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome! Let&apos;s get started</CardTitle>
            <CardDescription>Tell us your name and optionally add your websites.</CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
