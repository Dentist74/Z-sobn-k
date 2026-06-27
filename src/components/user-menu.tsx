"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/enums";

export function UserMenu({
  name,
  email,
  role,
  dark = false,
}: {
  name: string;
  email: string;
  role: Role;
  dark?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm " +
          (dark ? "hover:bg-white/10" : "hover:bg-slate-100")
        }
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F4B63E] text-sm font-medium text-[#103D63]">
          {name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || <UserIcon className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={"block truncate font-medium " + (dark ? "text-white" : "text-slate-900")}>
            {name}
          </span>
          <span className={"block truncate text-xs " + (dark ? "text-[#8FB0CE]" : "text-slate-500")}>
            {ROLE_LABELS[role]}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-slate-500">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="size-4" />
          Odhlásit se
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
