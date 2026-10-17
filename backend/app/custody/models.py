"""
Pydantic models for Chain of Custody events and documents.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum


class EventType(str, Enum):
    UPLOAD = "UPLOAD"
    ACCESS = "ACCESS"
    DOWNLOAD = "DOWNLOAD"
    TRANSFER = "TRANSFER"
    VERIFY = "VERIFY"
    DELETE = "DELETE"


class CustodyEventOut(BaseModel):
    """A single block in the custody chain, returned by the API."""
    block_index: int
    timestamp: str
    event_type: str
    document_id: str
    document_name: str
    document_hash: str
    actor: str
    actor_role: Optional[str] = None
    ip_address: Optional[str] = None
    duration_seconds: Optional[float] = None
    details: Optional[Dict[str, Any]] = None
    previous_hash: str
    block_hash: str


class ChainVerificationResult(BaseModel):
    valid: bool
    blocks_checked: int
    errors: List[Dict[str, Any]] = []
    message: str


class DocumentOut(BaseModel):
    document_id: str
    document_name: str
    document_hash: str
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: str
    uploaded_by: str
    case_id: Optional[str] = None
    status: str = "ACTIVE"
    metadata: Optional[Dict[str, Any]] = None


class ChainStatsOut(BaseModel):
    total_blocks: int
    unique_documents: int
    unique_actors: int
    event_counts: Dict[str, int] = {}
    last_block_hash: Optional[str] = None
    last_block_timestamp: Optional[str] = None
