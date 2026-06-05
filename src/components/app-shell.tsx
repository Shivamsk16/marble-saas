"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Box,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  Truck,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { ToastProvider } from "@/components/ui/toast";
import { trapTabKey } from "@/lib/focus-trap";
import { filterNavGroups, getSearchPages } from "@/lib/navigation";
import { PermissionsProvider } from "@/components/permissions-provider";

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/my-tasks": ClipboardList,
  "/inventory": Package,
  "/inventory/slabs": Package,
  "/orders": Box,
  "/orders/new": Box,
  "/production": Wrench,
  "/cutter": Wrench,
  "/clients": Users,
  "/clients/new": Users,
  "/invoices": FileText,
  "/invoices/new": FileText,
  "/ewb": Truck,
  "/labour": Users,
  "/labour/workers": Users,
  "/labour/workers/new": Users,
  "/labour/attendance": Users,
  "/labour/tasks": ClipboardList,
  "/labour/wages": CreditCard,
  "/reminders": Bell,
  "/reports": FileText,
  "/guidelines": Settings,
  "/settings/profile": User,
  "/settings/workspace": Building2,
  "/settings/team": Users,
  "/settings/billing": CreditCard,
};

export function AppShell({
  children,
  tenantName,
  roleName,
  permissions,
  userName,
}: {
  children: React.ReactNode;
  tenantName?: string;
  roleName?: string;
  permissions?: Record<string, boolean>;
  userName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const role = roleName ?? "owner";
  const perms = permissions ?? {};
  const navGroups = filterNavGroups(perms, role);
  const searchPages = getSearchPages(perms, role);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; body?: string; link?: string; severity: string; readAt?: string }[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchTriggerRef = useRef<HTMLElement | null>(null);
  const searchDialogRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const notifButtonRef = useRef<HTMLButtonElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);

  const openSearch = useCallback((trigger?: HTMLElement | null) => {
    if (trigger) searchTriggerRef.current = trigger;
    setSearchOpen(true);
    setSearchQuery("");
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    requestAnimationFrame(() => {
      searchTriggerRef.current?.focus();
    });
  }, []);

  const closeNotifications = useCallback(() => {
    setNotifOpen(false);
    requestAnimationFrame(() => {
      notifButtonRef.current?.focus();
    });
  }, []);

  const loadNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifications();
    const t = setInterval(loadNotifications, 60000);
    return () => clearInterval(t);
  }, [loadNotifications]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch(document.activeElement as HTMLElement | null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    if (!searchOpen) return;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSearch();
        return;
      }
      if (searchDialogRef.current) {
        trapTabKey(e, searchDialogRef.current);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen, closeSearch]);

  useEffect(() => {
    if (!notifOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeNotifications();
        return;
      }

      const menu = notifMenuRef.current;
      if (!menu) return;

      const items = Array.from(
        menu.querySelectorAll<HTMLElement>('[role="menuitem"]')
      );
      if (!items.length) return;

      const activeIndex = items.findIndex((item) => item === document.activeElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
        items[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
        items[prev]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => {
      const first = notifMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      first?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notifOpen, closeNotifications]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadNotifications();
  }

  const filteredSearch = searchPages.filter((p) =>
    p.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mobileNavItems = navGroups.flatMap((g) => g.items);
  const MOBILE_PRIMARY_COUNT = 4;
  const mobilePrimaryItems = mobileNavItems.slice(0, MOBILE_PRIMARY_COUNT);
  const showMobileMore = mobileNavItems.length > MOBILE_PRIMARY_COUNT;

  const sidebarContent = (
    <>
      <div className={cn("flex items-center gap-3 px-3 py-4 border-b border-[var(--border-subtle)]", collapsed && "justify-center px-2")}>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[var(--accent)] truncate">MarblePro</p>
            <p className="text-[var(--text-xs)] text-[var(--text-muted)] truncate">{tenantName}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => {
          const items = group.items;
          if (!items.length) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[var(--text-caption)] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[var(--text-sm)] transition-colors",
                        active
                          ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-medium"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className={cn("p-3 border-t border-[var(--border-subtle)]", collapsed && "px-2")}>
        <button
          type="button"
          onClick={logout}
          className={cn(
            "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[var(--text-sm)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </>
  );

  return (
    <PermissionsProvider permissions={perms}>
    <ToastProvider>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="min-h-screen flex bg-[var(--background)]">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-[var(--border-subtle)] bg-[var(--surface)] shrink-0 transition-all duration-200",
            collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]"
          )}
        >
          {sidebarContent}
        </aside>

        {/* Mobile sheet */}
        <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" title="Menu">
          <div className="flex flex-col h-full -m-4">{sidebarContent}</div>
        </Sheet>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface)]/95 backdrop-blur-sm px-4 md:px-6">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
            <button
              type="button"
              onClick={(e) => openSearch(e.currentTarget)}
              className="hidden sm:flex items-center gap-2 flex-1 max-w-md h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-sm)] text-[var(--text-muted)] hover:border-[var(--border)]"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span>Search…</span>
              <kbd className="ml-auto text-[var(--text-xs)] bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">⌘K</kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={(e) => openSearch(e.currentTarget)}
              aria-label="Search pages"
            >
              <Search className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Button
                  ref={notifButtonRef}
                  variant="ghost"
                  size="icon"
                  onClick={() => setNotifOpen((open) => !open)}
                  aria-label="Notifications"
                  aria-haspopup="menu"
                  aria-expanded={notifOpen}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={closeNotifications} aria-hidden="true" />
                    <div
                      ref={notifMenuRef}
                      role="menu"
                      aria-label="Notifications"
                      className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-md)] z-50"
                    >
                      <div className="px-4 py-3 border-b border-[var(--border-subtle)] font-medium text-[var(--text-sm)]">
                        Notifications
                      </div>
                      {notifications.length === 0 ? (
                        <p className="p-4 text-[var(--text-sm)] text-[var(--text-muted)]" role="presentation">
                          No notifications
                        </p>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <Link
                            key={n.id}
                            href={n.link ?? "/reminders"}
                            role="menuitem"
                            tabIndex={-1}
                            onClick={() => { markRead(n.id); closeNotifications(); }}
                            className={cn(
                              "block px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-2)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]",
                              !n.readAt && "bg-[var(--accent-subtle)]/20"
                            )}
                          >
                            <p className="text-[var(--text-sm)] font-medium">{n.title}</p>
                            {n.body && <p className="text-[var(--text-xs)] text-[var(--text-muted)] mt-0.5">{n.body}</p>}
                          </Link>
                        ))
                      )}
                      <Link
                        href="/reminders"
                        role="menuitem"
                        tabIndex={-1}
                        className="block px-4 py-2 text-center text-[var(--text-sm)] text-[var(--accent)] hover:bg-[var(--surface-2)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
                        onClick={closeNotifications}
                      >
                        View all
                      </Link>
                    </div>
                  </>
                )}
              </div>
              <Link
                href="/settings/profile"
                className="hidden sm:flex items-center gap-2 pl-2 border-l border-[var(--border-subtle)] rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] pr-2 py-1 -my-1"
              >
                <Avatar name={userName ?? role} size="sm" />
                <div className="text-[var(--text-xs)]">
                  <p className="font-medium text-[var(--text)] capitalize">{userName ?? role}</p>
                  <p className="text-[var(--text-muted)] capitalize">{role}</p>
                </div>
              </Link>
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto outline-none">
            {children}
          </main>

          {/* Mobile bottom nav — primary tabs + More opens full menu */}
          <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--border-subtle)] bg-[var(--surface)] safe-area-pb"
            aria-label="Mobile navigation"
          >
            {mobilePrimaryItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px]",
                    active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {showMobileMore && (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px]",
                  mobileOpen ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                )}
                aria-label="More navigation"
              >
                <Menu className="h-5 w-5" />
                <span>More</span>
              </button>
            )}
          </nav>
          <div className="h-16 md:hidden" />
        </div>

        {/* Command palette */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeSearch}
              aria-hidden="true"
            />
            <div
              ref={searchDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Search pages"
              className="relative w-full max-w-lg rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-md)] overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 border-b border-[var(--border-subtle)]">
                <Search className="h-4 w-4 text-[var(--text-muted)]" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pages…"
                  aria-label="Search pages"
                  className="flex-1 h-12 bg-transparent outline-none text-[var(--text-sm)]"
                />
                <button type="button" onClick={closeSearch} aria-label="Close search">
                  <X className="h-4 w-4 text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto py-2" role="listbox" aria-label="Search results">
                {filteredSearch.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    role="option"
                    onClick={closeSearch}
                    className="block px-4 py-2.5 text-[var(--text-sm)] hover:bg-[var(--surface-2)]"
                  >
                    {p.label}
                  </Link>
                ))}
                {filteredSearch.length === 0 && (
                  <p className="px-4 py-6 text-[var(--text-sm)] text-[var(--text-muted)] text-center">No results</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
    </PermissionsProvider>
  );
}
