import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/analysis/score-ring";
import { ShoppingListCard } from "@/components/dashboard/shopping-list-card";

export default async function DashboardListaComprasPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email
    ? `email#${session.user.email.toLowerCase()}`
    : undefined;
  const dashboard = await getDashboard({ userId }).catch(() => null);

  const avg = dashboard?.shopping_list_summary.averageScore ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Lista de compras
      </h1>
      <p className="text-sm text-slate-600">
        Tu canasta y productos añadidos tras los análisis.
      </p>

      <Card className="max-w-md">
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

      <ShoppingListCard items={dashboard?.shopping_list ?? []} userId={userId} />
    </div>
  );
}
