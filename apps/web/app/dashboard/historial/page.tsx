import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentScansSection } from "@/components/dashboard/recent-scans-section";

export default async function DashboardHistorialPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email
    ? `email#${session.user.email.toLowerCase()}`
    : undefined;
  const dashboard = await getDashboard({ userId }).catch(() => null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Historial de escaneos
      </h1>
      <p className="text-sm text-slate-600">
        Productos que analizaste; filtra por tipo (alimentos, cosméticos, aseo).
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Escaneos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {(dashboard?.recent_scans ?? []).length === 0 ? (
            <p className="text-sm text-slate-800">
              No hay escaneos todavía. Ve a cámara para iniciar.
            </p>
          ) : (
            <RecentScansSection scans={dashboard?.recent_scans ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
