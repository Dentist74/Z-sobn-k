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

      {/* moderní dentální scéna v pozadí: rozeseté zuby, částice a oblouky úsměvů */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <g id="tooth">
            <path
              d="M200 70 C150 70 110 95 110 150 C110 200 130 250 145 295 C153 320 180 325 190 300 C198 278 200 235 200 235 C200 235 202 278 210 300 C220 325 247 320 255 295 C270 250 290 200 290 150 C290 95 250 70 200 70 Z"
              fill="none" strokeWidth="7"
            />
            <path
              d="M200 130 c-10 -16 -38 -10 -38 10 c0 16 28 30 38 40 c10 -10 38 -24 38 -40 c0 -20 -28 -26 -38 -10 Z"
              fill="currentColor" stroke="none"
            />
          </g>
        </defs>

        {/* velký zub vpravo dole (hlavní motiv) */}
        <use href="#tooth" transform="translate(1060,440) scale(1.35)"
          stroke="#F4B63E" color="#F4B63E" opacity="0.08" />
        {/* menší zuby rozeseté po ploše */}
        <use href="#tooth" transform="translate(60,40) scale(0.62) rotate(-14 200 200)"
          stroke="#8FB0CE" color="#8FB0CE" opacity="0.07" />
        <use href="#tooth" transform="translate(1120,-60) scale(0.5) rotate(12 200 200)"
          stroke="#F4B63E" color="#F4B63E" opacity="0.06" />
        <use href="#tooth" transform="translate(-70,560) scale(0.8) rotate(10 200 200)"
          stroke="#F4B63E" color="#F4B63E" opacity="0.055" />
        <use href="#tooth" transform="translate(420,700) scale(0.4) rotate(-8 200 200)"
          stroke="#8FB0CE" color="#8FB0CE" opacity="0.08" />
        <use href="#tooth" transform="translate(760,-40) scale(0.34) rotate(18 200 200)"
          stroke="#8FB0CE" color="#8FB0CE" opacity="0.07" />

        {/* oblouky úsměvu */}
        <path d="M-40 260 Q 360 470 760 260" fill="none" stroke="#F4B63E"
          strokeWidth="1.5" strokeDasharray="2 10" opacity="0.28" strokeLinecap="round" />
        <path d="M680 760 Q 1070 930 1480 740" fill="none" stroke="#8FB0CE"
          strokeWidth="1.5" strokeDasharray="2 10" opacity="0.25" strokeLinecap="round" />

        {/* zlaté a modré částice */}
        <g fill="#F4B63E">
          <circle cx="180" cy="210" r="2.4" opacity="0.5" />
          <circle cx="340" cy="120" r="1.6" opacity="0.35" />
          <circle cx="520" cy="620" r="2" opacity="0.4" />
          <circle cx="905" cy="150" r="2.6" opacity="0.45" />
          <circle cx="1240" cy="330" r="1.8" opacity="0.4" />
          <circle cx="1330" cy="640" r="2.4" opacity="0.5" />
          <circle cx="90" cy="430" r="1.7" opacity="0.35" />
          <circle cx="640" cy="90" r="1.5" opacity="0.3" />
        </g>
        <g fill="#8FB0CE">
          <circle cx="260" cy="700" r="2.2" opacity="0.4" />
          <circle cx="470" cy="300" r="1.5" opacity="0.3" />
          <circle cx="1050" cy="90" r="1.8" opacity="0.35" />
          <circle cx="1160" cy="770" r="2" opacity="0.4" />
          <circle cx="820" cy="520" r="1.4" opacity="0.3" />
          <circle cx="1400" cy="180" r="1.6" opacity="0.35" />
        </g>
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
