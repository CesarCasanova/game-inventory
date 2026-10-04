# 🎮 Game Inventory — Multi-Store Core & RomM UI

**Game Inventory** is a multi-store video game aggregator and inventory manager. It allows you to consolidate your game library across multiple platforms (**Steam**, **PlayStation Network (PSN)**, **Epic Games**, **Xbox**, **GOG**, and **Physical / Manual Entries**), identifying cross-store duplicates, summing total playtime hours, and presenting everything in a modern web UI **inspired by RomM (RomM Edition)**.

---

## ✨ Key Features

- 🔄 **Multi-Store Synchronization**:
  - **Steam**: Full collection and playtime tracking via Steam Web API.
  - **PlayStation Network (PSN)**: Titles and platform breakdown (PS4/PS5) via `PSN_NPSSO` token.
  - **Epic Games**: Direct import using the JSON output of `legendary`.
  - **Manual / GOG / Xbox / Physical**: Custom CSV import support (`manual.csv`).
- ⚡ **Automatic Cross-Store Duplicate Detection**:
  - Automatically groups different editions and copies of the exact same title owned across 2 or more stores (e.g., *Fall Guys* on Epic & PSN, or *Fallout 4* on Steam & PSN).
  - Displays prominent `⚡ DUPLICATE` badges to prevent accidentally buying games you already own.
- 🎨 **RomM-Inspired Web Interface ([demo.romm.app](https://demo.romm.app))**:
  - **RomM Midnight & Electric Violet Aesthetics**: Deep obsidian dark background (`#0d1117`) paired with neon violet accents (`#9205f2`).
  - **3:4 Portrait Poster Grid View**: Responsive poster card format matching RomM and console library standards.
  - **Compact List View**: Sleek horizontal table view for rapidly browsing large catalogs.
  - **Hero Spotlight Banner**: Dynamic wide banner with blurred cover backdrop and random title selector (`🎲 Next Title`).
  - **Store Breakdown & Backlog HUD**: Visual progress bars showing percentage share per store and `🎮 Played (>0h)` vs `💤 Backlog (0h)` metrics.
  - **Theme Accent Switcher & CRT Scanlines FX**: Customizable neon color themes (RomM Violet, Cyber Cyan, Emerald Green, Neon Pink, Solar Amber) and an optional CRT Scanlines effect toggle.
- 🔍 **Interactive Game Detail Modal**:
  - Full game breakdown popup upon clicking any card: store of origin, exact platform, playtime per license, and quick action links to IGDB and Google Search.
- 🐳 **Docker & Docker Compose Ready**:
  - Lightweight FastAPI + Uvicorn + SQLite container with hot reload and persistent data volumes.
  - Native side-by-side integration with **RomM** (`rommapp/romm`).

---

## 🛠️ Project Structure

```
game-inventory/
├── api/
│   ├── app.py                 # FastAPI server and endpoints (/api/games, /api/stats, /api/sync)
│   ├── sync.py                # Multi-store CLI synchronization script
│   ├── gameinv/
│   │   ├── collectors.py      # Store collectors (Steam, PSN, Epic, Manual)
│   │   ├── db.py              # SQLite database manager
│   │   ├── queries.py         # Duplicate grouping and database queries
│   │   ├── igdb.py            # IGDB metadata and cover resolution
│   │   └── normalize.py       # Title normalization for matching
│   └── static/
│       ├── index.html         # Main web UI structure
│       ├── styles.css         # RomM Edition CSS styles
│       └── app.js             # Web UI JavaScript controller
├── config/
│   ├── game-inventory/        # Persistent database and configuration (/data)
│   └── romm/                  # RomM configuration
├── Dockerfile                 # API Dockerfile
└── docker-compose.yml         # Container orchestration (game-inventory, romm, romm-db)
```

---

## 🚀 Installation & Getting Started

### 1. Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

### 2. Configure Environment Variables
Edit the environment variables inside `docker-compose.yml` under the `game-inventory` service:

```yaml
environment:
  - STEAM_API_KEY=your_steam_api_key    # https://steamcommunity.com/dev/apikey
  - STEAM_ID=your_steam_id_64           # Your public SteamID64
  - PSN_NPSSO=your_npsso_token          # PlayStation Network NPSSO token
  - MANUAL_CSV=/data/manual.csv       # Path to manual CSV file
  - IGDB_CLIENT_ID=                   # Optional (Twitch/IGDB API)
  - IGDB_CLIENT_SECRET=               # Optional
```

### 3. Launch Services
Run the following command in the root directory:

```bash
docker compose up -d --build
```

---

## 🌐 Ports & Access Points

| Service | URL | Description |
| :--- | :--- | :--- |
| **Game Inventory Web UI** | `http://localhost:5057` | Main RomM-style web interface |
| **API Documentation** | `http://localhost:5057/api/docs` | FastAPI Swagger documentation |
| **RomM Manager App** | `http://localhost:8095` | RomM instance for ROMs and emulation |

---

## 📡 API Endpoints

- `GET /api/stats`: Returns global metrics (unique games, duplicates, total playtime, per-store breakdown, and sync status).
- `GET /api/games`: Lists games with support for search (`q`), store filter (`store`), duplicates only (`dupes`), and pagination (`limit`, `offset`).
- `GET /api/check?title=...`: Quick ownership check (*Do I already own this game?*).
- `POST /api/sync`: Triggers the background multi-store synchronization job.

---

## 📄 License

This project is licensed under the MIT License. Feel free to modify, distribute, and customize.
