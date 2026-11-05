"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, ChevronDown, Loader2, Package, Plus, Trash2 } from "lucide-react";

interface RepuestoOpcion {
  id: string;
  nombre: string;
  codigo_fabricante: string | null;
  stock: number;
  stock_minimo: number;
  precio: number;
}

interface LineaOrden {
  id: string;
  repuesto_id: string;
  nombre: string;
  codigo: string | null;
  cantidad: number;
  precio_unitario: number;
  stock: number;
  stock_minimo: number;
}

interface OrdenRepuestosPanelProps {
  servicioId: string;
  showNotification: (type: "success" | "error", message: string) => void;
}

function textoStock(stock: number): string {
  if (!Number.isFinite(stock)) return "0";
  return Number.isInteger(stock) ? String(stock) : String(Math.round(stock * 100) / 100);
}

export function mensajeStockInsuficiente(stock: number, nombre: string): string {
  return `Stock insuficiente: solo hay ${textoStock(stock)} unidades disponibles de ${nombre}`;
}

function validarCantidad(cantidadRaw: string, repuesto: RepuestoOpcion): string | null {
  const cantidad = Number(cantidadRaw);
  if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad) || cantidad <= 0) {
    return "La cantidad debe ser mayor a 0.";
  }
  if (cantidad > repuesto.stock) {
    return mensajeStockInsuficiente(repuesto.stock, repuesto.nombre);
  }
  return null;
}

function mensajeDeRpc(error: { message?: string; details?: string; code?: string } | null): string {
  const raw = error?.message || error?.details || "No se pudo completar la operación.";
  const stock = raw.match(/Stock insuficiente: solo hay .+ unidades disponibles de .+/);
  if (stock) return stock[0].replace(/\s+$/, "").replace(/\.$/, "");
  if (raw.includes("La cantidad debe ser mayor a 0")) {
    return "La cantidad debe ser mayor a 0.";
  }
  if (
    error?.code === "PGRST202" ||
    error?.code === "PGRST200" ||
    error?.code === "42P01" ||
    /agregar_repuesto_a_orden|quitar_repuesto_de_orden|orden_repuestos|schema cache|Could not find a relationship/i.test(raw)
  ) {
    return "Falta aplicar supabase/hu13_orden_repuestos.sql en el SQL Editor de Supabase.";
  }
  return raw;
}

function leerRepuesto(value: unknown): RepuestoOpcion | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.nombre !== "string") return null;
  return {
    id: row.id,
    nombre: row.nombre,
    codigo_fabricante: typeof row.codigo_fabricante === "string" ? row.codigo_fabricante : null,
    stock: Number(row.stock ?? 0),
    stock_minimo: Number(row.stock_minimo ?? 5),
    precio: Number(row.precio ?? 0),
  };
}

function leerEmbed(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function leerLinea(value: unknown): LineaOrden | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const repuesto = leerEmbed(row.repuestos);
  if (typeof row.id !== "string" || typeof row.repuesto_id !== "string" || !repuesto) return null;
  const nombre = typeof repuesto.nombre === "string" ? repuesto.nombre : "Repuesto";
  return {
    id: row.id,
    repuesto_id: row.repuesto_id,
    nombre,
    codigo: typeof repuesto.codigo_fabricante === "string" ? repuesto.codigo_fabricante : null,
    cantidad: Number(row.cantidad ?? 0),
    precio_unitario: Number(row.precio_unitario ?? 0),
    stock: Number(repuesto.stock ?? 0),
    stock_minimo: Number(repuesto.stock_minimo ?? 5),
  };
}

function comoErrorRpc(err: unknown): { message?: string; details?: string; code?: string } {
  if (!err || typeof err !== "object") {
    return { message: "No se pudo completar la operación." };
  }
  const row = err as { message?: unknown; details?: unknown; code?: unknown };
  return {
    message: typeof row.message === "string" ? row.message : undefined,
    details: typeof row.details === "string" ? row.details : undefined,
    code: typeof row.code === "string" ? row.code : undefined,
  };
}

export function OrdenRepuestosPanel({ servicioId, showNotification }: OrdenRepuestosPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const uid = useId();
  const contenedorRef = useRef<HTMLDivElement>(null);

  const [catalogo, setCatalogo] = useState<RepuestoOpcion[]>([]);
  const [lineas, setLineas] = useState<LineaOrden[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [quitandoId, setQuitandoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [abierto, setAbierto] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [catalogoRes, lineasRes] = await Promise.all([
      supabase
        .from("repuestos")
        .select("id, nombre, codigo_fabricante, stock, stock_minimo, precio")
        .order("nombre", { ascending: true }),
      supabase
        .from("orden_repuestos")
        .select(
          "id, cantidad, precio_unitario, repuesto_id, repuestos(nombre, codigo_fabricante, stock, stock_minimo)"
        )
        .eq("servicio_id", servicioId)
        .order("created_at", { ascending: true }),
    ]);

    if (catalogoRes.error) throw catalogoRes.error;
    if (lineasRes.error) throw lineasRes.error;

    const catalogoRows = (catalogoRes.data ?? []) as unknown[];
    const lineaRows = (lineasRes.data ?? []) as unknown[];
    setCatalogo(catalogoRows.map(leerRepuesto).filter((item): item is RepuestoOpcion => item !== null));
    setLineas(lineaRows.map(leerLinea).filter((item): item is LineaOrden => item !== null));
  }, [servicioId, supabase]);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    cargar()
      .then(() => {
        if (activo) setErrorCarga(null);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        const message = mensajeDeRpc(comoErrorRpc(err));
        setErrorCarga(message);
        showNotification("error", message);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [cargar, showNotification]);

  useEffect(() => {
    const cerrar = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  const seleccionado = catalogo.find((item) => item.id === seleccionadoId) ?? null;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const textoSeleccionado = seleccionado?.nombre.toLowerCase() ?? "";
    if (!q || q === textoSeleccionado) return catalogo;
    return catalogo.filter((item) => {
      const codigo = item.codigo_fabricante?.toLowerCase() ?? "";
      return item.nombre.toLowerCase().includes(q) || codigo.includes(q);
    });
  }, [busqueda, catalogo, seleccionado]);

  const totalRepuestos = lineas.reduce((sum, linea) => sum + linea.cantidad * linea.precio_unitario, 0);

  const elegir = (item: RepuestoOpcion) => {
    setSeleccionadoId(item.id);
    setBusqueda(item.nombre);
    setAbierto(false);
    setErrorLocal(null);
  };

  const agregar = async () => {
    if (!seleccionado) {
      setErrorLocal("Selecciona un repuesto del inventario.");
      return;
    }
    const errorCantidad = validarCantidad(cantidad, seleccionado);
    if (errorCantidad) {
      setErrorLocal(errorCantidad);
      return;
    }

    try {
      setGuardando(true);
      setErrorLocal(null);
      const { data, error } = await supabase.rpc("agregar_repuesto_a_orden", {
        p_servicio_id: servicioId,
        p_repuesto_id: seleccionado.id,
        p_cantidad: Number(cantidad),
      });
      if (error) throw error;

      await cargar();
      setErrorCarga(null);
      const resultado = data as { stock?: number; stock_bajo?: boolean } | null;
      const stockActual = Number(resultado?.stock ?? seleccionado.stock - Number(cantidad));
      const bajo = Boolean(resultado?.stock_bajo) || stockActual <= (seleccionado.stock_minimo ?? 5);
      showNotification(
        "success",
        `Se asociaron ${Number(cantidad)} unidades de ${seleccionado.nombre}. Stock actual: ${textoStock(stockActual)}.${
          bajo ? " Quedó en stock bajo." : ""
        }`
      );
      setCantidad("1");
    } catch (err: unknown) {
      const message = mensajeDeRpc(comoErrorRpc(err));
      setErrorLocal(message);
      showNotification("error", message);
      await cargar().catch(() => undefined);
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (linea: LineaOrden) => {
    try {
      setQuitandoId(linea.id);
      const { data, error } = await supabase.rpc("quitar_repuesto_de_orden", {
        p_orden_repuesto_id: linea.id,
      });
      if (error) throw error;
      await cargar();
      setErrorCarga(null);
      const resultado = data as { stock?: number } | null;
      const stockActual = Number(resultado?.stock ?? linea.stock + linea.cantidad);
      showNotification(
        "success",
        `Se devolvieron ${linea.cantidad} unidades de ${linea.nombre} al inventario. Stock actual: ${textoStock(stockActual)}.`
      );
    } catch (err: unknown) {
      showNotification("error", mensajeDeRpc(comoErrorRpc(err)));
    } finally {
      setQuitandoId(null);
    }
  };

  return (
    <section className="flex flex-col gap-3 pt-2 border-t">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Repuestos utilizados</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_auto] gap-2 items-end">
        <div className="relative" ref={contenedorRef}>
          <label htmlFor={`${uid}-buscar`} className="block text-xs font-semibold mb-1 text-foreground">
            Repuesto
          </label>
          <div className="relative">
            <input
              id={`${uid}-buscar`}
              type="text"
              value={busqueda}
              onChange={(event) => {
                setBusqueda(event.target.value);
                setSeleccionadoId(null);
                setAbierto(true);
                setErrorLocal(null);
              }}
              onFocus={() => setAbierto(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void agregar();
                }
              }}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-3 pr-9 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              autoComplete="off"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setAbierto((prev) => !prev)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded"
              aria-label="Abrir lista de repuestos"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
            </button>
          </div>
          {abierto && (
            <div className="absolute z-40 left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
              {filtrados.length > 0 ? (
                filtrados.map((item) => {
                  const bajo = item.stock <= item.stock_minimo;
                  const activo = item.id === seleccionadoId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => elegir(item)}
                      className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                        activo ? "bg-muted" : ""
                      }`}
                    >
                      <span className="block text-sm font-semibold text-foreground">{item.nombre}</span>
                      <span className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>{item.codigo_fabricante || "Sin código"}</span>
                        <span className={bajo ? "font-bold text-rose-600" : "font-semibold text-foreground"}>
                          Stock: {textoStock(item.stock)}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="p-3 text-xs text-muted-foreground text-center">
                  {catalogo.length === 0
                    ? "No hay repuestos en el inventario."
                    : "Ningún repuesto coincide con la búsqueda."}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor={`${uid}-cantidad`} className="block text-xs font-semibold mb-1 text-foreground">
            Cantidad
          </label>
          <input
            id={`${uid}-cantidad`}
            type="number"
            min={1}
            step={1}
            value={cantidad}
            onChange={(event) => {
              setCantidad(event.target.value);
              setErrorLocal(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void agregar();
              }
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="button"
          onClick={agregar}
          disabled={guardando || loading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar
        </button>
      </div>

      {seleccionado && (
        <p className="text-[11px] text-muted-foreground">
          {seleccionado.codigo_fabricante || "Sin código"} · Stock disponible:{" "}
          <span className="font-semibold text-foreground">{textoStock(seleccionado.stock)}</span>
          {" · "}
          {formatCurrency(seleccionado.precio)}
          {seleccionado.stock <= seleccionado.stock_minimo && (
            <span className="ml-2 font-bold text-rose-600">Stock bajo</span>
          )}
        </p>
      )}

      {errorLocal && (
        <p role="alert" className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
          {errorLocal}
        </p>
      )}

      {errorCarga ? (
        <p role="alert" className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
          {errorCarga}
        </p>
      ) : loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs">Cargando repuestos de la orden...</span>
        </div>
      ) : lineas.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-muted/40 border rounded-xl p-3">
          Esta orden aún no tiene repuestos asociados. Agrega los que se usen en la reparación.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-2 px-3">Repuesto</th>
                <th className="py-2 px-3">Cantidad</th>
                <th className="py-2 px-3">Precio unitario</th>
                <th className="py-2 px-3">Subtotal</th>
                <th className="py-2 px-3">Stock actual</th>
                <th className="py-2 px-3 text-right">Quitar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineas.map((linea) => {
                const bajo = linea.stock <= linea.stock_minimo;
                return (
                  <tr key={linea.id}>
                    <td className="py-2.5 px-3">
                      <span className="block font-semibold text-foreground">{linea.nombre}</span>
                      <span className="text-[11px] text-muted-foreground">{linea.codigo || "Sin código"}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{linea.cantidad}</td>
                    <td className="py-2.5 px-3">{formatCurrency(linea.precio_unitario)}</td>
                    <td className="py-2.5 px-3 font-semibold">
                      {formatCurrency(linea.cantidad * linea.precio_unitario)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold border ${
                          bajo
                            ? "bg-rose-500/15 text-rose-600 border-rose-500/20"
                            : "bg-muted text-foreground border-transparent"
                        }`}
                      >
                        {bajo && <AlertTriangle className="w-3 h-3" />}
                        {textoStock(linea.stock)}
                        {bajo && <span className="font-semibold">bajo</span>}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => quitar(linea)}
                        disabled={quitandoId === linea.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 disabled:opacity-50 cursor-pointer"
                        title="Quitar y devolver al inventario"
                      >
                        {quitandoId === linea.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td colSpan={3} className="py-2 px-3 text-right font-semibold text-muted-foreground">
                  Total repuestos
                </td>
                <td className="py-2 px-3 font-extrabold text-foreground">{formatCurrency(totalRepuestos)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
