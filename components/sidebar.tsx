"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Wrench, FileText } from "lucide-react";

const NAV_ITEMS = [
  {
    name: "Inicio",
    desktopName: "Inicio (Dashboard)",
    href: "/protected",
    icon: Home,
    exact: true,
  },
  {
    name: "Inventario",
    desktopName: "Inventario",
    href: "/protected/inventario",
    icon: Package,
    exact: false,
  },
  {
    name: "Servicios",
    desktopName: "Servicio Motos",
    href: "/protected/servicios",
    icon: Wrench,
    exact: false,
  },
  {
    name: "Reportes",
    desktopName: "Reportes",
    href: "/protected/reportes",
    icon: FileText,
    exact: false,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar de Escritorio (Desktop) */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col h-screen sticky top-0 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border text-lg font-extrabold flex gap-2 text-foreground">
          <Wrench className="text-primary w-5 h-5" />
          <span>Moto Zone</span>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
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
                <span>{item.desktopName}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Barra de Navegación Móvil (Bottom Navigation) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-t border-border flex justify-around items-center p-2 shadow-lg">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[11px] font-semibold transition-all ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={20} className={isActive ? "text-primary scale-110 transition-transform" : ""} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
