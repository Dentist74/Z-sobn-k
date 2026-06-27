import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { SETTINGS_ITEMS } from "@/lib/nav";
import { NavIcon } from "@/components/nav-icon";

export const metadata = { title: "Nastavení – Zásobník" };

export default async function SettingsPage() {
  await requireRole("MANAGER");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nastavení</h1>
        <p className="mt-1 text-slate-500">Číselníky a konfigurace skladu.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg border bg-white p-4 hover:border-slate-300 hover:shadow-sm"
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <NavIcon name={item.icon} className="size-5" />
            </span>
            <span className="font-medium text-slate-900">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
