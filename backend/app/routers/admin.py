import logging
import secrets
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict
from app.config import settings
from app.services.reset_service import reset_neo4j_database
from app.services.parity_service import get_parity_comparison

logger = logging.getLogger("backend.admin")
router = APIRouter(prefix="/admin", tags=["Admin"])


class ResetNeo4jRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirm: bool


def verify_admin_token(x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")) -> None:
    """
    Constant-time comparison of X-Admin-Token against ADMIN_TOKEN environment setting.
    """
    if not settings.ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_TOKEN is not configured on the server",
        )
    if not x_admin_token or not secrets.compare_digest(x_admin_token.strip(), settings.ADMIN_TOKEN.strip()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Admin-Token header",
        )


@router.post("/reset-neo4j")
def reset_neo4j_endpoint(
    payload: ResetNeo4jRequest,
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
):
    """
    Wipes and reloads Neo4j from local CSV files.
    Requires X-Admin-Token header and confirm=True.
    """
    verify_admin_token(x_admin_token)

    if not payload.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required (set confirm=True to proceed with reset)",
        )

    try:
        result = reset_neo4j_database()
        return {
            "message": "Neo4j database reset and reloaded successfully from CSV data.",
            "data": result,
            "meta": {
                "engine": "neo4j",
                "database": "Production Graph",
                "elapsed_ms": result["elapsed_ms"],
            },
        }
    except Exception:
        logger.exception("Reset failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Reset failed. Check server logs.",
        )


@router.get("/parity")
def get_parity_endpoint():
    """
    Compares Neo4j and Oracle entity counts, paper status breakdown, and review metrics.
    Read-only endpoint used by the Dashboard and Admin pages.
    """
    try:
        report = get_parity_comparison()
        meta = report.pop("meta", {})
        return {
            "data": report,
            "meta": meta,
        }
    except Exception:
        logger.exception("Parity check failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Parity check failed. Check server logs.",
        )
