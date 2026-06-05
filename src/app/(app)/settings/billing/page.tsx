import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BillingView } from "./billing-view";

export default async function BillingSettingsPage() {
  const session = await getSession();
  if (!session || session.roleName !== "owner") {
    redirect("/settings/profile");
  }
  return <BillingView />;
}
