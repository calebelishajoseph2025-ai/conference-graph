import time
import logging
from datetime import date
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from app.config import settings
from app.db_neo4j import get_driver, query_cypher
from app.queries import cypher as cypher_queries
from app.schemas import ReviewCreate

logger = logging.getLogger("backend.review_service")


def check_conflict_of_interest(paper_id: int, reviewer_id: int) -> Optional[Dict[str, Any]]:
    """
    Checks if a reviewer is in conflict of interest with any author of the paper.
    Traverses (rv)-[:SAME_PERSON_AS]->(a)-[:WROTE]->(p), with a fallback email match check.
    Returns None if no conflict, or a structured conflict payload if detected.
    Uses unified Type:id format matching graph serialization (B13).
    """
    params = {"paperId": paper_id, "reviewerId": reviewer_id}
    records, _ = query_cypher(cypher_queries.CHECK_COI_TRAVERSAL, params)
    if not records:
        return None

    row = records[0]
    rv = row.get("rv")
    p = row.get("p")
    a1 = row.get("a1")
    a2 = row.get("a2")

    # Conflict exists if a1 (via SAME_PERSON_AS) or a2 (via email match) is present
    conflicting_author = a1 or a2
    if not conflicting_author:
        return None

    edge_type = "SAME_PERSON_AS" if a1 is not None else "EMAIL_MATCH"
    author_id = conflicting_author["authorId"]

    # Unified Node ID format Type:id (B13)
    reviewer_node_id = f"Reviewer:{reviewer_id}"
    author_node_id = f"Author:{author_id}"
    paper_node_id = f"Paper:{paper_id}"

    conflict_nodes = [
        {
            "id": reviewer_node_id,
            "label": rv["name"],
            "type": "Reviewer",
            "props": {k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in rv.items()},
        },
        {
            "id": author_node_id,
            "label": conflicting_author["name"],
            "type": "Author",
            "props": {k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in conflicting_author.items()},
        },
        {
            "id": paper_node_id,
            "label": p["title"],
            "type": "Paper",
            "props": {k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in p.items()},
        },
    ]

    conflict_edges = [
        {
            "id": f"e_{edge_type.lower()}_{reviewer_id}_{author_id}",
            "source": reviewer_node_id,
            "target": author_node_id,
            "type": edge_type,
            "props": {"reason": f"Identity match: {rv['email']}"},
        },
        {
            "id": f"e_wrote_{author_id}_{paper_id}",
            "source": author_node_id,
            "target": paper_node_id,
            "type": "WROTE",
            "props": {},
        },
    ]

    return {
        "error": "CONFLICT_OF_INTEREST",
        "explanation": (
            f"Reviewer '{rv['name']}' ({rv['email']}) is an author of Paper {paper_id} "
            f"(identity match with author '{conflicting_author['name']}')."
        ),
        "path": {
            "nodes": conflict_nodes,
            "edges": conflict_edges,
        },
    }


def assign_reviewer(paper_id: int, reviewer_id: int) -> Dict[str, Any]:
    """
    Assigns a reviewer to a paper after verifying no conflict of interest.
    If paper status is 'Submitted', automatically updates it to 'Under Review'.
    Executes in a single atomic write transaction with concurrency guard (B8).
    """
    start = time.perf_counter()
    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    assigned_date = date.today().isoformat()

    # Verify paper and reviewer exist
    with driver.session(database=db_name) as session:
        p_check = session.run("MATCH (p:Paper {paperId: $pid}) RETURN p", pid=paper_id).single()
        if not p_check:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Paper ID {paper_id} not found.")

        rv_check = session.run("MATCH (rv:Reviewer {reviewerId: $rid}) RETURN rv", rid=reviewer_id).single()
        if not rv_check:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reviewer ID {reviewer_id} not found.")

    # Enforce graph-native Conflict of Interest check (Rule 24, Section 5.2)
    coi = check_conflict_of_interest(paper_id, reviewer_id)
    if coi:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=coi,
        )

    # Atomic write transaction with duplicate assignment check inside transaction (B8)
    def _assign_tx(tx):
        chk = tx.run(
            """
            MATCH (rv:Reviewer {reviewerId: $rid})
            MATCH (p:Paper {paperId: $pid})
            OPTIONAL MATCH (rv)-[ass:ASSIGNED_TO]->(p)
            RETURN ass IS NOT NULL AS isAssigned
            """,
            rid=reviewer_id,
            pid=paper_id,
        ).single()
        if chk and chk["isAssigned"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reviewer ID {reviewer_id} is already assigned to Paper ID {paper_id}.",
            )

        result = tx.run(
            cypher_queries.CREATE_ASSIGNMENT_TX,
            reviewerId=reviewer_id,
            paperId=paper_id,
            assignedDate=assigned_date,
        ).single()
        return dict(result) if result else {}

    with driver.session(database=db_name) as session:
        assignment_info = session.execute_write(_assign_tx)

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    return {
        "data": assignment_info,
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.CREATE_ASSIGNMENT_TX.strip(),
            "params": {"reviewerId": reviewer_id, "paperId": paper_id, "assignedDate": assigned_date},
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }


def create_review(paper_id: int, payload: ReviewCreate) -> Dict[str, Any]:
    """
    Submits a review for an assigned reviewer.
    Rejects duplicate reviews and unassigned reviewers inside an atomic transaction (B8).
    Replicates Oracle trigger trg_flag_paper: if score >= 9 and status != 'Rejected', sets status to 'Accepted'.
    """
    start = time.perf_counter()
    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    rev_date = date.today().isoformat()
    reviewer_id = payload.reviewerId

    # Validate paper exists
    with driver.session(database=db_name) as session:
        p_check = session.run("MATCH (p:Paper {paperId: $pid}) RETURN p.status AS status", pid=paper_id).single()
        if not p_check:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Paper ID {paper_id} not found.")

    # Atomic write transaction: verify assignment and duplicate check INSIDE transaction (B8)
    def _review_tx(tx):
        chk = tx.run(
            """
            MATCH (rv:Reviewer {reviewerId: $rid})
            MATCH (p:Paper {paperId: $pid})
            OPTIONAL MATCH (rv)-[ass:ASSIGNED_TO]->(p)
            OPTIONAL MATCH (rv)-[rev:REVIEWED]->(p)
            RETURN ass IS NOT NULL AS isAssigned, rev IS NOT NULL AS hasReviewed
            """,
            rid=reviewer_id,
            pid=paper_id,
        ).single()
        if not chk or not chk["isAssigned"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reviewer ID {reviewer_id} is not assigned to Paper ID {paper_id}.",
            )
        if chk["hasReviewed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reviewer ID {reviewer_id} has already submitted a review for Paper ID {paper_id}.",
            )

        # Fetch next review ID atomically
        id_res = tx.run(cypher_queries.GET_NEXT_REVIEW_ID).single()
        next_review_id = id_res["nextReviewId"] if id_res else 1

        params = {
            "reviewId": next_review_id,
            "reviewerId": reviewer_id,
            "paperId": paper_id,
            "score": payload.score,
            "comments": payload.comments,
            "recommendation": payload.recommendation,
            "reviewDate": rev_date,
        }

        result = tx.run(cypher_queries.CREATE_REVIEW_TX, parameters=params).single()
        return dict(result) if result else {}

    with driver.session(database=db_name) as session:
        review_info = session.execute_write(_review_tx)

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    return {
        "data": review_info,
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.CREATE_REVIEW_TX.strip(),
            "params": {
                "reviewerId": reviewer_id,
                "paperId": paper_id,
                "score": payload.score,
                "recommendation": payload.recommendation,
            },
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }
