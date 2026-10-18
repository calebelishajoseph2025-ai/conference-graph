from fastapi import APIRouter, Path
from app.services import profile_service

router = APIRouter(tags=["Profiles & Demo Data"])


@router.get("/authors/{id}")
def get_author_profile_endpoint(
    id: int = Path(..., ge=1, description="Author ID"),
):
    """
    Returns author profile, papers written, co-authors, and reviewer cross-link (if any).
    """
    return profile_service.get_author_profile(author_id=id)


@router.get("/reviewers/{id}")
def get_reviewer_profile_endpoint(
    id: int = Path(..., ge=1, description="Reviewer ID"),
):
    """
    Returns reviewer profile, active workload, assigned papers, review history, and author cross-link (if any).
    """
    return profile_service.get_reviewer_profile(reviewer_id=id)


@router.get("/demo/coi-pairs")
def get_coi_pairs_endpoint():
    """
    Returns the 8 conflict-of-interest test pairs from data/da3_coi_test_pairs.csv,
    enriched with real paper titles, reviewer details, and conflicting author names.
    """
    return profile_service.get_coi_pairs()
