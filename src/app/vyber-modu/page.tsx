import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Smartphone, LayoutDashboard } from "lucide-react";
import { requireUser } from "@/lib/dal";

export const metadata = { title: "Výběr módu – Zásobník" };

// Vedení si po přihlášení vybírá: pracovní (zjednodušený) × správní (plné UI).
export default async function ModeSelectPage() {
  const user = await requireUser();
  if (user.role === "STAFF") redirect("/m");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#103D63] p-6">
      <Image src="/brand-logo.png" alt="Svět úsměvů" width={210} height={64} className="mb-2 h-14 w-auto" />
      <h1 className="text-xl font-semibold text-white">Zásobník</h1>
      <p className="mb-8 mt-1 text-sm text-white/70">Ahoj {user.name.split(" ")[0]}, jak chceš pracovat?</p>

      <div className="grid w-full max-w-md gap-4">
        <Link href="/m"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-lg transition hover:scale-[1.02]">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#F4B63E]/20">
            <Smartphone className="size-7 text-[#103D63]" />
          </span>
          <span>
            <span className="block text-lg font-semibold text-[#103D63]">Pracovní mód</span>
            <span className="text-sm text-slate-500">Rychlý příjem, výdej a hledání — velká tlačítka</span>
          </span>
        </Link>

        <Link href="/dashboard"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-lg transition hover:scale-[1.02]">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#103D63]/10">
            <LayoutDashboard className="size-7 text-[#103D63]" />
          </span>
          <span>
            <span className="block text-lg font-semibold text-[#103D63]">Správní mód</span>
            <span className="text-sm text-slate-500">Plné rozhraní — karty, objednávky, reporty, nastavení</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
