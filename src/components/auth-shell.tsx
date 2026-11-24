// Branded obal pro přihlášení / registraci / pozvánku.
// Moderní tmavý vzhled sladěný s ostatními nástroji kliniky (CBCT plánovač,
// generátor léčebných plánů): navy gradient, zlaté glow akcenty, glass karta.
export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-10"
      style={{ background: "linear-gradient(135deg,#152A45 0%,#0F1E32 100%)" }}
    >
      {/* měkké světelné akcenty (zlatá + modrá) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 78% 12%, rgba(226,169,59,.13), transparent 60%)," +
            "radial-gradient(800px 560px at 6% 95%, rgba(80,140,190,.17), transparent 60%)," +
            "radial-gradient(520px 320px at 50% 115%, rgba(226,169,59,.08), transparent 70%)",
        }}
      />

      {/* dekorativní zub se srdíčkem */}
      <svg
        viewBox="0 0 400 400"
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-16 h-[480px] w-[480px] opacity-[0.07]"
      >
        <path
          d="M200 70 C150 70 110 95 110 150 C110 200 130 250 145 295 C153 320 180 325 190 300 C198 278 200 235 200 235 C200 235 202 278 210 300 C220 325 247 320 255 295 C270 250 290 200 290 150 C290 95 250 70 200 70 Z"
          fill="none" stroke="#F4B63E" strokeWidth="6"
        />
        <path
          d="M200 130 c-10 -16 -38 -10 -38 10 c0 16 28 30 38 40 c10 -10 38 -24 38 -40 c0 -20 -28 -26 -38 -10 Z"
          fill="#F4B63E"
        />
      </svg>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand-logo.png"
          alt="Svět úsměvů"
          className="mb-7 h-12 w-auto drop-shadow-[0_6px_24px_rgba(226,169,59,.35)]"
        />

        {children}

        <p className="mt-7 text-sm tracking-wide text-[#8FB0CE]">
          „Vaše úsměvy, naše poslání."
        </p>
        {footer && (
          <div className="mt-3 text-center text-sm text-[#8FB0CE]">{footer}</div>
        )}
      </div>
    </main>
  );
}
