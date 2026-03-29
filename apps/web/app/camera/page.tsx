import { CameraAnalyzer } from "@/components/analysis/camera-analyzer";
import { TopNav } from "@/components/layout/top-nav";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function CameraPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email ?? undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-8">
        <section className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Escanear producto</h1>
          <p className="text-sm text-slate-600">
            Sube una foto de etiqueta para analizar ingredientes, riesgos endocrinos
            y ética laboral con estrategia cache-first.
          </p>
          <CameraAnalyzer userId={userId} />
        </section>
      </main>
    </div>
  );
}
