"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen, Smartphone } from "lucide-react";
import { NavLinks } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { BackButton } from "@/components/back-button";
import type { NavItem } from "@/lib/nav";
import type { Role } from "@/lib/enums";

export function AppShell({
  items,
  user,
  children,
}: {
  items: NavItem[];
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("sidebarCollapsed") === "1") setCollapsed(true);
  }, []);
  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem("sidebarCollapsed", c ? "0" : "1");
      return !c;
    });
  }

  return (
    <div className="h-screen">
      {/* Boční menu — fixní, vždy přes celou výšku okna, nemizí při scrollu */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col bg-[#103D63] md:flex",
          collapsed ? "md:w-16" : "md:w-64",
        )}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-3">
          {!collapsed && (
            <Link href="/dashboard" className="flex flex-1 items-center px-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand-logo.png" alt="Svět úsměvů" className="h-8 w-auto" />
            </Link>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Rozbalit menu" : "Sbalit menu"}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg text-[#C7D8EC] hover:bg-white/10 hover:text-white",
              collapsed && "mx-auto",
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks items={items} dark collapsed={collapsed} />
        </div>

        <div className="space-y-1 border-t border-white/10 p-3">
          {/* Přepnutí do zjednodušeného pracovního módu — dole nad uživatelem */}
          <Link
            href="/m"
            title="Pracovní mód"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#C7D8EC] hover:bg-white/10 hover:text-white",
              collapsed && "justify-center px-0",
            )}
          >
            <Smartphone className="size-4 shrink-0" />
            {!collapsed && "Pracovní mód"}
          </Link>
          {collapsed ? (
            <LogoutButton dark collapsed />
          ) : (
            <>
              <UserMenu name={user.name} email={user.email} role={user.role} dark />
              <LogoutButton dark />
            </>
          )}
        </div>
      </aside>

      {/* Obsah — odsazený o šířku menu, scrolluje jen tato část */}
      <div className={cn("flex h-screen flex-col", collapsed ? "md:pl-16" : "md:pl-64")}>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-[#103D63] px-4 md:hidden">
          <MobileNav items={items} user={user} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-logo.png" alt="Svět úsměvů" className="h-7 w-auto" />
          <Link href="/m" title="Pracovní mód"
            className="ml-auto flex size-9 items-center justify-center rounded-lg text-[#C7D8EC] hover:bg-white/10 hover:text-white">
            <Smartphone className="size-5" />
          </Link>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
          <BackButton />
          {children}
        </main>
      </div>
    </div>
  );
}
