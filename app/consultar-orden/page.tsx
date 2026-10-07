"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Search,
  Bike,
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Calendar,
} from "lucide-react";

interface ConsultaResultado {
  id: string;
  created_at: string;
  placa: string;
  marca: string | null;
  estado: "Pendiente" | "En Reparación" | "Listo" | "Entregado" | "Cancelado";
  problema_diagnostico: string;
}

const PASOS_ESTADO = [
  { clave: "Pendiente", label: "Recibido / Pendiente", desc: "Moto ingresada al taller" },
  { clave: "En Reparación", label: "En Reparación", desc: "El mecánico está trabajando en la moto" },
  { clave: "Listo", label: "Listo para Entrega", desc: "Tu moto está lista para ser retirada" },
  { clave: "Entregado", label: "Entregado", desc: "Servicio completado y entregado" },
];

export default function ConsultarOrdenPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      setSearched(true);
      setResultado(null);

      const supabase = createClient();

      // Buscar por ID o por Placa
      let req = supabase
        .from("servicios")
        .select("id, created_at, placa, marca, estado, problema_diagnostico")
        .order("created_at", { ascending: false })
        .limit(1);

      // Si parece UUID o texto largo busca por ID, de lo contrario por placa
      if (cleanQuery.length >= 8 && cleanQuery.includes("-")) {
        req = req.eq("id", cleanQuery);
      } else {
        req = req.ilike("placa", cleanQuery);
      }

      const { data, error } = await req;

      if (error) throw error;

      if (data && data.length > 0) {
        setResultado(data[0] as ConsultaResultado);
      } else {
        setErrorMsg("Orden no encontrada. Verifica el número de orden o la placa de tu moto.");
      }
    } catch (err: unknown) {
      setErrorMsg("Ocurrió un error al consultar el estado. Por favor intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  const getPasoIndex = (estado: string) => {
    switch (estado) {
      case "Pendiente":
        return 0;
      case "En Reparación":
        return 1;
      case "Listo":
        return 2;
      case "Entregado":
        return 3;
      default:
        return 0;
    }
  };

  const pasoActual = resultado ? getPasoIndex(resultado.estado) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sm:px-12 flex justify-between items-center shadow-xs">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Wrench className="w-6 h-6 text-blue-600" />
          <span className="font-extrabold text-lg tracking-tight text-slate-900">Moto Zone</span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 my-8 flex flex-col gap-6">
        {/* Título */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-600 mb-3">
            <Bike className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Consulta el Estado de tu Moto
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Ingresa la placa de tu motocicleta o el código de tu orden de servicio para verificar su avance.
          </p>
        </div>

        {/* Formulario de Búsqueda */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
          <form onSubmit={handleConsultar} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Ej. ABC12D o Código de Orden..."
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-3 text-sm uppercase font-semibold rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Consultar Estado</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Mensaje de Error / No encontrado */}
        {searched && errorMsg && !loading && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800 animate-in fade-in">
            <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600 mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-rose-900 mb-1">Orden no encontrada</h3>
            <p className="text-sm text-rose-700 max-w-md mx-auto">{errorMsg}</p>
          </div>
        )}

        {/* Resultado de la Consulta */}
        {resultado && !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6 animate-in fade-in">
            {/* Encabezado del resultado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Placa de la Motocicleta
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h2 className="text-2xl font-black font-mono text-slate-900">{resultado.placa}</h2>
                  {resultado.marca && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      {resultado.marca}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Estado Actual
                </span>
                <div className="mt-0.5">
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide ${
                      resultado.estado === "Listo"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : resultado.estado === "En Reparación"
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : resultado.estado === "Entregado"
                        ? "bg-purple-100 text-purple-800 border border-purple-300"
                        : resultado.estado === "Cancelado"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {resultado.estado}
                  </span>
                </div>
              </div>
            </div>

            {/* Línea de tiempo de estados */}
            {resultado.estado !== "Cancelado" ? (
              <div className="py-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                  Progreso del Servicio
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PASOS_ESTADO.map((paso, index) => {
                    const isCompleted = index < pasoActual;
                    const isCurrent = index === pasoActual;
                    return (
                      <div
                        key={paso.clave}
                        className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
                          isCurrent
                            ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20"
                            : isCompleted
                            ? "bg-slate-50 border-slate-200 text-slate-700"
                            : "bg-slate-50/40 border-slate-100 text-slate-400 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : isCurrent ? (
                            <Clock className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                          )}
                          <span
                            className={`text-xs font-bold ${
                              isCurrent
                                ? "text-blue-900"
                                : isCompleted
                                ? "text-slate-800"
                                : "text-slate-400"
                            }`}
                          >
                            {paso.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">{paso.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                Esta orden de servicio ha sido cancelada. Si tienes preguntas, contacta a la administración del taller.
              </div>
            )}

            {/* Detalles básicos permitidos para el cliente */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Calendar className="w-3.5 h-3.5" />
                <span>Fecha de Registro: {formatDate(resultado.created_at)}</span>
              </div>
              {resultado.problema_diagnostico && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-xs font-bold text-slate-700 block mb-0.5">
                    Motivo / Falla Reportada:
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {resultado.problema_diagnostico}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Moto Zone - Sistema de Gestión de Taller de Motos
      </footer>
    </div>
  );
}
