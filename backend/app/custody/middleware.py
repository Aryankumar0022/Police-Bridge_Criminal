"""
FastAPI middleware that automatically logs document access events
in the Chain of Custody whenever a document endpoint is hit.
"""
import time
import re
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)

# URL patterns that represent a document being accessed.
# Group 1 captures the document_id.
_ACCESS_PATTERNS = [
    re.compile(r"/custody/documents/([A-Za-z0-9_-]+)/history"),
    re.compile(r"/custody/documents/([A-Za-z0-9_-]+)/verify"),
    re.compile(r"/evidence/documents/([A-Za-z0-9_-]+)$"),
]


class CustodyMiddleware(BaseHTTPMiddleware):
    """Intercept document-related requests and auto-log ACCESS events."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed = time.time() - start

        # Only log successful GET requests
        if request.method == "GET" and 200 <= response.status_code < 300:
            path = request.url.path
            for pattern in _ACCESS_PATTERNS:
                match = pattern.search(path)
                if match:
                    document_id = match.group(1)
                    actor = request.headers.get("X-Actor", "anonymous")
                    ip = request.client.host if request.client else "unknown"

                    # Lazy import to avoid circular dependency at module load
                    try:
                        from app.custody.service import custody_service
                        custody_service.log_access(
                            document_id=document_id,
                            actor=actor,
                            ip_address=ip,
                            duration_seconds=round(elapsed, 3),
                            details={"path": path, "method": request.method},
                        )
                    except ValueError:
                        pass  # document not in custody registry — skip
                    except Exception as exc:
                        logger.error("Custody middleware failed: %s", exc)
                    break

        return response
