import time
import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from app.config import settings
from app.db_neo4j import get_driver
from app.queries import cypher as cypher_queries
from app.services.graph_service import serialize_node, serialize_edge

logger = logging.getLogger("backend.analytics")


def get_collab_path(from_author_id: int, to_author_id: int) -> Dict[str, Any]:
    """
    Finds the shortest collaboration path between two authors using shortestPath((a)-[:WROTE*..8]-(b)).
    Returns path as Cytoscape-compatible nodes and edges, hop count, and intermediate papers.
    """
    if from_author_id < 1 or to_author_id < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Author IDs must be positive integers.",
        )

    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    start_time = time.perf_counter()

    with driver.session(database=db_name) as session:
        # 1. Verify existence of fromAuthor
        res_a1 = session.run(cypher_queries.CHECK_AUTHOR_EXISTS, parameters={"authorId": from_author_id}, timeout=10.0)
        rec_a1 = res_a1.single()
        if not rec_a1 or not rec_a1["a"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Author ID {from_author_id} not found.",
            )
        author1 = dict(rec_a1["a"])

        # 2. Verify existence of toAuthor
        if from_author_id == to_author_id:
            author2 = author1
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            node_serialized = serialize_node(rec_a1["a"])
            return {
                "found": True,
                "hops": 0,
                "fromAuthor": {
                    "authorId": author1["authorId"],
                    "name": author1.get("name"),
                    "affiliation": author1.get("affiliation"),
                    "country": author1.get("country"),
                },
                "toAuthor": {
                    "authorId": author1["authorId"],
                    "name": author1.get("name"),
                    "affiliation": author1.get("affiliation"),
                    "country": author1.get("country"),
                },
                "papers": [],
                "path": {
                    "nodes": [node_serialized],
                    "edges": [],
                },
                "explanation": f"Same author: {author1.get('name')} (0 hops).",
                "cypher": cypher_queries.CHECK_AUTHOR_EXISTS.strip(),
                "elapsed_ms": round(elapsed_ms, 2),
                "meta": {
                    "engine": "neo4j",
                    "database": db_name,
                    "elapsed_ms": round(elapsed_ms, 2),
                },
            }

        res_a2 = session.run(cypher_queries.CHECK_AUTHOR_EXISTS, parameters={"authorId": to_author_id}, timeout=10.0)
        rec_a2 = res_a2.single()
        if not rec_a2 or not rec_a2["a"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Author ID {to_author_id} not found.",
            )
        author2 = dict(rec_a2["a"])

        # 3. Find shortest path between distinct authors
        cypher = cypher_queries.SHORTEST_COLLAB_PATH
        res_path = session.run(
            cypher,
            parameters={"fromAuthorId": from_author_id, "toAuthorId": to_author_id},
            timeout=10.0,
        )
        rec_path = res_path.single()
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        if not rec_path or not rec_path["p"]:
            return {
                "found": False,
                "hops": None,
                "fromAuthor": {
                    "authorId": author1["authorId"],
                    "name": author1.get("name"),
                    "affiliation": author1.get("affiliation"),
                    "country": author1.get("country"),
                },
                "toAuthor": {
                    "authorId": author2["authorId"],
                    "name": author2.get("name"),
                    "affiliation": author2.get("affiliation"),
                    "country": author2.get("country"),
                },
                "papers": [],
                "path": {
                    "nodes": [],
                    "edges": [],
                },
                "explanation": f"No collaboration path found between {author1.get('name')} and {author2.get('name')} within 4 co-author hops (8 relationships).",
                "cypher": cypher.strip(),
                "elapsed_ms": round(elapsed_ms, 2),
                "meta": {
                    "engine": "neo4j",
                    "database": db_name,
                    "elapsed_ms": round(elapsed_ms, 2),
                },
            }

        path = rec_path["p"]
        rel_count = rec_path["relCount"]
        hops = rel_count // 2

        # Serialize Cytoscape nodes and edges
        nodes = [serialize_node(n) for n in path.nodes]
        elem_to_id = {getattr(n, "element_id", None): serialize_node(n)["id"] for n in path.nodes}
        edges = [serialize_edge(r, elem_to_id) for r in path.relationships if r is not None]
        edges = [e for e in edges if e is not None]

        # Extract intermediate papers
        papers = []
        for n in path.nodes:
            labels = list(getattr(n, "labels", []))
            if "Paper" in labels:
                papers.append({
                    "paperId": n.get("paperId"),
                    "title": n.get("title"),
                    "status": n.get("status"),
                })

        return {
            "found": True,
            "hops": hops,
            "fromAuthor": {
                "authorId": author1["authorId"],
                "name": author1.get("name"),
                "affiliation": author1.get("affiliation"),
                "country": author1.get("country"),
            },
            "toAuthor": {
                "authorId": author2["authorId"],
                "name": author2.get("name"),
                "affiliation": author2.get("affiliation"),
                "country": author2.get("country"),
            },
            "papers": papers,
            "path": {
                "nodes": nodes,
                "edges": edges,
            },
            "explanation": f"Found a {hops}-hop collaboration path between {author1.get('name')} and {author2.get('name')} across {len(papers)} shared papers.",
            "cypher": cypher.strip(),
            "elapsed_ms": round(elapsed_ms, 2),
            "meta": {
                "engine": "neo4j",
                "database": db_name,
                "elapsed_ms": round(elapsed_ms, 2),
            },
        }


def get_within_hops(author_id: int, hops: int = 1) -> Dict[str, Any]:
    """
    Finds distinct authors reachable within N co-author hops.
    1 co-author hop = 2 relationships (Author-Paper-Author).
    hops must be an integer 1 to 3.
    """
    if author_id < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Author ID must be a positive integer.",
        )
    if hops not in (1, 2, 3):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hops parameter must be an integer between 1 and 3.",
        )

    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    start_time = time.perf_counter()

    with driver.session(database=db_name) as session:
        # Check author existence
        res_a = session.run(cypher_queries.CHECK_AUTHOR_EXISTS, parameters={"authorId": author_id}, timeout=10.0)
        rec_a = res_a.single()
        if not rec_a or not rec_a["a"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Author ID {author_id} not found.",
            )
        author = dict(rec_a["a"])

        max_rels = hops * 2
        cypher = cypher_queries.WITHIN_HOPS_TEMPLATE.format(max_rels=max_rels)
        result = session.run(cypher, parameters={"authorId": author_id}, timeout=10.0)

        reachable_authors = []
        by_hop = {str(h): 0 for h in range(1, hops + 1)}

        for record in result:
            author_hop = record["hops"]
            if str(author_hop) in by_hop:
                by_hop[str(author_hop)] += 1
            reachable_authors.append({
                "authorId": record["authorId"],
                "name": record["name"],
                "affiliation": record["affiliation"],
                "country": record["country"],
                "hops": author_hop,
                "intermediatePapers": record["intermediatePapers"],
            })

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "author": {
                "authorId": author["authorId"],
                "name": author.get("name"),
                "affiliation": author.get("affiliation"),
                "country": author.get("country"),
            },
            "hops": hops,
            "totalReachable": len(reachable_authors),
            "byHop": by_hop,
            "authors": reachable_authors,
            "cypher": cypher.strip(),
            "elapsed_ms": round(elapsed_ms, 2),
            "meta": {
                "engine": "neo4j",
                "database": db_name,
                "elapsed_ms": round(elapsed_ms, 2),
            },
        }


def get_central_authors(limit: int = 10) -> Dict[str, Any]:
    """
    Returns the most connected authors by distinct co-authors (degree centrality), plus paper count.
    """
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit parameter must be an integer between 1 and 100.",
        )

    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    start_time = time.perf_counter()

    with driver.session(database=db_name) as session:
        cypher = cypher_queries.CENTRAL_AUTHORS
        result = session.run(cypher, parameters={"limit": limit}, timeout=10.0)
        authors = [
            {
                "authorId": rec["authorId"],
                "name": rec["name"],
                "affiliation": rec["affiliation"],
                "country": rec["country"],
                "distinctCoauthors": rec["distinctCoauthors"],
                "paperCount": rec["paperCount"],
            }
            for rec in result
        ]
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "limit": limit,
            "total": len(authors),
            "authors": authors,
            "cypher": cypher.strip(),
            "elapsed_ms": round(elapsed_ms, 2),
            "meta": {
                "engine": "neo4j",
                "database": db_name,
                "elapsed_ms": round(elapsed_ms, 2),
            },
        }


def get_institution_analytics(limit: int = 15) -> Dict[str, Any]:
    """
    Returns top cross-institution collaboration pairs, paper counts by research area,
    per-track counts, and top institutions overall.
    """
    if limit < 1 or limit > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit parameter must be an integer between 1 and 50.",
        )

    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    start_time = time.perf_counter()

    with driver.session(database=db_name) as session:
        # 1. Institution pairs
        res_pairs = session.run(cypher_queries.INSTITUTION_PAIRS, parameters={"limit": limit}, timeout=10.0)
        institution_pairs = [
            {
                "institution1": rec["institution1"],
                "institution2": rec["institution2"],
                "jointPapers": rec["jointPapers"],
                "authors1": rec["authors1"],
                "authors2": rec["authors2"],
            }
            for rec in res_pairs
        ]

        # 2. Research Areas paper counts
        res_areas = session.run(cypher_queries.RESEARCH_AREAS_PAPER_COUNTS, timeout=10.0)
        raw_areas = [
            {
                "areaName": rec["areaName"],
                "paperCount": rec["paperCount"],
            }
            for rec in res_areas
        ]
        total_area_papers = sum(a["paperCount"] for a in raw_areas)
        research_areas = [
            {
                "areaName": a["areaName"],
                "paperCount": a["paperCount"],
                "percentage": round((a["paperCount"] / total_area_papers) * 100, 1) if total_area_papers > 0 else 0,
            }
            for a in raw_areas
        ]

        # 3. Track paper counts
        res_tracks = session.run(cypher_queries.TRACK_PAPER_COUNTS, timeout=10.0)
        tracks = [
            {
                "trackId": rec["trackId"],
                "trackName": rec["trackName"],
                "conferenceName": rec["conferenceName"],
                "conferenceAcronym": rec["conferenceAcronym"],
                "paperCount": rec["paperCount"],
            }
            for rec in res_tracks
        ]

        # 4. Top Institutions overall
        res_top_inst = session.run(cypher_queries.TOP_INSTITUTIONS, parameters={"limit": limit}, timeout=10.0)
        top_institutions = [
            {
                "institution": rec["institution"],
                "authorCount": rec["authorCount"],
                "paperCount": rec["paperCount"],
            }
            for rec in res_top_inst
        ]

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "institutionPairs": institution_pairs,
            "researchAreas": research_areas,
            "tracks": tracks,
            "topInstitutions": top_institutions,
            "totalPapers": total_area_papers,
            "cyphers": [
                {"name": "institution_pairs", "cypher": cypher_queries.INSTITUTION_PAIRS.strip()},
                {"name": "research_areas", "cypher": cypher_queries.RESEARCH_AREAS_PAPER_COUNTS.strip()},
                {"name": "tracks", "cypher": cypher_queries.TRACK_PAPER_COUNTS.strip()},
                {"name": "top_institutions", "cypher": cypher_queries.TOP_INSTITUTIONS.strip()},
            ],
            "elapsed_ms": round(elapsed_ms, 2),
            "meta": {
                "engine": "neo4j",
                "database": db_name,
                "elapsed_ms": round(elapsed_ms, 2),
            },
        }
