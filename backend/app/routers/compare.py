from typing import Any, Dict
from fastapi import APIRouter, Depends, Query, Path
from app.rate_limiter import compare_rate_limiter
from app.services import compare_service

router = APIRouter(prefix="/compare", tags=["compare"])


@router.get("/dataset-status")
def get_dataset_status() -> Dict[str, Any]:
    """
    Returns availability status for demo and scale datasets.
    """
    return compare_service.get_dataset_availability()


@router.get("/stats")
def get_dataset_statistics(
    dataset: str = Query("demo", pattern="^(demo|scale)$", description="Target dataset (demo or scale)"),
) -> Dict[str, Any]:
    """
    Returns real database entity counts (authors, papers, co-author pairs) from both Oracle and Neo4j.
    """
    return compare_service.get_dataset_stats(dataset=dataset)


@router.get("/{scenario}", dependencies=[Depends(compare_rate_limiter)])
def run_comparison_benchmark(
    scenario: str = Path(..., description="Scenario: coauthors, within-hops, shortest-path, conflict-check, avg-score"),
    authorId: int = Query(1, ge=1, description="Author ID for coauthors and within-hops scenarios"),
    hops: int = Query(2, ge=1, le=3, description="Hop bound (1..3) for within-hops scenario"),
    fromAuthorId: int = Query(1, ge=1, description="Starting author ID for shortest-path scenario"),
    toAuthorId: int = Query(60, ge=1, description="Target author ID for shortest-path scenario"),
    dataset: str = Query("demo", pattern="^(demo|scale)$", description="Dataset target (demo or scale)"),
) -> Dict[str, Any]:
    """
    Executes the benchmark comparison scenario across Oracle SQL and Neo4j Cypher.
    Performs 1 warm-up run + 5 measured runs, returns median timings and confirms results match.
    """
    return compare_service.run_benchmark(
        scenario=scenario,
        author_id=authorId,
        hops=hops,
        from_author_id=fromAuthorId,
        to_author_id=toAuthorId,
        dataset=dataset,
    )
