import csv
import os
import time
import logging
from typing import Any, Dict, List
from fastapi import HTTPException, status
from app.config import settings
from app.db_neo4j import query_cypher
from app.queries import cypher as cypher_queries

logger = logging.getLogger("backend.profile_service")


def get_author_profile(author_id: int) -> Dict[str, Any]:
    """
    Retrieves an author's complete profile, written papers, co-authors, and reviewer cross-link.
    """
    params = {"authorId": author_id}
    records, elapsed_ms = query_cypher(cypher_queries.GET_AUTHOR_PROFILE, params)
    if not records or not records[0].get("name"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Author ID {author_id} not found.",
        )

    return {
        "data": records[0],
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.GET_AUTHOR_PROFILE.strip(),
            "params": params,
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }


def get_reviewer_profile(reviewer_id: int) -> Dict[str, Any]:
    """
    Retrieves a reviewer's complete profile, assigned papers, review history, and author cross-link.
    """
    params = {"reviewerId": reviewer_id}
    records, elapsed_ms = query_cypher(cypher_queries.GET_REVIEWER_PROFILE, params)
    if not records or not records[0].get("name"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reviewer ID {reviewer_id} not found.",
        )

    return {
        "data": records[0],
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.GET_REVIEWER_PROFILE.strip(),
            "params": params,
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }


def get_coi_pairs() -> Dict[str, Any]:
    """
    Reads the 8 conflict-of-interest test pairs from data/da3_coi_test_pairs.csv
    and enriches each pair with the current paper title, reviewer details, and conflicting author name.
    """
    start = time.perf_counter()
    csv_path = os.path.join(settings.DATA_DIR, "da3_coi_test_pairs.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="COI test pairs file (da3_coi_test_pairs.csv) not found in data directory.",
        )

    raw_pairs: List[Dict[str, int]] = []
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            norm_row = {k.strip().lower(): v.strip() for k, v in row.items() if k and v}
            paper_id_val = norm_row.get("paperid") or norm_row.get("paper_id")
            rev_id_val = norm_row.get("reviewerid") or norm_row.get("reviewer_id")
            if paper_id_val and rev_id_val:
                raw_pairs.append({
                    "paperId": int(paper_id_val),
                    "reviewerId": int(rev_id_val),
                })

    enrich_cypher = """
    MATCH (p:Paper {paperId: $paperId}), (rv:Reviewer {reviewerId: $reviewerId})
    OPTIONAL MATCH (rv)-[:SAME_PERSON_AS]->(a:Author)-[:WROTE]->(p)
    RETURN p.title AS paperTitle, p.status AS paperStatus,
           rv.name AS reviewerName, rv.email AS reviewerEmail, rv.expertise AS reviewerExpertise,
           a.authorId AS conflictingAuthorId, a.name AS conflictingAuthorName
    """

    enriched = []
    for pair in raw_pairs:
        records, _ = query_cypher(enrich_cypher, pair)
        if records:
            rec = records[0]
            enriched.append({
                "paperId": pair["paperId"],
                "reviewerId": pair["reviewerId"],
                "paperTitle": rec.get("paperTitle"),
                "paperStatus": rec.get("paperStatus"),
                "reviewerName": rec.get("reviewerName"),
                "reviewerEmail": rec.get("reviewerEmail"),
                "reviewerExpertise": rec.get("reviewerExpertise"),
                "conflictingAuthorId": rec.get("conflictingAuthorId"),
                "conflictingAuthorName": rec.get("conflictingAuthorName"),
                "reason": f"Reviewer {rec.get('reviewerName')} is author {rec.get('conflictingAuthorName')} on this paper",
            })
        else:
            enriched.append({
                "paperId": pair["paperId"],
                "reviewerId": pair["reviewerId"],
                "paperTitle": None,
                "paperStatus": None,
                "reviewerName": None,
                "reviewerEmail": None,
                "reviewerExpertise": None,
                "conflictingAuthorId": None,
                "conflictingAuthorName": None,
                "reason": "Paper or reviewer not found in database",
            })

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    return {
        "data": {
            "items": enriched,
            "count": len(enriched),
        },
        "meta": {
            "engine": "neo4j",
            "query": enrich_cypher.strip(),
            "params": {"source": "data/da3_coi_test_pairs.csv"},
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }
