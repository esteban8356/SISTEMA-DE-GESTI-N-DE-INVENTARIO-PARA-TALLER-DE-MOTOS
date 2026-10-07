import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Package,
  Wrench,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Bike,
  FileText,
  AlertCircle,
} from "lucide-react";

async function DashboardContent() {
  const supabase = await createClient();

  // Consultas en paralelo para optimizar la carga
  const [
    { count: totalRepuestos },
    { data: repuestosBajos },
    { count: totalActivos },
    { count: totalListos },
    { data: ultimasOrdenes },
  ] = await Promise.all([
    // Total de repuestos
    supabase.from("repuestos").select("*", { count: "exact", head: true }),
    // Repuestos con stock bajo (ordenados por menor stock)
    supabase
      .from("repuestos")
      .select("id, nombre, stock, stock_minimo, precio, categoria")
      .lte("stock", 5)
      .order("stock", { ascending: true })
      .limit(5),
    // Órdenes activas (Pendiente o En Reparación)
    supabase
      .from("servicios")
      .select("*", { count: "exact", head: true })
      .in("estado", ["Pendiente", "En Reparación"]),
    // Órdenes listas para entrega
    supabase
      .from("servicios")
      .select("*", { count: "exact", head: true })
      .eq("estado", "Listo"),
    // Últimas órdenes registradas
    supabase
      .from("servicios")
      .select("id, created_at, placa, marca, cliente_nombre, estado, costo")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stockCriticoCount = repuestosBajos ? repuestosBajos.length : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* HU-18: Tarjetas de Resumen de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Órdenes Activas */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Órdenes Activas
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-foreground">{totalActivos ?? 0}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">En taller</span>
          </div>
        </div>

        {/* 2. Listas para Entrega */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Listas para Entrega
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-foreground">{totalListos ?? 0}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Listas</span>
          </div>
        </div>

        {/* 3. Repuestos en Stock Crítico */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Stock Crítico
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {stockCriticoCount}
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Repuestos</span>
          </div>
        </div>

        {/* 4. Total Inventario */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Catálogo
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-foreground">{totalRepuestos ?? 0}</span>
            <span className="text-xs text-muted-foreground font-semibold">Piezas</span>
          </div>
        </div>
      </div>

      {/* HU-18: Listas de Últimas Órdenes y Stock Bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas Órdenes de Servicio */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Últimas Órdenes de Servicio</h2>
              </div>
              <Link
                href="/protected/servicios"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>

            {!ultimasOrdenes || ultimasOrdenes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No hay órdenes de servicio registradas recientemente.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {ultimasOrdenes.map((orden) => (
                  <div key={orden.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-muted shrink-0 text-muted-foreground">
                        <Bike className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-foreground block truncate">
                          {orden.placa} {orden.marca ? `• ${orden.marca}` : ""}
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          Cliente: {orden.cliente_nombre}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          orden.estado === "Listo"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : orden.estado === "En Reparación"
                            ? "bg-blue-500/15 text-blue-600"
                            : orden.estado === "Entregado"
                            ? "bg-purple-500/15 text-purple-600"
                            : "bg-amber-500/15 text-amber-600"
                        }`}
                      >
                        {orden.estado}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDate(orden.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/protected/servicios"
            className="pt-3 mt-2 border-t border-border flex items-center justify-between text-xs font-semibold text-primary hover:text-primary/80"
          >
            <span>Gestionar módulo de servicios</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Repuestos con Stock Bajo / Crítico */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-bold text-foreground">Repuestos en Stock Crítico</h2>
              </div>
              <Link
                href="/protected/inventario"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Ver inventario
              </Link>
            </div>

            {!repuestosBajos || repuestosBajos.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="text-xs">¡Excelente! No hay repuestos con stock crítico en este momento.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {repuestosBajos.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-foreground block truncate">
                        {item.nombre}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {item.categoria || "General"} • {formatCurrency(item.precio)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-500/15 text-rose-600 border border-rose-500/20">
                        {item.stock} unid.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/protected/inventario"
            className="pt-3 mt-2 border-t border-border flex items-center justify-between text-xs font-semibold text-primary hover:text-primary/80"
          >
            <span>Ir al inventario y reabastecer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Panel de Control (Dashboard)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Resumen operativo general de Moto Zone
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/protected/reportes"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generar Reporte</span>
          </Link>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando métricas del taller...</p>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
