import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "fake_news_history.db"


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _connect()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            owner_id TEXT,
            article TEXT NOT NULL,
            label TEXT NOT NULL,
            confidence REAL NOT NULL,
            reliability REAL NOT NULL,
            signals TEXT NOT NULL,
            metrics TEXT NOT NULL
        )
        """
    )
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(analyses)").fetchall()}
    if "owner_id" not in columns:
        conn.execute("ALTER TABLE analyses ADD COLUMN owner_id TEXT")
    conn.commit()
    conn.close()


def save_analysis(owner_id, article, label, confidence, reliability, signals, metrics):
    conn = _connect()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = conn.execute(
        """
        INSERT INTO analyses (created_at, owner_id, article, label, confidence, reliability, signals, metrics)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            now_iso,
            owner_id,
            article,
            label,
            float(confidence),
            float(reliability),
            json.dumps(signals),
            json.dumps(metrics),
        ),
    )
    conn.commit()
    analysis_id = cursor.lastrowid
    conn.close()
    return analysis_id


def get_history(owner_id):
    conn = _connect()
    rows = conn.execute(
        """
        SELECT id, created_at, article, label, confidence, reliability, signals, metrics
        FROM analyses
        WHERE owner_id = ?
        ORDER BY id DESC
        """
        , (owner_id,)
    ).fetchall()
    conn.close()

    result = []
    for row in rows:
        try:
            signals_data = json.loads(row["signals"])
        except Exception:
            signals_data = []
        try:
            metrics_data = json.loads(row["metrics"])
        except Exception:
            metrics_data = {}

        result.append(
            {
                "id": row["id"],
                "created_at": row["created_at"],
                "article": row["article"],
                "label": row["label"],
                "confidence": row["confidence"],
                "reliability": row["reliability"],
                "signals": signals_data,
                "metrics": metrics_data,
            }
        )
    return result


def get_analysis_by_id(owner_id, analysis_id):
    conn = _connect()
    row = conn.execute(
        """
        SELECT id, created_at, article, label, confidence, reliability, signals, metrics
        FROM analyses
        WHERE id = ? AND owner_id = ?
        """,
        (analysis_id, owner_id),
    ).fetchone()
    conn.close()

    if row is None:
        return None

    try:
        signals_data = json.loads(row["signals"])
    except Exception:
        signals_data = []
    try:
        metrics_data = json.loads(row["metrics"])
    except Exception:
        metrics_data = {}

    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "article": row["article"],
        "label": row["label"],
        "confidence": row["confidence"],
        "reliability": row["reliability"],
        "signals": signals_data,
        "metrics": metrics_data,
    }


def delete_analysis(owner_id, analysis_id):
    conn = _connect()
    cursor = conn.execute("DELETE FROM analyses WHERE id = ? AND owner_id = ?", (analysis_id, owner_id))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0


def clear_history(owner_id):
    conn = _connect()
    conn.execute("DELETE FROM analyses WHERE owner_id = ?", (owner_id,))
    conn.commit()
    conn.close()
