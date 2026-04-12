import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Elige un listado paginado. Necesitas <code className="rounded bg-slate-200 px-1">TABLE_NAME</code> y
        credenciales AWS en el servidor (rol de instancia en EC2 o variables de entorno en local).
      </p>
      <ul className="flex flex-col gap-3 sm:flex-row">
        <li>
          <Link
            href="/admin/productos"
            className="block rounded-lg border border-slate-200 bg-white px-6 py-4 text-sm font-medium shadow-sm transition hover:border-slate-300"
          >
            Productos escaneados (perfil <code className="text-xs">PRODUCT#</code>)
          </Link>
        </li>
        <li>
          <Link
            href="/admin/ingredientes"
            className="block rounded-lg border border-slate-200 bg-white px-6 py-4 text-sm font-medium shadow-sm transition hover:border-slate-300"
          >
            Catálogo de ingredientes (<code className="text-xs">INGREDIENT#</code>)
          </Link>
        </li>
      </ul>
    </div>
  );
}
