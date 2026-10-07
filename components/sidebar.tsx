"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Wrench, FileText } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Inicio (Dashboard)",
      href: "/protected",
      icon: Home,
      exact: true,
    },
    {
      name: "Inventario",
      href: "/protected/inventario",
      icon: Package,
      exact: false,
    },
    {
      name: "Servicio Motos",
      href: "/protected/servicios",
      icon: Wrench,
      exact: false,
    },
    {
      name: "Reportes",
      href: "/protected/reportes",
      icon: FileText,
      exact: false,
    },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0 shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border text-lg font-extrabold flex gap-2 text-foreground">
        <Wrench className="text-primary w-5 h-5" />
        <span>Moto Zone</span>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
