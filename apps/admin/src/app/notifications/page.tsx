"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  type CustomerVisitSummary,
  type DiscountCode,
  type EngagementPeriod,
  type Notification,
} from "@funfsterne/shared-types";
import { BellOff, RefreshCw, Send } from "lucide-react";

type Audience = "all" | "users";

const ENGAGEMENT_PERIODS: EngagementPeriod[] = ["month", "halfYear", "year"];
const ENGAGEMENT_PERIOD_LABEL_KEY: Record<EngagementPeriod, string> = {
  month: "analytics.periodMonth",
  halfYear: "analytics.periodHalfYear",
  year: "analytics.periodYear",
};

// Size of the "fewest visits" quick-fill selection.
const QUICK_FILL_SIZE = 10;

/**
 * The least-active customers worth nudging.
 *
 * Only customers who can actually receive a push are returned: pre-selecting
 * someone with no registered device would inflate the "selected" count with
 * people the send can never reach, which is exactly the false confidence
 * this screen is meant to avoid.
 */
function pickLeastActive(list: CustomerVisitSummary[]): CustomerVisitSummary[] {
  return [...list]
    .filter((c) => c.reachable)
    .sort((a, b) => a.visits - b.visits)
    .slice(0, QUICK_FILL_SIZE);
}

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

  // ── Targeting ───────────────────────────────────────────────────────────
  const [audience, setAudience] = useState<Audience>("all");
  const [customers, setCustomers] = useState<CustomerVisitSummary[]>([]);
  const [segmentPeriod, setSegmentPeriod] = useState<EngagementPeriod>("halfYear");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadCustomers = useCallback(
    async (period: EngagementPeriod) => {
      const res = await apiFetch(`/admin/loyalty/customer-visits?period=${period}`);
      if (!res.ok) {
        toast.error(t("notifications.loadCustomersError"), {
          description: t("common.tryAgain"),
        });
        return [];
      }
      const data = (await res.json()) as { customers: CustomerVisitSummary[] };
      setCustomers(data.customers);
      return data.customers;
    },
    [t],
  );

  useEffect(() => {
    loadCustomers(segmentPeriod);
  }, [loadCustomers, segmentPeriod]);

  // Honour the "Send them an offer" hand-off from the Analytics engagement
  // card. Read from window.location rather than useSearchParams() so this
  // page doesn't need a Suspense boundary to stay statically rendered.
  //
  // The link carries only the segment + period, never a list of user ids --
  // the segment is recomputed here against fresh data, so a stale bookmarked
  // link can never silently target the wrong people.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("segment") !== "least") return;

    const p = params.get("period");
    const period: EngagementPeriod =
      p === "month" || p === "halfYear" || p === "year" ? p : "halfYear";

    setAudience("users");
    setSegmentPeriod(period);
    loadCustomers(period).then((list) => {
      setSelectedIds(new Set(pickLeastActive(list).map((c) => c.userId)));
    });
  }, [loadCustomers]);

  const toggleCustomer = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedIds.has(c.userId)),
    [customers, selectedIds],
  );
  const reachableSelected = selectedCustomers.filter((c) => c.reachable).length;

  // Ordered so the people the owner most likely wants to nudge sit at the
  // top of the picker.
  const pickerCustomers = useMemo(
    () => [...customers].sort((a, b) => a.visits - b.visits),
    [customers],
  );

  const targetingInvalid =
    audience === "users" && (selectedIds.size === 0 || reachableSelected === 0);

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
        target: audience,
        ...(audience === "users" ? { userIds: Array.from(selectedIds) } : {}),
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
                {/* Same reason as the period selector: the raw value here is
                    a cuid, which is meaningless to the reader. */}
                <SelectValue placeholder={t("notifications.selectDiscountCode")}>
                  {(v) =>
                    !v || v === "none"
                      ? t("notifications.none")
                      : codes.find((c) => c.id === v)?.code ?? "—"
                  }
                </SelectValue>
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

          <div className="space-y-3 border-t pt-4">
            <Label>{t("notifications.audience")}</Label>
            <div className="flex w-fit gap-1 rounded-md border p-1">
              <Button
                type="button"
                size="sm"
                variant={audience === "all" ? "default" : "ghost"}
                onClick={() => setAudience("all")}
              >
                {t("notifications.audienceAll")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={audience === "users" ? "default" : "ghost"}
                onClick={() => setAudience("users")}
              >
                {t("notifications.audienceSelected")}
              </Button>
            </div>

            {audience === "users" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("notifications.targetedIntro")}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {t("notifications.quickFill")}:
                  </span>
                  <Select
                    value={segmentPeriod}
                    onValueChange={(v) => v && setSegmentPeriod(v as EngagementPeriod)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue>
                        {(v) =>
                          t(
                            ENGAGEMENT_PERIOD_LABEL_KEY[
                              (v as EngagementPeriod) ?? segmentPeriod
                            ],
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ENGAGEMENT_PERIODS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {t(ENGAGEMENT_PERIOD_LABEL_KEY[p])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedIds(
                        new Set(pickLeastActive(customers).map((c) => c.userId)),
                      )
                    }
                  >
                    {t("notifications.applyQuickFill")}
                  </Button>
                  {selectedIds.size > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      {t("notifications.clearSelection")}
                    </Button>
                  ) : null}
                </div>

                <div className="max-h-72 overflow-y-auto rounded-md border">
                  {pickerCustomers.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      {t("analytics.noCustomers")}
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {pickerCustomers.map((c) => (
                        <li key={c.userId}>
                          <label
                            className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 ${
                              c.reachable ? "" : "opacity-60"
                            }`}
                          >
                            <Checkbox
                              checked={selectedIds.has(c.userId)}
                              onCheckedChange={() => toggleCustomer(c.userId)}
                              disabled={!c.reachable}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {c.firstName} {c.lastName}
                                <span className="ms-2 text-xs font-normal text-muted-foreground">
                                  @{c.username}
                                </span>
                              </p>
                              {!c.reachable ? (
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <BellOff className="h-3 w-3" />
                                  {t("notifications.notReachable")}
                                </p>
                              ) : null}
                            </div>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {c.visits} {t("analytics.visitsLabel")}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {t("notifications.selectedCount", {
                    selected: selectedIds.size,
                    reachable: reachableSelected,
                  })}
                </p>

                {selectedIds.size > 0 && reachableSelected === 0 ? (
                  <p className="text-sm text-destructive">
                    {t("notifications.noneReachable")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!title || !body || sending || targetingInvalid}
          >
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
              {audience === "users" ? (
                <>
                  {t("notifications.audienceSelected")} ·{" "}
                  {t("notifications.selectedCount", {
                    selected: selectedIds.size,
                    reachable: reachableSelected,
                  })}
                </>
              ) : (
                <>
                  {t("notifications.confirmSendDescription")}
                  {recipientCount !== null && (
                    <> {t("notifications.estimatedRecipients", { count: recipientCount })}</>
                  )}
                </>
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
                  <TableHead>{t("notifications.audience")}</TableHead>
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
                    <TableCell>
                      {n.audience === "SEGMENT"
                        ? t("notifications.audienceSegmentShort")
                        : t("notifications.audienceAllShort")}
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
