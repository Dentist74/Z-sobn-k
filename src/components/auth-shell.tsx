import Link from "next/link";

// Branded obal pro přihlášení / registraci / pozvánku — vlevo dental panel, vpravo formulář.
export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen bg-[#EEF3F9]">
      {/* Levý brandový panel s dental motivem */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#103D63] p-10 text-white lg:flex">
        {/* dekorativní zub / úsměv */}
        <svg viewBox="0 0 400 400" className="pointer-events-none absolute -right-16 -bottom-16 h-[420px] w-[420px] opacity-10" aria-hidden="true">
          <path
            d="M200 70 C150 70 110 95 110 150 C110 200 130 250 145 295 C153 320 180 325 190 300 C198 278 200 235 200 235 C200 235 202 278 210 300 C220 325 247 320 255 295 C270 250 290 200 290 150 C290 95 250 70 200 70 Z"
            fill="none" stroke="#F4B63E" strokeWidth="6"
          />
          <path
            d="M200 130 c-10 -16 -38 -10 -38 10 c0 16 28 30 38 40 c10 -10 38 -24 38 -40 c0 -20 -28 -26 -38 -10 Z"
            fill="#F4B63E"
          />
        </svg>

        <Link href="/login" className="relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-logo.png" alt="Svět úsměvů" className="h-12 w-auto" />
        </Link>

        <div className="relative z-10 max-w-sm">
          <h2 className="text-3xl font-semibold leading-tight">Zásobník</h2>
          <p className="mt-3 text-lg text-[#CBDAEC]">
            Skladový systém kliniky Svět úsměvů — přehled o materiálu, expiracích
            i objednávkách na jednom místě.
          </p>
          <p className="mt-6 text-sm text-[#8FB0CE]">„Vaše úsměvy, naše poslání."</p>
        </div>

        <div className="relative z-10 flex gap-2 text-[#8FB0CE]">
          <span className="size-2 rounded-full bg-[#F4B63E]" />
          <span className="size-2 rounded-full bg-white/30" />
          <span className="size-2 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Pravá strana s formulářem */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {children}
          {footer && <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
