from typing import Optional
from fastapi import APIRouter, Header, Path, Query, status
from app.routers.admin import verify_admin_token
from app.schemas import (
    PaperCreate,
    PaperUpdate,
    PaperDeleteConfirm,
    AssignmentCreate,
    ReviewCreate,
)
from app.services import paper_service, review_service

router = APIRouter(prefix="/papers", tags=["Paper Operations"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_paper_endpoint(payload: PaperCreate):
    """
    Creates a new paper node with author, submission, track, conference, and keyword relationships.
    Runs inside a single atomic write transaction.
    """
    return paper_service.create_paper(payload)


@router.get("")
def list_papers_endpoint(
    status: Optional[str] = Query(None, pattern="^(Submitted|Under Review|Accepted|Rejected)$", description="Filter by status"),
    confId: Optional[int] = Query(None, ge=1, description="Filter by conference ID"),
    q: Optional[str] = Query(None, max_length=100, description="Search text in title or abstract"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    pageSize: int = Query(20, ge=1, le=100, description="Page size (max 100)"),
):
    """
    Returns a paginated list of papers with search filters, author details, keywords, and review statistics.
    """
    return paper_service.list_papers(
        status_filter=status,
        conf_id=confId,
        q=q,
        page=page,
        page_size=pageSize,
    )


@router.get("/{id}")
def get_paper_endpoint(
    id: int = Path(..., ge=1, description="Paper ID"),
):
    """
    Returns complete details of a paper: authors, keywords, conference, track, assignments, and reviews.
    """
    return paper_service.get_paper(paper_id=id)


@router.patch("/{id}")
def update_paper_endpoint(
    id: int = Path(..., ge=1, description="Paper ID"),
    payload: PaperUpdate = ...,
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
):
    """
    Updates a paper's title, abstract, or status.
    Modifying paper status requires valid X-Admin-Token header.
    """
    if payload.status is not None:
        verify_admin_token(x_admin_token)
    return paper_service.update_paper(paper_id=id, payload=payload)


@router.delete("/{id}")
def delete_paper_endpoint(
    id: int = Path(..., ge=1, description="Paper ID"),
    confirm: Optional[bool] = Query(None, description="Confirmation flag in query parameter"),
    payload: Optional[PaperDeleteConfirm] = None,
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
):
    """
    Permanently deletes a paper and its private presentation node (DETACH DELETE).
    Requires explicit confirm: true (via query parameter or JSON body) and valid X-Admin-Token.
    """
    verify_admin_token(x_admin_token)
    is_confirmed = False
    if confirm is not None:
        is_confirmed = confirm
    elif payload is not None:
        is_confirmed = payload.confirm
    return paper_service.delete_paper(paper_id=id, confirm=is_confirmed)


@router.post("/{id}/assignments")
def assign_reviewer_endpoint(
    id: int = Path(..., ge=1, description="Paper ID"),
    payload: AssignmentCreate = ...,
):
    """
    Assigns a reviewer to a paper.
    Enforces the graph-native conflict-of-interest rule (SAME_PERSON_AS traversal + email match).
    If in conflict, returns HTTP 409 with the full conflict path.
    If clear, creates ASSIGNED_TO and moves 'Submitted' papers to 'Under Review'.
    """
    return review_service.assign_reviewer(paper_id=id, reviewer_id=payload.reviewerId)


@router.post("/{id}/reviews", status_code=status.HTTP_201_CREATED)
def submit_review_endpoint(
    id: int = Path(..., ge=1, description="Paper ID"),
    payload: ReviewCreate = ...,
):
    """
    Submits a review for an assigned paper.
    Requires existing ASSIGNED_TO and rejects duplicate reviews.
    Replicates the Oracle trigger trg_flag_paper: if score >= 9 and status != 'Rejected', sets status to 'Accepted'.
    Runs in a single atomic transaction.
    """
    return review_service.create_review(paper_id=id, payload=payload)
