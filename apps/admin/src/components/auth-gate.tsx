"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { AppShell } from "./app-shell";

// Legal/support pages must be reachable by App Store review, GDPR data
// subjects, and the public without an admin login — so they bypass the
// gate entirely rather than living behind AppShell.
const PUBLIC_PATHS = ["/privacy", "/impressum", "/support"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <AppShell>{children}</AppShell>;
}
