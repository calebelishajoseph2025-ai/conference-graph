import time
import logging
from typing import Any, Dict, List
from app.config import settings
from app.db_neo4j import get_driver
from app.db_oracle import get_oracle_connection

logger = logging.getLogger("backend.parity")


def get_parity_comparison() -> Dict[str, Any]:
    """
    Compares entity counts, status breakdown, and review metrics between Neo4j and Oracle.
    Counts must match exactly; average scores within a tolerance of 0.01.
    """
    start = time.perf_counter()
    driver = get_driver()
    neo_counts: Dict[str, Any] = {}
    neo_status: Dict[str, int] = {}
    neo_review_stats: Dict[str, Any] = {}

    # Query Neo4j
    neo_start = time.perf_counter()
    with driver.session(database=settings.NEO4J_DATABASE) as session:
        # Node counts
        neo_counts["Conference"] = session.run("MATCH (n:Conference) RETURN count(n) AS c").single()["c"]
        neo_counts["Track"] = session.run("MATCH (n:Track) RETURN count(n) AS c").single()["c"]
        neo_counts["Session"] = session.run("MATCH (n:Session) RETURN count(n) AS c").single()["c"]
        neo_counts["Author"] = session.run("MATCH (n:Author) RETURN count(n) AS c").single()["c"]
        neo_counts["Reviewer"] = session.run("MATCH (n:Reviewer) RETURN count(n) AS c").single()["c"]
        neo_counts["Paper"] = session.run("MATCH (n:Paper) RETURN count(n) AS c").single()["c"]
        neo_counts["Keyword"] = session.run("MATCH (n:Keyword) RETURN count(n) AS c").single()["c"]
        neo_counts["Presentation"] = session.run("MATCH (n:Presentation) RETURN count(n) AS c").single()["c"]

        # Relationship counts
        neo_counts["Paper_Author (WROTE)"] = session.run("MATCH ()-[r:WROTE]->() RETURN count(r) AS c").single()["c"]
        neo_counts["Paper_Reviewer (ASSIGNED_TO)"] = session.run("MATCH ()-[r:ASSIGNED_TO]->() RETURN count(r) AS c").single()["c"]
        neo_counts["Review (REVIEWED)"] = session.run("MATCH ()-[r:REVIEWED]->() RETURN count(r) AS c").single()["c"]
        neo_counts["Paper_Keyword (HAS_KEYWORD)"] = session.run("MATCH ()-[r:HAS_KEYWORD]->() RETURN count(r) AS c").single()["c"]
        neo_counts["Submission (SUBMITTED)"] = session.run("MATCH ()-[r:SUBMITTED]->() RETURN count(r) AS c").single()["c"]
        neo_counts["Identity (SAME_PERSON_AS)"] = session.run("MATCH ()-[r:SAME_PERSON_AS]->() RETURN count(r) AS c").single()["c"]

        # Paper status breakdown
        status_res = session.run("MATCH (p:Paper) RETURN p.status AS status, count(p) AS c")
        for rec in status_res:
            neo_status[rec["status"]] = rec["c"]

        # Review stats
        rev_res = session.run("MATCH ()-[r:REVIEWED]->() RETURN count(r) AS cnt, avg(r.score) AS avg_s").single()
        neo_review_stats["count"] = rev_res["cnt"]
        neo_review_stats["avg_score"] = float(rev_res["avg_s"]) if rev_res["avg_s"] is not None else 0.0

    neo_elapsed_ms = (time.perf_counter() - neo_start) * 1000.0

    # Query Oracle
    ora_counts: Dict[str, Any] = {}
    ora_status: Dict[str, int] = {}
    ora_review_stats: Dict[str, Any] = {}

    ora_start = time.perf_counter()
    with get_oracle_connection() as conn:
        with conn.cursor() as cursor:
            # Table counts
            cursor.execute("SELECT COUNT(*) FROM conference")
            ora_counts["Conference"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM track")
            ora_counts["Track"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM session_tbl")
            ora_counts["Session"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM author")
            ora_counts["Author"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM reviewer")
            ora_counts["Reviewer"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM paper")
            ora_counts["Paper"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM keyword")
            ora_counts["Keyword"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM presentation")
            ora_counts["Presentation"] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM paper_author")
            ora_counts["Paper_Author (WROTE)"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM paper_reviewer")
            ora_counts["Paper_Reviewer (ASSIGNED_TO)"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM review")
            ora_counts["Review (REVIEWED)"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM paper_keyword")
            ora_counts["Paper_Keyword (HAS_KEYWORD)"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM submission")
            ora_counts["Submission (SUBMITTED)"] = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM reviewer rv JOIN author a ON rv.email = a.email")
            ora_counts["Identity (SAME_PERSON_AS)"] = cursor.fetchone()[0]

            cursor.execute("SELECT status, COUNT(*) FROM paper GROUP BY status")
            for row in cursor.fetchall():
                ora_status[row[0]] = row[1]

            cursor.execute("SELECT COUNT(*), AVG(score) FROM review")
            rev_row = cursor.fetchone()
            ora_review_stats["count"] = rev_row[0]
            ora_review_stats["avg_score"] = float(rev_row[1]) if rev_row[1] is not None else 0.0

    ora_elapsed_ms = (time.perf_counter() - ora_start) * 1000.0

    # Build comparison rows
    rows: List[Dict[str, Any]] = []

    # Entity counts
    for item in [
        "Conference",
        "Track",
        "Session",
        "Author",
        "Reviewer",
        "Paper",
        "Keyword",
        "Presentation",
        "Paper_Author (WROTE)",
        "Paper_Reviewer (ASSIGNED_TO)",
        "Review (REVIEWED)",
        "Paper_Keyword (HAS_KEYWORD)",
        "Submission (SUBMITTED)",
        "Identity (SAME_PERSON_AS)",
    ]:
        n_val = neo_counts.get(item, 0)
        o_val = ora_counts.get(item, 0)
        match = (n_val == o_val)
        diff = n_val - o_val
        category = "Nodes" if "(" not in item else "Relationships"
        rows.append({
            "category": category,
            "entity": item,
            "neo4j": n_val,
            "oracle": o_val,
            "difference": diff,
            "match": match,
        })

    # Status breakdown
    all_statuses = sorted([s for s in set(list(neo_status.keys()) + list(ora_status.keys())) if s is not None])
    for st in all_statuses:
        n_val = neo_status.get(st, 0)
        o_val = ora_status.get(st, 0)
        match = (n_val == o_val)
        rows.append({
            "category": "Paper Status",
            "entity": f"Status: {st}",
            "neo4j": n_val,
            "oracle": o_val,
            "difference": n_val - o_val,
            "match": match,
        })

    # Review Metrics
    # Count
    rev_count_match = (neo_review_stats["count"] == ora_review_stats["count"])
    rows.append({
        "category": "Review Metrics",
        "entity": "Review Count",
        "neo4j": neo_review_stats["count"],
        "oracle": ora_review_stats["count"],
        "difference": neo_review_stats["count"] - ora_review_stats["count"],
        "match": rev_count_match,
    })

    # Average score with 0.01 tolerance
    n_avg = round(neo_review_stats["avg_score"], 2)
    o_avg = round(ora_review_stats["avg_score"], 2)
    score_diff = abs(n_avg - o_avg)
    score_match = (score_diff <= 0.01)
    rows.append({
        "category": "Review Metrics",
        "entity": "Average Review Score",
        "neo4j": n_avg,
        "oracle": o_avg,
        "difference": round(score_diff, 4),
        "match": score_match,
    })

    overall_match = all(r["match"] for r in rows)
    total_elapsed_ms = (time.perf_counter() - start) * 1000.0

    return {
        "overall_match": overall_match,
        "summary": {
            "total_checks": len(rows),
            "matched_checks": sum(1 for r in rows if r["match"]),
            "unmatched_checks": sum(1 for r in rows if not r["match"]),
        },
        "rows": rows,
        "note": "Differences after demo writes are expected. Running database reload restores the baseline.",
        "meta": {
            "engine": "both",
            "neo4j_elapsed_ms": round(neo_elapsed_ms, 2),
            "oracle_elapsed_ms": round(ora_elapsed_ms, 2),
            "elapsed_ms": round(total_elapsed_ms, 2),
        },
    }
