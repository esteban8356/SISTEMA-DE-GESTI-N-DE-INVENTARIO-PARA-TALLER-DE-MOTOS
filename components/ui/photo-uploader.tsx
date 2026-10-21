"use client";

import { X, UploadCloud } from "lucide-react";

interface PhotoUploaderProps {
  existingPhotos: string[];
  newFilePreviews: string[];
  onRemoveExisting: (url: string) => void;
  onRemoveNew: (index: number) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}

export function PhotoUploader({
  existingPhotos,
  newFilePreviews,
  onRemoveExisting,
  onRemoveNew,
  onFileChange,
  label = "Fotos",
}: PhotoUploaderProps) {
  const totalCount = existingPhotos.length + newFilePreviews.length;

  return (
    <div className="pt-2 border-t">
      <label className="block text-xs font-semibold mb-2 text-foreground">
        {label} ({totalCount})
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
        {/* Fotos existentes */}
        {existingPhotos.map((url, idx) => (
          <div
            key={url}
            className="relative aspect-square rounded-xl border bg-muted overflow-hidden group shadow-2xs"
          >
            <img
              src={url}
              alt={`Foto ${idx + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => onRemoveExisting(url)}
              className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
              title="Eliminar foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Previews de nuevas fotos */}
        {newFilePreviews.map((preview, idx) => (
          <div
            key={preview}
            className="relative aspect-square rounded-xl border-2 border-primary/40 bg-muted overflow-hidden group shadow-2xs"
          >
            <img
              src={preview}
              alt={`Nueva foto ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded font-bold shadow-xs">
              Nueva
            </span>
            <button
              type="button"
              onClick={() => onRemoveNew(idx)}
              className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
              title="Quitar foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Botón de subida */}
        <label className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors p-2 text-center group">
          <UploadCloud className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
            Agregar Foto
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
