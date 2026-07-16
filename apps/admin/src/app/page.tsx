"use client";

import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type DashboardStats = {
  products: number;
  branches: number;
  activeDiscountCodes: number;
  notificationsThisMonth: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = getAdminToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [productsRes, branchesRes, codesRes, notificationsRes] =
          await Promise.all([
            fetch(`${API_BASE_URL}/admin/products`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}/admin/branches`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}/admin/discount-codes`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}/admin/notifications`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {loading && <p className="text-muted-foreground">Loading stats...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Products" value={stats.products} />
          <StatCard title="Total Branches" value={stats.branches} />
          <StatCard title="Active Discount Codes" value={stats.activeDiscountCodes} />
          <StatCard title="Notifications This Month" value={stats.notificationsThisMonth} />
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
