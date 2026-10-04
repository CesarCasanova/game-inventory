#!/usr/bin/env python3
"""Sincroniza las bibliotecas de cada tienda hacia el inventario.

    python sync.py                      # todas las tiendas configuradas
    python sync.py --stores steam,psn   # solo algunas
    python sync.py --demo               # datos de ejemplo, sin credenciales
    python sync.py --no-igdb            # agrupa solo por título normalizado
"""
from __future__ import annotations

import argparse
import os
import sys

from gameinv import db, igdb
from gameinv.collectors import COLLECTORS
from gameinv.normalize import normalize

DEFAULT_STORES = os.getenv("STORES", "steam,epic,psn,manual")


def run(stores: list[str], use_igdb: bool, prune: bool) -> int:
    failures = 0
    with db.connect() as conn:
        for store in stores:
            collector = COLLECTORS.get(store)
            if collector is None:
                print(f"  ✗ {store}: colector desconocido")
                failures += 1
                continue

            try:
                entries = collector()
            except Exception as e:  # noqa: BLE001
                print(f"  ✗ {store}: {e}")
                db.log_sync(conn, store, False, 0, str(e))
                failures += 1
                continue

            seen: set[str] = set()
            for entry in entries:
                entry["norm_title"] = normalize(entry["raw_title"])
                db.upsert_entry(conn, entry)
                seen.add(str(entry["store_id"]))

            removed = db.prune_store(conn, store, seen) if prune else 0
            db.log_sync(conn, store, True, len(entries))
            extra = f", {removed} ya no están" if removed else ""
            print(f"  ✓ {store}: {len(entries)} juegos{extra}")

        # --- Resolución contra IGDB -------------------------------------- #
        if use_igdb and igdb.enabled():
            pending = [r["norm_title"] for r in conn.execute(
                "SELECT DISTINCT norm_title FROM entries WHERE igdb_id IS NULL")]
            hits = 0
            for norm in pending:
                cached = db.cached_igdb(conn, norm)
                match = cached if cached is not None else igdb.search(norm)
                db.set_igdb(conn, norm, match if match and match.get("id") else None)
                hits += bool(match and match.get("id"))
            print(f"  ✓ igdb: {hits}/{len(pending)} títulos resueltos")
        elif use_igdb:
            print("  · igdb: sin credenciales, se agrupa por título normalizado")

    return failures


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stores", default=DEFAULT_STORES)
    ap.add_argument("--demo", action="store_true", help="carga datos de ejemplo")
    ap.add_argument("--no-igdb", action="store_true")
    ap.add_argument("--no-prune", action="store_true",
                    help="no borrar entradas que ya no aparecen en la tienda")
    args = ap.parse_args()

    stores = ["demo"] if args.demo else [s.strip() for s in args.stores.split(",") if s.strip()]
    print(f"Sincronizando: {', '.join(stores)}")
    failures = run(stores, not args.no_igdb, not args.no_prune)
    sys.exit(1 if failures == len(stores) else 0)


if __name__ == "__main__":
    main()