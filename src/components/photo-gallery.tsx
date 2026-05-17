"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Image, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { QuotePhoto } from "@/types";

interface PhotoGalleryProps {
  photos: QuotePhoto[];
  onPhotosChange: (photos: QuotePhoto[]) => void;
  readOnly?: boolean;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

const TYPE_LABELS: Record<string, string> = {
  before: "Przed",
  after: "Po",
  other: "Inne",
};

const TYPE_COLORS: Record<string, string> = {
  before: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  after: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
};

/**
 * Galeria zdjęć do wyceny — dodawanie, podgląd, usuwanie.
 * Zdjęcia przechowywane jako base64 w IndexedDB.
 */
export function PhotoGallery({ photos, onPhotosChange, readOnly = false }: PhotoGalleryProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoType, setPhotoType] = useState<"before" | "after" | "other">("before");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} jest za duży (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const newPhoto: QuotePhoto = {
          id: generateId(),
          dataUrl,
          type: photoType,
          createdAt: new Date(),
        };
        onPhotosChange([...photos, newPhoto]);
        toast.success("Zdjęcie dodane");
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(id: string) {
    onPhotosChange(photos.filter((p) => p.id !== id));
    toast.success("Zdjęcie usunięte");
  }

  return (
    <Card className="card-modern">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          Galeria zdjęć ({photos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Dodawanie */}
        {!readOnly && (
          <div className="flex items-center gap-2 mb-3">
            <select
              value={photoType}
              onChange={(e) => setPhotoType(e.target.value as typeof photoType)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="before">Przed</option>
              <option value="after">Po</option>
              <option value="other">Inne</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="btn-secondary h-8 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-3.5 w-3.5" />
              Dodaj zdjęcie
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Siatka zdjęć */}
        {photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Image className="h-8 w-8 opacity-30" />
            <p className="text-xs">Brak zdjęć</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <AnimatePresence>
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 cursor-pointer"
                  onClick={() => setPreviewUrl(photo.dataUrl)}
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption || TYPE_LABELS[photo.type]}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <Badge className={`absolute top-1 left-1 text-[8px] px-1 py-0 ${TYPE_COLORS[photo.type]}`}>
                    {TYPE_LABELS[photo.type]}
                  </Badge>
                  {!readOnly && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Podgląd pełnoekranowy */}
        <AnimatePresence>
          {previewUrl && (
            <motion.div
              className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewUrl(null)}
            >
              <motion.img
                src={previewUrl}
                alt="Podgląd"
                className="max-w-full max-h-full rounded-lg object-contain"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
              />
              <button
                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                onClick={() => setPreviewUrl(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
