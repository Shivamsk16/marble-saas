import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkspaceSettingsForm } from "./workspace-form";

export default async function WorkspaceSettingsPage() {
  const session = await getSession();
  if (!session || session.roleName !== "owner") {
    redirect("/settings/profile");
  }
  return <WorkspaceSettingsForm />;
}
