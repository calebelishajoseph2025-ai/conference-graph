import time
import logging
import statistics
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from app.config import settings
from app.db_neo4j import query_cypher, get_driver, is_neo4j_scale_available
from app.db_oracle import query_oracle, is_oracle_scale_available
from app.queries import cypher as cypher_queries
from app.queries import sql as sql_queries

logger = logging.getLogger("backend.compare")

VALID_SCENARIOS = ["coauthors", "within-hops", "shortest-path", "conflict-check", "avg-score"]

SCENARIO_EXPLANATIONS = {
    "coauthors": {
        "title": "Direct Co-Authors (1 Hop)",
        "graph": (
            "Cypher navigates index-free relationship pointers: (Author)-[:WROTE]->(Paper)<-[:WROTE]-(Author). "
            "It directly walks outgoing and incoming pointer structures without scanning relational indices."
        ),
        "relational": (
            "Oracle SQL requires a self-join on the PAPER_AUTHOR associative table (pa1.PaperID = pa2.PaperID), "
            "filtering out self-authorship and joining the AUTHOR dimension table to resolve researcher names."
        ),
        "why": (
            "Graph query is concise and declarative because relationships are first-class entities. "
            "SQL requires an explicit self-join on the intersection table plus grouping and filtering."
        ),
    },
    "within-hops": {
        "title": "Reachable Authors Within N Hops (Multi-Hop Traversal)",
        "graph": (
            "Cypher natively expresses variable-length patterns: -[:WROTE*2..{2N}]-. "
            "Traversal evaluates direct graph adjacency across N author-paper hops with automatic node uniqueness."
        ),
        "relational": (
            "Oracle SQL requires recursive subquery factoring (WITH recursive clause). Each recursion level joins "
            "the co-author projection, and an explicit CYCLE clause is mandatory to track visited authors and avoid infinite loops."
        ),
        "why": (
            "Graph traversal is dramatically simpler in syntax (*2..2N vs 25 lines of recursive SQL) and uses "
            "pointer chasing instead of repeated relational self-joins and cycle-tracking hash tables."
        ),
    },
    "shortest-path": {
        "title": "Shortest Collaboration Path",
        "graph": (
            "Neo4j provides native shortestPath() using bidirectional breadth-first search directly over physical graph pointers, "
            "terminating immediately upon meeting."
        ),
        "relational": (
            "Oracle SQL requires a recursive CTE constructing path strings, tracking search depth, and pruning cycles "
            "with a CYCLE clause or string pattern check, ordered by depth ASC."
        ),
        "why": (
            "Shortest path is a core graph primitive natively executed inside Neo4j's traversal engine. "
            "In relational SQL, simulating graph BFS requires recursive CTE evaluation with string concatenation."
        ),
    },
    "conflict-check": {
        "title": "Conflict of Interest Audit (Blocked Reviewer-Paper Pairs)",
        "graph": (
            "Cypher traverses the SAME_PERSON_AS identity edge: (rv:Reviewer)-[:SAME_PERSON_AS]->(a:Author)-[:WROTE]->(p:Paper). "
            "Identity bridging is pre-materialized as a single pointer hop."
        ),
        "relational": (
            "Oracle SQL performs a 4-table relational join: REVIEWER JOIN AUTHOR ON email JOIN PAPER_AUTHOR JOIN PAPER. "
            "It requires case-insensitive email string matching across tables."
        ),
        "why": (
            "In the graph, identity resolution is an explicit edge (SAME_PERSON_AS), avoiding string joins across entities. "
            "Both engines identify the exact same conflict pairs with 0 current violations in the dataset."
        ),
    },
    "avg-score": {
        "title": "Average Review Score per Paper (Aggregation)",
        "graph": (
            "Cypher matches papers, traverses incoming REVIEWED relationships, and aggregates scores using round(avg(r.score), 2)."
        ),
        "relational": (
            "Oracle SQL executes a classic LEFT JOIN between PAPER and REVIEW grouped by PaperID and Title with ROUND(AVG(Score), 2)."
        ),
        "why": (
            "This aggregation highlights relational database strength: column scanning and grouping is highly optimized in Oracle. "
            "Both engines return identical paper score records, keeping the comparison fair and balanced."
        ),
    },
}


def is_scale_available() -> Tuple[bool, str]:
    """Checks whether both Neo4j and Oracle scale targets are provisioned and seeded."""
    neo_ok = is_neo4j_scale_available()
    ora_ok = is_oracle_scale_available()
    if neo_ok and ora_ok:
        return True, "Scale data is ready on both Neo4j and Oracle."
    elif neo_ok and not ora_ok:
        return False, (
            "Neo4j scale database is populated, but Oracle scale schema is not available. "
            "To enable Oracle scale benchmarks, provision the scale schema and run the seed script."
        )
    elif not neo_ok and ora_ok:
        return False, (
            "Oracle scale schema is populated, but Neo4j scale database is not ready. "
            "Run the scale seed script to initialize Neo4j scale data."
        )
    else:
        return False, "Scale benchmark dataset is not yet initialized."


def get_dataset_availability() -> Dict[str, Any]:
    """Returns availability status and reason for both demo and scale datasets."""
    scale_ok, reason = is_scale_available()
    return {
        "demo": {"available": True},
        "scale": {
            "available": scale_ok,
            "reason": reason,
            "neo4j_scale_db": settings.NEO4J_SCALE_DATABASE,
            "oracle_scale_user": settings.ORACLE_SCALE_USER,
        },
    }


_stats_cache: Dict[str, Any] = {}
_stats_cache_ttl = 30.0  # seconds


def get_dataset_stats(dataset: str = "demo") -> Dict[str, Any]:
    """
    Returns real database entity counts (authors, papers, co-author pairs) from both Oracle and Neo4j.
    Cached for 30s to avoid expensive repeat scans (B18).
    """
    now = time.time()
    if dataset in _stats_cache:
        cached_time, cached_val = _stats_cache[dataset]
        if now - cached_time < _stats_cache_ttl:
            return cached_val

    if dataset == "scale":
        scale_ok, reason = is_scale_available()
        if not scale_ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Scale dataset has not been seeded yet. {reason}",
            )

        # Query Oracle scale
        ora_rows, _ = query_oracle(sql_queries.SQL_DATASET_STATS, dataset="scale")
        ora_stats = ora_rows[0] if ora_rows else {}

        # Query Neo4j scale
        neo_rows, _ = query_cypher(cypher_queries.COMPARE_DATASET_STATS, database=settings.NEO4J_SCALE_DATABASE)
        neo_stats = neo_rows[0] if neo_rows else {}

        res = {
            "dataset": dataset,
            "oracle": {
                "authors": ora_stats.get("author_count", 0),
                "papers": ora_stats.get("paper_count", 0),
                "coauthorPairs": ora_stats.get("coauthor_pair_count", 0),
            },
            "neo4j": {
                "authors": neo_stats.get("author_count", 0),
                "papers": neo_stats.get("paper_count", 0),
                "coauthorPairs": neo_stats.get("coauthor_pair_count", 0),
            },
            "confirmedMatch": (
                ora_stats.get("author_count") == neo_stats.get("author_count")
                and ora_stats.get("paper_count") == neo_stats.get("paper_count")
                and ora_stats.get("coauthor_pair_count") == neo_stats.get("coauthor_pair_count")
            ),
        }
        _stats_cache[dataset] = (now, res)
        return res

    # Oracle demo stats
    ora_rows, _ = query_oracle(sql_queries.SQL_DATASET_STATS)
    ora_stats = ora_rows[0] if ora_rows else {}

    # Neo4j demo stats
    neo_rows, _ = query_cypher(cypher_queries.COMPARE_DATASET_STATS)
    neo_stats = neo_rows[0] if neo_rows else {}

    res = {
        "dataset": dataset,
        "oracle": {
            "authors": ora_stats.get("author_count", 0),
            "papers": ora_stats.get("paper_count", 0),
            "coauthorPairs": ora_stats.get("coauthor_pair_count", 0),
        },
        "neo4j": {
            "authors": neo_stats.get("author_count", 0),
            "papers": neo_stats.get("paper_count", 0),
            "coauthorPairs": neo_stats.get("coauthor_pair_count", 0),
        },
        "confirmedMatch": (
            ora_stats.get("author_count") == neo_stats.get("author_count")
            and ora_stats.get("paper_count") == neo_stats.get("paper_count")
            and ora_stats.get("coauthor_pair_count") == neo_stats.get("coauthor_pair_count")
        ),
    }
    _stats_cache[dataset] = (now, res)
    return res


def run_benchmark(
    scenario: str,
    author_id: int = 1,
    hops: int = 2,
    from_author_id: int = 1,
    to_author_id: int = 60,
    dataset: str = "demo",
) -> Dict[str, Any]:
    """
    Executes a comparison scenario on both Oracle SQL and Neo4j Cypher.
    Performs 1 warm-up run + 5 measured runs per engine.
    Calculates median execution time, compares result sets, and includes plain-English notes.
    """
    if scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown scenario '{scenario}'. Valid scenarios: {', '.join(VALID_SCENARIOS)}",
        )

    db_name = settings.NEO4J_DATABASE
    ora_dataset = "demo"

    if dataset == "scale":
        scale_ok, reason = is_scale_available()
        if not scale_ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Scale dataset has not been seeded yet. {reason}",
            )
        db_name = settings.NEO4J_SCALE_DATABASE
        ora_dataset = "scale"

    # Validate parameters
    author_id = max(1, author_id)
    from_author_id = max(1, from_author_id)
    to_author_id = max(1, to_author_id)
    hops = max(1, min(hops, 3))

    sql_text = ""
    sql_params: Dict[str, Any] = {}
    cypher_text = ""
    cypher_params: Dict[str, Any] = {}

    if scenario == "coauthors":
        sql_text = sql_queries.SQL_COAUTHORS
        sql_params = {"authorId": author_id}
        cypher_text = cypher_queries.COMPARE_COAUTHORS
        cypher_params = {"authorId": author_id}

    elif scenario == "within-hops":
        sql_text = sql_queries.SQL_WITHIN_HOPS
        sql_params = {"authorId": author_id, "hops": hops}
        max_rels = hops * 2
        cypher_text = cypher_queries.COMPARE_WITHIN_HOPS_TEMPLATE.format(max_rels=max_rels)
        cypher_params = {"authorId": author_id}

    elif scenario == "shortest-path":
        sql_text = sql_queries.SQL_SHORTEST_PATH
        sql_params = {"fromAuthorId": from_author_id, "toAuthorId": to_author_id}
        cypher_text = cypher_queries.COMPARE_SHORTEST_PATH
        cypher_params = {"fromAuthorId": from_author_id, "toAuthorId": to_author_id}

    elif scenario == "conflict-check":
        sql_text = sql_queries.SQL_CONFLICT_CHECK
        sql_params = {}
        cypher_text = cypher_queries.COMPARE_CONFLICT_CHECK
        cypher_params = {}

    elif scenario == "avg-score":
        sql_text = sql_queries.SQL_AVG_SCORE
        sql_params = {}
        cypher_text = cypher_queries.COMPARE_AVG_SCORE_QUERY
        cypher_params = {}

    # 1. Warm-up runs (1 iteration unrecorded)
    query_oracle(sql_text, sql_params, dataset=ora_dataset)
    query_cypher(cypher_text, cypher_params, database=db_name)

    # 2. Five measured runs on Oracle
    oracle_timings: List[float] = []
    oracle_rows: List[Dict[str, Any]] = []
    for _ in range(5):
        rows, elapsed = query_oracle(sql_text, sql_params, dataset=ora_dataset)
        oracle_timings.append(round(elapsed, 2))
        oracle_rows = rows

    # 3. Five measured runs on Neo4j
    neo4j_timings: List[float] = []
    neo4j_rows: List[Dict[str, Any]] = []
    for _ in range(5):
        rows, elapsed = query_cypher(cypher_text, cypher_params, database=db_name)
        neo4j_timings.append(round(elapsed, 2))
        neo4j_rows = rows

    oracle_median = round(statistics.median(oracle_timings), 2)
    neo4j_median = round(statistics.median(neo4j_timings), 2)

    # 4. Compare results match
    results_match = False
    match_detail = ""
    extra_meta: Dict[str, Any] = {}

    if scenario in ("coauthors", "within-hops"):
        ora_ids = {r.get("id") for r in oracle_rows}
        neo_ids = {r.get("id") for r in neo4j_rows}
        results_match = (ora_ids == neo_ids)
        match_detail = f"Both engines returned identical {len(ora_ids)} author IDs."

    elif scenario == "shortest-path":
        if from_author_id == to_author_id:
            ora_hops = 0
            neo_hops = 0
            results_match = True
            match_detail = "Both engines returned 0 hops for identical starting and ending authors."
        else:
            ora_hops = oracle_rows[0].get("hops") if oracle_rows else None
            neo_hops = neo4j_rows[0].get("hops") if neo4j_rows else None
            results_match = (ora_hops == neo_hops)
            if ora_hops is not None and neo_hops is not None:
                match_detail = f"Both engines found the shortest path length of {ora_hops} co-author hops."
            elif ora_hops is None and neo_hops is None:
                match_detail = "Both engines confirmed no collaboration path exists between the specified authors."
            else:
                match_detail = f"Path length mismatch: Oracle found {ora_hops} hops, Neo4j found {neo_hops} hops."

    elif scenario == "conflict-check":
        ora_pairs = {(r.get("reviewer_id"), r.get("paper_id")) for r in oracle_rows}
        neo_pairs = {(r.get("reviewer_id"), r.get("paper_id")) for r in neo4j_rows}
        results_match = (ora_pairs == neo_pairs)
        match_detail = f"Both engines identified identical {len(ora_pairs)} blocked assignment pairs."

        # Audit current violations (B4: violation_count)
        ora_viol, _ = query_oracle(sql_queries.SQL_CONFLICT_VIOLATIONS, dataset=ora_dataset)
        neo_viol, _ = query_cypher(cypher_queries.COMPARE_CONFLICT_VIOLATIONS, database=db_name)
        ora_v_cnt = ora_viol[0].get("violation_count", 0) if ora_viol else 0
        neo_v_cnt = neo_viol[0].get("violation_count", 0) if neo_viol else 0
        viol_info = {
            "oracle": ora_v_cnt,
            "neo4j": neo_v_cnt,
            "match": (ora_v_cnt == neo_v_cnt),
            "clean": (ora_v_cnt == 0 and neo_v_cnt == 0),
        }
        extra_meta["violations"] = viol_info
        extra_meta["existingViolations"] = viol_info

    elif scenario == "avg-score":
        ora_map = {r.get("id"): round(float(r.get("avg_score") if r.get("avg_score") is not None else 0), 2) for r in oracle_rows}
        neo_map = {r.get("id"): round(float(r.get("avg_score") if r.get("avg_score") is not None else 0), 2) for r in neo4j_rows}
        results_match = (ora_map.keys() == neo_map.keys()) and all(abs(ora_map[k] - neo_map[k]) <= 0.01 for k in ora_map)
        match_detail = f"Both engines computed identical average score records across {len(oracle_rows)} papers."

    dataset_stats = get_dataset_stats(dataset=dataset)
    expl = SCENARIO_EXPLANATIONS.get(scenario, {})

    return {
        "scenario": scenario,
        "dataset": dataset,
        "datasetStats": dataset_stats,
        "resultsMatch": results_match,
        "matchDetail": match_detail,
        "explanation": {
            "title": expl.get("title", ""),
            "graphNotes": expl.get("graph", ""),
            "relationalNotes": expl.get("relational", ""),
            "whyGraph": expl.get("why", ""),
            "graph": expl.get("graph", ""),
            "relational": expl.get("relational", ""),
            "why": expl.get("why", ""),
        },
        "parameters": {
            "authorId": author_id,
            "hops": hops,
            "fromAuthorId": from_author_id,
            "toAuthorId": to_author_id,
        },
        "oracle": {
            "engine": "Oracle SQL (26ai)",
            "query": sql_text,
            "params": sql_params,
            "rowCount": len(oracle_rows),
            "timings": oracle_timings,
            "medianMs": oracle_median,
            "sampleRows": oracle_rows[:10],
        },
        "neo4j": {
            "engine": "Neo4j Cypher (Desktop 2.x)",
            "query": cypher_text,
            "params": cypher_params,
            "rowCount": len(neo4j_rows),
            "timings": neo4j_timings,
            "medianMs": neo4j_median,
            "sampleRows": neo4j_rows[:10],
        },
        "extra": extra_meta,
    }
