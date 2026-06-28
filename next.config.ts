import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vývojový indikátor přesunut, ať se nepřekrývá s tlačítkem odhlášení vlevo dole.
  devIndicators: {
    position: "bottom-right",
  },
  // Větší limit pro server actions kvůli nahrávání fotek (faktury, doklady).
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
