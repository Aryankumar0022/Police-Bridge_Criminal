"""
Core blockchain-inspired append-only ledger for chain of custody.

Each block's hash is computed from its data + the previous block's hash,
forming an immutable chain. Any tampering breaks the hash linkage and is
immediately detectable via the verify_chain() method.

Storage: SQLite — zero external dependencies, WAL mode for concurrent reads.
"""
import sqlite3
import hashlib
import json
import os
import threading
from datetime import datetime, timezone
from typing import List, Optional

# Resolve paths relative to the backend root (two levels up from this file)
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_DIR = os.path.join(_BACKEND_ROOT, "data")
DB_PATH = os.path.join(DB_DIR, "custody_ledger.db")

# The "previous hash" of the very first block in the chain
GENESIS_HASH = "0" * 64


class CustodyLedger:
    """Blockchain-inspired append-only ledger for chain of custody."""

    def __init__(self, db_path: str = None):
        self.db_path = db_path or DB_PATH
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    # ------------------------------------------------------------------
    # Connection helpers
    # ------------------------------------------------------------------

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _init_db(self):
        conn = self._get_conn()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS custody_chain (
                    block_index     INTEGER PRIMARY KEY,
                    timestamp       TEXT    NOT NULL,
                    event_type      TEXT    NOT NULL,
                    document_id     TEXT    NOT NULL,
                    document_name   TEXT    NOT NULL,
                    document_hash   TEXT    NOT NULL,
                    actor           TEXT    NOT NULL,
                    actor_role      TEXT,
                    ip_address      TEXT,
                    duration_seconds REAL,
                    details         TEXT,
                    previous_hash   TEXT    NOT NULL,
                    block_hash      TEXT    NOT NULL UNIQUE
                );

                CREATE INDEX IF NOT EXISTS idx_coc_document
                    ON custody_chain(document_id);
                CREATE INDEX IF NOT EXISTS idx_coc_actor
                    ON custody_chain(actor);
                CREATE INDEX IF NOT EXISTS idx_coc_event
                    ON custody_chain(event_type);
                CREATE INDEX IF NOT EXISTS idx_coc_ts
                    ON custody_chain(timestamp);

                CREATE TABLE IF NOT EXISTS documents (
                    document_id     TEXT PRIMARY KEY,
                    document_name   TEXT NOT NULL,
                    document_hash   TEXT NOT NULL,
                    content_type    TEXT,
                    file_size       INTEGER,
                    uploaded_at     TEXT NOT NULL,
                    uploaded_by     TEXT NOT NULL,
                    current_custodian TEXT,
                    case_id         TEXT,
                    status          TEXT DEFAULT 'ACTIVE',
                    metadata        TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_doc_case
                    ON documents(case_id);
            """)

            # Migrate existing db
            try:
                conn.execute("ALTER TABLE documents ADD COLUMN current_custodian TEXT;")
            except sqlite3.OperationalError:
                pass
            
            conn.commit()
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Hash computation
    # ------------------------------------------------------------------

    @staticmethod
    def compute_hash(block_data: dict, previous_hash: str) -> str:
        """
        Compute SHA-256 hash for a block.

        Only deterministic fields are included so that the hash is
        reproducible for verification.
        """
        payload = json.dumps({
            "block_index":   block_data["block_index"],
            "timestamp":     block_data["timestamp"],
            "event_type":    block_data["event_type"],
            "document_id":   block_data["document_id"],
            "document_name": block_data["document_name"],
            "document_hash": block_data["document_hash"],
            "actor":         block_data["actor"],
            "previous_hash": previous_hash,
        }, sort_keys=True)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    # ------------------------------------------------------------------
    # Chain operations
    # ------------------------------------------------------------------

    def get_last_block(self, conn: sqlite3.Connection = None) -> Optional[dict]:
        own_conn = conn is None
        if own_conn:
            conn = self._get_conn()
        try:
            row = conn.execute(
                "SELECT * FROM custody_chain ORDER BY block_index DESC LIMIT 1"
            ).fetchone()
            return dict(row) if row else None
        finally:
            if own_conn:
                conn.close()

    def append_block(
        self,
        event_type: str,
        document_id: str,
        document_name: str,
        document_hash: str,
        actor: str,
        actor_role: str = None,
        ip_address: str = None,
        duration_seconds: float = None,
        details: dict = None,
    ) -> dict:
        """Append a new block. Thread-safe via a Python lock + SQLite exclusive txn."""
        with self._lock:
            conn = self._get_conn()
            try:
                conn.execute("BEGIN EXCLUSIVE")

                last = self.get_last_block(conn)
                previous_hash = last["block_hash"] if last else GENESIS_HASH
                block_index = (last["block_index"] + 1) if last else 0
                timestamp = datetime.now(timezone.utc).isoformat()

                block_data = {
                    "block_index":   block_index,
                    "timestamp":     timestamp,
                    "event_type":    event_type,
                    "document_id":   document_id,
                    "document_name": document_name,
                    "document_hash": document_hash,
                    "actor":         actor,
                }
                block_hash = self.compute_hash(block_data, previous_hash)

                conn.execute(
                    """INSERT INTO custody_chain
                       (block_index, timestamp, event_type, document_id,
                        document_name, document_hash, actor, actor_role,
                        ip_address, duration_seconds, details,
                        previous_hash, block_hash)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        block_index, timestamp, event_type, document_id,
                        document_name, document_hash, actor, actor_role,
                        ip_address, duration_seconds,
                        json.dumps(details) if details else None,
                        previous_hash, block_hash,
                    ),
                )
                conn.commit()

                return {
                    "block_index":      block_index,
                    "timestamp":        timestamp,
                    "event_type":       event_type,
                    "document_id":      document_id,
                    "document_name":    document_name,
                    "document_hash":    document_hash,
                    "actor":            actor,
                    "actor_role":       actor_role,
                    "ip_address":       ip_address,
                    "duration_seconds": duration_seconds,
                    "details":          details,
                    "previous_hash":    previous_hash,
                    "block_hash":       block_hash,
                }
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

    # ------------------------------------------------------------------
    # Chain verification
    # ------------------------------------------------------------------

    def verify_chain(self) -> dict:
        """Walk the entire chain and verify every hash link."""
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM custody_chain ORDER BY block_index ASC"
            ).fetchall()

            if not rows:
                return {"valid": True, "blocks_checked": 0,
                        "errors": [], "message": "Chain is empty"}

            blocks = [dict(r) for r in rows]
            errors = []

            for i, block in enumerate(blocks):
                # Index continuity
                if block["block_index"] != i:
                    errors.append({
                        "block_index": block["block_index"],
                        "expected_index": i,
                        "error": "Index gap detected",
                    })

                # Previous-hash linkage
                expected_prev = blocks[i - 1]["block_hash"] if i > 0 else GENESIS_HASH
                if block["previous_hash"] != expected_prev:
                    errors.append({
                        "block_index": block["block_index"],
                        "error": "Previous hash mismatch — chain broken",
                        "expected": expected_prev,
                        "actual": block["previous_hash"],
                    })

                # Recompute block hash
                block_data = {
                    "block_index":   block["block_index"],
                    "timestamp":     block["timestamp"],
                    "event_type":    block["event_type"],
                    "document_id":   block["document_id"],
                    "document_name": block["document_name"],
                    "document_hash": block["document_hash"],
                    "actor":         block["actor"],
                }
                recomputed = self.compute_hash(block_data, block["previous_hash"])
                if recomputed != block["block_hash"]:
                    errors.append({
                        "block_index": block["block_index"],
                        "error": "Block hash mismatch — data tampered",
                        "expected": recomputed,
                        "actual": block["block_hash"],
                    })

            return {
                "valid": len(errors) == 0,
                "blocks_checked": len(blocks),
                "errors": errors,
                "message": (
                    "Chain integrity verified — all blocks valid"
                    if not errors
                    else f"{len(errors)} integrity violation(s) detected"
                ),
            }
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def get_document_history(self, document_id: str) -> List[dict]:
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM custody_chain WHERE document_id = ? ORDER BY block_index ASC",
                (document_id,),
            ).fetchall()
            return [self._parse_row(r) for r in rows]
        finally:
            conn.close()

    def get_actor_activity(self, actor: str) -> List[dict]:
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM custody_chain WHERE actor = ? ORDER BY block_index DESC",
                (actor,),
            ).fetchall()
            return [self._parse_row(r) for r in rows]
        finally:
            conn.close()

    def get_recent_events(self, limit: int = 50, offset: int = 0) -> List[dict]:
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM custody_chain ORDER BY block_index DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
            return [self._parse_row(r) for r in rows]
        finally:
            conn.close()

    def get_chain_stats(self) -> dict:
        conn = self._get_conn()
        try:
            total = conn.execute("SELECT COUNT(*) FROM custody_chain").fetchone()[0]
            docs = conn.execute("SELECT COUNT(DISTINCT document_id) FROM custody_chain").fetchone()[0]
            actors = conn.execute("SELECT COUNT(DISTINCT actor) FROM custody_chain").fetchone()[0]

            event_counts = {}
            for row in conn.execute(
                "SELECT event_type, COUNT(*) AS cnt FROM custody_chain GROUP BY event_type"
            ).fetchall():
                event_counts[row["event_type"]] = row["cnt"]

            last_block = self.get_last_block(conn)

            return {
                "total_blocks":        total,
                "unique_documents":    docs,
                "unique_actors":       actors,
                "event_counts":        event_counts,
                "last_block_hash":     last_block["block_hash"] if last_block else None,
                "last_block_timestamp": last_block["timestamp"] if last_block else None,
            }
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Document registry
    # ------------------------------------------------------------------

    def register_document(
        self, document_id, document_name, document_hash,
        content_type, file_size, uploaded_by, current_custodian=None, case_id=None, metadata=None,
    ):
        conn = self._get_conn()
        try:
            conn.execute(
                """INSERT OR REPLACE INTO documents
                   (document_id, document_name, document_hash, content_type,
                    file_size, uploaded_at, uploaded_by, current_custodian, case_id, status, metadata)
                   VALUES (?,?,?,?,?,?,?,?,?,'ACTIVE',?)""",
                (
                    document_id, document_name, document_hash, content_type,
                    file_size, datetime.now(timezone.utc).isoformat(),
                    uploaded_by, current_custodian or uploaded_by, case_id,
                    json.dumps(metadata) if metadata else None,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def update_document_custodian(self, document_id: str, new_custodian: str):
        conn = self._get_conn()
        try:
            conn.execute(
                "UPDATE documents SET current_custodian = ? WHERE document_id = ?",
                (new_custodian, document_id)
            )
            conn.commit()
        finally:
            conn.close()

    def get_document(self, document_id: str) -> Optional[dict]:
        conn = self._get_conn()
        try:
            row = conn.execute(
                "SELECT * FROM documents WHERE document_id = ?", (document_id,)
            ).fetchone()
            return self._parse_row(row) if row else None
        finally:
            conn.close()

    def list_documents(self, limit=50, offset=0, case_id=None) -> List[dict]:
        conn = self._get_conn()
        try:
            if case_id:
                rows = conn.execute(
                    "SELECT * FROM documents WHERE case_id = ? ORDER BY uploaded_at DESC LIMIT ? OFFSET ?",
                    (case_id, limit, offset),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM documents ORDER BY uploaded_at DESC LIMIT ? OFFSET ?",
                    (limit, offset),
                ).fetchall()
            return [self._parse_row(r) for r in rows]
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_row(row) -> dict:
        d = dict(row)
        for key in ("details", "metadata"):
            if d.get(key) and isinstance(d[key], str):
                try:
                    d[key] = json.loads(d[key])
                except (json.JSONDecodeError, TypeError):
                    pass
        return d


# ---------------------------------------------------------------------------
# Singleton — imported by other modules
# ---------------------------------------------------------------------------
custody_ledger = CustodyLedger()
