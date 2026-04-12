/** Construye query string para listados admin (productos / ingredientes). */

export type AdminListQuery = {
  q: string;
  sort: string;
  dir: "asc" | "desc";
  page: number;
};

export function parseAdminListQuery(
  sp: Record<string, string | string[] | undefined>,
  defaults: { sort: string },
): AdminListQuery {
  const raw = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const q = (raw("q") ?? "").trim();
  const sortRaw = raw("sort");
  const sort = sortRaw && sortRaw.trim() ? sortRaw.trim() : defaults.sort;
  const dir = raw("dir") === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(raw("page") ?? "1", 10) || 1);
  return { q, sort, dir, page };
}

export function adminListHref(
  basePath: string,
  p: AdminListQuery & Partial<{ sort: string; dir: "asc" | "desc"; page: number }>,
): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  sp.set("sort", p.sort ?? "");
  sp.set("dir", p.dir ?? "asc");
  const page = p.page ?? 1;
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Siguiente orden al pulsar una columna: misma columna alterna dir; otra columna empieza asc. */
export function nextSortDir(
  currentSort: string,
  currentDir: "asc" | "desc",
  column: string,
): { sort: string; dir: "asc" | "desc" } {
  if (currentSort === column) {
    return { sort: column, dir: currentDir === "asc" ? "desc" : "asc" };
  }
  return { sort: column, dir: "asc" };
}
