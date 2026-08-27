"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.error(t("notifications.loadError"), { description: t("common.tryAgain") });
    }
    if (codesRes.ok) {
      setCodes((await codesRes.json()) as DiscountCode[]);
    }
    if (countRes.ok) {
      setRecipientCount(((await countRes.json()) as { count: number }).count);
    }
    setLoading(false);
  }, [t]);

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
      toast.success(
        data.sent === 1
          ? t("notifications.notificationSent", { count: data.sent })
          : t("notifications.notificationSentPlural", { count: data.sent }),
      );
    } else {
      toast.error(t("notifications.couldNotSend"), {
        description: t("notifications.dialogStaysOpen"),
      });
    }

    setSending(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("notifications.title")} description={t("notifications.description")} />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="title">{t("notifications.notificationTitle")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Neue Aktion"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">{t("notifications.body")}</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="20% Rabatt auf alle Haarprodukte!"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountCode">{t("notifications.attachDiscountCode")}</Label>
            <Select
              value={discountCodeId || "none"}
              onValueChange={(v) => setDiscountCodeId(v === "none" ? null : v)}
            >
              <SelectTrigger id="discountCode">
                <SelectValue placeholder={t("notifications.selectDiscountCode")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("notifications.none")}</SelectItem>
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
            {t("notifications.sendNow")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("notifications.confirmSend")}</DialogTitle>
            <DialogDescription>
              {t("notifications.confirmSendDescription")}
              {recipientCount !== null && (
                <> {t("notifications.estimatedRecipients", { count: recipientCount })}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-3 text-sm">
            <p><strong>{title}</strong></p>
            <p className="text-muted-foreground">{body}</p>
            {discountCodeId && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("notifications.discountCodeAttached")}{" "}
                {codes.find((c) => c.id === discountCodeId)?.code ?? "—"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? t("notifications.sending") : t("notifications.confirmSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">{t("notifications.history")}</h2>
        {loading ? (
          <div className="space-y-2 rounded-md border p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : failed ? (
          <div className="flex flex-col items-center gap-3 rounded-md border py-12 text-center">
            <p className="text-sm text-muted-foreground">{t("notifications.loadError")}</p>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              {t("common.tryAgain")}
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("notifications.noNotifications")}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("notifications.sentAt")}</TableHead>
                  <TableHead>{t("notifications.notificationTitle")}</TableHead>
                  <TableHead>{t("notifications.body")}</TableHead>
                  <TableHead>{t("notifications.discountCode")}</TableHead>
                  <TableHead className="text-right">{t("notifications.sentTo")}</TableHead>
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
