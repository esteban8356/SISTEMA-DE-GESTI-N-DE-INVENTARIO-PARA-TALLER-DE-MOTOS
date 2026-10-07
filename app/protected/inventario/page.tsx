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
  Package,
  AlertTriangle,
  UploadCloud,
  X,
  Loader2,
  Image as ImageIcon,
  Tag,
  AlertCircle,
  Filter,
} from "lucide-react";

export interface Repuesto {
  id: string;
  created_at: string;
  updated_at: string;
  nombre: string;
  descripcion: string | null;
  codigo_fabricante: string | null;
  stock: number;
  stock_minimo?: number;
  precio: number;
  categoria: string | null;
  marca_repuesto: string | null;
  fotos: string[];
}

const CATEGORIAS_SUGERIDAS = [
  "Motor",
  "Frenos",
  "Transmisión",
  "Suspensión",
  "Sistema Eléctrico",
  "Llantas y Ruedas",
  "Carrocería y Plásticos",
  "Lubricantes y Químicos",
  "Accesorios",
  "Escape",
  "Otro",
];

const MARCAS_SUGERIDAS = [
  "Honda",
  "Yamaha",
  "Suzuki",
  "Kawasaki",
  "Bajaj",
  "KTM",
  "BMW",
  "TVS",
  "Hero",
  "Italika",
  "Genérico / Universal",
];

const INITIAL_FORM = {
  nombre: "",
  descripcion: "",
  codigo_fabricante: "",
  stock: 0,
  stock_minimo: 5,
  precio: 0,
  categoria: "",
  marca_repuesto: "",
  fotos: [] as string[],
};

export default function InventarioPage() {
  const supabase = useMemo(() => createClient(), []);

  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyCriticalStock, setOnlyCriticalStock] = useState(false);
  const [notification, setNotification] = useState<ToastMessage | null>(null);

  // Categorías y Marcas
  const [categoriasList, setCategoriasList] = useState<string[]>(CATEGORIAS_SUGERIDAS);
  const [marcasList, setMarcasList] = useState<string[]>(MARCAS_SUGERIDAS);

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRepuesto, setSelectedRepuesto] = useState<Repuesto | null>(null);

  // Form State
  const [formData, setFormData] = useState<{ id?: string } & typeof INITIAL_FORM>(INITIAL_FORM);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Cargar datos iniciales
  const fetchRepuestos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("repuestos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRepuestos(
        (data || []).map((item) => ({
          ...item,
          fotos: Array.isArray(item.fotos) ? item.fotos : [],
          precio: Number(item.precio || 0),
          stock: Number(item.stock || 0),
          stock_minimo: item.stock_minimo !== undefined && item.stock_minimo !== null ? Number(item.stock_minimo) : 5,
        }))
      );
    } catch (err: unknown) {
      showNotification("error", "Error al cargar repuestos: " + (err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  }, [supabase, showNotification]);

  const fetchCategoriasYMarcas = useCallback(async () => {
    try {
      const [resCat, resMarcas] = await Promise.all([
        supabase.from("categorias").select("nombre").order("nombre", { ascending: true }),
        supabase.from("marcas").select("nombre").order("nombre", { ascending: true }),
      ]);
      if (resCat.data?.length) setCategoriasList(resCat.data.map((c) => c.nombre));
      if (resMarcas.data?.length) setMarcasList(resMarcas.data.map((m) => m.nombre));
    } catch {
      // Usar sugeridos por defecto
    }
  }, [supabase]);

  useEffect(() => {
    fetchRepuestos();
    fetchCategoriasYMarcas();
  }, [fetchRepuestos, fetchCategoriasYMarcas]);

  // Limpiar previews de archivos
  const clearFilePreviews = useCallback(() => {
    newFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    setNewFiles([]);
    setNewFilePreviews([]);
  }, [newFilePreviews]);

  // Manejo de Modales
  const handleOpenCreate = () => {
    clearFilePreviews();
    setSelectedRepuesto(null);
    setFormData(INITIAL_FORM);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (repuesto: Repuesto) => {
    clearFilePreviews();
    setSelectedRepuesto(repuesto);
    setFormData({
      id: repuesto.id,
      nombre: repuesto.nombre || "",
      descripcion: repuesto.descripcion || "",
      codigo_fabricante: repuesto.codigo_fabricante || "",
      stock: repuesto.stock || 0,
      stock_minimo: repuesto.stock_minimo ?? 5,
      precio: repuesto.precio || 0,
      categoria: repuesto.categoria || "",
      marca_repuesto: repuesto.marca_repuesto || "",
      fotos: repuesto.fotos || [],
    });
    setIsFormOpen(true);
  };

  const handleOpenDetail = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setActivePhotoIndex(0);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
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

  // Guardar Repuesto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      showNotification("error", "El nombre del repuesto es obligatorio.");
      return;
    }

    try {
      setSaving(true);

      // Eliminar fotos removidas del storage si estamos editando
      if (selectedRepuesto?.fotos?.length) {
        const removed = selectedRepuesto.fotos.filter((url) => !formData.fotos.includes(url));
        if (removed.length > 0) {
          await deleteFilesFromBucket(supabase, "repuestos", removed);
        }
      }

      // Subir fotos nuevas
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        uploadedUrls = await uploadFilesToBucket(supabase, "repuestos", newFiles, formData.nombre);
      }

      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        codigo_fabricante: formData.codigo_fabricante.trim() || null,
        stock: Number(formData.stock) || 0,
        stock_minimo: Number(formData.stock_minimo) || 5,
        precio: Number(formData.precio) || 0,
        categoria: formData.categoria.trim() || null,
        marca_repuesto: formData.marca_repuesto.trim() || null,
        fotos: [...formData.fotos, ...uploadedUrls],
      };

      if (selectedRepuesto?.id) {
        const { error } = await supabase.from("repuestos").update(payload).eq("id", selectedRepuesto.id);
        if (error) throw error;
        showNotification("success", "Repuesto actualizado exitosamente.");
      } else {
        const { error } = await supabase.from("repuestos").insert([payload]);
        if (error) throw error;
        showNotification("success", "Repuesto registrado exitosamente.");
      }

      setIsFormOpen(false);
      clearFilePreviews();
      fetchRepuestos();
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Error al guardar repuesto.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Repuesto
  const handleDelete = async () => {
    if (!selectedRepuesto) return;
    try {
      setSaving(true);
      if (selectedRepuesto.fotos?.length) {
        await deleteFilesFromBucket(supabase, "repuestos", selectedRepuesto.fotos);
      }
      const { error } = await supabase.from("repuestos").delete().eq("id", selectedRepuesto.id);
      if (error) throw error;

      showNotification("success", "Repuesto eliminado correctamente.");
      setIsDeleteOpen(false);
      setSelectedRepuesto(null);
      fetchRepuestos();
    } catch (err: unknown) {
      showNotification("error", "Error al eliminar: " + (err instanceof Error ? err.message : ""));
    } finally {
      setSaving(false);
    }
  };

  // Conteo de repuestos en alerta de stock
  const criticalItems = useMemo(() => {
    return repuestos.filter((item) => item.stock <= (item.stock_minimo ?? 5));
  }, [repuestos]);

  // Filtrado
  const filteredRepuestos = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return repuestos.filter((item) => {
      const minStock = item.stock_minimo ?? 5;
      if (onlyCriticalStock && item.stock > minStock) {
        return false;
      }
      if (!q) return true;
      return (
        item.nombre.toLowerCase().includes(q) ||
        (item.codigo_fabricante && item.codigo_fabricante.toLowerCase().includes(q)) ||
        (item.marca_repuesto && item.marca_repuesto.toLowerCase().includes(q)) ||
        (item.categoria && item.categoria.toLowerCase().includes(q)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(q))
      );
    });
  }, [repuestos, searchTerm, onlyCriticalStock]);

  return (
    <div className="flex-1 w-full flex flex-col gap-6 max-w-7xl mx-auto">
      <ToastNotification notification={notification} onClose={() => setNotification(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventario de Repuestos</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Control de existencias, alertas de stock mínimo, repuestos y precios
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Repuesto</span>
        </button>
      </div>

      {/* HU-14: Banner de Alerta de Stock Crítico */}
      {criticalItems.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800 dark:text-rose-200 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                ¡Alerta de Stock Mínimo! Hay {criticalItems.length} repuesto(s) en nivel crítico
              </h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                La cantidad disponible es igual o inferior al stock mínimo configurado. Se recomienda reabastecer.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOnlyCriticalStock((prev) => !prev)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            {onlyCriticalStock ? "Mostrar Todos" : "Filtrar Críticos"}
          </button>
        </div>
      )}

      {/* Buscador y Filtro Rápido */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por repuesto, código de fabricante, marca o categoría..."
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

        <button
          onClick={() => setOnlyCriticalStock((prev) => !prev)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border transition-colors cursor-pointer shrink-0 ${
            onlyCriticalStock
              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
              : "bg-card text-foreground hover:bg-muted border-input"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Solo Stock Bajo ({criticalItems.length})</span>
        </button>
      </div>

      {/* Contenido Tabla / Tarjetas */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando inventario...</p>
          </div>
        ) : filteredRepuestos.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-4 rounded-2xl bg-muted text-muted-foreground">
              <Package className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold">No se encontraron repuestos</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchTerm || onlyCriticalStock
                ? "No hay repuestos que coincidan con los filtros seleccionados."
                : "Aún no tienes repuestos en el inventario. Añade el primero para comenzar."}
            </p>
            {searchTerm || onlyCriticalStock ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setOnlyCriticalStock(false);
                }}
                className="mt-2 text-xs font-semibold text-primary underline underline-offset-4"
              >
                Limpiar filtros
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> Registrar Primer Repuesto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Código / Marca</th>
                  <th className="py-3 px-4 hidden md:table-cell">Categoría</th>
                  <th className="py-3 px-4">Stock / Estado</th>
                  <th className="py-3 px-4">Precio Venta</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRepuestos.map((item) => {
                  const firstPhoto = item.fotos?.[0];
                  const minStock = item.stock_minimo ?? 5;
                  const isCritical = item.stock <= minStock;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/40 transition-colors group ${
                        isCritical ? "bg-rose-500/[0.03]" : ""
                      }`}
                    >
                      {/* Nombre y Foto */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                            {firstPhoto ? (
                              <img
                                src={firstPhoto}
                                alt={item.nombre}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                            )}
                            {item.fotos.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/75 text-white text-[9px] px-1 rounded-tl font-bold">
                                +{item.fotos.length - 1}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => handleOpenDetail(item)}
                              className="font-bold text-foreground hover:text-primary transition-colors text-left line-clamp-1 cursor-pointer"
                            >
                              {item.nombre}
                            </button>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                              {item.descripcion || "Sin descripción"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Código & Marca */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {item.codigo_fabricante || "N/A"}
                          </span>
                          {item.marca_repuesto && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Tag className="w-3 h-3 text-muted-foreground/70" />
                              {item.marca_repuesto}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground border">
                          {item.categoria || "General"}
                        </span>
                      </td>

                      {/* Stock con Alerta HU-14 */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isCritical
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {item.stock} unid.
                          </span>
                          {isCritical && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Stock crítico (mín: {minStock})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Precio */}
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {formatCurrency(item.precio)}
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
        title={selectedRepuesto ? "Editar Repuesto" : "Nuevo Repuesto"}
        subtitle={selectedRepuesto ? "Modifica los datos del repuesto" : "Completa la información del nuevo repuesto"}
        icon={<Package className="w-5 h-5" />}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Nombre del Repuesto <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Pastillas de Freno Delanteras"
                value={formData.nombre}
                onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Código de Fabricante / Parte
              </label>
              <input
                type="text"
                placeholder="Ej. OEM-12345"
                value={formData.codigo_fabricante}
                onChange={(e) => setFormData((prev) => ({ ...prev, codigo_fabricante: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <SearchableCombobox
                label="Marca del Repuesto / Moto"
                value={formData.marca_repuesto}
                onChange={(val) => setFormData((prev) => ({ ...prev, marca_repuesto: val }))}
                options={marcasList}
                placeholder="Seleccionar o escribir marca..."
              />
            </div>

            <div>
              <SearchableCombobox
                label="Categoría"
                value={formData.categoria}
                onChange={(val) => setFormData((prev) => ({ ...prev, categoria: val }))}
                options={categoriasList}
                placeholder="Seleccionar o escribir categoría..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Stock Disponible <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.stock}
                onChange={(e) => setFormData((prev) => ({ ...prev, stock: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Stock Mínimo de Alerta
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.stock_minimo}
                onChange={(e) => setFormData((prev) => ({ ...prev, stock_minimo: Number(e.target.value) || 5 }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground">Avisar cuando quede esta cantidad o menos</span>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">
                Precio de Venta (COP) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={formData.precio}
                onChange={(e) => setFormData((prev) => ({ ...prev, precio: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1 text-foreground">Descripción</label>
              <textarea
                rows={2}
                placeholder="Especificaciones o compatibilidad..."
                value={formData.descripcion}
                onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Gestión de Fotos */}
          <div className="pt-2 border-t">
            <label className="block text-xs font-semibold mb-2 text-foreground">
              Fotos del Repuesto ({formData.fotos.length + newFiles.length})
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
              {/* Fotos existentes */}
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

              {/* Previews de nuevas fotos */}
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

              {/* Botón de subida */}
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
              <span>{selectedRepuesto ? "Actualizar Repuesto" : "Crear Repuesto"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalle */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedRepuesto?.nombre || "Detalle del Repuesto"}
        subtitle={selectedRepuesto?.codigo_fabricante ? `Código: ${selectedRepuesto.codigo_fabricante}` : undefined}
        icon={<Eye className="w-5 h-5" />}
        maxWidth="lg"
      >
        {selectedRepuesto && (
          <div className="flex flex-col gap-4">
            {/* Galería de Fotos */}
            {selectedRepuesto.fotos?.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="relative aspect-video w-full rounded-2xl bg-muted border overflow-hidden">
                  <img
                    src={selectedRepuesto.fotos[activePhotoIndex] || selectedRepuesto.fotos[0]}
                    alt={selectedRepuesto.nombre}
                    className="w-full h-full object-contain"
                  />
                </div>
                {selectedRepuesto.fotos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedRepuesto.fotos.map((url, idx) => (
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
                <span className="text-xs">Sin fotos registradas</span>
              </div>
            )}

            {/* Datos */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border">
              <div>
                <span className="text-xs text-muted-foreground block">Precio de Venta</span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(selectedRepuesto.precio)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Stock Disponible</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold mt-0.5 ${
                    selectedRepuesto.stock <= (selectedRepuesto.stock_minimo ?? 5)
                      ? "bg-rose-500/15 text-rose-600 border border-rose-500/20"
                      : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                  }`}
                >
                  {selectedRepuesto.stock} unidades (Mín: {selectedRepuesto.stock_minimo ?? 5})
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Categoría</span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedRepuesto.categoria || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Marca / Compatibilidad</span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedRepuesto.marca_repuesto || "N/A"}
                </span>
              </div>
              {selectedRepuesto.created_at && (
                <div className="col-span-2 text-xs text-muted-foreground pt-2 border-t">
                  Registrado el: {formatDate(selectedRepuesto.created_at)}
                </div>
              )}
            </div>

            {selectedRepuesto.descripcion && (
              <div>
                <span className="text-xs font-semibold text-foreground block mb-1">Descripción:</span>
                <p className="text-xs sm:text-sm text-muted-foreground bg-card p-3 rounded-xl border leading-relaxed">
                  {selectedRepuesto.descripcion}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedRepuesto);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar Repuesto
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
            ¿Estás seguro de que deseas eliminar permanentemente el repuesto{" "}
            <span className="font-bold text-foreground">"{selectedRepuesto?.nombre}"</span>? Esta acción también borrará sus fotos asociadas en storage.
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
              <span>Eliminar Repuesto</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
