"""
GitHub Auto-Sync Module
=======================
Automatically pushes data changes to a GitHub repository whenever
records are created, updated, or deleted in the BIMS system.

Each modification triggers (with debouncing to batch rapid changes):
  1. Push of the affected table as JSON  -> data/<table>.json
  2. Push of the full SQLite database     -> backups/database.db

Environment variables required:
  GITHUB_TOKEN          : Personal Access Token with 'repo' scope
  GITHUB_REPO           : 'owner/repo' (e.g., 'alperenacer-eng/alperen')
  GITHUB_BRANCH         : Target branch (default: 'main')
  GITHUB_SYNC_ENABLED   : 'true' to enable (default: 'true')
"""
from __future__ import annotations

import os
import json
import base64
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict

import httpx
import aiosqlite

logger = logging.getLogger("github_sync")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
GITHUB_REPO = os.environ.get("GITHUB_REPO", "").strip()
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main").strip()
GITHUB_SYNC_ENABLED = os.environ.get("GITHUB_SYNC_ENABLED", "true").lower() == "true"

API_BASE = "https://api.github.com"

# Tables that must NEVER be pushed to GitHub (security / privacy)
SKIP_TABLES = {"users"}  # contains password hashes

# Debounce window (seconds) — multiple rapid changes get coalesced
TABLE_DEBOUNCE_SECONDS = 3
DB_DEBOUNCE_SECONDS = 10

# URL prefixes that should not trigger any sync
SKIP_URL_PREFIXES = ("auth/", "upload-file")

# Map URL path (without /api/ prefix) -> SQL table name.
# Longest keys are matched first to handle nested routes correctly.
URL_TO_TABLE: Dict[str, str] = {
    # Auth/admin
    "admin/users": "users",  # tracked but SKIP_TABLES filters it out

    # Production / molds / products
    "products": "products",
    "departments": "departments",
    "operators": "operators",
    "molds": "molds",
    "production": "production_records",

    # BIMS Stock
    "bims-stok-urunler": "bims_stok_urunler",
    "bims-stok-hareketler": "bims_stok_hareketler",
    "bims-stok-acilis-fisi": "bims_stok_hareketler",

    # Cimento
    "cimento-firmalar": "cimento_firmalar",
    "cimento-isletmeler": "cimento_isletmeler",
    "cimento-cinsleri": "cimento_cinsleri",
    "cimento-giris": "cimento_giris",

    # Nakliye
    "nakliyeci-firmalar": "nakliyeci_firmalar",
    "plakalar": "plakalar",
    "soforler": "soforler",
    "sehirler": "sehirler",

    # Personnel
    "personeller/{personel_id}/maas-donemleri": "personel_maas_donemleri",
    "personeller": "personeller",
    "personel-departmanlar": "personel_departmanlar",
    "puantaj/toplu": "puantaj",
    "puantaj": "puantaj",
    "tesisler": "tesisler",
    "izinler": "izinler",
    "maas-donemleri": "personel_maas_donemleri",
    "maas-bordrolari/hesapla": "maas_bordrolari",
    "maas-bordrolari": "maas_bordrolari",
    "pozisyonlar": "pozisyonlar",
    "custom-durumlar": "custom_durumlar",

    # Vehicles
    "araclar": "araclar",
    "arac-cinsleri": "arac_cinsleri",
    "markalar": "markalar",
    "modeller": "modeller",
    "sirketler": "sirketler",
    "ana-sigorta-firmalari": "ana_sigorta_firmalari",
    "sigorta-acentalari": "sigorta_acentalari",

    # Motorin (fuel)
    "motorin-tedarikciler": "motorin_tedarikciler",
    "bosaltim-tesisleri": "bosaltim_tesisleri",
    "akaryakit-markalari": "akaryakit_markalari",
    "motorin-alimlar": "motorin_alimlar",
    "motorin-verme/bulk": "motorin_verme",
    "motorin-verme-uploads": "motorin_verme_uploads",
    "motorin-verme": "motorin_verme",

    # Teklif
    "teklif-musteriler": "teklif_musteriler",
    "teklifler": "teklifler",

    # Parke
    "parke-urunler": "parke_urunler",
    "parke-hammaddeler": "parke_hammaddeler",
    "parke-uretim": "parke_uretim_kayitlari",
    "parke-renkler": "parke_renkler",
    "parke-operatorler": "parke_operatorler",

    # Irsaliye
    "irsaliyeler": "irsaliyeler",
}

# Sorted by length descending, so longer prefixes win during matching.
_SORTED_URL_KEYS = sorted(URL_TO_TABLE.keys(), key=len, reverse=True)

# Path to the SQLite database (must match server.py)
DB_PATH = Path(__file__).parent / "data" / "database.db"

# ---------------------------------------------------------------------------
# Internal state
# ---------------------------------------------------------------------------
_debounce_tasks: Dict[str, asyncio.Task] = {}
_state_lock = asyncio.Lock()

# Status counters (for monitoring)
_stats = {
    "total_attempts": 0,
    "total_success": 0,
    "total_failed": 0,
    "last_success_at": None,
    "last_error": None,
    "last_error_at": None,
}


def get_stats() -> dict:
    """Return current sync statistics (for debugging endpoint)."""
    return dict(_stats)


def is_configured() -> bool:
    return bool(GITHUB_TOKEN and GITHUB_REPO and GITHUB_SYNC_ENABLED)


# ---------------------------------------------------------------------------
# URL path -> table resolution
# ---------------------------------------------------------------------------
def resolve_table_from_path(path: str) -> Optional[str]:
    """
    Extract the SQL table name from a request path like '/api/personeller/abc'.
    Returns None if the path is not recognized or should be skipped.
    """
    if not path.startswith("/api/"):
        return None
    rest = path[len("/api/"):]

    for skip in SKIP_URL_PREFIXES:
        if rest == skip or rest.startswith(skip + "/") or rest.startswith(skip):
            return None

    for key in _SORTED_URL_KEYS:
        # Replace dynamic segments (e.g., {personel_id}) with a wildcard match
        if "{" in key:
            # Convert pattern 'personeller/{personel_id}/maas-donemleri'
            # to a simple segment-wise match.
            key_segments = key.split("/")
            rest_segments = rest.split("/")
            if len(rest_segments) < len(key_segments):
                continue
            ok = True
            for k_seg, r_seg in zip(key_segments, rest_segments):
                if k_seg.startswith("{") and k_seg.endswith("}"):
                    continue
                if k_seg != r_seg:
                    ok = False
                    break
            if ok:
                return URL_TO_TABLE[key]
        else:
            if rest == key or rest.startswith(key + "/"):
                return URL_TO_TABLE[key]

    return None


# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------
def _headers() -> dict:
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


async def _get_existing_sha(client: httpx.AsyncClient, path: str) -> Optional[str]:
    url = f"{API_BASE}/repos/{GITHUB_REPO}/contents/{path}"
    try:
        r = await client.get(
            url, params={"ref": GITHUB_BRANCH}, headers=_headers(), timeout=15.0
        )
        if r.status_code == 200:
            return r.json().get("sha")
    except Exception:
        pass
    return None


async def _put_file(
    client: httpx.AsyncClient, path: str, content_bytes: bytes, message: str
) -> bool:
    """Create or update a file in the repo. Returns True on success."""
    url = f"{API_BASE}/repos/{GITHUB_REPO}/contents/{path}"
    sha = await _get_existing_sha(client, path)
    payload = {
        "message": message,
        "branch": GITHUB_BRANCH,
        "content": base64.b64encode(content_bytes).decode("ascii"),
    }
    if sha:
        payload["sha"] = sha

    try:
        r = await client.put(url, json=payload, headers=_headers(), timeout=60.0)
    except Exception as e:
        _stats["total_failed"] += 1
        _stats["last_error"] = f"network: {e}"
        _stats["last_error_at"] = datetime.now(timezone.utc).isoformat()
        logger.exception("github push network error for %s", path)
        return False

    if r.status_code in (200, 201):
        _stats["total_success"] += 1
        _stats["last_success_at"] = datetime.now(timezone.utc).isoformat()
        return True

    # If we got a 409 (sha conflict because someone else just pushed),
    # try once more without sha so the API rejects-or-creates fresh.
    if r.status_code == 409:
        try:
            payload.pop("sha", None)
            sha2 = await _get_existing_sha(client, path)
            if sha2:
                payload["sha"] = sha2
            r2 = await client.put(url, json=payload, headers=_headers(), timeout=60.0)
            if r2.status_code in (200, 201):
                _stats["total_success"] += 1
                _stats["last_success_at"] = datetime.now(timezone.utc).isoformat()
                return True
            r = r2
        except Exception:
            pass

    _stats["total_failed"] += 1
    _stats["last_error"] = f"{r.status_code}: {r.text[:200]}"
    _stats["last_error_at"] = datetime.now(timezone.utc).isoformat()
    logger.error("github push failed %s status=%s body=%s", path, r.status_code, r.text[:300])
    return False


# ---------------------------------------------------------------------------
# Data extraction
# ---------------------------------------------------------------------------
async def export_table_as_json(table_name: str) -> Optional[bytes]:
    if not DB_PATH.exists():
        return None
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            # Make sure the table actually exists
            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,),
            )
            row = await cursor.fetchone()
            if not row:
                return None
            cursor = await db.execute(f"SELECT * FROM {table_name}")
            rows = await cursor.fetchall()
            data = [dict(r) for r in rows]
    except Exception:
        logger.exception("export_table_as_json failed for %s", table_name)
        return None

    payload = {
        "table": table_name,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "row_count": len(data),
        "rows": data,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str).encode("utf-8")


# ---------------------------------------------------------------------------
# Push operations
# ---------------------------------------------------------------------------
async def push_table_to_github(table_name: str) -> bool:
    if not is_configured() or table_name in SKIP_TABLES:
        return False
    json_bytes = await export_table_as_json(table_name)
    if json_bytes is None:
        return False
    _stats["total_attempts"] += 1
    async with httpx.AsyncClient() as client:
        return await _put_file(
            client,
            f"data/{table_name}.json",
            json_bytes,
            f"auto-sync: {table_name} ({datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')})",
        )


async def push_database_to_github() -> bool:
    if not is_configured() or not DB_PATH.exists():
        return False
    try:
        with open(DB_PATH, "rb") as f:
            content = f.read()
    except Exception:
        logger.exception("could not read database file")
        return False
    _stats["total_attempts"] += 1
    async with httpx.AsyncClient() as client:
        return await _put_file(
            client,
            "backups/database.db",
            content,
            f"auto-backup: database.db ({datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')})",
        )


# ---------------------------------------------------------------------------
# Debounced trigger (called from middleware)
# ---------------------------------------------------------------------------
async def _delayed_push_table(table: str):
    try:
        await asyncio.sleep(TABLE_DEBOUNCE_SECONDS)
        await push_table_to_github(table)
    except asyncio.CancelledError:
        pass
    except Exception:
        logger.exception("delayed table push failed for %s", table)


async def _delayed_push_db():
    try:
        await asyncio.sleep(DB_DEBOUNCE_SECONDS)
        await push_database_to_github()
    except asyncio.CancelledError:
        pass
    except Exception:
        logger.exception("delayed db push failed")


def schedule_sync(table_name: Optional[str]) -> None:
    """
    Schedule a debounced sync. Multiple calls within the debounce window
    are coalesced into a single push.

    - table_name push : data/<table>.json    (3 sec debounce)
    - full DB push    : backups/database.db (10 sec debounce)
    """
    if not is_configured():
        return
    if not table_name or table_name in SKIP_TABLES:
        # Still keep the DB backup running for any change.
        pass

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return  # no event loop, give up silently

    # Cancel any pending task for this specific table
    if table_name and table_name not in SKIP_TABLES:
        existing = _debounce_tasks.get(table_name)
        if existing and not existing.done():
            existing.cancel()
        _debounce_tasks[table_name] = loop.create_task(_delayed_push_table(table_name))

    # Cancel and reschedule the full-DB push
    db_task = _debounce_tasks.get("__db__")
    if db_task and not db_task.done():
        db_task.cancel()
    _debounce_tasks["__db__"] = loop.create_task(_delayed_push_db())


# ---------------------------------------------------------------------------
# Manual full-sync (for initial backup or admin button)
# ---------------------------------------------------------------------------
async def push_all_tables() -> dict:
    """Push every known table + full DB. Returns a result summary."""
    if not is_configured():
        return {"ok": False, "error": "GitHub sync not configured"}

    results = {"tables": {}, "database": False, "configured": True}
    seen = set()
    for table in URL_TO_TABLE.values():
        if table in seen or table in SKIP_TABLES:
            continue
        seen.add(table)
        ok = await push_table_to_github(table)
        results["tables"][table] = ok

    results["database"] = await push_database_to_github()
    results["stats"] = get_stats()
    return results
