import Link from "next/link";
import { LoginScreen } from "@/components/login-screen";
import { AuthShell } from "@/components/auth-shell";
import { isSetupOpen } from "@/app/actions/onboarding";

export const metadata = {
  title: "Přihlášení – Zásobník",
};

// Stránka čte stav DB (isSetupOpen) za běhu — nesmí se prerenderovat při buildu.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const setupOpen = await isSetupOpen();
  return (
    <AuthShell
      footer={
        setupOpen ? (
          <Link href="/registrace" className="font-medium text-[#103D63] hover:underline">
            Začínáš? Vytvoř účet majitele kliniky →
          </Link>
        ) : null
      }
    >
      <LoginScreen />
    </AuthShell>
  );
}
