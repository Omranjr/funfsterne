"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  type ConsumerUser,
  type CustomerVisitSummary,
  type EngagementPeriod,
} from "@funfsterne/shared-types";
import { BellOff, RefreshCw, Send } from "lucide-react";

type Granularity = "day" | "month" | "year";

type VisitStatsBucket = {
  bucket: string;
  label: string;
  visits: number;
};

type VisitStatsResponse = {
  granularity: Granularity;
  series: VisitStatsBucket[];
  totalVisits: number;
  uniqueCustomers: number;
};

const GRANULARITY_VALUES: Granularity[] = ["day", "month", "year"];

const ENGAGEMENT_PERIODS: EngagementPeriod[] = ["month", "halfYear", "year"];
const ENGAGEMENT_PERIOD_LABEL_KEY: Record<EngagementPeriod, string> = {
  month: "analytics.periodMonth",
  halfYear: "analytics.periodHalfYear",
  year: "analytics.periodYear",
};

// How many customers each side of the leaderboard shows. Enough to act on,
// short enough to read at a glance.
const LEADERBOARD_SIZE = 8;

type CustomerVisitsResponse = {
  period: EngagementPeriod;
  from: string;
  customers: CustomerVisitSummary[];
};

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [stats, setStats] = useState<VisitStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [users, setUsers] = useState<ConsumerUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<ConsumerUser | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    apiFetch("/admin/consumer-users").then(async (res) => {
      if (res.ok) setUsers((await res.json()) as ConsumerUser[]);
    });
  }, []);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    const params = new URLSearchParams({ granularity });
    if (selectedUser) params.set("userId", selectedUser.id);

    apiFetch(`/admin/loyalty/stats?${params.toString()}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error("Failed to load visit stats");
        setStats((await res.json()) as VisitStatsResponse);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        toast.error(t("analytics.loadError"), {
          description: t("analytics.loadErrorDescription"),
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [granularity, selectedUser, t]);

  useEffect(load, [load]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [users, search]);

  // Caps the number of visible x-axis labels regardless of bucket count
  // (up to ~30 for "day") so ticks never overlap into an unreadable smear.
  const tickInterval = stats
    ? Math.max(0, Math.ceil(stats.series.length / 8) - 1)
    : 0;

  const hasData = Boolean(stats && stats.series.some((b) => b.visits > 0));

  return (
    <div className="space-y-6">
      <PageHeader title={t("analytics.title")} description={t("analytics.description")} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-md border p-1">
          {GRANULARITY_VALUES.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={granularity === value ? "default" : "ghost"}
              onClick={() => setGranularity(value)}
            >
              {t(`analytics.${value}`)}
            </Button>
          ))}
        </div>

        <div className="relative w-64">
          <Input
            placeholder={t("analytics.filterPlaceholder")}
            value={
              selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : search
            }
            onChange={(e) => {
              setSelectedUser(null);
              setSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 ? (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
              {suggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedUser(u);
                    setSearch("");
                    setShowSuggestions(false);
                  }}
                >
                  {u.firstName} {u.lastName}{" "}
                  <span className="text-muted-foreground">@{u.username}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {selectedUser ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedUser(null);
              setSearch("");
            }}
          >
            {t("analytics.clearFilter")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {selectedUser
                ? t("analytics.visitsBy", { name: selectedUser.firstName })
                : t("analytics.totalVisits")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold tabular-nums">
                {stats ? stats.totalVisits : "—"}
              </p>
            )}
          </CardContent>
        </Card>
        {!selectedUser ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("analytics.uniqueCustomers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold tabular-nums">
                  {stats ? stats.uniqueCustomers : "—"}
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("analytics.visitsPer", { granularity: t(`analytics.${granularity}`) })}
            {selectedUser ? ` — ${selectedUser.firstName} ${selectedUser.lastName}` : ""}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              granularity === "day"
                ? "analytics.last30Days"
                : granularity === "month"
                  ? "analytics.last12Months"
                  : "analytics.last5Years",
            )}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-80 w-full" />
          ) : failed ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("analytics.loadError")}</p>
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCw className="h-4 w-4" />
                {t("common.tryAgain")}
              </Button>
            </div>
          ) : !hasData ? (
            <p className="py-16 text-center text-muted-foreground">{t("analytics.noVisits")}</p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats!.series} barCategoryGap="24%">
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={tickInterval}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="visits"
                    name={t("analytics.totalVisits")}
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <EngagementCard />
    </div>
  );
}

function EngagementCard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [period, setPeriod] = useState<EngagementPeriod>("halfYear");
  const [mode, setMode] = useState<"top" | "least">("top");
  const [customers, setCustomers] = useState<CustomerVisitSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    apiFetch(`/admin/loyalty/customer-visits?period=${period}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error("Failed to load customer engagement");
        const data = (await res.json()) as CustomerVisitsResponse;
        setCustomers(data.customers);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(load, [load]);

  // The API returns customers sorted by visits descending, so "fewest" is
  // just the same list read from the other end -- no second request and no
  // risk of the two views disagreeing about a tie.
  const shown = useMemo(() => {
    if (!customers) return [];
    const ordered = mode === "top" ? customers : [...customers].reverse();
    return ordered.slice(0, LEADERBOARD_SIZE);
  }, [customers, mode]);

  const reachableShown = shown.filter((c) => c.reachable).length;

  const formatDate = (iso: string | Date) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      day: "numeric",
      month: "short",
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("analytics.engagementTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("analytics.engagementDescription")}
        </p>
        <CardAction>
          <Select
            value={period}
            onValueChange={(v) => v && setPeriod(v as EngagementPeriod)}
          >
            <SelectTrigger className="w-40">
              {/* Formats the trigger label -- without this the raw enum
                  value ("halfYear") is what the user sees. */}
              <SelectValue>
                {(v) =>
                  t(ENGAGEMENT_PERIOD_LABEL_KEY[(v as EngagementPeriod) ?? period])
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
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex w-fit gap-1 rounded-md border p-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "top" ? "default" : "ghost"}
            onClick={() => setMode("top")}
          >
            {t("analytics.mostVisits")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "least" ? "default" : "ghost"}
            onClick={() => setMode("least")}
          >
            {t("analytics.fewestVisits")}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : failed ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{t("analytics.loadError")}</p>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              {t("common.tryAgain")}
            </Button>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("analytics.noCustomers")}
          </p>
        ) : (
          <>
            <ul className="divide-y">
              {shown.map((c, index) => (
                <li key={c.userId} className="flex items-center gap-3 py-2.5">
                  <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {c.firstName} {c.lastName}
                      <span className="ms-2 text-xs font-normal text-muted-foreground">
                        @{c.username}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.lastVisitAt
                        ? t("analytics.lastVisit", { date: formatDate(c.lastVisitAt) })
                        : `${t("analytics.neverVisited")} · ${t("analytics.joined", {
                            date: formatDate(c.joinedAt),
                          })}`}
                    </p>
                  </div>
                  {!c.reachable ? (
                    <BellOff
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-label={t("notifications.notReachable")}
                    />
                  ) : null}
                  <div className="shrink-0 text-end">
                    <p className="text-sm font-semibold tabular-nums">{c.visits}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t("analytics.visitsLabel")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                {t("analytics.reachableSummary", {
                  reachable: reachableShown,
                  total: shown.length,
                })}
              </p>
              {mode === "least" ? (
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(`/notifications?segment=least&period=${period}`)
                  }
                >
                  <Send className="h-4 w-4" />
                  {t("analytics.targetWithOffer")}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
