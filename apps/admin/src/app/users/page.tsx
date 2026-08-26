"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { type ConsumerUser, PasswordSchema } from "@funfsterne/shared-types";
import { KeyRound, RefreshCw, Users as UsersIcon } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<ConsumerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<ConsumerUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const res = await apiFetch("/admin/consumer-users");
    if (res.ok) {
      setUsers((await res.json()) as ConsumerUser[]);
    } else {
      setFailed(true);
      toast.error("Could not load users", { description: "Please try again." });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        q === "" ||
        u.username.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Registered app accounts. There is no self-service password recovery in the app (no email or phone is collected) — reset a customer’s password here when they ask in person."
      />

      <Input
        placeholder="Search by name or username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:w-80"
      />

      {loading ? (
        <div className="space-y-2 rounded-md border p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : failed ? (
        <div className="flex flex-col items-center gap-3 rounded-md border py-12 text-center">
          <p className="text-sm text-muted-foreground">Something went wrong loading users.</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 && users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border py-16 text-center">
          <UsersIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No customers have signed up yet.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Reset password"
                      onClick={() => {
                        setResetTarget(user);
                        setDialogOpen(true);
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users match “{search}”.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Reset password{resetTarget ? ` — ${resetTarget.username}` : ""}
            </DialogTitle>
          </DialogHeader>
          {resetTarget ? (
            <ResetPasswordForm
              user={resetTarget}
              onDone={() => {
                setDialogOpen(false);
                setResetTarget(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResetPasswordForm({
  user,
  onDone,
}: {
  user: ConsumerUser;
  onDone: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parse = PasswordSchema.safeParse(newPassword);
    if (!parse.success) {
      setError(parse.error.issues[0]?.message ?? "Invalid password.");
      return;
    }

    setLoading(true);
    const res = await apiFetch(`/admin/consumer-users/${user.id}/reset-password`, {
      method: "PATCH",
      body: JSON.stringify({ newPassword: parse.data }),
    });
    setLoading(false);

    if (!res.ok) {
      setError("Failed to reset password.");
      return;
    }

    toast.success(`Password reset for ${user.username}`);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tell {user.firstName} their new password once you’ve set it — this
        can’t be undone or looked up later.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="text"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="off"
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </div>
    </form>
  );
}
