import { redirect } from "next/navigation";
import { getLoggedInTenant, getSession } from "@/lib/route-helpers";

export default async function Home() {
  const session = await getSession();
  const tenant = await getLoggedInTenant(session.user.id);

  redirect(`/dashboard/${tenant.websites[0].id}/home`);
}
