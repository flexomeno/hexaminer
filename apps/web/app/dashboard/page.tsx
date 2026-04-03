import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/analysis/score-ring";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email
    ? `email#${session.user.email.toLowerCase()}`
    : undefined;
  const dashboard = await getDashboard({ userId }).catch(() => null);

  const avg = dashboard?.shopping_list_summary.averageScore ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Dashboard de escaneos
      </h1>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Nota de canasta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ScoreRing score={avg} />
            <p className="text-center text-sm leading-relaxed text-slate-800">
              {dashboard?.shopping_list_summary.recommendation ??
                "Aún no hay datos de canasta."}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Historial reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dashboard?.recent_scans ?? []).length === 0 ? (
              <p className="text-sm text-slate-800">
                No hay escaneos todavía. Ve a cámara para iniciar.
              </p>
            ) : (
              dashboard?.recent_scans.map((scan) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  key={`${scan.productUid}-${scan.scannedAt}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {scan.productName}
                    </p>
                    <p className="text-xs text-slate-600">{scan.scannedAt}</p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {scan.score}/20
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
