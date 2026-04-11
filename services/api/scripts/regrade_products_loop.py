#!/usr/bin/env python3
"""
Invoca la Lambda regradeProducts en tandas hasta recorrer la tabla (finishedTable).

Requisito: pip install boto3

Credenciales: igual que el SDK AWS (env vars, ~/.aws/credentials, perfil, etc.).

Ejemplo:
  python3 scripts/regrade_products_loop.py --batch-size 5
  python3 scripts/regrade_products_loop.py --function-name product-analysis-api-prod-regradeProducts --region eu-west-1 --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Regrade Dynamo product profiles via Lambda (batched).")
    p.add_argument(
        "--function-name",
        default="product-analysis-api-dev-regradeProducts",
        help="Nombre de la Lambda (default: dev Terraform estándar).",
    )
    p.add_argument("--region", default="us-east-1", help="Región AWS.")
    p.add_argument("--profile", default=None, help="Perfil ~/.aws/credentials (opcional).")
    p.add_argument(
        "--batch-size",
        type=int,
        default=5,
        metavar="N",
        help="Productos por invocación (1–25). Default: 5.",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Payload dryRun=true (no escribe en Dynamo).",
    )
    p.add_argument(
        "--read-timeout",
        type=int,
        default=0,
        metavar="SEC",
        help="Timeout lectura HTTP boto3 en segundos; 0 = sin límite (default).",
    )
    return p.parse_args()


def clamp_batch(n: int) -> int:
    return max(1, min(25, n))


def run(args: argparse.Namespace) -> None:
    try:
        import boto3
        from botocore.config import Config
    except ImportError:
        print("Instala boto3: pip install boto3", file=sys.stderr)
        sys.exit(1)

    batch = clamp_batch(args.batch_size)

    session = boto3.Session(profile_name=args.profile) if args.profile else boto3.Session()
    # read_timeout=0: sin límite de espera (invocaciones largas). >0: segundos.
    rt = 0 if args.read_timeout == 0 else max(60, args.read_timeout)
    config = Config(
        read_timeout=rt,
        connect_timeout=60,
        retries={"max_attempts": 5, "mode": "standard"},
    )
    client = session.client("lambda", region_name=args.region, config=config)

    resume: dict[str, Any] | None = None
    iteration = 0
    total_updated = total_skipped = total_errors = 0

    while True:
        iteration += 1
        payload: dict[str, Any] = {"maxProducts": batch, "dryRun": args.dry_run}
        if resume is not None:
            payload["resume"] = resume

        print(f"\n--- Invocación {iteration} (maxProducts={batch}) ---", flush=True)

        resp = client.invoke(
            FunctionName=args.function_name,
            InvocationType="RequestResponse",
            Payload=json.dumps(payload).encode("utf-8"),
        )

        raw = resp["Payload"].read()
        if resp.get("FunctionError"):
            print(resp.get("StatusCode"), raw.decode("utf-8", errors="replace")[:2000], file=sys.stderr)
            sys.exit(1)

        try:
            out = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as e:
            print("Respuesta no JSON:", raw[:500], e, file=sys.stderr)
            sys.exit(1)

        updated = out.get("updated") or []
        skipped = out.get("skipped") or []
        errors = out.get("errors") or []
        total_updated += len(updated)
        total_skipped += len(skipped)
        total_errors += len(errors)

        print(
            f"updated={len(updated)} skipped={len(skipped)} errors={len(errors)} "
            f"finishedTable={out.get('finishedTable')} resume={'sí' if out.get('resume') else 'no'}",
            flush=True,
        )
        if updated:
            tail = ", ..." if len(updated) > 10 else ""
            print("  uids:", ", ".join(str(u) for u in updated[:10]) + tail, flush=True)
        for e in errors[:8]:
            print("  ERR", e, flush=True)

        if out.get("finishedTable"):
            print("\n=== Tabla completa ===", flush=True)
            break

        resume = out.get("resume")
        if not resume:
            print("Parada inesperada (sin resume y finishedTable=false):", flush=True)
            print(json.dumps(out, indent=2, ensure_ascii=False)[:4000], flush=True)
            sys.exit(2)

    print(
        f"\nResumen: iteraciones={iteration} updated={total_updated} "
        f"skipped={total_skipped} errors={total_errors}",
        flush=True,
    )


if __name__ == "__main__":
    run(parse_args())
