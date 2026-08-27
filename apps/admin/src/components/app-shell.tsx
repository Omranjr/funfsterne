"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  MapPin,
  Ticket,
  Bell,
  Menu,
  LogOut,
  Images,
  Users,
  ScanLine,
  BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/products", labelKey: "nav.products", icon: Package },
  { href: "/categories", labelKey: "nav.categoryImages", icon: Images },
  { href: "/branches", labelKey: "nav.branches", icon: MapPin },
  { href: "/discount-codes", labelKey: "nav.discountCodes", icon: Ticket },
  { href: "/notifications", labelKey: "nav.notifications", icon: Bell },
  { href: "/users", labelKey: "nav.users", icon: Users },
  { href: "/loyalty", labelKey: "nav.loyaltyScan", icon: ScanLine },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
] as const;

function Wordmark() {
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="h-2 w-2 rounded-full bg-sidebar-primary" />
      <span className="font-heading text-lg font-semibold tracking-tight text-sidebar-foreground">
        Fünf Sterne
      </span>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-e border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark />
        </div>
        <NavLinks />
        <div className="mt-auto space-y-1 border-t border-sidebar-border pt-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-sidebar-foreground/50">
              {t("common.appearance")}
            </span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-sidebar-foreground/50">
              {t("common.language")}
            </span>
            <LanguageSwitcher />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            {t("common.signOut")}
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:hidden">
          <Wordmark />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                }
              />
              <SheetContent side="left" className="w-64 bg-sidebar p-4 text-sidebar-foreground">
                <div className="mb-6">
                  <Wordmark />
                </div>
                <NavLinks />
                <div className="mt-6 border-t border-sidebar-border pt-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-sidebar-foreground/70"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("common.signOut")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
