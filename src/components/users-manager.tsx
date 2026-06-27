"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, KeyRound, Power, Lock, Link2, Mail, Trash2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createUser,
  setUserPin,
  setUserPassword,
  toggleUserActive,
  setUserRole,
  type UserActionResult,
} from "@/app/actions/users";
import { createInvite, sendInviteEmail, revokeInvite } from "@/app/actions/onboarding";
import { useDirty } from "@/components/nav-guard";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/enums";

export type UserVM = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  hasPin: boolean;
};

export type InviteVM = {
  id: string;
  token: string;
  email: string | null;
  role: string;
};

function inviteLink(token: string) {
  return typeof window !== "undefined" ? `${window.location.origin}/pozvanka/${token}` : `/pozvanka/${token}`;
}

const selectClass =
  "border-input flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

export function UsersManager({
  rows,
  invites = [],
  actorRole,
  actorId,
}: {
  rows: UserVM[];
  invites?: InviteVM[];
  actorRole: string;
  actorId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isAdmin = actorRole === "ADMIN";
  const [inviteEmail, setInviteEmail] = useState("");

  function makeInvite(role: string) {
    const email = inviteEmail.trim();
    start(async () => {
      const res = await createInvite(role, email || undefined);
      if (!res.ok || !res.token) { toast.error(res.error ?? "Vytvoření pozvánky selhalo."); return; }
      const link = inviteLink(res.token);
      if (email) {
        const sent = await sendInviteEmail(res.token, link);
        if (sent.ok) toast.success(`Pozvánka odeslána na ${email}.`);
        else { await navigator.clipboard.writeText(link).catch(() => {}); toast.info(`E-mail neodeslán (${sent.error}). Odkaz zkopírován.`); }
      } else {
        await navigator.clipboard.writeText(link).catch(() => {});
        toast.success("Odkaz pozvánky zkopírován do schránky.");
      }
      setInviteEmail("");
      router.refresh();
    });
  }
  function copyInvite(token: string) {
    navigator.clipboard.writeText(inviteLink(token)).then(
      () => toast.success("Odkaz zkopírován."),
      () => toast.error("Kopírování selhalo."),
    );
  }

  const [formDirty, setFormDirty] = useState(false);
  useDirty(formDirty);

  const [state, action, formPending] = useActionState<UserActionResult | undefined, FormData>(
    createUser,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Hotovo.");
      setFormDirty(false);
      router.refresh();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  function run(fn: () => Promise<UserActionResult>) {
    start(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.error ?? "Akce selhala."); return; }
      if (res.message) toast.success(res.message);
      router.refresh();
    });
  }

  function changePin(u: UserVM) {
    const pin = prompt(`PIN pro ${u.name} (4 číslice, prázdné = zrušit):`, "");
    if (pin === null) return;
    run(() => setUserPin(u.id, pin.trim()));
  }
  function changePassword(u: UserVM) {
    const pw = prompt(`Nové heslo pro ${u.name} (min. 6 znaků):`, "");
    if (!pw) return;
    run(() => setUserPassword(u.id, pw));
  }

  return (
    <div className="space-y-6">
      {/* Nový uživatel */}
      <form action={action} onInput={() => setFormDirty(true)}
        className="space-y-4 rounded-lg border bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <UserPlus className="size-4" /> Nový uživatel
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Jméno</Label>
            <Input id="name" name="name" required placeholder="Jana Nováková" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required placeholder="jana@klinika.cz" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Heslo</Label>
            <Input id="password" name="password" type="text" required placeholder="min. 6 znaků" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pin">PIN (4 číslice)</Label>
            <Input id="pin" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required
              placeholder="pro rychlé přepínání" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            {isAdmin ? (
              <select id="role" name="role" defaultValue="STAFF" className={selectClass + " w-full"}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r as Role]}</option>
                ))}
              </select>
            ) : (
              <>
                <input type="hidden" name="role" value="STAFF" />
                <p className="flex h-9 items-center text-sm text-slate-500">
                  Běžný uživatel
                </p>
              </>
            )}
          </div>
        </div>
        <Button type="submit" disabled={formPending}>
          <UserPlus className="size-4" /> {formPending ? "Zakládám…" : "Založit uživatele"}
        </Button>
      </form>

      {/* Pozvánky odkazem / e-mailem */}
      <div className="space-y-4 rounded-lg border bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Link2 className="size-4" /> Pozvat odkazem nebo e-mailem
        </h2>
        <p className="text-sm text-slate-500">
          Vytvoř pozvánku podle role. Když vyplníš e-mail, pošle se na něj (jinak se
          odkaz zkopíruje do schránky). Odkaz je pro každou roli jiný.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="inviteEmail">E-mail (volitelně)</Label>
            <Input id="inviteEmail" type="email" value={inviteEmail} className="w-64"
              onChange={(e) => setInviteEmail(e.target.value)} placeholder="kolega@klinika.cz" />
          </div>
          {isAdmin && (
            <Button type="button" variant="outline" disabled={pending}
              onClick={() => makeInvite("MANAGER")}>
              {inviteEmail ? <Mail className="size-4" /> : <Link2 className="size-4" />}
              Pozvat vedoucí sestru
            </Button>
          )}
          <Button type="button" variant="outline" disabled={pending}
            onClick={() => makeInvite("STAFF")}>
            {inviteEmail ? <Mail className="size-4" /> : <Link2 className="size-4" />}
            Pozvat běžnou sestru
          </Button>
        </div>

        {invites.length > 0 && (
          <div className="divide-y rounded-md border">
            {invites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <Badge variant="secondary">{ROLE_LABELS[inv.role as Role] ?? inv.role}</Badge>
                <span className="text-slate-600">{inv.email ?? "odkaz (bez e-mailu)"}</span>
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => copyInvite(inv.token)}>
                    <Copy className="size-4" /> Kopírovat odkaz
                  </Button>
                  <Button variant="ghost" size="sm" disabled={pending}
                    onClick={() => run(() => revokeInvite(inv.id))}
                    className="text-red-600 focus:text-red-600">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seznam */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jméno</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id} className={!u.active ? "opacity-50" : ""}>
                <TableCell className="font-medium">
                  {u.name}
                  <span className="block text-xs text-slate-400">{u.email}</span>
                </TableCell>
                <TableCell>
                  {isAdmin && u.id !== actorId ? (
                    <select
                      defaultValue={u.role}
                      className={selectClass}
                      disabled={pending}
                      onChange={(e) => run(() => setUserRole(u.id, e.target.value))}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r as Role]}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="secondary">{ROLE_LABELS[u.role as Role] ?? u.role}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {u.hasPin ? (
                    <span className="text-sm text-green-700">nastaven</span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {u.active ? (
                    <Badge variant="secondary">aktivní</Badge>
                  ) : (
                    <Badge variant="outline">neaktivní</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" disabled={pending}
                      onClick={() => changePin(u)} title="Nastavit PIN">
                      <KeyRound className="size-4" /> PIN
                    </Button>
                    <Button variant="ghost" size="sm" disabled={pending}
                      onClick={() => changePassword(u)} title="Změnit heslo">
                      <Lock className="size-4" />
                    </Button>
                    {u.id !== actorId && (
                      <Button variant="ghost" size="sm" disabled={pending}
                        onClick={() => run(() => toggleUserActive(u.id))}
                        title={u.active ? "Deaktivovat" : "Aktivovat"}>
                        <Power className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
