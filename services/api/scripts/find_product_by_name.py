#!/usr/bin/env python3
"""
Busca productos en DynamoDB por texto en name / brand / barcode (ítems PROFILE).

La tabla no tiene GSI por nombre: Scan paginado de PK=PRODUCT#* y SK=PROFILE,
luego filtro en cliente (subcadena insensible a mayúsculas por defecto).

Requisito: pip install boto3 (mejor: venv en services/api)

Ejemplos:
  export TABLE_NAME=product-analysis-api-dev
  python3 scripts/find_product_by_name.py lubriderm          # name o brand
  python3 scripts/find_product_by_name.py "Coca" --in name
  python3 scripts/find_product_by_name.py "Nombre" --exact --json
  python3 scripts/find_product_by_name.py --sample 8       # solo diagnóstico
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Busca productos en Dynamo por texto (name, brand, barcode).",
    )
    p.add_argument(
        "name",
        nargs="?",
        default=None,
        help="Texto a buscar (omitir con --sample).",
    )
    p.add_argument(
        "--table-name",
        default=os.environ.get("TABLE_NAME", "product-analysis-api-dev"),
        help="Nombre de la tabla Dynamo (default: env TABLE_NAME o product-analysis-api-dev).",
    )
    p.add_argument("--region", default=os.environ.get("AWS_REGION", "us-east-1"), help="Región AWS.")
    p.add_argument("--profile", default=None, help="Perfil ~/.aws/credentials (opcional).")
    p.add_argument(
        "--limit",
        type=int,
        default=50,
        metavar="N",
        help="Máximo de coincidencias a devolver (default 50).",
    )
    p.add_argument(
        "--in",
        dest="match_in",
        choices=("any", "name", "brand", "barcode"),
        default="any",
        help="Dónde buscar la subcadena: any=name|brand|barcode (default), o solo un campo.",
    )
    p.add_argument(
        "--exact",
        action="store_true",
        help="Igualdad exacta en el/los campo(s) indicados con --in (sensible a mayúsculas).",
    )
    p.add_argument(
        "--case-sensitive",
        action="store_true",
        help="Con subcadena: distinguir mayúsculas (default: insensible).",
    )
    p.add_argument(
        "--json",
        action="store_true",
        help="Imprime JSON en stdout (una lista de ítems).",
    )
    p.add_argument(
        "--sample",
        type=int,
        metavar="N",
        default=0,
        help="Solo lista los primeros N perfiles de producto (name/brand/uid); ignora búsqueda.",
    )
    return p.parse_args()


def field_contains(
    haystack: str,
    needle: str,
    *,
    exact: bool,
    case_sensitive: bool,
) -> bool:
    if not needle:
        return False
    if exact:
        return haystack == needle
    if case_sensitive:
        return needle in haystack
    return needle.casefold() in haystack.casefold()


def item_matches(
    item: dict[str, Any],
    needle: str,
    *,
    match_in: str,
    exact: bool,
    case_sensitive: bool,
) -> bool:
    name = str(item.get("name") or "")
    brand = str(item.get("brand") or "")
    barcode = str(item.get("barcode") or item.get("uid") or "")

    if match_in == "name":
        return field_contains(name, needle, exact=exact, case_sensitive=case_sensitive)
    if match_in == "brand":
        return field_contains(brand, needle, exact=exact, case_sensitive=case_sensitive)
    if match_in == "barcode":
        return field_contains(barcode, needle, exact=exact, case_sensitive=case_sensitive)
    # any
    if exact:
        return name == needle or brand == needle or barcode == needle
    if case_sensitive:
        return needle in name or needle in brand or needle in barcode
    n = needle.casefold()
    return n in name.casefold() or n in brand.casefold() or n in barcode.casefold()


def dynamo_filter_for_exact(
    match_in: str,
    needle: str,
    base,
):
    from boto3.dynamodb.conditions import Attr

    if match_in == "name":
        return base & Attr("name").eq(needle)
    if match_in == "brand":
        return base & Attr("brand").eq(needle)
    if match_in == "barcode":
        return base & Attr("uid").eq(needle)
    return base & (Attr("name").eq(needle) | Attr("brand").eq(needle) | Attr("uid").eq(needle))


def run(args: argparse.Namespace) -> None:
    try:
        import boto3
        from boto3.dynamodb.conditions import Attr
    except ImportError:
        print("Instala boto3: pip install boto3", file=sys.stderr)
        sys.exit(1)

    if args.sample > 0:
        if args.name:
            print("Ignorando texto de búsqueda porque usaste --sample.", file=sys.stderr)
    elif not args.name or not str(args.name).strip():
        print("Indica un texto a buscar o usa --sample N.", file=sys.stderr)
        sys.exit(2)

    limit = max(1, args.limit)
    session = boto3.Session(profile_name=args.profile) if args.profile else boto3.Session()
    dynamodb = session.resource("dynamodb", region_name=args.region)
    table = dynamodb.Table(args.table_name)

    # Perfil de producto: PK PRODUCT#… (excluye USER#, INGREDIENT#, etc.)
    base_filter = Attr("SK").eq("PROFILE") & Attr("PK").begins_with("PRODUCT#")

    results: list[dict[str, Any]] = []
    scan_kwargs: dict[str, Any] = {"FilterExpression": base_filter}

    needle = (args.name or "").strip()

    if args.exact:
        scan_kwargs["FilterExpression"] = dynamo_filter_for_exact(args.match_in, needle, base_filter)

    exclusive_start_key = None
    sample_seen: list[dict[str, Any]] = []

    while True:
        if args.sample > 0:
            if len(sample_seen) >= args.sample:
                break
        elif len(results) >= limit:
            break

        if exclusive_start_key:
            scan_kwargs["ExclusiveStartKey"] = exclusive_start_key
        elif "ExclusiveStartKey" in scan_kwargs:
            del scan_kwargs["ExclusiveStartKey"]

        try:
            resp = table.scan(**scan_kwargs)
        except Exception as e:
            print(f"Error al escanear la tabla (¿nombre/región/credenciales?): {e}", file=sys.stderr)
            sys.exit(1)

        items = resp.get("Items") or []

        for item in items:
            if args.sample > 0:
                if len(sample_seen) < args.sample:
                    sample_seen.append(item)
                if len(sample_seen) >= args.sample:
                    break
                continue

            if args.exact:
                results.append(item)
            elif item_matches(
                item,
                needle,
                match_in=args.match_in,
                exact=False,
                case_sensitive=args.case_sensitive,
            ):
                results.append(item)

            if len(results) >= limit:
                break

        exclusive_start_key = resp.get("LastEvaluatedKey")
        if not exclusive_start_key:
            break

    if args.sample > 0:
        print(
            f"Tabla: {args.table_name} | muestra de {len(sample_seen)} perfiles PRODUCT#*/PROFILE\n",
            flush=True,
        )
        for i, item in enumerate(sample_seen, 1):
            print(
                f"{i}. uid={item.get('uid')} | name={item.get('name')!r} | brand={item.get('brand')!r}",
                flush=True,
            )
        return

    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False, default=str))
        return

    print(f"Tabla: {args.table_name} | coincidencias: {len(results)} (límite {limit})\n", flush=True)
    for i, item in enumerate(results, 1):
        uid = item.get("uid", "?")
        nm = item.get("name", "?")
        brand = item.get("brand", "")
        score = item.get("score", "")
        pk = item.get("PK", "")
        print(f"{i}. uid={uid}")
        print(f"   name: {nm}")
        print(f"   brand: {brand} | score: {score}")
        print(f"   PK/SK: {pk} / {item.get('SK', '')}")
        print(f"   last_updated: {item.get('last_updated', '')}")
        print()


if __name__ == "__main__":
    run(parse_args())
