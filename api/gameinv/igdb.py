"""Resolución de títulos contra IGDB (opcional).

Sin credenciales, el inventario agrupa solo por título normalizado.
Con IGDB, agrupa por id de juego, que es bastante más confiable.
"""
from __future__ import annotations

import os
import time
from typing import Any

import httpx

CLIENT_ID = os.getenv("IGDB_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("IGDB_CLIENT_SECRET", "")
TOKEN_URL = "https://id.twitch.tv/oauth2/token"
API_URL = "https://api.igdb.com/v4/games"

_token: dict[str, Any] = {}


def enabled() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET)


def _access_token() -> str:
    if _token.get("value") and _token["expires_at"] > time.time() + 60:
        return _token["value"]
    r = httpx.post(TOKEN_URL, params={
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "client_credentials",
    }, timeout=30)
    r.raise_for_status()
    data = r.json()
    _token.update(value=data["access_token"],
                  expires_at=time.time() + data.get("expires_in", 3600))
    return _token["value"]


def search(title: str) -> dict[str, Any] | None:
    """Mejor coincidencia para un título. None si no hay match o falla."""
    if not enabled() or not title:
        return None
    body = (
        f'search "{title}"; '
        "fields id,name,cover.image_id,first_release_date,category; "
        "where category = (0,8,9,10,11); limit 5;"
    )
    try:
        r = httpx.post(API_URL, content=body, timeout=30, headers={
            "Client-ID": CLIENT_ID,
            "Authorization": f"Bearer {_access_token()}",
            "Accept": "application/json",
        })
        if r.status_code == 429:          # rate limit: 4 req/s
            time.sleep(1)
            return search(title)
        r.raise_for_status()
        results = r.json()
    except httpx.HTTPError:
        return None

    if not results:
        return None
    best = results[0]
    cover = best.get("cover") or {}
    image_id = cover.get("image_id")
    return {
        "id": best["id"],
        "name": best.get("name"),
        "cover": (f"https://images.igdb.com/igdb/image/upload/t_cover_big/{image_id}.jpg"
                  if image_id else None),
    }