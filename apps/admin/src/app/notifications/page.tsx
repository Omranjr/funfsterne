"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { type DiscountCode, type Notification } from "@funfsterne/shared-types";
import { RefreshCw, Send } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [discountCodeId, setDiscountCodeId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [notificationsRes, codesRes, countRes] = await Promise.all([
      apiFetch("/admin/notifications"),
      apiFetch("/admin/discount-codes"),
      apiFetch("/admin/notifications/recipient-count"),
    ]);
    if (notificationsRes.ok) {
      setNotifications((await notificationsRes.json()) as Notification[]);
    } else {
      setFailed(true);
      toast.error("Could not load notification history", { description: "Please try again." });
    }
    if (codesRes.ok) {
      setCodes((await codesRes.json()) as DiscountCode[]);
    }
    if (countRes.ok) {
      setRecipientCount(((await countRes.json()) as { count: number }).count);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      const data = (await res.json()) as { notification: Notification; sent: number };
      setNotifications((prev) => [data.notification, ...prev]);
      setTitle("");
      setBody("");
      setDiscountCodeId(null);
      setConfirmOpen(false);
      toast.success(`Notification sent to ${data.sent} device${data.sent === 1 ? "" : "s"}`);
    } else {
      toast.error("Could not send notification", {
        description: "The dialog is staying open so you can try again.",
      });
    }

    setSending(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Send Notification"
        description="Broadcast a push notification to every device with the app installed."
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
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

          <Button onClick={() => setConfirmOpen(true)} disabled={!title || !body || sending}>
            <Send className="h-4 w-4" />
            Send Now
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
            <DialogDescription>
              You are about to send a push notification to all users.
              {recipientCount !== null && (
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
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Confirm Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">History</h2>
        {loading ? (
          <div className="space-y-2 rounded-md border p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : failed ? (
          <div className="flex flex-col items-center gap-3 rounded-md border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Something went wrong loading notification history.
            </p>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border py-16 text-center">
            <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
          </div>
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
                    <TableCell className="text-right tabular-nums">
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
