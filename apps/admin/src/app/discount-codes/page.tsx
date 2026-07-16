"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DiscountCodeTypeSchema,
  type Branch,
  type DiscountCode,
} from "@funfsterne/shared-types";
import { Pencil, Plus } from "lucide-react";

const types = DiscountCodeTypeSchema.options;

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [codesRes, branchesRes] = await Promise.all([
      apiFetch("/admin/discount-codes"),
      apiFetch("/admin/branches"),
    ]);
    if (codesRes.ok) {
      const data = (await codesRes.json()) as DiscountCode[];
      setCodes(data);
    }
    if (branchesRes.ok) {
      const data = (await branchesRes.json()) as Branch[];
      setBranches(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return codes.filter((c) =>
      search === "" || c.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [codes, search]);

  async function toggleActive(code: DiscountCode) {
    const res = await apiFetch(`/admin/discount-codes/${code.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !code.isActive }),
    });
    if (res.ok) {
      const updated = (await res.json()) as DiscountCode;
      setCodes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
  }

  function handleSaved(saved: DiscountCode) {
    setCodes((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [saved, ...prev];
    });
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discount Codes</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Code
              </Button>
            }
          />
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Discount Code" : "Create Discount Code"}
              </DialogTitle>
            </DialogHeader>
            <DiscountCodeForm
              code={editing}
              branches={branches}
              onSaved={handleSaved}
              onCancel={() => {
                setDialogOpen(false);
                setEditing(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search codes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:w-80"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading codes...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Redemptions</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-medium">{code.code}</TableCell>
                  <TableCell>{code.type}</TableCell>
                  <TableCell>
                    {code.type === "PERCENTAGE"
                      ? `${code.value}%`
                      : `€${Number(code.value).toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    {code.expiresAt
                      ? new Date(code.expiresAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {code.currentRedemptions} / {code.maxRedemptions ?? "∞"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={code.isActive}
                      onCheckedChange={() => toggleActive(code)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(code);
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

function DiscountCodeForm({
  code,
  branches,
  onSaved,
  onCancel,
}: {
  code: DiscountCode | null;
  branches: Branch[];
  onSaved: (code: DiscountCode) => void;
  onCancel: () => void;
}) {
  const [formCode, setFormCode] = useState(code?.code ?? "");
  const [type, setType] = useState<(typeof types)[number]>(
    code?.type ?? "PERCENTAGE"
  );
  const [value, setValue] = useState(code?.value?.toString() ?? "");
  const [expiresAt, setExpiresAt] = useState(
    code?.expiresAt
      ? new Date(code.expiresAt).toISOString().slice(0, 16)
      : ""
  );
  const [maxRedemptions, setMaxRedemptions] = useState(
    code?.maxRedemptions?.toString() ?? ""
  );
  const [scopeBranchId, setScopeBranchId] = useState<string | null>(
    code?.scopeBranchId ?? null
  );
  const [isActive, setIsActive] = useState(code?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      code: formCode,
      type,
      value: Number(value),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
      scopeBranchId: scopeBranchId ?? undefined,
      isActive,
    };

    const res = code
      ? await apiFetch(`/admin/discount-codes/${code.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiFetch("/admin/discount-codes", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      setError("Failed to save discount code.");
      setLoading(false);
      return;
    }

    const saved = (await res.json()) as DiscountCode;
    onSaved(saved);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          value={formCode}
          onChange={(e) => setFormCode(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="value">Value</Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expiry</Label>
          <Input
            id="expiresAt"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxRedemptions">Max Redemptions</Label>
          <Input
            id="maxRedemptions"
            type="number"
            min="0"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scopeBranchId">Scope to Branch (optional)</Label>
        <Select
          value={scopeBranchId || "all"}
          onValueChange={(v) => setScopeBranchId(v === "all" ? null : v)}
        >
          <SelectTrigger id="scopeBranchId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : code ? "Save Changes" : "Create Code"}
        </Button>
      </div>
    </form>
  );
}
