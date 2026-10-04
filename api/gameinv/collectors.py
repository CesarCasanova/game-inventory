"""Colectores: cada uno devuelve una lista de entradas normalizables.

Entrada = {store, store_id, raw_title, platform?, playtime_min?, last_played?, image?}
"""
from __future__ import annotations

import csv
import json
import os
import subprocess
from pathlib import Path
from typing import Any

import httpx

Entry = dict[str, Any]


# --------------------------------------------------------------------------- #
# Steam — API oficial
# --------------------------------------------------------------------------- #
def steam() -> list[Entry]:
    key, steam_id = os.getenv("STEAM_API_KEY"), os.getenv("STEAM_ID")
    print(key, steam_id)
    if not key or not steam_id:
        raise RuntimeError("Faltan STEAM_API_KEY o STEAM_ID")

    r = httpx.get(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
        params={"key": key, "steamid": steam_id, "include_appinfo": 1,
                "include_played_free_games": 1, "format": "json"},
        timeout=60,
    )
    r.raise_for_status()
    games = (r.json().get("response") or {}).get("games")
    if games is None:
        raise RuntimeError(
            "Steam devolvió una respuesta vacía: revisa que el perfil y los "
            "detalles del juego estén en público, y que el SteamID64 sea correcto"
        )

    return [{
        "store": "steam",
        "store_id": str(g["appid"]),
        "raw_title": g.get("name") or f"App {g['appid']}",
        "platform": "PC",
        "playtime_min": g.get("playtime_forever", 0),
        "last_played": str(g.get("rtime_last_played") or "") or None,
        "image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{g['appid']}/header.jpg",
    } for g in games]


# --------------------------------------------------------------------------- #
# Epic — legendary CLI, o un JSON exportado con `legendary list --json`
# --------------------------------------------------------------------------- #
def epic() -> list[Entry]:
    export = os.getenv("EPIC_JSON")
    if export and Path(export).exists():
        data = json.loads(Path(export).read_text())
    else:
        binary = os.getenv("LEGENDARY_BIN", "legendary")
        try:
            out = subprocess.run(
                [binary, "list", "--json"], capture_output=True, text=True,
                timeout=180, check=True,
            )
        except FileNotFoundError:
            raise RuntimeError(
                "No se encontró 'legendary'. Instálalo y haz 'legendary auth', "
                "o exporta la lista con 'legendary list --json > epic.json' y "
                "apunta EPIC_JSON a ese archivo"
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"legendary falló: {(e.stderr or '')[:300]}")
        data = json.loads(out.stdout)

    entries = []
    for g in data:
        meta = g.get("metadata") or {}
        images = meta.get("keyImages") or []
        image = next((i.get("url") for i in images
                      if i.get("type") in ("DieselGameBoxTall", "Thumbnail", "DieselGameBox")), None)
        entries.append({
            "store": "epic",
            "store_id": g.get("app_name") or meta.get("id") or g.get("title"),
            "raw_title": g.get("app_title") or meta.get("title") or "?",
            "platform": "PC",
            "image": image,
        })
    return entries


# --------------------------------------------------------------------------- #
# PlayStation — psnawp (API interna, requiere token NPSSO)
# --------------------------------------------------------------------------- #
def psn() -> list[Entry]:
    npsso = os.getenv("PSN_NPSSO")
    if not npsso:
        print("Falta PSN_NPSSO")
        raise RuntimeError("Falta PSN_NPSSO")

    try:
        # pyrefly: ignore [missing-import]
        from psnawp_api import PSNAWP
    except ImportError:
        raise RuntimeError("Falta el paquete psnawp-api")

    client = PSNAWP(npsso).me()
    by_id: dict[str, Entry] = {}

    # Juegos jugados (incluye tiempo de juego)
    for t in client.title_stats():
        by_id[t.title_id] = {
            "store": "psn",
            "store_id": t.title_id,
            "raw_title": t.name or t.title_id,
            "platform": str(getattr(t.category, "value", t.category) or "PlayStation"),
            "playtime_min": int((t.play_duration.total_seconds() // 60) if t.play_duration else 0),
            "last_played": t.last_played_date_time.isoformat() if t.last_played_date_time else None,
            "image": t.image_url,
        }

    # Títulos con trofeos: atrapa juegos que no aparecen en title_stats
    for t in client.trophy_titles():
        key = t.np_communication_id or t.title_name
        if key in by_id or any(e["raw_title"] == t.title_name for e in by_id.values()):
            continue
        platforms = ", ".join(sorted(str(getattr(p, "value", p)) for p in (t.title_platform or [])))
        by_id[key] = {
            "store": "psn",
            "store_id": key,
            "raw_title": t.title_name or key,
            "platform": platforms or "PlayStation",
            "image": t.title_icon_url,
        }

    return list(by_id.values())


# --------------------------------------------------------------------------- #
# Manual — CSV para Xbox, GOG, físicos, lo que sea
# --------------------------------------------------------------------------- #
def manual() -> list[Entry]:
    path = Path(os.getenv("MANUAL_CSV", "/data/manual.csv"))
    if not path.exists():
        return []

    entries = []
    with path.open(newline="", encoding="utf-8") as fh:
        for i, row in enumerate(csv.DictReader(fh)):
            title = (row.get("title") or "").strip()
            if not title:
                continue
            store = (row.get("store") or "manual").strip().lower()
            entries.append({
                "store": store,
                "store_id": (row.get("id") or f"{store}:{title}").strip(),
                "raw_title": title,
                "platform": (row.get("platform") or "").strip() or None,
                "image": (row.get("image") or "").strip() or None,
            })
    return entries


# --------------------------------------------------------------------------- #
# Demo — datos de prueba para validar la agrupación sin credenciales
# --------------------------------------------------------------------------- #
def demo() -> list[Entry]:
    samples = [
        ("steam", "292030", "The Witcher 3: Wild Hunt - Game of the Year Edition", "PC", 4200),
        ("psn", "CUSA05725", "The Witcher 3: Wild Hunt Complete Edition", "PS4", 300),
        ("epic", "Fortnite", "Fortnite", "PC", 0),
        ("steam", "1091500", "Cyberpunk 2077", "PC", 1800),
        ("epic", "Ginger", "Cyberpunk 2077: Ultimate Edition", "PC", 0),
        ("psn", "PPSA01490", "Cyberpunk 2077", "PS5", 60),
        ("steam", "39140", "FINAL FANTASY VII", "PC", 0),
        ("psn", "CUSA07372", "Final Fantasy 7 Remastered", "PS4", 120),
        ("manual", "xbox:halo", "Halo: The Master Chief Collection", "Xbox", 0),
        ("steam", "976730", "Halo: The Master Chief Collection", "PC", 90),
        ("epic", "Alabaster", "Control Ultimate Edition", "PC", 0),
    ]
    return [{
        "store": s, "store_id": sid, "raw_title": title,
        "platform": plat, "playtime_min": mins, "image": None,
    } for s, sid, title, plat, mins in samples]


COLLECTORS = {
    "steam": steam,
    "epic": epic,
    "psn": psn,
    "manual": manual,
    "demo": demo,
}