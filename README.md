# 🎮 Game Inventory — Multi-Store Core & RomM UI

**Game Inventory** es un agregador y gestor de inventario de videojuegos multi-tienda. Permite unificar tu biblioteca de juegos distribuidos en múltiples plataformas (**Steam**, **PlayStation Network (PSN)**, **Epic Games**, **Xbox**, **GOG** y **Juegos Físicos / Manuales**), identificando duplicados entre tiendas, sumando horas de juego y ofreciendo una interfaz web moderna **estilo RomM (RomM Edition)**.

---

## ✨ Características Principales

- 🔄 **Sincronización Multi-Tienda**:
  - **Steam**: Colección completa y horas de juego usando Steam Web API.
  - **PlayStation Network (PSN)**: Títulos y plataformas (PS4/PS5) vía token `PSN_NPSSO`.
  - **Epic Games**: Importación mediante la salida JSON de `legendary`.
  - **Manual / GOG / Xbox / Físicos**: Compatibilidad con archivo CSV (`manual.csv`).
- ⚡ **Detección Automática de Duplicados**:
  - Agrupa automáticamente diferentes ediciones y copias del mismo título poseído en 2 o más tiendas (ej. *Fall Guys* en Epic & PSN, o *Fallout 4* en Steam & PSN).
  - Muestra alertas destacadas `⚡ REPETIDO` para evitar comprar juegos que ya posees.
- 🎨 **Interfaz Web Estilo RomM ([demo.romm.app](https://demo.romm.app))**:
  - **Estética RomM Midnight & Electric Violet**: Fondo obsidian oscuro (`#0d1117`) con acentos neón violeta (`#9205f2`).
  - **Vista Cuadrícula Poster (Aspect Ratio 3:4)**: Tarjetas formato poster como en RomM y librerías de consola.
  - **Vista Lista Compacta**: Formato tabla para explorar catálogos extensos rápidamente.
  - **Hero Spotlight Banner**: Destacado dinámico panorámico con carátulas desenfocadas y seleccionador aleatorio (`🎲 Siguiente Título`).
  - **Gráficos de Distribución por Tienda & Backlog**: Barras de progreso visuales con % por plataforma y segmento de `🎮 Jugados (>0h)` vs `💤 Backlog (0h)`.
  - **Personalización de Colores & CRT Scanlines**: Selector de acentos (RomM Violet, Cyber Cyan, Emerald Green, Neon Pink, Solar Amber) y alternador de efecto CRT Scanlines.
- 🔍 **Modal Interactivo de Detalle**:
  - Desglose completo al hacer clic en cualquier juego: tienda origen, plataforma exacta, horas jugadas por licencia y enlaces directos a IGDB y Google.
- 🐳 **Despliegue Listo con Docker Compose**:
  - Contenedor ligero FastAPI + Uvicorn + SQLite con recarga en caliente y volúmenes persistentes.
  - Integración nativa junto al contenedor de **RomM** (`rommapp/romm`).

---

## 🛠️ Estructura del Proyecto

```
game-inventory/
├── api/
│   ├── app.py                 # Servidor FastAPI y endpoints (/api/games, /api/stats, /api/sync)
│   ├── sync.py                # Script CLI de sincronización multi-tienda
│   ├── gameinv/
│   │   ├── collectors.py      # Recolectores (Steam, PSN, Epic, Manual)
│   │   ├── db.py              # Base de datos SQLite
│   │   ├── queries.py         # Agrupación y consultas de juegos/duplicados
│   │   ├── igdb.py            # Resolución de metadatos e imágenes IGDB
│   │   └── normalize.py       # Normalización de títulos para matching
│   └── static/
│       ├── index.html         # Estructura principal de la interfaz web
│       ├── styles.css         # Estilos CSS RomM Edition
│       └── app.js             # Controlador JavaScript de la interfaz
├── config/
│   ├── game-inventory/        # Base de datos y configuración persistente (/data)
│   └── romm/                  # Configuración de RomM
├── Dockerfile                 # Dockerfile de la API
└── docker-compose.yml         # Orquestación de servicios (game-inventory, romm, romm-db)
```

---

## 🚀 Guía de Instalación y Uso

### 1. Requisitos Previos
- [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/) instalados.

### 2. Configurar Variables de Entorno
Edita las variables en `docker-compose.yml` dentro del servicio `game-inventory`:

```yaml
environment:
  - STEAM_API_KEY=tu_steam_api_key    # https://steamcommunity.com/dev/apikey
  - STEAM_ID=tu_steam_id_64           # Tu SteamID64 público
  - PSN_NPSSO=tu_token_npsso          # Token NPSSO de PlayStation Network
  - MANUAL_CSV=/data/manual.csv       # Ruta a juegos manuales
  - IGDB_CLIENT_ID=                   # Opcional (Twitch/IGDB API)
  - IGDB_CLIENT_SECRET=               # Opcional
```

### 3. Iniciar los Servicios
Ejecuta el siguiente comando en la raíz del proyecto:

```bash
docker compose up -d --build
```

---

## 🌐 Puertos y Accesos

| Servicio | URL | Descripción |
| :--- | :--- | :--- |
| **Game Inventory Web UI** | `http://localhost:5057` | Interfaz principal estilo RomM |
| **API Documentation** | `http://localhost:5057/api/docs` | Documentación de la API FastAPI (Swagger) |
| **RomM Manager App** | `http://localhost:8095` | Instancia de RomM para ROMs y emulación |

---

## 📡 Endpoints de la API

- `GET /api/stats`: Devuelve métricas globales (juegos únicos, repetidos, horas jugadas, distribución por tienda y diagnósticos de sync).
- `GET /api/games`: Lista juegos con soporte para búsqueda (`q`), filtro de tiendas (`store`), duplicados (`dupes`), paginación (`limit`, `offset`).
- `GET /api/check?title=...`: Consulta rápida de disponibilidad (*¿Ya tengo este juego?*).
- `POST /api/sync`: Dispara el proceso de sincronización con las APIs externas.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Libre para modificar, distribuir y personalizar.
