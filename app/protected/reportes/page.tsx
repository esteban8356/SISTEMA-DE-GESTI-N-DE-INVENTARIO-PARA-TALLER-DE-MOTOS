"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ToastNotification, ToastMessage } from "@/components/ui/toast-notification";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Loader2,
  Bike,
  CheckCircle2,
  DollarSign,
  Search,
} from "lucide-react";

export interface ReporteServicio {
  id: string;
  created_at: string;
  placa: string;
  marca: string | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  problema_diagnostico: string;
  estado: string;
  costo: number;
}

export default function ReportesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [servicios, setServicios] = useState<ReporteServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<ToastMessage | null>(null);

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Inicializar fechas al montar
  useEffect(() => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const formatInputDate = (d: Date) => d.toISOString().split("T")[0];
    setFechaInicio(formatInputDate(primerDia));
    setFechaFin(formatInputDate(hoy));
  }, []);

  // Cargar reporte según el rango de fechas
  const fetchReporte = useCallback(async () => {
    if (!fechaInicio || !fechaFin) return;
    try {
      setLoading(true);
      let query = supabase
        .from("servicios")
        .select("id, created_at, placa, marca, cliente_nombre, cliente_telefono, problema_diagnostico, estado, costo")
        .gte("created_at", `${fechaInicio}T00:00:00.000Z`)
        .lte("created_at", `${fechaFin}T23:59:59.999Z`)
        .order("created_at", { ascending: false });

      if (filtroEstado !== "Todos") {
        query = query.eq("estado", filtroEstado);
      }

      const { data, error } = await query;
      if (error) throw error;

      setServicios(
        (data || []).map((item) => ({
          ...item,
          costo: Number(item.costo || 0),
        }))
      );
    } catch (err: unknown) {
      showNotification("error", "Error al cargar el reporte: " + (err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  }, [supabase, fechaInicio, fechaFin, filtroEstado, showNotification]);

  useEffect(() => {
    fetchReporte();
  }, [fetchReporte]);

  // Filtrado adicional por texto
  const filteredServicios = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return servicios;
    return servicios.filter(
      (item) =>
        item.placa.toLowerCase().includes(q) ||
        item.cliente_nombre.toLowerCase().includes(q) ||
        (item.marca && item.marca.toLowerCase().includes(q)) ||
        item.problema_diagnostico.toLowerCase().includes(q)
    );
  }, [servicios, searchTerm]);

  // Métricas
  const totalCosto = useMemo(() => {
    return filteredServicios.reduce((sum, item) => sum + (item.costo || 0), 0);
  }, [filteredServicios]);

  const totalCompletados = useMemo(() => {
    return filteredServicios.filter((item) => item.estado === "Listo" || item.estado === "Entregado").length;
  }, [filteredServicios]);

  // Exportar a CSV (HU-17)
  const exportarCSV = () => {
    if (filteredServicios.length === 0) {
      showNotification("error", "No hay datos para exportar en este rango de fechas.");
      return;
    }

    const headers = [
      "Fecha",
      "Placa",
      "Marca",
      "Cliente",
      "Telefono",
      "Diagnostico / Reparacion",
      "Estado",
      "Costo (COP)",
    ];

    const rows = filteredServicios.map((s) => [
      `"${formatDate(s.created_at)}"`,
      `"${s.placa}"`,
      `"${s.marca || 'N/A'}"`,
      `"${s.cliente_nombre.replace(/"/g, '""')}"`,
      `"${s.cliente_telefono || 'N/A'}"`,
      `"${(s.problema_diagnostico || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${s.estado}"`,
      s.costo,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_servicios_${fechaInicio}_al_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification("success", "Reporte descargado exitosamente.");
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6 max-w-7xl mx-auto">
      <ToastNotification notification={notification} onClose={() => setNotification(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reporte de Servicios</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Consulta de trabajos realizados por rango de fechas y exportación a CSV
            </p>
          </div>
        </div>

        <button
          onClick={exportarCSV}
          disabled={filteredServicios.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exportar a CSV</span>
        </button>
      </div>

      {/* Filtros de Fecha y Estado */}
      <div className="bg-card border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row gap-4 items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1">
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Fecha Inicial</label>
            <div className="relative">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Fecha Final</label>
            <div className="relative">
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Reparación">En Reparación</option>
              <option value="Listo">Listo</option>
              <option value="Entregado">Entregado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar placa o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Tarjetas de Resumen del Reporte */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Total de Servicios</span>
            <p className="text-2xl font-bold text-foreground">{filteredServicios.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Servicios Completados</span>
            <p className="text-2xl font-bold text-foreground">{totalCompletados}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Monto Total Acumulado</span>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCosto)}</p>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Generando reporte...</p>
          </div>
        ) : filteredServicios.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-4 rounded-2xl bg-muted text-muted-foreground">
              <FileText className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold">No hay servicios en este rango de fechas</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Prueba cambiando la fecha inicial o final para abarcar más registros.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Moto / Placa</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 hidden md:table-cell">Diagnóstico / Trabajo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredServicios.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      {s.placa}
                      {s.marca && (
                        <span className="block text-[11px] font-sans font-normal text-muted-foreground">
                          {s.marca}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {s.cliente_nombre}
                      {s.cliente_telefono && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {s.cliente_telefono}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell text-xs text-muted-foreground max-w-[260px] truncate">
                      {s.problema_diagnostico}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-muted border">
                        {s.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-foreground">
                      {formatCurrency(s.costo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
