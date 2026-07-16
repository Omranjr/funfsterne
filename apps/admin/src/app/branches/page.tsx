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
import { type Branch, CreateBranchSchema } from "@funfsterne/shared-types";
import { Pencil, Plus } from "lucide-react";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Branch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/admin/branches");
    if (res.ok) {
      const data = (await res.json()) as Branch[];
      setBranches(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Branches</h1>
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
                Add Branch
              </Button>
            }
          />
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Branch" : "Create Branch"}
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
      </div>

      <Input
        placeholder="Search branches..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:w-80"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading branches...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
      setError("Please check the form values.");
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
      setError("Failed to save branch.");
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
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
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : branch ? "Save Changes" : "Create Branch"}
        </Button>
      </div>
    </form>
  );
}
