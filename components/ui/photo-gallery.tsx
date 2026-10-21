"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

interface PhotoGalleryProps {
  photos: string[];
  altTitle?: string;
  emptyText?: string;
}

export function PhotoGallery({
  photos,
  altTitle = "Foto",
  emptyText = "Sin fotos registradas",
}: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-muted border flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <ImageIcon className="w-8 h-8 opacity-40" />
        <span className="text-xs">{emptyText}</span>
      </div>
    );
  }

  const currentPhoto = photos[activeIndex] || photos[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full rounded-2xl bg-muted border overflow-hidden">
        <img
          src={currentPhoto}
          alt={`${altTitle} - ${activeIndex + 1}`}
          className="w-full h-full object-contain"
        />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, idx) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                activeIndex === idx
                  ? "border-primary scale-95 shadow-xs"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={url}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
