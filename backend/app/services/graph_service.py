import time
import logging
from typing import Any, Dict, List, Optional
from app.config import settings
from app.db_neo4j import get_driver
from app.queries import cypher as cypher_queries

logger = logging.getLogger("backend.graph")

ID_FIELD_MAP = {
    "author": "authorId",
    "reviewer": "reviewerId",
    "paper": "paperId",
    "conference": "confId",
    "track": "trackId",
    "session": "sessionId",
    "keyword": "keywordId",
    "presentation": "presentationId",
}

LABEL_MAP = {
    "author": "Author",
    "reviewer": "Reviewer",
    "paper": "Paper",
    "conference": "Conference",
    "track": "Track",
    "session": "Session",
    "keyword": "Keyword",
    "presentation": "Presentation",
}


def _serialize_props(props_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Convert Neo4j Date and special types into JSON-serializable primitives."""
    clean = {}
    for k, v in props_dict.items():
        if hasattr(v, "iso_format"):
            clean[k] = v.iso_format()
        elif hasattr(v, "isoformat"):
            clean[k] = v.isoformat()
        elif "date" in type(v).__name__.lower():
            clean[k] = str(v)
        else:
            clean[k] = v
    return clean


def serialize_node(node: Any) -> Dict[str, Any]:
    """Serializes a Neo4j Node into Cytoscape-compatible node format."""
    labels = list(node.labels) if hasattr(node, "labels") else []
    primary_label = labels[0] if labels else "Node"
    id_field = ID_FIELD_MAP.get(primary_label.lower(), "id")
    raw_id = node.get(id_field, node.element_id)
    node_id = f"{primary_label}:{raw_id}"

    props = _serialize_props(dict(node))
    display_label = (
        props.get("name")
        or props.get("title")
        or props.get("keyword")
        or f"{primary_label} #{raw_id}"
    )

    return {
        "id": node_id,
        "elementId": getattr(node, "element_id", node_id),
        "label": display_label,
        "type": primary_label,
        "props": props,
    }


def serialize_edge(rel: Any, element_to_id: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Serializes a Neo4j Relationship into Cytoscape-compatible edge format."""
    if rel is None:
        return None

    start_elem = getattr(rel.start_node, "element_id", None)
    end_elem = getattr(rel.end_node, "element_id", None)

    source_id = element_to_id.get(start_elem)
    target_id = element_to_id.get(end_elem)

    if not source_id or not target_id:
        return None

    rel_id = f"edge_{getattr(rel, 'element_id', f'{source_id}_{rel.type}_{target_id}')}"
    props = _serialize_props(dict(rel))

    return {
        "id": rel_id,
        "source": source_id,
        "target": target_id,
        "type": rel.type,
        "props": props,
    }


def search_graph(q: str, node_type: Optional[str] = None, limit: int = 10) -> Dict[str, Any]:
    """
    Autocomplete search across authors, reviewers, and papers using case-insensitive CONTAINS.
    """
    clean_q = q.strip()
    clean_limit = max(1, min(limit, 20))
    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    results: List[Dict[str, Any]] = []

    type_filter = (node_type or "").lower().strip()
    queries_to_run = []

    if not type_filter or type_filter == "all":
        queries_to_run = [
            cypher_queries.SEARCH_AUTHORS,
            cypher_queries.SEARCH_REVIEWERS,
            cypher_queries.SEARCH_PAPERS,
        ]
    elif type_filter == "author":
        queries_to_run = [cypher_queries.SEARCH_AUTHORS]
    elif type_filter == "reviewer":
        queries_to_run = [cypher_queries.SEARCH_REVIEWERS]
    elif type_filter == "paper":
        queries_to_run = [cypher_queries.SEARCH_PAPERS]

    start = time.perf_counter()
    executed_cyphers = []
    bucket_results: List[List[Dict[str, Any]]] = []

    with driver.session(database=db_name) as session:
        for cypher in queries_to_run:
            res = session.run(cypher, parameters={"q": clean_q, "limit": clean_limit})
            bucket = []
            for record in res:
                bucket.append({
                    "id": f"{record['label']}:{record['rawId']}",
                    "rawId": record["rawId"],
                    "type": record["type"],
                    "label": record["label"],
                    "title": record["title"],
                    "subtitle": record["subtitle"],
                })
            bucket_results.append(bucket)
            executed_cyphers.append(cypher.strip())

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    # Round-robin interleave results when searching across multiple types (B9)
    if len(bucket_results) > 1:
        interleaved = []
        max_len = max((len(b) for b in bucket_results), default=0)
        for i in range(max_len):
            for bucket in bucket_results:
                if i < len(bucket):
                    interleaved.append(bucket[i])
        results = interleaved[:clean_limit]
    else:
        results = bucket_results[0][:clean_limit] if bucket_results else []

    return {
        "data": results,
        "meta": {
            "engine": "neo4j",
            "query": " UNION \n".join(executed_cyphers),
            "params": {"q": clean_q, "limit": clean_limit, "type": type_filter or "all"},
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }


def get_neighborhood(node_type: str, node_id: int, depth: int = 1) -> Dict[str, Any]:
    """
    Retrieves a node and its neighborhood up to depth 1 or 2, strictly capped at 150 nodes.
    """
    clean_depth = 2 if depth >= 2 else 1
    clean_label = LABEL_MAP.get(node_type.lower().strip(), "Author")
    cypher_query = (
        cypher_queries.NEIGHBORHOOD_DEPTH_2 if clean_depth == 2 else cypher_queries.NEIGHBORHOOD_DEPTH_1
    )

    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    start = time.perf_counter()

    with driver.session(database=db_name) as session:
        rec = session.run(cypher_query, parameters={"label": clean_label, "id": node_id}).single()

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

    if rec and rec["targetNodes"]:
        # Cap at 150 nodes
        raw_nodes = rec["targetNodes"][:150]
        element_to_id: Dict[str, str] = {}

        for n in raw_nodes:
            if n is not None:
                sn = serialize_node(n)
                nodes.append(sn)
                element_to_id[sn["elementId"]] = sn["id"]

        for r in rec["rels"]:
            se = serialize_edge(r, element_to_id)
            if se:
                edges.append(se)

    return {
        "data": {
            "nodes": nodes,
            "edges": edges,
        },
        "meta": {
            "engine": "neo4j",
            "query": cypher_query.strip(),
            "params": {"label": clean_label, "id": node_id, "depth": clean_depth},
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }


def get_overview(conf_id: int = 1) -> Dict[str, Any]:
    """
    Retrieves a starter graph containing a Conference, its Tracks, and sample Papers.
    """
    cypher_query = cypher_queries.GRAPH_OVERVIEW
    driver = get_driver()
    db_name = settings.NEO4J_DATABASE
    start = time.perf_counter()

    with driver.session(database=db_name) as session:
        rec = session.run(cypher_query, parameters={"confId": conf_id}).single()

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

    if rec and rec["allNodes"]:
        raw_nodes = rec["allNodes"][:150]
        element_to_id: Dict[str, str] = {}

        for n in raw_nodes:
            if n is not None:
                sn = serialize_node(n)
                nodes.append(sn)
                element_to_id[sn["elementId"]] = sn["id"]

        for r in rec["allRels"]:
            se = serialize_edge(r, element_to_id)
            if se:
                edges.append(se)

    return {
        "data": {
            "nodes": nodes,
            "edges": edges,
        },
        "meta": {
            "engine": "neo4j",
            "query": cypher_query.strip(),
            "params": {"confId": conf_id},
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }
