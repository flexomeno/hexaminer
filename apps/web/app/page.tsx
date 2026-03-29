import Link from "next/link";
import { ScanLine, ShieldCheck, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 md:px-8">
      <section className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Análisis inteligente de productos con AWS Serverless + GPT-4o Vision
        </h1>
        <p className="max-w-3xl text-slate-600">
          Escanea alimentos, cosméticos y productos de aseo. Detecta disruptores endocrinos, evalúa ética laboral y
          optimiza costos con caché global en DynamoDB.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/camera">
              <ScanLine className="mr-2 h-4 w-4" />
              Escanear producto
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/dashboard">
              <ShoppingBasket className="mr-2 h-4 w-4" />
              Ver dashboard
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-blue-600" />
              Flujo cache-first
            </CardTitle>
            <CardDescription>Ahorro inmediato de costos OpenAI</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Primero extraemos UID (barcode/OCR), consultamos DynamoDB y solo si no existe hacemos análisis vision.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Riesgos endocrinos
            </CardTitle>
            <CardDescription>Puntaje 0-20 y alertas críticas</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Identificamos parabenos, ftalatos, BPA/BPS, BHT/BHA, triclosán y más, con veredicto accionable.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBasket className="h-5 w-5 text-amber-600" />
              Shopping List Evaluator
            </CardTitle>
            <CardDescription>Nota media de canasta</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Promedia tus puntajes y detecta cuando tienes demasiados productos con riesgo endocrino.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
