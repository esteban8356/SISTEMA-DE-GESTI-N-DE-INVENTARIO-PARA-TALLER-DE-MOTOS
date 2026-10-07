"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFilesToBucket, deleteFilesFromBucket } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { ToastNotification, ToastMessage } from "@/components/ui/toast-notification";
import { Modal } from "@/components/ui/modal";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Wrench,
  AlertTriangle,
  UploadCloud,
  X,
  Loader2,
  Image as ImageIcon,
  Phone,
  Bike,
  ExternalLink,
} from "lucide-react";

export interface ServicioMoto {
  id: string;
  created_at: string;
  updated_at: string;
  placa: string;
  marca: string | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  problema_diagnostico: string;
  estado: "Pendiente" | "En Reparación" | "Listo" | "Entregado" | "Cancelado";
  costo: number;
  fotos: string[];
}

const ESTADOS_SERVICIO = [
  "Pendiente",
  "En Reparación",
  "Listo",
  "Entregado",
  "Cancelado",
] as const;

const MARCAS_MOTO_DEFAULT = [
  "Yamaha",
  "Honda",
  "Suzuki",
  "Kawasaki",
  "Bajaj / Pulsar",
  "KTM",
  "TVS",
  "Hero",
  "BMW",
  "Ducati",
  "Royal Enfield",
  "AKT",
  "Kymco",
  "Auteco",
  "Otro",
];

const STATUS_CONFIG: Record<
  ServicioMoto["estado"],
  { bg: string; text: string; border: string }
> = {
  Pendiente: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  "En Reparación": {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
  Listo: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  Entregado: {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
  },
  Cancelado: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
  },
};

const INITIAL_FORM = {
  placa: "",
  marca: "",
  cliente_nombre: "",
  cliente_telefono: "",
  problema_diagnostico: "",
  estado: "Pendiente" as ServicioMoto["estado"],
  costo: 0,
  fotos: [] as string[],
};

export default function ServiciosPage() {
  const supabase = useMemo(() => createClient(), []);

  const [servicios, setServicios] = useState<ServicioMoto[]>([]);
  const [marcasList, setMarcasList] = useState<string[]>(MARCAS_MOTO_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("Todos");
  const [notification, setNotification] = useState<ToastMessage | null>(null);

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<ServicioMoto | null>(null);

  // Form State
  const [formData, setFormData] = useState<{ id?: string } & typeof INITIAL_FORM>(INITIAL_FORM);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Cargar datos
  const fetchServicios = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("servicios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setServicios(
        (data || []).map((item) => ({
          ...item,
          fotos: Array.isArray(item.fotos) ? item.fotos : [],
          costo: Number(item.costo || 0),
        }))
      );
    } catch (err: unknown) {
      showNotification("error", "Error al cargar servicios: " + (err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  }, [supabase, showNotification]);

  const fetchMarcas = useCallback(async () => {
    try {
      const { data } = await supabase.from("marcas").select("nombre").order("nombre", { ascending: true });
      if (data?.length) {
        setMarcasList(data.map((m) => m.nombre));
      }
    } catch {
      // Usar defaults
    }
  }, [supabase]);

  useEffect(() => {
    fetchServicios();
    fetchMarcas();
  }, [fetchServicios, fetchMarcas]);

  // Limpiar previews
  const clearFilePreviews = useCallback(() => {
    newFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    setNewFiles([]);
    setNewFilePreviews([]);
  }, [newFilePreviews]);

  // Handlers de Modales
  const handleOpenCreate = () => {
    clearFilePreviews();
    setSelectedServicio(null);
    setFormData(INITIAL_FORM);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (servicio: ServicioMoto) => {
    clearFilePreviews();
    setSelectedServicio(servicio);
    setFormData({
      id: servicio.id,
      placa: servicio.placa || "",
      marca: servicio.marca || "",
      cliente_nombre: servicio.cliente_nombre || "",
      cliente_telefono: servicio.cliente_telefono || "",
      problema_diagnostico: servicio.problema_diagnostico || "",
      estado: servicio.estado || "Pendiente",
      costo: servicio.costo || 0,
      fotos: servicio.fotos || [],
    });
    setIsFormOpen(true);
  };

  const handleOpenDetail = (servicio: ServicioMoto) => {
    setSelectedServicio(servicio);
    setActivePhotoIndex(0);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (servicio: ServicioMoto) => {
    setSelectedServicio(servicio);
    setIsDeleteOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const filesArray = Array.from(e.target.files);
    setNewFiles((prev) => [...prev, ...filesArray]);
    const previews = filesArray.map((file) => URL.createObjectURL(file));
    setNewFilePreviews((prev) => [...prev, ...previews]);
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newFilePreviews[index]);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (urlToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      fotos: prev.fotos.filter((url) => url !== urlToRemove),
    }));
  };

  // Guardar Servicio
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.placa.trim() || !formData.cliente_nombre.trim() || !formData.problema_diagnostico.trim()) {
      showNotification("error", "Placa, Cliente y Motivo de Ingreso son obligatorios.");
      return;
    }

    try {
      setSaving(true);

      // Eliminar fotos removidas
      if (selectedServicio?.fotos?.length) {
        const removed = selectedServicio.fotos.filter((url) => !formData.fotos.includes(url));
        if (removed.length > 0) {
          await deleteFilesFromBucket(supabase, "servicios", removed);
        }
      }

      // Subir fotos nuevas
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        uploadedUrls = await uploadFilesToBucket(supabase, "servicios", newFiles, formData.placa);
      }

      const payload = {
        placa: formData.placa.trim().toUpperCase(),
        marca: formData.marca.trim() || null,
        cliente_nombre: formData.cliente_nombre.trim(),
        cliente_telefono: formData.cliente_telefono.trim() || null,
        problema_diagnostico: formData.problema_diagnostico.trim(),
        estado: formData.estado,
        costo: Number(formData.costo) || 0,
        fotos: [...formData.fotos, ...uploadedUrls],
      };

      if (selectedServicio?.id) {
        const { error } = await supabase.from("servicios").update(payload).eq("id", selectedServicio.id);
        if (error) throw error;
        showNotification("success", "Servicio actualizado exitosamente.");
      } else {
        const { error } = await supabase.from("servicios").insert([payload]);
        if (error) throw error;
        showNotification("success", "Orden de servicio creada con éxito.");
      }

      setIsFormOpen(false);
      clearFilePreviews();
      fetchServicios();
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Error al guardar orden.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Servicio
  const handleDelete = async () => {
    if (!selectedServicio) return;
    try {
      setSaving(true);
      if (selectedServicio.fotos?.length) {
        await deleteFilesFromBucket(supabase, "servicios", selectedServicio.fotos);
      }
      const { error } = await supabase.from("servicios").delete().eq("id", selectedServicio.id);
      if (error) throw error;

      showNotification("success", "Orden de servicio eliminada correctamente.");
      setIsDeleteOpen(false);
      setSelectedServicio(null);
      fetchServicios();
    } catch (err: unknown) {
      showNotification("error", "Error al eliminar: " + (err instanceof Error ? err.message : ""));
    } finally {
      setSaving(false);
    }
  };

  // Filtrado
  const filteredServicios = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return servicios.filter((item) => {
      const matchEstado = filterEstado === "Todos" || item.estado === filterEstado;
      if (!matchEstado) return false;
      if (!q) return true;
      return (
        item.placa.toLowerCase().includes(q) ||
        item.cliente_nombre.toLowerCase().includes(q) ||
        (item.cliente_telefono && item.cliente_telefono.includes(q)) ||
        (item.marca && item.marca.toLowerCase().includes(q)) ||
        item.problema_diagnostico.toLowerCase().includes(q)
      );
    });
  }, [servicios, searchTerm, filterEstado]);

  return (
    <div className="flex-1 w-full flex flex-col gap-6 max-w-7xl mx-auto">
      <ToastNotification notification={notification} onClose={() => setNotification(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Servicio y Reparaciones</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gestión de motos en taller, diagnósticos mecánicos y órdenes de trabajo
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Moto / Servicio</span>
        </button>
      </div>

      {/* Buscador y Filtros por Estado */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por placa, cliente, teléfono, marca o falla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Pestañas de Estado */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 items-center">
          {["Todos", ...ESTADOS_SERVICIO].map((estado) => {
            const isSelected = filterEstado === estado;
            return (
              <button
                key={estado}
                onClick={() => setFilterEstado(estado)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {estado}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla / Listado */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando servicios...</p>
          </div>
        ) : filteredServicios.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-4 rounded-2xl bg-muted text-muted-foreground">
              <Bike className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold">No se encontraron servicios</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchTerm || filterEstado !== "Todos"
                ? "No hay órdenes que coincidan con los filtros aplicados."
                : "Aún no has registrado ninguna moto en el taller. Comienza con una nueva orden."}
            </p>
            {searchTerm || filterEstado !== "Todos" ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterEstado("Todos");
                }}
                className="mt-2 text-xs font-semibold text-primary underline underline-offset-4"
              >
                Restablecer filtros
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> Registrar Primera Moto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Moto / Placa</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 hidden md:table-cell">Diagnóstico / Motivo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Costo Estimado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredServicios.map((item) => {
                  const firstPhoto = item.fotos?.[0];
                  const statusStyle = STATUS_CONFIG[item.estado] || STATUS_CONFIG.Pendiente;

                  return (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors group">
                      {/* Moto & Placa */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                            {firstPhoto ? (
                              <img
                                src={firstPhoto}
                                alt={item.placa}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Bike className="w-5 h-5 text-muted-foreground/50" />
                            )}
                            {item.fotos.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/75 text-white text-[9px] px-1 rounded-tl font-bold">
                                +{item.fotos.length - 1}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-mono text-sm font-extrabold text-foreground tracking-wider">
                              {item.placa}
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">
                              {item.marca || "Marca no especificada"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">
                            {item.cliente_nombre}
                          </span>
                          {item.cliente_telefono && (
                            <a
                              href={`https://wa.me/${item.cliente_telefono.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-emerald-600 flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{item.cliente_telefono}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Diagnóstico */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-[280px]">
                          {item.problema_diagnostico}
                        </p>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {item.estado}
                        </span>
                      </td>

                      {/* Costo */}
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {formatCurrency(item.costo)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Ver Detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Formulario (Crear / Editar) */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedServicio ? "Editar Orden de Servicio" : "Registrar Entrada de Moto"}
        subtitle={selectedServicio ? `Placa: ${selectedServicio.placa}` : "Ingresa los datos del cliente y la motocicleta"}
        icon={<Wrench className="w-5 h-5" />}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Placa de la Moto <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. ABC12D"
                value={formData.placa}
                onChange={(e) => setFormData((prev) => ({ ...prev, placa: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 text-sm uppercase font-mono font-bold rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <SearchableCombobox
                label="Marca de la Moto"
                value={formData.marca}
                onChange={(val) => setFormData((prev) => ({ ...prev, marca: val }))}
                options={marcasList}
                placeholder="Seleccionar o escribir marca..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Nombre del Cliente <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Carlos Pérez"
                value={formData.cliente_nombre}
                onChange={(e) => setFormData((prev) => ({ ...prev, cliente_nombre: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Teléfono / WhatsApp</label>
              <input
                type="tel"
                placeholder="Ej. 3001234567"
                value={formData.cliente_telefono}
                onChange={(e) => setFormData((prev) => ({ ...prev, cliente_telefono: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Estado del Servicio</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData((prev) => ({ ...prev, estado: e.target.value as ServicioMoto["estado"] }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ESTADOS_SERVICIO.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Costo Estimado / Total (COP)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.costo}
                onChange={(e) => setFormData((prev) => ({ ...prev, costo: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Problema Reportado / Diagnóstico <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describa la falla, cambio de repuestos requeridos o mantenimiento a realizar..."
                value={formData.problema_diagnostico}
                onChange={(e) => setFormData((prev) => ({ ...prev, problema_diagnostico: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Fotos */}
          <div className="pt-2 border-t">
            <label className="block text-xs font-semibold mb-2 text-foreground">
              Fotos del Estado de la Moto / Reparación ({formData.fotos.length + newFiles.length})
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
              {formData.fotos.map((url, idx) => (
                <div key={url} className="relative aspect-square rounded-xl border bg-muted overflow-hidden group">
                  <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(url)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                    title="Eliminar foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {newFilePreviews.map((preview, idx) => (
                <div key={preview} className="relative aspect-square rounded-xl border-2 border-primary/40 bg-muted overflow-hidden group">
                  <img src={preview} alt={`Nueva ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded font-bold">
                    Nueva
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNewFile(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                    title="Quitar foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <label className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors p-2 text-center">
                <UploadCloud className="w-6 h-6 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground">Agregar Foto</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border hover:bg-muted transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{selectedServicio ? "Actualizar Servicio" : "Crear Orden"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalle */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Orden: Placa ${selectedServicio?.placa || ""}`}
        subtitle={selectedServicio?.marca || undefined}
        icon={<Bike className="w-5 h-5" />}
        maxWidth="lg"
      >
        {selectedServicio && (
          <div className="flex flex-col gap-4">
            {/* Galería */}
            {selectedServicio.fotos?.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="relative aspect-video w-full rounded-2xl bg-muted border overflow-hidden">
                  <img
                    src={selectedServicio.fotos[activePhotoIndex] || selectedServicio.fotos[0]}
                    alt={selectedServicio.placa}
                    className="w-full h-full object-contain"
                  />
                </div>
                {selectedServicio.fotos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedServicio.fotos.map((url, idx) => (
                      <button
                        key={url}
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`relative w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                          activePhotoIndex === idx ? "border-primary scale-95" : "border-transparent opacity-60"
                        }`}
                      >
                        <img src={url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video w-full rounded-2xl bg-muted border flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageIcon className="w-8 h-8 opacity-40" />
                <span className="text-xs">Sin fotos adjuntas</span>
              </div>
            )}

            {/* Datos */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border">
              <div>
                <span className="text-xs text-muted-foreground block">Cliente</span>
                <span className="text-sm font-bold text-foreground">{selectedServicio.cliente_nombre}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Teléfono</span>
                {selectedServicio.cliente_telefono ? (
                  <a
                    href={`https://wa.me/${selectedServicio.cliente_telefono.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{selectedServicio.cliente_telefono}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">No registrado</span>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Estado Actual</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold mt-0.5 border ${
                    STATUS_CONFIG[selectedServicio.estado]?.bg || ""
                  } ${STATUS_CONFIG[selectedServicio.estado]?.text || ""} ${
                    STATUS_CONFIG[selectedServicio.estado]?.border || ""
                  }`}
                >
                  {selectedServicio.estado}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Costo</span>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(selectedServicio.costo)}
                </span>
              </div>
              {selectedServicio.created_at && (
                <div className="col-span-2 text-xs text-muted-foreground pt-2 border-t">
                  Ingresada el: {formatDate(selectedServicio.created_at)}
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground block mb-1">Motivo / Diagnóstico:</span>
              <p className="text-xs sm:text-sm text-muted-foreground bg-card p-3 rounded-xl border leading-relaxed">
                {selectedServicio.problema_diagnostico}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedServicio);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar Orden
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Eliminar */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirmar Eliminación"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar la orden de servicio de la moto{" "}
            <span className="font-bold text-foreground">"{selectedServicio?.placa}"</span>? Esta acción también eliminará sus fotos asociadas en storage.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border hover:bg-muted transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Eliminar Orden</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
