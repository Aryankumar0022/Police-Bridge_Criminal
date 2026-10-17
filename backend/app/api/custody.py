"""
REST API endpoints for the Chain of Custody system.

Prefix: /custody
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Request
from typing import Optional
from app.custody.service import custody_service

router = APIRouter()


# ======================================================================
# Document upload
# ======================================================================

@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    actor: str = Form(...),
    actor_role: Optional[str] = Form(None),
    case_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
):
    """Upload a document and register it in the chain of custody."""
    try:
        content = await file.read()
        ip = request.client.host if request.client else "unknown"

        result = custody_service.upload_document(
            file_content=content,
            filename=file.filename,
            actor=actor,
            actor_role=actor_role,
            ip_address=ip,
            case_id=case_id,
            content_type=file.content_type,
            metadata={"description": description} if description else None,
        )

        return {
            "status": "success",
            "document_id": result["document_id"],
            "document_hash": result["document_hash"],
            "block_index": result["block"]["block_index"],
            "block_hash": result["block"]["block_hash"],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ======================================================================
# Document queries
# ======================================================================

@router.get("/documents")
async def list_documents(
    limit: int = Query(50),
    offset: int = Query(0),
    case_id: Optional[str] = Query(None),
):
    """List all documents under custody."""
    try:
        docs = custody_service.get_documents(limit, offset, case_id)
        return {"documents": docs, "count": len(docs)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    """Get metadata for a specific document."""
    try:
        doc = custody_service.get_document_info(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/documents/{document_id}/history")
async def get_document_history(document_id: str):
    """Get the full chain of custody for a document."""
    try:
        history = custody_service.get_document_history(document_id)
        if not history:
            raise HTTPException(
                status_code=404,
                detail="No custody records found for this document",
            )
        return {"document_id": document_id, "history": history, "count": len(history)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/documents/{document_id}/verify")
async def verify_document(document_id: str):
    """Verify a document's integrity (re-hash and compare)."""
    try:
        return custody_service.verify_document_integrity(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ======================================================================
# Manual event logging
# ======================================================================

@router.post("/access")
async def log_access_event(
    request: Request,
    document_id: str = Form(...),
    actor: str = Form(...),
    actor_role: Optional[str] = Form(None),
    duration_seconds: Optional[float] = Form(None),
):
    """Manually log a document access event."""
    try:
        ip = request.client.host if request.client else "unknown"
        block = custody_service.log_access(
            document_id=document_id,
            actor=actor,
            actor_role=actor_role,
            ip_address=ip,
            duration_seconds=duration_seconds,
        )
        return {"status": "logged", "block_index": block["block_index"]}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/transfer")
async def transfer_custody(
    request: Request,
    document_id: str = Form(...),
    from_actor: str = Form(...),
    to_actor: str = Form(...),
    reason: Optional[str] = Form(None),
):
    """Transfer custody of a document between actors."""
    try:
        ip = request.client.host if request.client else "unknown"
        block = custody_service.log_transfer(
            document_id=document_id,
            from_actor=from_actor,
            to_actor=to_actor,
            reason=reason,
            ip_address=ip,
        )
        return {"status": "transferred", "block_index": block["block_index"]}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/accept")
async def accept_transfer(
    request: Request,
    document_id: str = Form(...),
    actor: str = Form(...),
    reason: Optional[str] = Form(None),
):
    """Accept custody of a document."""
    try:
        ip = request.client.host if request.client else "unknown"
        block = custody_service.log_accept_transfer(
            document_id=document_id,
            actor=actor,
            reason=reason,
            ip_address=ip,
        )
        return {"status": "accepted", "block_index": block["block_index"]}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ======================================================================
# Chain verification
# ======================================================================

@router.get("/verify")
async def verify_chain():
    """Verify the entire chain of custody integrity."""
    try:
        return custody_service.verify_chain()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ======================================================================
# Audit log & stats
# ======================================================================

@router.get("/events")
async def get_events(
    limit: int = Query(50),
    offset: int = Query(0),
):
    """Get recent custody events (audit log)."""
    try:
        events = custody_service.get_recent_events(limit, offset)
        return {"events": events, "count": len(events)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/events/actor/{actor}")
async def get_actor_events(actor: str):
    """Get all events by a specific actor."""
    try:
        events = custody_service.get_actor_activity(actor)
        return {"actor": actor, "events": events, "count": len(events)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/stats")
async def get_stats():
    """Get chain of custody statistics."""
    try:
        return custody_service.get_chain_stats()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
