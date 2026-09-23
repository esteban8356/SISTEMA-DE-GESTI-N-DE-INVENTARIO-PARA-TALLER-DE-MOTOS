"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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
  CheckCircle2,
  AlertCircle,
  Tag,
  Wrench,
  Hash,
  ChevronDown,
  Check,
} from "lucide-react";

export interface Repuesto {
  id: string;
  created_at: string;
  updated_at: string;
  nombre: string;
  descripcion: string | null;
  codigo_fabricante: string | null;
  stock: number;
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

// Componente de Selección con Buscador integrado en la plataforma
function SearchableCombobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!value) return options;
    const filter = value.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(filter));
  }, [options, value]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-semibold mb-1 text-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-3 pr-9 py-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-card text-card-foreground border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-muted flex items-center justify-between transition-colors ${
                    value.toLowerCase() === item.toLowerCase()
                      ? "bg-muted font-semibold text-primary"
                      : "text-foreground"
                  }`}
                >
                  <span>{item}</span>
                  {value.toLowerCase() === item.toLowerCase() && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-xs text-muted-foreground text-center">
              Opción personalizada: <span className="font-semibold text-foreground">"{value}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Función para sanitizar el nombre de carpeta por repuesto
const sanitizeFolderName = (name: string): string => {
  const sanitized = (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-z0-9_-]/g, "_") // caracteres válidos
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || "repuesto";
};

export default function InventarioPage() {
  const supabase = createClient();

  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRepuesto, setSelectedRepuesto] = useState<Repuesto | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    nombre: string;
    descripcion: string;
    codigo_fabricante: string;
    stock: number;
    precio: number;
    categoria: string;
    marca_repuesto: string;
    fotos: string[];
  }>({
    nombre: "",
    descripcion: "",
    codigo_fabricante: "",
    stock: 0,
    precio: 0,
    categoria: "",
    marca_repuesto: "",
    fotos: [],
  });

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [categoriasList, setCategoriasList] = useState<string[]>(CATEGORIAS_SUGERIDAS);
  const [marcasList, setMarcasList] = useState<string[]>(MARCAS_SUGERIDAS);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Cargar Categorías y Marcas dinámicamente desde Supabase
  const fetchCategoriasYMarcas = async () => {
    try {
      const [resCat, resMarcas] = await Promise.all([
        supabase.from("categorias").select("nombre").order("nombre", { ascending: true }),
        supabase.from("marcas").select("nombre").order("nombre", { ascending: true }),
      ]);

      if (resCat.data && resCat.data.length > 0) {
        setCategoriasList(resCat.data.map((c: any) => c.nombre));
      }
      if (resMarcas.data && resMarcas.data.length > 0) {
        setMarcasList(resMarcas.data.map((m: any) => m.nombre));
      }
    } catch (err) {
      console.error("No se pudieron cargar marcas o categorías:", err);
    }
  };

  // Cargar Repuestos
  const fetchRepuestos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("repuestos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsedData: Repuesto[] = (data || []).map((item) => ({
        ...item,
        fotos: Array.isArray(item.fotos) ? item.fotos : [],
        precio: Number(item.precio || 0),
        stock: Number(item.stock || 0),
      }));

      setRepuestos(parsedData);
    } catch (err: any) {
      console.error("Error cargando repuestos:", err);
      showNotification("error", "Error al cargar los repuestos: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepuestos();
    fetchCategoriasYMarcas();
  }, []);

  // Abrir Formulario para Crear
  const handleOpenCreate = () => {
    setSelectedRepuesto(null);
    setFormData({
      nombre: "",
      descripcion: "",
      codigo_fabricante: "",
      stock: 0,
      precio: 0,
      categoria: "",
      marca_repuesto: "",
      fotos: [],
    });
    setNewFiles([]);
    setNewFilePreviews([]);
    setIsFormOpen(true);
  };

  // Abrir Formulario para Editar
  const handleOpenEdit = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setFormData({
      id: repuesto.id,
      nombre: repuesto.nombre || "",
      descripcion: repuesto.descripcion || "",
      codigo_fabricante: repuesto.codigo_fabricante || "",
      stock: repuesto.stock || 0,
      precio: repuesto.precio || 0,
      categoria: repuesto.categoria || "",
      marca_repuesto: repuesto.marca_repuesto || "",
      fotos: repuesto.fotos || [],
    });
    setNewFiles([]);
    setNewFilePreviews([]);
    setIsFormOpen(true);
  };

  // Abrir Detalle
  const handleOpenDetail = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setIsDetailOpen(true);
  };

  // Abrir Confirmación Eliminar
  const handleOpenDelete = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setIsDeleteOpen(true);
  };

  // Manejo de Selección de Archivos Nuevos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesArray = Array.from(e.target.files);
    setNewFiles((prev) => [...prev, ...filesArray]);

    const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
    setNewFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingPhoto = (urlToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      fotos: prev.fotos.filter((url) => url !== urlToRemove),
    }));
  };

  // Helper para extraer la ruta relativa dentro del bucket "repuestos"
  const getStoragePathFromUrl = (url: string): string | null => {
    try {
      if (!url) return null;
      const bucketIdentifier = "/repuestos/";
      const index = url.indexOf(bucketIdentifier);
      if (index !== -1) {
        const pathPart = url.substring(index + bucketIdentifier.length);
        return decodeURIComponent(pathPart.split("?")[0]);
      }
      if (!url.startsWith("http")) return url;
      return null;
    } catch {
      return null;
    }
  };

  // Eliminar archivos del Bucket "repuestos"
  const deletePhotosFromBucket = async (photoUrls: string[]) => {
    if (!photoUrls || photoUrls.length === 0) return;
    const pathsToDelete = photoUrls
      .map((url) => getStoragePathFromUrl(url))
      .filter((path): path is string => Boolean(path));

    if (pathsToDelete.length > 0) {
      const { error } = await supabase.storage.from("repuestos").remove(pathsToDelete);
      if (error) {
        console.warn("No se pudieron eliminar algunas fotos del storage:", error.message);
      }
    }
  };

  // Subir Fotos al Bucket "repuestos" dentro de una carpeta con el nombre del repuesto
  const uploadPhotosToBucket = async (files: File[], repuestoNombre: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const folderName = sanitizeFolderName(repuestoNombre);

    for (const file of files) {
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${folderName}/${Date.now()}_${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("repuestos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error subiendo archivo:", uploadError);
        throw new Error(`Error al subir imagen ${file.name}: ${uploadError.message}`);
      }

      const { data } = supabase.storage.from("repuestos").getPublicUrl(filePath);
      if (data?.publicUrl) {
        uploadedUrls.push(data.publicUrl);
      }
    }

    return uploadedUrls;
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      showNotification("error", "El nombre del repuesto es obligatorio.");
      return;
    }

    try {
      setSaving(true);

      // Si estamos editando y se quitaron fotos existentes, borrarlas del bucket
      if (selectedRepuesto?.id && selectedRepuesto.fotos?.length > 0) {
        const removedPhotos = selectedRepuesto.fotos.filter(
          (oldUrl) => !formData.fotos.includes(oldUrl)
        );
        if (removedPhotos.length > 0) {
          await deletePhotosFromBucket(removedPhotos);
        }
      }

      // Subir fotos nuevas a la carpeta del repuesto
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        uploadedUrls = await uploadPhotosToBucket(newFiles, formData.nombre);
      }

      const totalFotos = [...formData.fotos, ...uploadedUrls];

      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        codigo_fabricante: formData.codigo_fabricante.trim() || null,
        stock: Number(formData.stock) || 0,
        precio: Number(formData.precio) || 0,
        categoria: formData.categoria.trim() || null,
        marca_repuesto: formData.marca_repuesto.trim() || null,
        fotos: totalFotos,
      };

      if (selectedRepuesto?.id) {
        // Actualizar
        const { error } = await supabase
          .from("repuestos")
          .update(payload)
          .eq("id", selectedRepuesto.id);

        if (error) throw error;
        showNotification("success", "Repuesto actualizado exitosamente.");
      } else {
        // Crear
        const { error } = await supabase.from("repuestos").insert([payload]);

        if (error) throw error;
        showNotification("success", "Repuesto creado exitosamente.");
      }

      setIsFormOpen(false);
      fetchRepuestos();
    } catch (err: any) {
      console.error("Error guardando repuesto:", err);
      showNotification("error", err.message || "Ocurrió un error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Repuesto y sus fotos del bucket
  const handleDelete = async () => {
    if (!selectedRepuesto) return;

    try {
      setSaving(true);

      // 1. Eliminar fotos asociadas del bucket de Storage
      if (selectedRepuesto.fotos && selectedRepuesto.fotos.length > 0) {
        await deletePhotosFromBucket(selectedRepuesto.fotos);
      }

      // 2. Eliminar registro de la tabla repuestos
      const { error } = await supabase
        .from("repuestos")
        .delete()
        .eq("id", selectedRepuesto.id);

      if (error) throw error;

      showNotification("success", "Repuesto y fotos eliminados correctamente.");
      setIsDeleteOpen(false);
      setSelectedRepuesto(null);
      fetchRepuestos();
    } catch (err: any) {
      console.error("Error eliminando repuesto:", err);
      showNotification("error", "Error al eliminar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Repuestos filtrados por el buscador
  const filteredRepuestos = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return repuestos
      .filter((item) => {
        if (!query) return true;
        return (
          item.nombre.toLowerCase().includes(query) ||
          (item.codigo_fabricante && item.codigo_fabricante.toLowerCase().includes(query)) ||
          (item.marca_repuesto && item.marca_repuesto.toLowerCase().includes(query)) ||
          (item.categoria && item.categoria.toLowerCase().includes(query)) ||
          (item.descripcion && item.descripcion.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [repuestos, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-2 md:p-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border transition-all animate-in fade-in slide-in-from-bottom-5 ${
            notification.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-700/60 backdrop-blur-md"
              : "bg-rose-950/90 text-rose-200 border-rose-700/60 backdrop-blur-md"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Botón Nuevo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Inventario</h1>
              <p className="text-sm text-muted-foreground">
                Control de repuestos, accesorios, existencias y precios del taller
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Repuesto</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, código de fabricante, marca o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-8 py-2.5 text-sm rounded-xl bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            title="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lista / Tabla de Repuestos */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Cargando inventario de repuestos...</p>
          </div>
        ) : filteredRepuestos.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-4 rounded-full bg-muted text-muted-foreground">
              <Package className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold">No se encontraron repuestos</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchTerm
                ? "No hay resultados que coincidan con la búsqueda."
                : "Aún no has registrado repuestos en el inventario. Haz clic en 'Nuevo Repuesto' para comenzar."}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-2 text-xs text-primary underline underline-offset-4 hover:opacity-80"
              >
                Limpiar búsqueda
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> Agregar primer repuesto
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
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Precio Venta</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRepuestos.map((item) => {
                  const hasPhoto = item.fotos && item.fotos.length > 0;
                  const firstPhoto = hasPhoto ? item.fotos[0] : null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-accent/40 transition-colors group"
                    >
                      {/* Producto con Imagen */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
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
                              <ImageIcon className="w-5 h-5 text-muted-foreground/60" />
                            )}
                            {item.fotos.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/75 text-white text-[9px] px-1 rounded-tl font-medium">
                                +{item.fotos.length - 1}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => handleOpenDetail(item)}
                              className="font-semibold text-foreground hover:text-primary transition-colors text-left line-clamp-1 flex items-center gap-1.5"
                            >
                              {item.nombre}
                            </button>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">
                              {item.descripcion || "Sin descripción"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Código & Marca */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {item.codigo_fabricante ? (
                            <span className="font-mono text-xs font-medium text-foreground">
                              {item.codigo_fabricante}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">N/A</span>
                          )}
                          {item.marca_repuesto && (
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              {item.marca_repuesto}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        {item.categoria ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                            {item.categoria}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">General</span>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                              item.stock === 0
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : item.stock <= 5
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {item.stock === 0
                              ? "Agotado"
                              : `${item.stock} un.`}
                          </span>
                        </div>
                      </td>

                      {/* Precio */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-foreground">
                          {formatCurrency(item.precio)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Editar repuesto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            title="Eliminar repuesto"
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

      {/* ======================================================== */}
      {/* MODAL FORMULARIO: CREAR / EDITAR REPUESTO (SIMPLE) */}
      {/* ======================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-card text-card-foreground border border-border rounded-lg max-w-lg w-full shadow-lg overflow-hidden">
            {/* Cabecera simple */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <h2 className="text-base font-bold">
                {selectedRepuesto ? "Editar Repuesto" : "Registrar Repuesto"}
              </h2>
              <button
                type="button"
                onClick={() => !saving && setIsFormOpen(false)}
                disabled={saving}
                className="text-muted-foreground hover:text-foreground text-sm font-bold px-2 py-1 rounded hover:bg-muted"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Nombre del repuesto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Llanta, Pastillas de freno, Aceite..."
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Código */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Código / Referencia
                </label>
                <input
                  type="text"
                  placeholder="Ej: COD-102"
                  value={formData.codigo_fabricante}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo_fabricante: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Marca */}
              <SearchableCombobox
                label="Marca"
                placeholder="Ej: Yamaha, Honda, Suzuki..."
                value={formData.marca_repuesto}
                onChange={(val) => setFormData({ ...formData, marca_repuesto: val })}
                options={marcasList}
              />

              {/* Categoría */}
              <SearchableCombobox
                label="Categoría"
                placeholder="Ej: Motor, Frenos, Suspensión..."
                value={formData.categoria}
                onChange={(val) => setFormData({ ...formData, categoria: val })}
                options={categoriasList}
              />

              {/* Stock */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Cantidad en Stock <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Precio de Venta ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="0"
                  value={formData.precio}
                  onChange={(e) =>
                    setFormData({ ...formData, precio: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-sm font-semibold rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Escribe una breve descripción o notas del repuesto..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Subir Fotos */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Fotos del repuesto
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-input file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                />

                {/* Vista previa simple de fotos */}
                {(formData.fotos.length > 0 || newFilePreviews.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-dashed">
                    {formData.fotos.map((url, idx) => (
                      <div
                        key={`existing-${idx}`}
                        className="relative w-12 h-12 rounded border bg-muted overflow-hidden"
                      >
                        <img
                          src={url}
                          alt="Foto guardada"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingPhoto(url)}
                          className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-bl"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {newFilePreviews.map((preview, idx) => (
                      <div
                        key={`new-${idx}`}
                        className="relative w-12 h-12 rounded border border-primary/40 bg-muted overflow-hidden"
                      >
                        <img
                          src={preview}
                          alt="Nueva foto"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewFile(idx)}
                          className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-bl"
                          title="Quitar"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de acción simples */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-xs sm:text-sm font-medium rounded border border-input hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs sm:text-sm font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Guardando..." : selectedRepuesto ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DETALLE DE REPUESTO */}
      {/* ======================================================== */}
      {isDetailOpen && selectedRepuesto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b">
              <h2 className="text-base font-semibold">Detalle del Repuesto</h2>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Galería de Fotos */}
              {selectedRepuesto.fotos && selectedRepuesto.fotos.length > 0 ? (
                <div className="space-y-2">
                  <div className="rounded-lg overflow-hidden border aspect-video max-h-56 bg-muted flex items-center justify-center">
                    <img
                      src={selectedRepuesto.fotos[0]}
                      alt={selectedRepuesto.nombre}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {selectedRepuesto.fotos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedRepuesto.fotos.map((foto, idx) => (
                        <a
                          key={idx}
                          href={foto}
                          target="_blank"
                          rel="noreferrer"
                          className="relative w-12 h-12 rounded-lg overflow-hidden border shrink-0 bg-muted hover:ring-2 hover:ring-primary transition-all"
                        >
                          <img
                            src={foto}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground flex flex-col items-center gap-1 bg-muted/10">
                  <ImageIcon className="w-6 h-6 opacity-40" />
                  <p className="text-xs">Sin fotografías registradas.</p>
                </div>
              )}

              {/* Información */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {selectedRepuesto.nombre}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Marca:{" "}
                      <span className="font-medium text-foreground">
                        {selectedRepuesto.marca_repuesto || "No especificada"}
                      </span>{" "}
                      • Categoría:{" "}
                      <span className="font-medium text-foreground">
                        {selectedRepuesto.categoria || "General"}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                      selectedRepuesto.stock === 0
                        ? "bg-rose-500/15 text-rose-500"
                        : selectedRepuesto.stock <= 5
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-emerald-500/15 text-emerald-500"
                    }`}
                  >
                    {selectedRepuesto.stock === 0
                      ? "Agotado"
                      : `${selectedRepuesto.stock} en Stock`}
                  </span>
                </div>

                {selectedRepuesto.codigo_fabricante && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-xs font-mono">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    <span>Ref: {selectedRepuesto.codigo_fabricante}</span>
                  </div>
                )}
              </div>

              {/* Precios */}
              <div className="p-3 rounded-lg bg-muted/30 border text-center">
                <p className="text-[11px] text-muted-foreground">Precio de Venta</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedRepuesto.precio)}
                </p>
              </div>

              {/* Descripción */}
              {selectedRepuesto.descripcion && (
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-muted-foreground">
                    Descripción / Detalles
                  </h4>
                  <p className="text-xs bg-muted/20 p-2.5 rounded-lg border text-foreground leading-relaxed">
                    {selectedRepuesto.descripcion}
                  </p>
                </div>
              )}

              {/* Footer Acciones */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleOpenEdit(selectedRepuesto);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CONFIRMACIÓN DE ELIMINACIÓN */}
      {/* ======================================================== */}
      {isDeleteOpen && selectedRepuesto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-xl max-w-sm w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">¿Eliminar repuesto?</h3>
                <p className="text-xs text-muted-foreground">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-foreground">
              ¿Estás seguro de que deseas eliminar{" "}
              <span className="font-semibold text-rose-500">"{selectedRepuesto.nombre}"</span> de tu inventario?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setIsDeleteOpen(false)}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{saving ? "Eliminando..." : "Sí, Eliminar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
