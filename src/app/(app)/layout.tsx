import { requireUser } from "@/lib/dal";
import { navItemsForRole } from "@/lib/nav";
import { getSystemSettings } from "@/lib/settings";
import { AppShell } from "@/components/app-shell";
import { NavGuardProvider } from "@/components/nav-guard";
import { AutoLogout } from "@/components/auto-logout";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const items = navItemsForRole(user.role);
  const settings = await getSystemSettings();

  return (
    <NavGuardProvider>
      <AppShell items={items} user={user}>
        {children}
      </AppShell>
      <AutoLogout minutes={settings.autoLogoutMinutes} />
    </NavGuardProvider>
  );
}
