import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, LogOut } from "lucide-react";
import { requireUser } from "@/lib/dal";
import { getSystemSettings } from "@/lib/settings";
import { logout } from "@/app/actions/auth";
import { AutoLogout } from "@/components/auto-logout";

// Pracovní mód: zjednodušené mobilní UI bez bočního menu.
export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const settings = await getSystemSettings();
  const isManager = user.role === "ADMIN" || user.role === "MANAGER";

  return (
    <div className="flex min-h-svh flex-col bg-slate-100">
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-[#103D63] px-4 py-2.5 text-white shadow">
        <Link href="/m" className="flex items-center gap-2">
          <Image src="/icon-192.png" alt="" width={30} height={30} className="rounded-md" />
          <span className="text-base font-semibold">Zásobník</span>
        </Link>
        <span className="ml-auto text-sm text-white/70">{user.name.split(" ")[0]}</span>
        {isManager && (
          <Link href="/vyber-modu" title="Přepnout mód"
            className="flex size-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
            <LayoutDashboard className="size-4.5" />
          </Link>
        )}
        <form action={logout}>
          <button type="submit" title="Odhlásit se"
            className="flex size-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
            <LogOut className="size-4.5" />
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 p-4">{children}</main>
      <AutoLogout minutes={settings.autoLogoutMinutes} />
    </div>
  );
}
