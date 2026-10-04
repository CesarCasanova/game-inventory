"""Capa SQLite del inventario."""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

DB_PATH = os.getenv("DB_PATH", "/data/inventory.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS entries (
    id           INTEGER PRIMARY KEY,
    store        TEXT NOT NULL,
    store_id     TEXT NOT NULL,
    raw_title    TEXT NOT NULL,
    norm_title   TEXT NOT NULL,
    platform     TEXT,
    playtime_min INTEGER DEFAULT 0,
    last_played  TEXT,
    image        TEXT,
    igdb_id      INTEGER,
    igdb_name    TEXT,
    igdb_cover   TEXT,
    updated_at   TEXT NOT NULL,
    UNIQUE (store, store_id)
);
CREATE INDEX IF NOT EXISTS idx_entries_norm ON entries (norm_title);
CREATE INDEX IF NOT EXISTS idx_entries_igdb ON entries (igdb_id);

CREATE TABLE IF NOT EXISTS igdb_cache (
    norm_title TEXT PRIMARY KEY,
    igdb_id    INTEGER,
    igdb_name  TEXT,
    igdb_cover TEXT,
    checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS syncs (
    id         INTEGER PRIMARY KEY,
    store      TEXT NOT NULL,
    ok         INTEGER NOT NULL,
    items      INTEGER NOT NULL,
    message    TEXT,
    ran_at     TEXT NOT NULL
);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connect(path: str | None = None) -> Iterator[sqlite3.Connection]:
    target = path or DB_PATH
    os.makedirs(os.path.dirname(target) or ".", exist_ok=True)
    conn = sqlite3.connect(target)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(SCHEMA)
        yield conn
        conn.commit()
    finally:
        conn.close()


def upsert_entry(conn: sqlite3.Connection, entry: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO entries (store, store_id, raw_title, norm_title, platform,
                             playtime_min, last_played, image, updated_at)
        VALUES (:store, :store_id, :raw_title, :norm_title, :platform,
                :playtime_min, :last_played, :image, :updated_at)
        ON CONFLICT (store, store_id) DO UPDATE SET
            raw_title    = excluded.raw_title,
            norm_title   = excluded.norm_title,
            platform     = excluded.platform,
            playtime_min = excluded.playtime_min,
            last_played  = excluded.last_played,
            image        = COALESCE(excluded.image, entries.image),
            updated_at   = excluded.updated_at
        """,
        {"playtime_min": 0, "last_played": None, "image": None,
         "platform": None, "updated_at": now(), **entry},
    )


def set_igdb(conn: sqlite3.Connection, norm_title: str, match: dict[str, Any] | None) -> None:
    conn.execute(
        """INSERT INTO igdb_cache (norm_title, igdb_id, igdb_name, igdb_cover, checked_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (norm_title) DO UPDATE SET
               igdb_id=excluded.igdb_id, igdb_name=excluded.igdb_name,
               igdb_cover=excluded.igdb_cover, checked_at=excluded.checked_at""",
        (norm_title, (match or {}).get("id"), (match or {}).get("name"),
         (match or {}).get("cover"), now()),
    )
    conn.execute(
        """UPDATE entries SET igdb_id=?, igdb_name=?, igdb_cover=?
           WHERE norm_title=?""",
        ((match or {}).get("id"), (match or {}).get("name"),
         (match or {}).get("cover"), norm_title),
    )


def cached_igdb(conn: sqlite3.Connection, norm_title: str) -> dict[str, Any] | None:
    row = conn.execute(
        "SELECT igdb_id, igdb_name, igdb_cover FROM igdb_cache WHERE norm_title=?",
        (norm_title,),
    ).fetchone()
    if row is None:
        return None
    return {"id": row["igdb_id"], "name": row["igdb_name"], "cover": row["igdb_cover"]}


def log_sync(conn: sqlite3.Connection, store: str, ok: bool, items: int, message: str = "") -> None:
    conn.execute(
        "INSERT INTO syncs (store, ok, items, message, ran_at) VALUES (?,?,?,?,?)",
        (store, int(ok), items, message[:500], now()),
    )


def prune_store(conn: sqlite3.Connection, store: str, keep_ids: set[str]) -> int:
    """Borra entradas de una tienda que ya no aparecen (juegos removidos)."""
    rows = conn.execute("SELECT store_id FROM entries WHERE store=?", (store,)).fetchall()
    gone = [r["store_id"] for r in rows if r["store_id"] not in keep_ids]
    for store_id in gone:
        conn.execute("DELETE FROM entries WHERE store=? AND store_id=?", (store, store_id))
    return len(gone)