import { CameraAnalyzer } from "@/components/analysis/camera-analyzer";
import { TopNavWrapper } from "@/components/layout/top-nav-wrapper";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function CameraPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email ?? undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNavWrapper />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-8">
        <section className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Escanear producto</h1>
          <p className="text-sm text-slate-600">
            Sube una o varias fotos (nombre, ingredientes, tabla nutricional) del mismo
            producto; el análisis las combina. Cache por identificador del producto.
          </p>
          <CameraAnalyzer userId={userId} />
        </section>
      </main>
    </div>
  );
}
