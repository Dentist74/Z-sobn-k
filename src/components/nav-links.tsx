"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NavIcon } from "@/components/nav-icon";
import { useNavGuard } from "@/components/nav-guard";
import type { NavItem } from "@/lib/nav";

export function NavLinks({
  items,
  onNavigate,
  dark = false,
  collapsed = false,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  dark?: boolean;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { confirmLeave } = useNavGuard();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => {
              if (!confirmLeave()) {
                e.preventDefault();
                return;
              }
              onNavigate?.();
            }}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              dark
                ? active
                  ? "bg-white text-[#103D63] [&_svg]:text-[#103D63]"
                  : "text-[#C7D8EC] hover:bg-white/10 hover:text-white"
                : active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <NavIcon name={item.icon} className="size-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}
