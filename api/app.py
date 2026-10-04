"""Game Inventory — API web del inventario multi-tienda."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from gameinv import db, igdb, queries

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Game Inventory", docs_url="/api/docs", openapi_url="/api/openapi.json")


@app.get("/api/stats")
def stats():
    with db.connect() as conn:
        data = queries.stats(conn)
    data["igdb"] = igdb.enabled()
    return data


@app.get("/api/games")
def games(q: str = "", store: str = "", dupes: bool = False,
          limit: int = 200, offset: int = 0):
    with db.connect() as conn:
        return queries.games(conn, q=q, store=store, only_dupes=dupes,
                             limit=limit, offset=offset)


@app.get("/api/check")
def check(title: str):
    """¿Ya tengo este juego? Pensado para consultar antes de comprar."""
    if not title.strip():
        raise HTTPException(400, "Falta el título")
    with db.connect() as conn:
        result = queries.games(conn, q=title, limit=5)
    items = result["items"]
    return {
        "owned": bool(items),
        "query": title,
        "matches": [{
            "title": g["title"],
            "stores": [c["store_label"] for c in g["copies"]],
            "platforms": sorted({c["platform"] for c in g["copies"] if c["platform"]}),
        } for g in items],
    }


@app.post("/api/sync")
def sync(stores: str = "", igdb_lookup: bool = True):
    """Lanza sync.py. Útil para el botón de la interfaz."""
    cmd = [sys.executable, str(Path(__file__).parent / "sync.py")]
    if stores:
        cmd += ["--stores", stores]
    if not igdb_lookup:
        cmd.append("--no-igdb")
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    return {
        "ok": proc.returncode == 0,
        "output": (proc.stdout + proc.stderr)[-4000:],
    }


app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")