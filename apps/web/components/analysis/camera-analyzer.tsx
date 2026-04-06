"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Camera, UploadCloud, LoaderCircle, ScanSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductAnalysisCard } from "@/components/analysis/product-analysis-card";
import {
  getAnalyzeJob,
  requestUploadUrl,
  startAnalyzeJob,
  uploadToPresignedUrl,
} from "@/lib/api";
import type { ProductRecord } from "@/types/domain";

const MAX_FILES = 12;
const POLL_MS = 2500;
const POLL_MAX_ATTEMPTS = 48;

type CameraAnalyzerProps = {
  userId?: string;
};

export function CameraAnalyzer({ userId }: CameraAnalyzerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProductRecord | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const pollAbort = useRef(false);

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      pollAbort.current = true;
    };
  }, []);

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

  async function pollJob(jobId: string, auth?: { userId: string }) {
    pollAbort.current = false;
    setIsPolling(true);
    try {
      for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
        if (pollAbort.current) break;
        await new Promise((r) => setTimeout(r, POLL_MS));
        const res = await getAnalyzeJob(jobId, auth);
        if (res.job.status === "COMPLETED" && res.product) {
          setAnalysis(res.product);
          setQueuedMessage(null);
          return;
        }
        if (res.job.status === "FAILED") {
          setError(res.job.errorMessage ?? "El análisis falló. Intenta de nuevo.");
          setQueuedMessage(null);
          return;
        }
      }
      setQueuedMessage(
        "El análisis sigue en proceso. Revisa el historial en unos momentos.",
      );
    } finally {
      setIsPolling(false);
    }
  }

  async function onAnalyze() {
    if (files.length === 0) {
      setError("Añade al menos una foto (frente, ingredientes, tabla nutricional…).");
      return;
    }

    setError(null);
    setAnalysis(null);
    setQueuedMessage(null);
    setIsUploading(true);

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
      const started = await startAnalyzeJob({ imageKeys: keys }, auth);

      setQueuedMessage(started.message);
      setIsUploading(false);
      void pollJob(started.jobId, auth);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Error inesperado.";
      setError(message);
      setIsUploading(false);
    }
  }

  const busy = isUploading || isPolling;

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
            disabled={busy}
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
                    disabled={busy}
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
              disabled={busy}
              onClick={() => replaceFiles([])}
            >
              Quitar todas
            </Button>
          </div>
        ) : null}

        <Button
          className="w-full"
          onClick={onAnalyze}
          disabled={busy || files.length === 0}
          type="button"
        >
          {isUploading ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Subiendo…
            </>
          ) : isPolling ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Analizando en segundo plano…
            </>
          ) : (
            <>
              <ScanSearch className="mr-2 h-4 w-4" />
              Analizar producto
            </>
          )}
        </Button>

        {queuedMessage ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            <p>{queuedMessage}</p>
            <p className="mt-2">
              <Link
                href="/dashboard"
                className="font-semibold text-emerald-800 underline underline-offset-2"
              >
                Ir al historial (dashboard)
              </Link>
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {analysis ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-700">
              Resultado listo. También quedó guardado en tu historial.
            </p>
            <ProductAnalysisCard product={analysis} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
