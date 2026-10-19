from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.rate_limiter import graph_rate_limiter
from app.services import graph_service

router = APIRouter(prefix="/graph", tags=["Graph Exploration"])

VALID_SEARCH_TYPES = {"author", "reviewer", "paper", "all"}
VALID_NODE_TYPES = {
    "author",
    "reviewer",
    "paper",
    "conference",
    "track",
    "session",
    "keyword",
    "presentation",
}


@router.get("/search", dependencies=[Depends(graph_rate_limiter)])
def search_endpoint(
    q: str = Query("", min_length=0, max_length=100, description="Search query string"),
    type: Optional[str] = Query(None, description="Entity type: author, reviewer, or paper"),
    limit: int = Query(10, ge=1, le=20, description="Max results to return"),
):
    """
    Autocomplete search across authors, reviewers, and papers.
    """
    clean_type = (type or "").lower().strip()
    if clean_type and clean_type not in VALID_SEARCH_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid type filter '{type}'. Must be one of: {', '.join(sorted(VALID_SEARCH_TYPES))}",
        )

    return graph_service.search_graph(q=q, node_type=clean_type, limit=limit)


@router.get("/neighborhood", dependencies=[Depends(graph_rate_limiter)])
def neighborhood_endpoint(
    type: str = Query(..., min_length=1, max_length=50, description="Target node type"),
    id: int = Query(..., ge=1, description="Target node ID"),
    depth: int = Query(1, ge=1, le=2, description="Traversal depth (1 or 2)"),
):
    """
    Returns a node and its neighborhood up to depth 1 or 2, capped at 150 nodes.
    """
    clean_type = type.lower().strip()
    if clean_type not in VALID_NODE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid node type '{type}'. Must be one of: {', '.join(sorted(VALID_NODE_TYPES))}",
        )

    return graph_service.get_neighborhood(node_type=clean_type, node_id=id, depth=depth)


@router.get("/overview")
def overview_endpoint(
    confId: int = Query(1, ge=1, description="Conference ID for starter overview graph"),
):
    """
    Returns a starter graph showing a conference, its tracks, and sample papers.
    """
    return graph_service.get_overview(conf_id=confId)
