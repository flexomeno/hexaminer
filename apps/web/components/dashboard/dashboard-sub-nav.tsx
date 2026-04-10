"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutGrid, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Resumen", icon: LayoutGrid },
  { href: "/dashboard/historial", label: "Historial", icon: History },
  { href: "/dashboard/lista-compras", label: "Lista de compras", icon: ShoppingBasket },
] as const;

export function DashboardSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-slate-200 pb-4"
      aria-label="Secciones del panel"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
