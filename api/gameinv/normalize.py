"""Normalización de títulos para poder comparar entre tiendas.

"The Witcher 3: Wild Hunt – Game of the Year Edition" (Steam)
"The Witcher 3: Wild Hunt Complete Edition"            (PS Store)
    -> witcher 3 wild hunt
"""
from __future__ import annotations

import re
import unicodedata

# Sufijos de edición: se eliminan porque no distinguen un juego de otro
# para efectos de "¿ya lo tengo?".
EDITION_WORDS = [
    "game of the year", "goty", "complete", "definitive", "deluxe", "ultimate",
    "enhanced", "extended", "anniversary", "remastered", "remaster", "redux",
    "gold", "premium", "standard", "legendary", "collectors", "collector",
    "special", "director s cut", "directors cut", "digital", "bundle",
    "collection", "trilogy", "edition", "ps4", "ps5", "ps3", "for pc",
    "pc edition", "windows edition", "the full experience", "full game",
]
EDITION_RE = re.compile(
    r"\b(" + "|".join(re.escape(w) for w in EDITION_WORDS) + r")\b", re.I
)

ROMAN = {
    "ii": "2", "iii": "3", "iv": "4", "v": "5", "vi": "6", "vii": "7",
    "viii": "8", "ix": "9", "x": "10", "xi": "11", "xii": "12", "xiii": "13",
    "xiv": "14", "xv": "15", "xvi": "16", "xvii": "17", "xviii": "18",
    "xix": "19", "xx": "20",
}

TRADEMARKS = str.maketrans({"™": "", "®": "", "©": "", "℠": ""})


def normalize(title: str) -> str:
    """Devuelve una clave comparable entre tiendas."""
    if not title:
        return ""

    text = unicodedata.normalize("NFKD", title.translate(TRADEMARKS))
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()

    # Contenido entre paréntesis o corchetes: casi siempre plataforma o región
    text = re.sub(r"[\(\[\{].*?[\)\]\}]", " ", text)

    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)          # puntuación fuera
    text = EDITION_RE.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()

    # Numerales romanos -> arábigos, solo como palabra suelta
    words = [ROMAN.get(w, w) for w in text.split()]

    # Artículo inicial: "the witcher" == "witcher"
    if words and words[0] in ("the", "a", "an"):
        words = words[1:]

    # Pasadas extra: quitar ediciones que quedaron al final
    while words and words[-1] in ("edition", "the", "of", "game", "ps4", "ps5"):
        words.pop()

    return " ".join(words)