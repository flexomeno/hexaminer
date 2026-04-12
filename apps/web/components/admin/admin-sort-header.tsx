import Link from "next/link";
import { adminListHref, nextSortDir, type AdminListQuery } from "@/lib/admin-list-url";

export function AdminSortHeader({
  basePath,
  column,
  label,
  lq,
}: {
  basePath: string;
  column: string;
  label: string;
  lq: AdminListQuery;
}) {
  const { sort, dir } = nextSortDir(lq.sort, lq.dir, column);
  const href = adminListHref(basePath, { ...lq, sort, dir, page: 1 });
  const active = lq.sort === column;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 hover:text-blue-700 hover:underline ${
        active ? "font-semibold text-slate-900" : ""
      }`}
    >
      {label}
      {active ? <span aria-hidden>{lq.dir === "asc" ? "↑" : "↓"}</span> : null}
    </Link>
  );
}
