import time
import logging
from typing import Any, Dict
from fastapi import HTTPException, status
from app.db_neo4j import query_cypher
from app.queries import cypher as cypher_queries

logger = logging.getLogger("backend.recommend_service")

# Scoring Formula Constants (Documented here as required by Section 5.3)
KEYWORD_MATCH_WEIGHT = 3.0
EXACT_EXPERTISE_WEIGHT = 5.0
PARTIAL_EXPERTISE_WEIGHT = 3.0
WORKLOAD_PENALTY_WEIGHT = 1.0


def get_recommended_reviewers(paper_id: int, limit: int = 5) -> Dict[str, Any]:
    """
    Ranks potential reviewers for a target paper based on:
      (a) Shared keywords with papers they have previously reviewed (+3.0 per keyword)
      (b) Reviewer expertise matching the paper's Track name (+5.0 exact, +3.0 partial)
      (c) Workload penalty based on active assignments (-1.0 per assignment)
    Excludes reviewers who already have an assignment or have a conflict of interest
    (identity link via SAME_PERSON_AS or matching email).
    """
    start = time.perf_counter()

    # Check paper exists
    p_check, _ = query_cypher("MATCH (p:Paper {paperId: $pid}) RETURN p", {"pid": paper_id})
    if not p_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper ID {paper_id} not found.",
        )

    params = {"paperId": paper_id, "limit": limit}
    records, elapsed_ms = query_cypher(cypher_queries.RECOMMEND_REVIEWERS, params)

    explanation = {
        "formula": (
            f"Total Score = (Shared Keywords * {KEYWORD_MATCH_WEIGHT}) + "
            f"Expertise Score (Exact: {EXACT_EXPERTISE_WEIGHT}, Partial: {PARTIAL_EXPERTISE_WEIGHT}) - "
            f"(Workload * {WORKLOAD_PENALTY_WEIGHT})"
        ),
        "weights": {
            "keyword_weight": KEYWORD_MATCH_WEIGHT,
            "exact_expertise_weight": EXACT_EXPERTISE_WEIGHT,
            "partial_expertise_weight": PARTIAL_EXPERTISE_WEIGHT,
            "workload_penalty_weight": WORKLOAD_PENALTY_WEIGHT,
        },
        "exclusions": "Excluded reviewers with existing assignment to this paper or conflict of interest (co-author).",
    }

    return {
        "data": {
            "paperId": paper_id,
            "recommendations": records,
            "scoring_model": explanation,
        },
        "meta": {
            "engine": "neo4j",
            "query": cypher_queries.RECOMMEND_REVIEWERS.strip(),
            "params": params,
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }
