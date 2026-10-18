from fastapi import APIRouter, Depends, Query
from app.rate_limiter import recommend_rate_limiter
from app.services import recommend_service

router = APIRouter(prefix="/recommend", tags=["Reviewer Recommendation"])


@router.get("/reviewers", dependencies=[Depends(recommend_rate_limiter)])
def recommend_reviewers_endpoint(
    paperId: int = Query(..., ge=1, description="Target paper ID to recommend reviewers for"),
    limit: int = Query(5, ge=1, le=50, description="Max number of candidate reviewers (default 5, max 50)"),
):
    """
    Ranks potential reviewers for a target paper based on:
      - Shared keywords from papers previously reviewed (+3.0 per keyword)
      - Reviewer expertise matching paper track (+5.0 exact, +3.0 partial)
      - Workload penalty based on active assignments (-1.0 per assignment)
    Excludes reviewers with existing assignments or conflict of interest (co-authors).
    Returns an explainable score breakdown.
    """
    return recommend_service.get_recommended_reviewers(paper_id=paperId, limit=limit)
