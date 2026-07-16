"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type DiscountCode, type Notification } from "@funfsterne/shared-types";
import { Send } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [discountCodeId, setDiscountCodeId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    const [notificationsRes, codesRes] = await Promise.all([
      apiFetch("/admin/notifications"),
      apiFetch("/admin/discount-codes"),
    ]);
    if (notificationsRes.ok) {
      setNotifications((await notificationsRes.json()) as Notification[]);
    }
    if (codesRes.ok) {
      setCodes((await codesRes.json()) as DiscountCode[]);
    }
    // API does not expose token count yet; show 0 until backend supports it
    setRecipientCount(0);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function refreshRecipientCount() {
    const res = await apiFetch("/admin/discount-codes");
    if (res.ok) {
      // API does not expose token count yet; show 0 until backend supports it
      setRecipientCount(0);
    }
  }

  async function handleSend() {
    setSending(true);
    const res = await apiFetch("/admin/notifications/send", {
      method: "POST",
      body: JSON.stringify({
        title,
        body,
        discountCodeId: discountCodeId ?? undefined,
        target: "all",
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { notification: Notification };
      setNotifications((prev) => [data.notification, ...prev]);
      setTitle("");
      setBody("");
      setDiscountCodeId("");
    }

    setConfirmOpen(false);
    setSending(false);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Send Notification</h1>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Neue Aktion"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="20% Rabatt auf alle Haarprodukte!"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discountCode">Attach Discount Code (optional)</Label>
          <Select
            value={discountCodeId || "none"}
            onValueChange={(v) => setDiscountCodeId(v === "none" ? null : v)}
          >
            <SelectTrigger id="discountCode">
              <SelectValue placeholder="Select a discount code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {codes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} ({c.type === "PERCENTAGE" ? `${c.value}%` : `€${c.value}`})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => {
            refreshRecipientCount();
            setConfirmOpen(true);
          }}
          disabled={!title || !body || sending}
        >
          <Send className="mr-2 h-4 w-4" />
          Send Now
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
            <DialogDescription>
              You are about to send a push notification to all users.
              {recipientCount > 0 && (
                <> Estimated recipients: <strong>{recipientCount}</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-3 text-sm">
            <p><strong>{title}</strong></p>
            <p className="text-muted-foreground">{body}</p>
            {discountCodeId && (
              <p className="mt-2 text-xs text-muted-foreground">
                Discount code attached:{" "}
                {codes.find((c) => c.id === discountCodeId)?.code ?? "—"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Confirm Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">History</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading history...</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Body</TableHead>
                  <TableHead>Discount Code</TableHead>
                  <TableHead className="text-right">Sent To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      {new Date(n.sentAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell>{n.body}</TableCell>
                    <TableCell>
                      {n.discountCodeId
                        ? codes.find((c) => c.id === n.discountCodeId)?.code ?? "—"
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {n.sentToCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
