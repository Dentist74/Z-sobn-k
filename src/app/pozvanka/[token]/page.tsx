import Link from "next/link";
import { db } from "@/lib/db";
import { AuthShell } from "@/components/auth-shell";
import { AcceptInviteForm } from "@/components/accept-invite-form";
import { ROLE_LABELS, type Role } from "@/lib/enums";

export const metadata = { title: "Pozvánka – Zásobník" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const inv = await db.invitation.findUnique({ where: { token } });
  const valid = inv && !inv.acceptedAt && inv.expiresAt > new Date();

  return (
    <AuthShell
      footer={
        <Link href="/login" className="font-medium text-[#103D63] hover:underline">
          Zpět na přihlášení
        </Link>
      }
    >
      {valid ? (
        <AcceptInviteForm
          token={token}
          roleLabel={ROLE_LABELS[inv!.role as Role] ?? inv!.role}
          email={inv!.email}
        />
      ) : (
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Pozvánka neplatná</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tato pozvánka už byla použita nebo vypršela. Požádej správce o novou.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
