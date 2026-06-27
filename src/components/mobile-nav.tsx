"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { LogoutButton } from "@/components/logout-button";
import type { NavItem } from "@/lib/nav";
import type { Role } from "@/lib/enums";

export function MobileNav({
  items,
  user,
}: {
  items: NavItem[];
  user: { name: string; email: string; role: Role };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Menu"
        className="flex size-9 items-center justify-center rounded-md text-white hover:bg-white/10"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Svět úsměvů · Zásobník</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks items={items} onNavigate={() => setOpen(false)} />
        </div>
        <div className="space-y-1 border-t p-3">
          <UserMenu name={user.name} email={user.email} role={user.role} />
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
