"""Consultas de agrupación: varias entradas de tiendas -> un juego."""
from __future__ import annotations

import sqlite3
from typing import Any

STORE_LABEL = {
    "steam": "Steam", "epic": "Epic", "psn": "PlayStation",
    "gog": "GOG", "xbox": "Xbox", "itch": "itch.io", "manual": "Manual",
}


def _group_key(row: sqlite3.Row) -> str:
    return f"igdb:{row['igdb_id']}" if row["igdb_id"] else f"norm:{row['norm_title']}"


def games(conn: sqlite3.Connection, q: str = "", store: str = "",
          only_dupes: bool = False, limit: int = 500, offset: int = 0) -> dict[str, Any]:
    rows = conn.execute("SELECT * FROM entries").fetchall()

    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = _group_key(row)
        game = grouped.setdefault(key, {
            "key": key,
            "title": row["igdb_name"] or row["raw_title"],
            "cover": row["igdb_cover"],
            "igdb_id": row["igdb_id"],
            "matched": bool(row["igdb_id"]),
            "copies": [],
        })
        if not game["cover"] and row["image"]:
            game["cover"] = row["image"]
        game["copies"].append({
            "store": row["store"],
            "store_label": STORE_LABEL.get(row["store"], row["store"].title()),
            "platform": row["platform"],
            "raw_title": row["raw_title"],
            "playtime_min": row["playtime_min"] or 0,
        })

    out = []
    needle = q.strip().lower()
    for game in grouped.values():
        stores = {c["store"] for c in game["copies"]}
        game["stores"] = sorted(stores)
        game["store_count"] = len(stores)
        game["playtime_min"] = sum(c["playtime_min"] for c in game["copies"])
        game["copies"].sort(key=lambda c: c["store"])

        if only_dupes and len(stores) < 2:
            continue
        if store and store not in stores:
            continue
        if needle and needle not in game["title"].lower() and not any(
            needle in c["raw_title"].lower() for c in game["copies"]
        ):
            continue
        out.append(game)

    out.sort(key=lambda g: (-g["store_count"], g["title"].lower()))
    return {"count": len(out), "items": out[offset:offset + limit]}


def stats(conn: sqlite3.Connection) -> dict[str, Any]:
    per_store = {
        r["store"]: r["n"] for r in conn.execute(
            "SELECT store, COUNT(*) n FROM entries GROUP BY store ORDER BY n DESC")
    }
    all_games = games(conn, limit=10 ** 6)["items"]
    dupes = [g for g in all_games if g["store_count"] > 1]
    matched = sum(1 for g in all_games if g["matched"])
    last = conn.execute(
        "SELECT store, ok, items, message, ran_at FROM syncs ORDER BY id DESC LIMIT 8"
    ).fetchall()

    return {
        "entries": sum(per_store.values()),
        "unique_games": len(all_games),
        "duplicates": len(dupes),
        "matched_igdb": matched,
        "per_store": [{"store": s, "label": STORE_LABEL.get(s, s.title()), "count": n}
                      for s, n in per_store.items()],
        "playtime_hours": round(
            sum(g["playtime_min"] for g in all_games) / 60, 1),
        "last_syncs": [dict(r) for r in last],
    }