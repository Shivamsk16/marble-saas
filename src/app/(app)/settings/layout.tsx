import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings-nav";
import { getSession } from "@/lib/auth";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl">
      <SettingsNav role={session.roleName} />
      {children}
    </div>
  );
}
