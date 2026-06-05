import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TeamSettingsView } from "./team-view";

export default async function TeamSettingsPage() {
  const session = await getSession();
  if (!session || session.roleName !== "owner") {
    redirect("/settings/profile");
  }
  return <TeamSettingsView />;
}
