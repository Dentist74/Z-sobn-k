"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { useNavGuard } from "@/components/nav-guard";

export function LogoutButton({ dark = false, collapsed = false }: { dark?: boolean; collapsed?: boolean }) {
  const { confirmLeave } = useNavGuard();
  return (
    <button
      type="button"
      title={collapsed ? "Odhlásit se" : undefined}
      onClick={() => {
        if (confirmLeave()) logout();
      }}
      className={
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
        (collapsed ? "justify-center px-0 " : "") +
        (dark
          ? "text-[#C7D8EC] hover:bg-white/10 hover:text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
      }
    >
      <LogOut className="size-4" /> {!collapsed && "Odhlásit se"}
    </button>
  );
}
