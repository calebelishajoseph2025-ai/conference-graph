import time
import logging
from datetime import date
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from app.config import settings
from app.db_neo4j import get_driver, query_cypher
from app.queries import cypher as cypher_queries
from app.schemas import PaperCreate, PaperUpdate

logger = logging.getLogger("backend.paper_service")

VALID_STATUS_TRANSITIONS = {
    "Submitted": {"Under Review", "Rejected"},
    "Under Review": {"Accepted", "Rejected"},
    "Accepted": set(),
    "Rejected": set(),
}


def create_paper(payload: PaperCreate) -> Dict[str, Any]:
    """
    Creates a new Paper in Neo4j within a single atomic write transaction.
    Connects to Conference, Track, Authors, Submission, and Keywords.
    Validates conference-track association, keyword existence, and author existence.
    """
    start = time.perf_counter()
    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    sub_date = date.today().isoformat()

    # Normalize author list
    if payload.authors:
        authors_data = [
            {
                "authorId": a.authorId,
                "authorOrder": a.authorOrder,
                "isCorresponding": a.isCorresponding,
            }
            for a in payload.authors
        ]
        corr_id = payload.correspondingAuthorId
        if not corr_id:
            corr_candidates = [a["authorId"] for a in authors_data if a["isCorresponding"]]
            corr_id = corr_candidates[0] if corr_candidates else authors_data[0]["authorId"]
    else:
        corr_id = payload.correspondingAuthorId or payload.authorIds[0]
        authors_data = [
            {
                "authorId": aid,
                "authorOrder": idx + 1,
                "isCorresponding": (aid == corr_id),
            }
            for idx, aid in enumerate(payload.authorIds)
        ]

    # Validate target conference, track, and conference-track relationship (B8)
    with driver.session(database=db_name) as session:
        conf_check = session.run("MATCH (c:Conference {confId: $cid}) RETURN count(c) AS c", cid=payload.confId).single()
        if not conf_check or conf_check["c"] == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Conference ID {payload.confId} not found.")

        track_check = session.run(
            "MATCH (t:Track {trackId: $tid})-[:PART_OF]->(c:Conference {confId: $cid}) RETURN count(t) AS c",
            tid=payload.trackId,
            cid=payload.confId,
        ).single()
        if not track_check or track_check["c"] == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Track ID {payload.trackId} does not belong to Conference ID {payload.confId}.",
            )

        # Validate authors exist
        for au in authors_data:
            a_check = session.run("MATCH (a:Author {authorId: $aid}) RETURN count(a) AS c", aid=au["authorId"]).single()
            if not a_check or a_check["c"] == 0:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Author ID {au['authorId']} not found.")

        # Validate keywords exist (B8)
        if payload.keywordIds:
            kw_check = session.run(
                "MATCH (k:Keyword) WHERE k.keywordId IN $kids RETURN count(k) AS c",
                kids=payload.keywordIds,
            ).single()
            if not kw_check or kw_check["c"] != len(payload.keywordIds):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more specified keyword IDs do not exist.",
                )

    def _create_tx(tx):
        # Calculate next paperId and submissionId atomically
        p_id_res = tx.run(cypher_queries.GET_NEXT_PAPER_ID).single()
        next_paper_id = p_id_res["nextId"] if p_id_res else 1

        sub_id_res = tx.run(cypher_queries.GET_NEXT_SUBMISSION_ID).single()
        next_sub_id = sub_id_res["nextSubId"] if sub_id_res else 1

        params = {
            "paperId": next_paper_id,
            "title": payload.title,
            "abstract": payload.abstract,
            "confId": payload.confId,
            "trackId": payload.trackId,
            "submissionDate": sub_date,
            "authors": authors_data,
            "correspondingAuthorId": corr_id,
            "submissionId": next_sub_id,
            "keywordIds": payload.keywordIds,
        }

        result = tx.run(cypher_queries.CREATE_PAPER_TX, parameters=params).single()
        return dict(result) if result else {"paperId": next_paper_id, "status": "Submitted"}

    # Execute write transaction
    with driver.session(database=db_name) as session:
        created = session.execute_write(_create_tx)

    # Fetch created paper full details
    full_paper = get_paper(created["paperId"])
    elapsed_ms = (time.perf_counter() - start) * 1000.0

    return {
        "data": full_paper["data"],
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.CREATE_PAPER_TX.strip(),
            "params": {
                "paperId": created["paperId"],
                "title": payload.title,
                "confId": payload.confId,
                "trackId": payload.trackId,
            },
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }


def list_papers(
    status_filter: Optional[str] = None,
    conf_id: Optional[int] = None,
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """
    Retrieves a paginated list of papers with search filters, authors, keywords, and review stats.
    """
    start = time.perf_counter()
    skip = (page - 1) * page_size
    params = {
        "status": status_filter,
        "confId": conf_id,
        "q": q.strip() if q else None,
        "skip": skip,
        "limit": page_size,
    }

    # Total count query
    count_records, _ = query_cypher(cypher_queries.COUNT_PAPERS, params)
    total = count_records[0]["total"] if count_records else 0

    # Paginated items query
    items_records, elapsed_ms = query_cypher(cypher_queries.LIST_PAPERS, params)

    return {
        "data": {
            "items": items_records,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": max(1, (total + page_size - 1) // page_size),
        },
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.LIST_PAPERS.strip(),
            "params": params,
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }


def get_paper(paper_id: int) -> Dict[str, Any]:
    """
    Retrieves complete paper details: authors, keywords, conference, track, assignments, and reviews.
    """
    params = {"paperId": paper_id}
    records, elapsed_ms = query_cypher(cypher_queries.GET_PAPER_DETAILS, params)

    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID {paper_id} does not exist.",
        )

    return {
        "data": records[0],
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.GET_PAPER_DETAILS.strip(),
            "params": params,
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }


def update_paper(paper_id: int, payload: PaperUpdate) -> Dict[str, Any]:
    """
    Updates a paper's title, abstract, or status with status transition validation (B22).
    """
    # Verify paper exists first and check current status
    curr_paper = get_paper(paper_id)["data"]
    curr_status = curr_paper.get("status")

    # Validate status transitions if status is being updated (B22)
    if payload.status and payload.status != curr_status:
        allowed = VALID_STATUS_TRANSITIONS.get(curr_status, set())
        if payload.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{curr_status}' to '{payload.status}'. Allowed transitions: {sorted(list(allowed)) or 'None (terminal status)'}",
            )

    params = {
        "paperId": paper_id,
        "title": payload.title,
        "abstract": payload.abstract,
        "status": payload.status,
    }

    records, elapsed_ms = query_cypher(cypher_queries.UPDATE_PAPER, params)
    updated = records[0] if records else {"paperId": paper_id}

    # Fetch fresh representation
    full_details = get_paper(paper_id)

    return {
        "data": full_details["data"],
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.UPDATE_PAPER.strip(),
            "params": params,
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }


def delete_paper(paper_id: int, confirm: bool) -> Dict[str, Any]:
    """
    Permanently deletes a paper and any dependent presentation using DETACH DELETE.
    Leaves keywords, authors, track, and conference intact.
    Requires explicit confirm=True flag.
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paper deletion requires explicit confirm: true.",
        )

    # Verify paper exists before deleting
    get_paper(paper_id)

    params = {"paperId": paper_id}
    records, elapsed_ms = query_cypher(cypher_queries.DELETE_PAPER, params)

    return {
        "data": {
            "success": True,
            "deletedPaperId": paper_id,
            "message": f"Paper {paper_id} and its associated presentation relationships have been deleted.",
        },
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.DELETE_PAPER.strip(),
            "params": params,
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }
