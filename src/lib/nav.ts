import type { Role } from "@/lib/enums";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // název ikony z lucide-react
  roles?: Role[]; // pokud nevyplněno → vidí všichni přihlášení
};

// Pozn.: „Pracovní mód" není v NAV_ITEMS — má vlastní tlačítko v patičce sidebaru.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Přehled", icon: "LayoutDashboard" },
  { href: "/naskladneni", label: "Naskladnění", icon: "PackagePlus" },
  { href: "/vydej", label: "Výdej", icon: "PackageMinus" },
  { href: "/produkty", label: "Skladové karty", icon: "Boxes" },
  {
    href: "/preskladneni",
    label: "Přeskladnění",
    icon: "ArrowLeftRight",
    roles: ["MANAGER"],
  },
  {
    href: "/inventura",
    label: "Inventura",
    icon: "ClipboardList",
    roles: ["MANAGER"],
  },
  // Objednávky zatím schované z menu (routy zůstávají — na přání se vrátí).
  {
    href: "/expirace",
    label: "Expirace",
    icon: "CalendarClock",
    roles: ["MANAGER"],
  },
  // Hub: Spotřeba materiálu, Doklady a Historie akcí žijí pod Reporty.
  {
    href: "/reporty",
    label: "Reporty",
    icon: "BarChart3",
    roles: ["MANAGER"],
  },
  {
    href: "/nastaveni",
    label: "Nastavení",
    icon: "Settings",
    roles: ["MANAGER"],
  },
];

// Položky hubu Reporty (stránka /reporty).
export const REPORT_ITEMS: NavItem[] = [
  { href: "/reporty/naklady", label: "Náklady a grafy", icon: "BarChart3" },
  { href: "/spotreba", label: "Spotřeba materiálu", icon: "ChartPie" },
  { href: "/doklady", label: "Doklady", icon: "FileText" },
  { href: "/historie", label: "Historie akcí", icon: "History" },
];

// Položky pod sekcí Nastavení (hub stránka /nastaveni).
export const SETTINGS_ITEMS: NavItem[] = [
  { href: "/nastaveni/uzivatele", label: "Uživatelé", icon: "Users" },
  { href: "/sklady", label: "Sklady", icon: "Warehouse" },
  { href: "/dodavatele", label: "Dodavatelé", icon: "Truck" },
  { href: "/kategorie", label: "Kategorie", icon: "Tags" },
  { href: "/ordinace", label: "Ordinace", icon: "Stethoscope" },
  { href: "/zarizeni", label: "Zařízení", icon: "Cpu" },
  { href: "/nastaveni/import", label: "Import produktů", icon: "Upload" },
  { href: "/nastaveni/system", label: "Nastavení systému", icon: "Settings" },
];

// Vrací položky viditelné pro danou roli (ADMIN vidí vše).
export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.roles || role === "ADMIN" || item.roles.includes(role),
  );
}
