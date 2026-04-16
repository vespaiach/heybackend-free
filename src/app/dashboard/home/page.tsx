import { redirect } from "next/navigation";
import { getLoggedInTenant } from "@/lib/route-helpers";

export default async function Home() {
  const tenant = await getLoggedInTenant();
  redirect(`/dashboard/${tenant.websites[0].id}/home`);
}
