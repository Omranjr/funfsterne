"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  MapPin,
  Ticket,
  Bell,
  Menu,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/branches", label: "Branches", icon: MapPin },
  { href: "/discount-codes", label: "Discount Codes", icon: Ticket },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-background p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-bold">
          FünfSterne Admin
        </div>
        <NavLinks />
        <div className="mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background p-4 lg:hidden">
          <span className="font-bold">FünfSterne Admin</span>
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>} />
            <SheetContent side="left" className="w-64 p-4">
              <div className="mb-6 text-lg font-bold">FünfSterne Admin</div>
              <NavLinks />
              <div className="mt-6">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
