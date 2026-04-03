"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera, UploadCloud, LoaderCircle, ScanSearch } from "lucide-react";
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

type CameraAnalyzerProps = {
  userId?: string;
};

export function CameraAnalyzer({ userId }: CameraAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProductRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);

  async function onAnalyze() {
    if (!file) {
      setError("Selecciona o captura una foto de etiqueta antes de analizar.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setAnalysis(null);

    try {
      const upload = await requestUploadUrl({
        fileName: file.name,
        contentType: file.type || "image/jpeg",
      });
      await uploadToPresignedUrl(upload.uploadUrl, file, file.type || "image/jpeg");
      const auth = userId?.trim() ? { userId: userId.trim() } : undefined;
      const response = await analyzeProduct({ imageKey: upload.key }, auth);

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
            Subir/capturar imagen de etiqueta
          </span>
          <span className="text-xs text-slate-500">
            JPG/PNG. El backend intentará barcode y fallback por OCR.
          </span>
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
              }
              setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
            }}
          />
        </label>

        {file ? (
          <div className="space-y-2">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Vista previa de etiqueta"
                width={640}
                height={240}
                unoptimized
                className="h-40 w-full rounded-md object-cover"
              />
            ) : null}
            <p className="text-xs text-slate-500">
              Archivo seleccionado: <span className="font-medium">{file.name}</span>
            </p>
          </div>
        ) : null}

        <Button
          className="w-full"
          onClick={onAnalyze}
          disabled={isLoading || !file}
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
