"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Wrench } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Inicio",
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
  ];

  return (
    <aside className="w-64 border-r border-r-foreground/10 bg-background flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-b-foreground/10 text-lg font-bold flex gap-2">
        <Wrench className="text-primary" />
        <span>MotoGest</span>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
