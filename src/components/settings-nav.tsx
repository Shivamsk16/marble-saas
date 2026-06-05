"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const allItems = [
  { href: "/settings/profile", label: "Profile", icon: User, ownerOnly: false },
  { href: "/settings/workspace", label: "Workspace", icon: Building2, ownerOnly: true },
  { href: "/settings/team", label: "Team", icon: Users, ownerOnly: true },
  { href: "/settings/billing", label: "Billing", icon: CreditCard, ownerOnly: true },
] as const;

export function SettingsNav({ role }: { role: string }) {
  const pathname = usePathname();
  const isOwner = role === "owner";
  const items = allItems.filter((item) => !item.ownerOnly || isOwner);

  return (
    <nav aria-label="Settings" className="mb-6">
      <ul className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)]">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 text-[var(--text-sm)] border-b-2 -mb-px transition-colors",
                  active
                    ? "border-[var(--accent)] text-[var(--accent)] font-medium"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border)]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
