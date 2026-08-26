"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ConsumerUser } from "@funfsterne/shared-types";

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

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

// How far back each granularity looks -- mirrors the API's own window so
// the subtitle under the chart accurately describes what's plotted.
const GRANULARITY_HINT: Record<Granularity, string> = {
  day: "Last 30 days",
  month: "Last 12 months",
  year: "Last 5 years",
};

export default function AnalyticsPage() {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [stats, setStats] = useState<VisitStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<ConsumerUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<ConsumerUser | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    apiFetch("/admin/consumer-users").then(async (res) => {
      if (res.ok) setUsers((await res.json()) as ConsumerUser[]);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ granularity });
    if (selectedUser) params.set("userId", selectedUser.id);

    apiFetch(`/admin/loyalty/stats?${params.toString()}`).then(async (res) => {
      if (cancelled) return;
      if (res.ok) setStats((await res.json()) as VisitStatsResponse);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [granularity, selectedUser]);

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
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Customer visits over time, tracked from loyalty scans at checkout.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-md border p-1">
          {GRANULARITY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={granularity === opt.value ? "default" : "ghost"}
              onClick={() => setGranularity(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="relative w-64">
          <Input
            placeholder="Filter by customer name..."
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
            Clear filter
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {selectedUser ? `Visits by ${selectedUser.firstName}` : "Total visits"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats ? stats.totalVisits : "—"}</p>
          </CardContent>
        </Card>
        {!selectedUser ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unique customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats ? stats.uniqueCustomers : "—"}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Visits per {granularity}
            {selectedUser ? ` — ${selectedUser.firstName} ${selectedUser.lastName}` : ""}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{GRANULARITY_HINT[granularity]}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">Loading...</p>
          ) : !hasData ? (
            <p className="py-12 text-center text-muted-foreground">
              No visits in this period.
            </p>
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
                    name="Visits"
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
    </div>
  );
}
