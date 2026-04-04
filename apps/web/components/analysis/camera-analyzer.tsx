"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Camera, UploadCloud, LoaderCircle, ScanSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductAnalysisCard } from "@/components/analysis/product-analysis-card";
import {
  addItemToShoppingList,
  analyzeProduct,
  requestUploadUrl,
  uploadToPresignedUrl,
} from "@/lib/api";
import type { ProductRecord } from "@/types/domain";

const MAX_FILES = 12;

type CameraAnalyzerProps = {
  userId?: string;
};

export function CameraAnalyzer({ userId }: CameraAnalyzerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProductRecord | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  function replaceFiles(next: File[]) {
    const capped = next.slice(0, MAX_FILES);
    setFiles(capped);
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setPreviewUrls(capped.map((f) => URL.createObjectURL(f)));
  }

  function removeAt(index: number) {
    const u = previewUrls[index];
    if (u) URL.revokeObjectURL(u);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function onAnalyze() {
    if (files.length === 0) {
      setError("Añade al menos una foto (frente, ingredientes, tabla nutricional…).");
      return;
    }

    setError(null);
    setIsLoading(true);
    setAnalysis(null);

    try {
      const keys: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const upload = await requestUploadUrl({
          fileName: file.name || `foto-${i}.jpg`,
          contentType: file.type || "image/jpeg",
        });
        await uploadToPresignedUrl(
          upload.uploadUrl,
          file,
          file.type || "image/jpeg",
        );
        keys.push(upload.key);
      }

      const auth = userId?.trim() ? { userId: userId.trim() } : undefined;
      const response = await analyzeProduct({ imageKeys: keys }, auth);

      setAnalysis(response.product);
      setFromCache(response.source === "cache");
      await addItemToShoppingList({ uid: response.product.uid }, auth);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Error inesperado.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5 text-emerald-600" />
          Escaneo inteligente de producto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-6 text-center hover:bg-slate-50">
          <UploadCloud className="mb-2 h-6 w-6 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Subir fotos del producto (varias)
          </span>
          <span className="text-xs text-slate-500">
            Frente, ingredientes, tabla nutricional… hasta {MAX_FILES} imágenes JPG/PNG/WebP.
          </span>
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const list = event.target.files ? Array.from(event.target.files) : [];
              replaceFiles(list);
              event.target.value = "";
            }}
          />
        </label>

        {files.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {previewUrls.map((url, i) => (
                <div key={url} className="relative h-24 w-24 overflow-hidden rounded-md border">
                  <Image
                    src={url}
                    alt={`Vista previa ${i + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 rounded-bl bg-black/60 p-1 text-white"
                    onClick={() => removeAt(i)}
                    aria-label={`Quitar imagen ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {files.length} foto(s) lista(s). Puedes añadir más desde el recuadro de arriba.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => replaceFiles([])}
            >
              Quitar todas
            </Button>
          </div>
        ) : null}

        <Button
          className="w-full"
          onClick={onAnalyze}
          disabled={isLoading || files.length === 0}
          type="button"
        >
          {isLoading ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <ScanSearch className="mr-2 h-4 w-4" />
              Analizar producto
            </>
          )}
        </Button>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {analysis ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-700">
              Resultado obtenido desde:{" "}
              <span className="font-semibold text-slate-900">
                {fromCache ? "DynamoDB cache" : "OpenAI (nuevo análisis)"}
              </span>
            </p>
            <ProductAnalysisCard product={analysis} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
