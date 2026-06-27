import { requireRole } from "@/lib/dal";
import { getSystemSettings } from "@/lib/settings";
import { SystemSettingsForm } from "@/components/system-settings-form";

export const metadata = { title: "Nastavení systému – Zásobník" };

export default async function SystemSettingsPage() {
  await requireRole("MANAGER");
  const settings = await getSystemSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nastavení systému</h1>
        <p className="mt-1 text-slate-500">Chování aplikace pro celou kliniku.</p>
      </div>
      <SystemSettingsForm autoLogoutMinutes={settings.autoLogoutMinutes} />
    </div>
  );
}
