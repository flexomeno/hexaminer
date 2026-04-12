"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, LayoutDashboard, LogIn, ScanLine, Shield } from "lucide-react";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { href: "/", label: "Inicio", icon: ScanLine },
  { href: "/camera", label: "Cámara", icon: Camera },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function TopNav({ showAdminLink = false }: { showAdminLink?: boolean }) {
  const pathname = usePathname();
  const navItems = showAdminLink
    ? [...baseNavItems, { href: "/admin", label: "Visibilidad", icon: Shield }]
    : baseNavItems;

  return (
    <header className="border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="font-semibold text-slate-900">Ethical Product Scanner</div>
        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname?.startsWith("/dashboard/")
                : item.href === "/admin"
                  ? pathname === "/admin" || pathname?.startsWith("/admin/")
                  : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => signIn()}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <LogIn className="size-4" />
            Entrar
          </button>
        </nav>
      </div>
    </header>
  );
}
