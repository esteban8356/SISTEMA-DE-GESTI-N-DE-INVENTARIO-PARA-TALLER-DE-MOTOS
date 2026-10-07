import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Package, Wrench, ArrowRight, Clock, Loader2 } from "lucide-react";

async function DashboardStats() {
  const supabase = await createClient();

  const [{ count: totalRepuestos }, { count: totalServicios }, { count: serviciosPendientes }] =
    await Promise.all([
      supabase.from("repuestos").select("*", { count: "exact", head: true }),
      supabase.from("servicios").select("*", { count: "exact", head: true }),
      supabase
        .from("servicios")
        .select("*", { count: "exact", head: true })
        .in("estado", ["Pendiente", "En Reparación"]),
    ]);

  const cards = [
    {
      title: "Inventario de Repuestos",
      description: "Administra catálogo de repuestos, stock disponible, precios y fotografías.",
      count: totalRepuestos ?? 0,
      href: "/protected/inventario",
      icon: Package,
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    },
    {
      title: "Servicio de Motos",
      description: "Gestiona órdenes de trabajo, diagnósticos de fallas, placas y estado de motos.",
      count: totalServicios ?? 0,
      activeCount: serviciosPendientes ?? 0,
      href: "/protected/servicios",
      icon: Wrench,
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.href}
            className="bg-card text-card-foreground rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.badgeColor} border`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-3xl font-extrabold text-foreground">
                  {card.count}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                {card.title}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {card.description}
              </p>
              {card.activeCount !== undefined && (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-4 bg-amber-500/10 px-3 py-1.5 rounded-lg w-fit border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{card.activeCount} motos en taller activas</span>
                </div>
              )}
            </div>

            <Link
              href={card.href}
              className="inline-flex items-center justify-between w-full pt-4 border-t border-border text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <span>Acceder al módulo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Panel Principal
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Bienvenido al sistema de administración de taller de motos MotoGest.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando estadísticas...</p>
          </div>
        }
      >
        <DashboardStats />
      </Suspense>
    </div>
  );
}
