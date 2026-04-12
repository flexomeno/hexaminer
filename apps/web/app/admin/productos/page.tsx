import Link from "next/link";
import { AdminSortHeader } from "@/components/admin/admin-sort-header";
import { adminListHref, parseAdminListQuery, type AdminListQuery } from "@/lib/admin-list-url";
import { listProductAdminPage, serializeItems } from "@/lib/dynamodb-admin";

type SearchParams = Record<string, string | string[] | undefined>;

function navQuery(lq: AdminListQuery, overrides: Partial<AdminListQuery>): AdminListQuery {
  return { ...lq, ...overrides };
}

export default async function AdminProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const lq = parseAdminListQuery(sp, { sort: "uid" });
  const result = await listProductAdminPage(lq);

  const {
    items,
    totalCount,
    page,
    totalPages,
    startRowOffset,
    q,
    sort,
    dir,
    truncated,
    error,
  } = result;

  const rows = items.map((it) => ({
    uid: String(it.uid ?? it.id ?? "—"),
    name: String(it.name ?? "—"),
    brand: String(it.brand ?? "—"),
    score: it.score != null ? String(it.score) : "—",
    updated: String(it.last_updated ?? "—"),
    raw: JSON.stringify(serializeItems([it as Record<string, unknown>])[0], null, 2),
  }));

  const basePath = "/admin/productos";
  const lqFull: AdminListQuery = { q, sort, dir, page };

  const rangeStart = totalCount === 0 ? 0 : startRowOffset + 1;
  const rangeEnd = startRowOffset + rows.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-900">Productos</h2>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar UID, nombre, marca…"
            className="min-w-[200px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <button
            type="submit"
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-600">
          {totalCount === 0
            ? "Sin resultados"
            : `Mostrando ${rangeStart}–${rangeEnd} de ${totalCount}`}
          {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={adminListHref(basePath, navQuery(lqFull, { page: 1 }))} className="text-blue-700 hover:underline">
            Primera página
          </Link>
          {page > 1 ? (
            <Link
              href={adminListHref(basePath, navQuery(lqFull, { page: page - 1 }))}
              className="font-medium text-blue-700 hover:underline"
            >
              ← Anterior
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={adminListHref(basePath, navQuery(lqFull, { page: page + 1 }))}
              className="font-medium text-blue-700 hover:underline"
            >
              Siguiente →
            </Link>
          ) : totalCount > 0 ? (
            <span className="text-slate-400">Fin del listado</span>
          ) : null}
        </div>
      </div>

      {truncated ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Listado recortado en memoria (tope 10.000 ítems). Usa el buscador o reduce el volumen en DynamoDB.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="w-12 px-3 py-2">#</th>
              <th className="px-3 py-2">
                <AdminSortHeader basePath={basePath} column="uid" label="UID" lq={lqFull} />
              </th>
              <th className="px-3 py-2">
                <AdminSortHeader basePath={basePath} column="name" label="Nombre" lq={lqFull} />
              </th>
              <th className="px-3 py-2">
                <AdminSortHeader basePath={basePath} column="brand" label="Marca" lq={lqFull} />
              </th>
              <th className="px-3 py-2">
                <AdminSortHeader basePath={basePath} column="score" label="Score" lq={lqFull} />
              </th>
              <th className="px-3 py-2">
                <AdminSortHeader basePath={basePath} column="updated" label="Actualizado" lq={lqFull} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && !error ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Sin filas en esta página.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.uid}-${i}`} className="align-top text-slate-800">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">
                    {startRowOffset + i + 1}
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs">{r.uid}</td>
                  <td className="max-w-[200px] px-3 py-2">{r.name}</td>
                  <td className="max-w-[160px] px-3 py-2">{r.brand}</td>
                  <td className="px-3 py-2">{r.score}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{r.updated}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.map((r, i) => (
        <details key={`d-${r.uid}-${i}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <summary className="cursor-pointer font-medium text-slate-800">
            JSON: {r.name} ({r.uid})
          </summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{r.raw}</pre>
        </details>
      ))}
    </div>
  );
}
