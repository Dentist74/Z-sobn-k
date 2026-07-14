import Link from "next/link";
import {
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  Search,
  ClipboardList,
  Barcode,
} from "lucide-react";
import { requireUser, can } from "@/lib/dal";

export const metadata = { title: "Zásobník" };

const tileClass =
  "flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition active:scale-95";

// Úvodní obrazovka pracovního módu — velká akční tlačítka.
export default async function MobileHomePage() {
  const user = await requireUser();
  const isManager = can(user, "MANAGER");

  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <Link href="/m/prijem" className={tileClass}>
        <span className="flex size-16 items-center justify-center rounded-2xl bg-green-100">
          <PackagePlus className="size-8 text-green-700" />
        </span>
        <span className="text-lg font-semibold text-slate-800">Příjem</span>
      </Link>

      <Link href="/m/vydej" className={tileClass}>
        <span className="flex size-16 items-center justify-center rounded-2xl bg-blue-100">
          <PackageMinus className="size-8 text-blue-700" />
        </span>
        <span className="text-lg font-semibold text-slate-800">Výdej</span>
      </Link>

      <Link href="/m/preskladneni" className={tileClass}>
        <span className="flex size-16 items-center justify-center rounded-2xl bg-violet-100">
          <ArrowLeftRight className="size-8 text-violet-700" />
        </span>
        <span className="text-lg font-semibold text-slate-800">Přeskladnění</span>
      </Link>

      <Link href="/m/hledat" className={tileClass}>
        <span className="flex size-16 items-center justify-center rounded-2xl bg-amber-100">
          <Search className="size-8 text-amber-700" />
        </span>
        <span className="text-lg font-semibold text-slate-800">Vyhledávání</span>
      </Link>

      {isManager && (
        <>
          <Link href="/m/inventura" className={tileClass}>
            <span className="flex size-16 items-center justify-center rounded-2xl bg-slate-200">
              <ClipboardList className="size-8 text-slate-700" />
            </span>
            <span className="text-lg font-semibold text-slate-800">Inventura</span>
          </Link>

          <Link href="/m/ean" className={tileClass}>
            <span className="flex size-16 items-center justify-center rounded-2xl bg-slate-200">
              <Barcode className="size-8 text-slate-700" />
            </span>
            <span className="text-center text-lg font-semibold leading-tight text-slate-800">
              Přidělení EAN kódu
            </span>
          </Link>
        </>
      )}
    </div>
  );
}
