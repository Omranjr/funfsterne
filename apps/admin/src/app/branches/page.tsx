"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { type Branch, CreateBranchSchema } from "@funfsterne/shared-types";
import { Pencil, Plus, RefreshCw } from "lucide-react";

export default function BranchesPage() {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Branch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const res = await apiFetch("/admin/branches");
    if (res.ok) {
      setBranches((await res.json()) as Branch[]);
    } else {
      setFailed(true);
      toast.error(t("branches.loadError"), { description: t("common.tryAgain") });
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return branches.filter(
      (b) =>
        search === "" ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.city.toLowerCase().includes(search.toLowerCase()),
    );
  }, [branches, search]);

  async function toggleActive(branch: Branch) {
    const res = await apiFetch(`/admin/branches/${branch.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !branch.isActive }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Branch;
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      toast.success(
        updated.isActive
          ? t("branches.nowActive", { name: updated.name })
          : t("branches.nowInactive", { name: updated.name }),
      );
    } else {
      toast.error(t("branches.couldNotUpdate"), { description: t("common.tryAgain") });
    }
  }

  function handleSaved(saved: Branch) {
    setBranches((prev) => {
      const exists = prev.find((b) => b.id === saved.id);
      if (exists) {
        return prev.map((b) => (b.id === saved.id ? saved : b));
      }
      return [saved, ...prev];
    });
    toast.success(editing ? t("branches.branchUpdated") : t("branches.branchCreated"));
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("branches.title")}
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {t("branches.addBranch")}
                </Button>
              }
            />
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing ? t("branches.editBranch") : t("branches.createBranch")}
                </DialogTitle>
              </DialogHeader>
              <BranchForm
                branch={editing}
                onSaved={handleSaved}
                onCancel={() => {
                  setDialogOpen(false);
                  setEditing(null);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <Input
        placeholder={t("branches.searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:w-80"
      />

      {loading ? (
        <div className="space-y-2 rounded-md border p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : failed ? (
        <div className="flex flex-col items-center gap-3 rounded-md border py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("branches.loadError")}</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            {t("common.tryAgain")}
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("branches.city")}</TableHead>
                <TableHead>{t("branches.phone")}</TableHead>
                <TableHead>{t("common.active")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>{branch.city}</TableCell>
                  <TableCell>{branch.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={branch.isActive}
                      onCheckedChange={() => toggleActive(branch)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(branch);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function BranchForm({
  branch,
  onSaved,
  onCancel,
}: {
  branch: Branch | null;
  onSaved: (branch: Branch) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [city, setCity] = useState(branch?.city ?? "");
  const [postalCode, setPostalCode] = useState(branch?.postalCode ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [isActive, setIsActive] = useState(branch?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const parse = CreateBranchSchema.safeParse({
      name,
      address,
      city,
      postalCode,
      phone: phone || undefined,
      isActive,
    });

    if (!parse.success) {
      setError(t("common.checkFormValues"));
      setLoading(false);
      return;
    }

    const res = branch
      ? await apiFetch(`/admin/branches/${branch.id}`, {
          method: "PATCH",
          body: JSON.stringify(parse.data),
        })
      : await apiFetch("/admin/branches", {
          method: "POST",
          body: JSON.stringify(parse.data),
        });

    if (!res.ok) {
      setError(t("branches.failedToSave"));
      setLoading(false);
      return;
    }

    const saved = (await res.json()) as Branch;
    onSaved(saved);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        <Label htmlFor="name">{t("common.name")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t("branches.address")}</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">{t("branches.city")}</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">{t("branches.postalCode")}</Label>
          <Input
            id="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{t("branches.phone")}</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="isActive">{t("common.active")}</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t("common.saving") : branch ? t("branches.saveChanges") : t("branches.createBranch")}
        </Button>
      </div>
    </form>
  );
}
