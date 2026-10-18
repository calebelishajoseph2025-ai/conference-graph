from typing import Any, Dict
from fastapi import APIRouter, Depends, Query
from app.rate_limiter import analytics_rate_limiter
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/collab-path", dependencies=[Depends(analytics_rate_limiter)])
def get_collaboration_path(
    fromAuthorId: int = Query(..., ge=1, description="Starting Author ID"),
    toAuthorId: int = Query(..., ge=1, description="Ending Author ID"),
) -> Dict[str, Any]:
    """
    Finds the shortest collaboration path between two authors using Neo4j shortestPath((a)-[:WROTE*..8]-(b)).
    Returns Cytoscape-compatible nodes and edges, hop count, and connecting papers.
    """
    return analytics_service.get_collab_path(from_author_id=fromAuthorId, to_author_id=toAuthorId)


@router.get("/within-hops", dependencies=[Depends(analytics_rate_limiter)])
def get_authors_within_hops(
    authorId: int = Query(..., ge=1, description="Author ID"),
    hops: int = Query(1, ge=1, le=3, description="Number of co-author hops (1 to 3)"),
) -> Dict[str, Any]:
    """
    Finds all distinct authors reachable within N co-author hops (1 hop = 2 relationships: Author-Paper-Author).
    Validated for hops between 1 and 3.
    """
    return analytics_service.get_within_hops(author_id=authorId, hops=hops)


@router.get("/central-authors", dependencies=[Depends(analytics_rate_limiter)])
def get_most_central_authors(
    limit: int = Query(10, ge=1, le=100, description="Maximum number of authors to return (1 to 100)"),
) -> Dict[str, Any]:
    """
    Returns the most connected authors ordered by distinct co-authors (degree) and paper count.
    """
    return analytics_service.get_central_authors(limit=limit)


@router.get("/institutions", dependencies=[Depends(analytics_rate_limiter)])
def get_institutions_analytics(
    limit: int = Query(15, ge=1, le=50, description="Limit for top institution pairs"),
) -> Dict[str, Any]:
    """
    Returns top cross-institution collaboration pairs, paper counts per research area,
    track breakdown, and top institutions overall.
    """
    return analytics_service.get_institution_analytics(limit=limit)
