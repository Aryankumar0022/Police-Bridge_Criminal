"""
High-level business logic for Chain of Custody operations.

Orchestrates file storage, document registration, and chain event logging.
"""
import hashlib
import uuid
import os
import logging
from typing import Optional

from .ledger import custody_ledger

logger = logging.getLogger(__name__)

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(_BACKEND_ROOT, "data", "evidence")


class CustodyService:
    """Facade over the ledger for chain-of-custody workflows."""

    def __init__(self):
        self.ledger = custody_ledger
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def compute_file_hash(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    # ------------------------------------------------------------------
    # Upload
    # ------------------------------------------------------------------

    def upload_document(
        self,
        file_content: bytes,
        filename: str,
        actor: str,
        actor_role: str = None,
        ip_address: str = None,
        case_id: str = None,
        content_type: str = None,
        metadata: dict = None,
    ) -> dict:
        """Save a file to disk, register it, and log an UPLOAD block."""
        document_id = f"DOC-{uuid.uuid4().hex[:12].upper()}"
        document_hash = self.compute_file_hash(file_content)

        # Persist file
        safe_name = f"{document_id}_{filename}"
        with open(os.path.join(UPLOAD_DIR, safe_name), "wb") as fh:
            fh.write(file_content)

        # Register in the documents table
        self.ledger.register_document(
            document_id=document_id,
            document_name=filename,
            document_hash=document_hash,
            content_type=content_type,
            file_size=len(file_content),
            uploaded_by=actor,
            current_custodian=actor,
            case_id=case_id,
            metadata=metadata,
        )

        # Append REGISTERED block to the chain
        block = self.ledger.append_block(
            event_type="REGISTERED",
            document_id=document_id,
            document_name=filename,
            document_hash=document_hash,
            actor=actor,
            actor_role=actor_role,
            ip_address=ip_address,
            details={
                "file_size": len(file_content),
                "content_type": content_type,
                "case_id": case_id,
                **(metadata or {}),
            },
        )

        logger.info(
            "Document %s uploaded by %s — block #%d",
            document_id, actor, block["block_index"],
        )
        return {"document_id": document_id, "document_hash": document_hash, "block": block}

    # ------------------------------------------------------------------
    # Event logging
    # ------------------------------------------------------------------

    def log_access(
        self, document_id: str, actor: str,
        actor_role: str = None, ip_address: str = None,
        duration_seconds: float = None, details: dict = None,
    ) -> dict:
        doc = self.ledger.get_document(document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found in custody registry")

        return self.ledger.append_block(
            event_type="VIEWED",
            document_id=document_id,
            document_name=doc["document_name"],
            document_hash=doc["document_hash"],
            actor=actor,
            actor_role=actor_role,
            ip_address=ip_address,
            duration_seconds=duration_seconds,
            details=details,
        )

    def log_download(
        self, document_id: str, actor: str,
        actor_role: str = None, ip_address: str = None,
    ) -> dict:
        doc = self.ledger.get_document(document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found in custody registry")

        return self.ledger.append_block(
            event_type="DOWNLOAD",
            document_id=document_id,
            document_name=doc["document_name"],
            document_hash=doc["document_hash"],
            actor=actor,
            actor_role=actor_role,
            ip_address=ip_address,
        )

    def log_transfer(
        self, document_id: str, from_actor: str, to_actor: str,
        reason: str = None, ip_address: str = None,
    ) -> dict:
        doc = self.ledger.get_document(document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found in custody registry")

        return self.ledger.append_block(
            event_type="TRANSFERRED",
            document_id=document_id,
            document_name=doc["document_name"],
            document_hash=doc["document_hash"],
            actor=from_actor,
            ip_address=ip_address,
            details={"receiving_custodian": to_actor, "reason": reason, "current_custodian": doc.get("current_custodian")},
        )

    def log_accept_transfer(
        self, document_id: str, actor: str,
        reason: str = None, ip_address: str = None,
    ) -> dict:
        doc = self.ledger.get_document(document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found in custody registry")

        # Change custody
        self.ledger.update_document_custodian(document_id, actor)

        return self.ledger.append_block(
            event_type="ACCEPTED",
            document_id=document_id,
            document_name=doc["document_name"],
            document_hash=doc["document_hash"],
            actor=actor,
            ip_address=ip_address,
            details={"reason": reason, "previous_custodian": doc.get("current_custodian")},
        )

    # ------------------------------------------------------------------
    # Verification
    # ------------------------------------------------------------------

    def verify_document_integrity(self, document_id: str) -> dict:
        """Re-hash the file on disk and compare against the stored hash."""
        doc = self.ledger.get_document(document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found in custody registry")

        # Locate the file
        matches = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(document_id)]
        if not matches:
            return {
                "document_id": document_id,
                "file_found": False,
                "integrity": "UNKNOWN",
                "message": "File not found on disk",
            }

        with open(os.path.join(UPLOAD_DIR, matches[0]), "rb") as fh:
            current_hash = self.compute_file_hash(fh.read())

        intact = current_hash == doc["document_hash"]

        # Record the verification itself
        event_str = "VERIFIED — HASH MATCH" if intact else "INTEGRITY FAILURE — HASH MISMATCH"
        self.ledger.append_block(
            event_type=event_str,
            document_id=document_id,
            document_name=doc["document_name"],
            document_hash=current_hash,
            actor="SYSTEM",
            details={
                "stored_hash": doc["document_hash"],
                "computed_hash": current_hash,
                "integrity": "INTACT" if intact else "COMPROMISED",
            },
        )

        return {
            "document_id": document_id,
            "file_found": True,
            "integrity": "INTACT" if intact else "COMPROMISED",
            "stored_hash": doc["document_hash"],
            "current_hash": current_hash,
            "event": event_str
        }

    def verify_chain(self) -> dict:
        return self.ledger.verify_chain()

    # ------------------------------------------------------------------
    # Queries (delegated to ledger)
    # ------------------------------------------------------------------

    def get_document_history(self, document_id: str):
        return self.ledger.get_document_history(document_id)

    def get_actor_activity(self, actor: str):
        return self.ledger.get_actor_activity(actor)

    def get_recent_events(self, limit=50, offset=0):
        return self.ledger.get_recent_events(limit, offset)

    def get_chain_stats(self):
        return self.ledger.get_chain_stats()

    def get_documents(self, limit=50, offset=0, case_id=None):
        return self.ledger.list_documents(limit, offset, case_id)

    def get_document_info(self, document_id: str):
        return self.ledger.get_document(document_id)


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------
custody_service = CustodyService()
