// Centrální definice "enumů" (SQLite je nepodporuje nativně, držíme je jako String).
// Slouží zároveň jako jediný zdroj pravdy pro validaci i UI popisky.

export const ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrátor",
  MANAGER: "Hlavní sestra",
  STAFF: "Běžný uživatel",
};

export const WAREHOUSE_TYPES = [
  "CONSUMABLE",
  "CONSUMPTION",
  "SMALL_EQUIPMENT",
  "LARGE_EQUIPMENT",
  "OTHER",
] as const;
export type WarehouseType = (typeof WAREHOUSE_TYPES)[number];

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  CONSUMABLE: "Spotřební materiál",
  CONSUMPTION: "Konzumní",
  SMALL_EQUIPMENT: "Malé vybavení",
  LARGE_EQUIPMENT: "Velké vybavení",
  OTHER: "Ostatní",
};

export const UNITS = ["PCS", "BOX", "PACK", "ML", "G", "OTHER"] as const;
export type Unit = (typeof UNITS)[number];

export const UNIT_LABELS: Record<Unit, string> = {
  PCS: "ks",
  BOX: "krabice",
  PACK: "balení",
  ML: "ml",
  G: "g",
  OTHER: "jiné",
};

export const MOVEMENT_TYPES = [
  "RECEIPT",
  "ISSUE",
  "WRITE_OFF",
  "ADJUSTMENT",
  "TRANSFER",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  RECEIPT: "Naskladnění",
  ISSUE: "Výdej",
  WRITE_OFF: "Odpis",
  ADJUSTMENT: "Korekce (inventura)",
  TRANSFER: "Převod",
};

export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}

export const ORDER_STATUSES = [
  "DRAFT",
  "SENT",
  "CONFIRMED",
  "RECEIVED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Návrh",
  SENT: "Odesláno",
  CONFIRMED: "Potvrzeno",
  RECEIVED: "Přijato",
  CANCELLED: "Zrušeno",
};
