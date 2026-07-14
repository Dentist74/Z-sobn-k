import {
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  Boxes,
  Warehouse,
  ClipboardList,
  ChartPie,
  Stethoscope,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  Cpu,
  Tags,
  Settings,
  Upload,
  Users,
  History,
  FileText,
  BarChart3,
  CalendarClock,
  Smartphone,
  type LucideProps,
} from "lucide-react";

const ICONS = {
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  Boxes,
  Warehouse,
  ClipboardList,
  ChartPie,
  Stethoscope,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  Cpu,
  Tags,
  Settings,
  Upload,
  Users,
  History,
  FileText,
  BarChart3,
  CalendarClock,
  Smartphone,
} as const;

export type IconName = keyof typeof ICONS;

export function NavIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name as IconName] ?? Boxes;
  return <Icon {...props} />;
}
