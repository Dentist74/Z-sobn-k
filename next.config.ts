import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vývojový indikátor přesunut, ať se nepřekrývá s tlačítkem odhlášení vlevo dole.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
