// Konfigurační konstanty aplikace (později může přejít do nastavení v DB).

// Kolik dní předem upozorňovat na expiraci šarží.
export const EXPIRY_WARN_DAYS = 30;

// Prahy pro barevné odlišení expirace (dní předem).
export const EXPIRY_THRESHOLDS = {
  critical: 7,
  warning: 30,
  notice: 60,
} as const;
