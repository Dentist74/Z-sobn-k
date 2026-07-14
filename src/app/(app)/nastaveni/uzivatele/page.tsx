import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { UsersManager, type UserVM } from "@/components/users-manager";

export const metadata = { title: "Uživatelé – Zásobník" };

export default async function UsersPage() {
  const actor = await requireRole("MANAGER");
  const [users, invites] = await Promise.all([
    db.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, active: true, pinHash: true },
    }),
    db.invitation.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, token: true, email: true, role: true, multiUse: true },
    }),
  ]);

  const rows: UserVM[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    hasPin: !!u.pinHash,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Uživatelé</h1>
        <p className="mt-1 text-slate-500">
          Zakládání účtů, role a PIN pro rychlé přihlášení.
        </p>
      </div>
      <UsersManager rows={rows} invites={invites} actorRole={actor.role} actorId={actor.id} />
    </div>
  );
}
