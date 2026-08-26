"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Package, MapPin, Ticket, Bell, RefreshCw } from "lucide-react";

type DashboardStats = {
  products: number;
  branches: number;
  activeDiscountCodes: number;
  notificationsThisMonth: number;
};

const STAT_CARDS = [
  { key: "products", title: "Total Products", icon: Package },
  { key: "branches", title: "Total Branches", icon: MapPin },
  { key: "activeDiscountCodes", title: "Active Discount Codes", icon: Ticket },
  { key: "notificationsThisMonth", title: "Notifications This Month", icon: Bell },
] as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!getAdminToken()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFailed(false);
    try {
      const [productsRes, branchesRes, codesRes, notificationsRes] = await Promise.all([
        apiFetch("/admin/products"),
        apiFetch("/admin/branches"),
        apiFetch("/admin/discount-codes"),
        apiFetch("/admin/notifications"),
      ]);

      if (!productsRes.ok || !branchesRes.ok || !codesRes.ok || !notificationsRes.ok) {
        throw new Error("Failed to load dashboard stats");
      }

      const products = (await productsRes.json()) as unknown[];
      const branches = (await branchesRes.json()) as unknown[];
      const codes = (await codesRes.json()) as { isActive: boolean }[];
      const notifications = (await notificationsRes.json()) as { sentAt: string }[];

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const notificationsThisMonth = notifications.filter(
        (n) => new Date(n.sentAt) >= monthStart,
      ).length;

      setStats({
        products: products.length,
        branches: branches.length,
        activeDiscountCodes: codes.filter((c) => c.isActive).length,
        notificationsThisMonth,
      });
    } catch {
      setFailed(true);
      toast.error("Could not load dashboard stats", {
        description: "Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A quick look at how the shop is doing right now."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((c) => (
            <Card key={c.key}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : failed ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Something went wrong loading your stats.
            </p>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map(({ key, title, icon: Icon }) => (
            <StatCard key={key} title={title} value={stats[key]} icon={Icon} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <CardAction>
          <Icon className="h-4 w-4 text-primary" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
