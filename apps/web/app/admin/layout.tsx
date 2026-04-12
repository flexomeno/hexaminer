import Link from "next/link";
import { requireAdminSession } from "@/lib/require-admin";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminSession();

  const link =
    "rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Visibilidad</h1>
            <p className="text-xs text-slate-500">
              Datos en DynamoDB (solo lectura). La app pública no cambia.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link href="/admin" className={link}>
              Inicio
            </Link>
            <Link href="/admin/productos" className={link}>
              Productos
            </Link>
            <Link href="/admin/ingredientes" className={link}>
              Ingredientes
            </Link>
            <Link href="/dashboard" className={`${link} border border-slate-200 bg-slate-50`}>
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">{children}</div>
    </div>
  );
}
