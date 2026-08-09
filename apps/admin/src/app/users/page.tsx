"use client";

import { useEffect, useMemo, useState } from "react";
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
import { type ConsumerUser, PasswordSchema } from "@funfsterne/shared-types";
import { KeyRound } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<ConsumerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<ConsumerUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/admin/consumer-users");
    if (res.ok) {
      const data = (await res.json()) as ConsumerUser[];
      setUsers(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Registered app accounts. There is no self-service password
          recovery in the app (no email or phone is collected) — reset a
          customer’s password here when they ask in person.
        </p>
      </div>

      <Input
        placeholder="Search by name or username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:w-80"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading users...</p>
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
                    No users found.
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
