"use client";

import { useAuth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { AppShell } from "./app-shell";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <AppShell>{children}</AppShell>;
}
