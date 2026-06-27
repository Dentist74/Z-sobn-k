import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";
import { isSetupOpen } from "@/app/actions/onboarding";

export const metadata = { title: "Registrace – Zásobník" };

export default async function RegisterPage() {
  // Registrace majitele je možná jen při prvním nastavení (žádný admin).
  if (!(await isSetupOpen())) redirect("/login");

  return (
    <AuthShell
      footer={
        <Link href="/login" className="font-medium text-[#103D63] hover:underline">
          Už máš účet? Přihlásit se →
        </Link>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
