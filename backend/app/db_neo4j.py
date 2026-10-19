import time
import logging
from typing import Any, Dict, List, Optional, Tuple
import neo4j
from neo4j.exceptions import DriverError, Neo4jError
from app.config import settings

logger = logging.getLogger("backend.neo4j")

_driver: Optional[neo4j.Driver] = None


def init_neo4j_driver() -> None:
    global _driver
    if _driver is None:
        try:
            logger.info("Initializing Neo4j driver for URI: %s, user: %s", settings.NEO4J_URI, settings.NEO4J_USER)
            _driver = neo4j.GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                max_connection_lifetime=30 * 60,
                max_connection_pool_size=50,
                connection_acquisition_timeout=10.0,
            )
            _driver.verify_connectivity()
            logger.info("Neo4j driver initialized and verified successfully.")
        except Exception as e:
            logger.error("Failed to initialize Neo4j driver: %s", str(e))
            _driver = None


def close_neo4j_driver() -> None:
    global _driver
    if _driver is not None:
        try:
            _driver.close()
            logger.info("Neo4j driver closed.")
        except Exception as e:
            logger.warning("Error closing Neo4j driver: %s", str(e))
        finally:
            _driver = None


def get_driver() -> neo4j.Driver:
    global _driver
    if _driver is None:
        init_neo4j_driver()
    if _driver is None:
        raise RuntimeError("Neo4j driver is not available")
    return _driver


def query_cypher(
    cypher: str,
    params: Optional[Dict[str, Any]] = None,
    database: Optional[str] = None,
    timeout_s: float = 10.0,
) -> Tuple[List[Dict[str, Any]], float]:
    """
    Executes a parameterised Cypher query on Neo4j and returns (records as list of dicts, elapsed_ms).
    """
    params = params or {}
    db_name = database or settings.NEO4J_DATABASE
    driver = get_driver()

    start = time.perf_counter()
    with driver.session(database=db_name) as session:
        result = session.run(cypher, parameters=params, timeout=timeout_s)
        records = [record.data() for record in result]
    elapsed_ms = (time.perf_counter() - start) * 1000.0

    logger.info("Neo4j query executed in %.2f ms: %.80s", elapsed_ms, cypher.strip().replace("\n", " "))
    return records, elapsed_ms


def _abstract_neo4j_uri(raw_uri: str) -> str:
    """Safely abstracts raw Neo4j connection URI to prevent infrastructure exposure."""
    if not raw_uri:
        return "Neo4j Graph Database"
    raw_lower = raw_uri.lower()
    if "databases.neo4j.io" in raw_lower or "+s" in raw_lower or "aura" in raw_lower:
        return "Neo4j AuraDB (Cloud)"
    if "127.0.0.1" in raw_lower or "localhost" in raw_lower:
        return "Neo4j Desktop (Local)"
    return "Neo4j Graph Database (Remote)"


def _abstract_neo4j_database(raw_database: str) -> str:
    """Safely abstracts internal database ID/name to prevent leaking AuraDB instance identifiers."""
    return "Production Graph"


def check_neo4j_health() -> Dict[str, Any]:
    """
    Checks Neo4j reachability and returns node, relationship, and SAME_PERSON_AS counts.
    """
    start = time.perf_counter()
    try:
        driver = get_driver()
        db_name = settings.NEO4J_DATABASE

        with driver.session(database=db_name) as session:
            node_res = session.run("MATCH (n) RETURN count(n) AS c", timeout=5.0).single()
            rel_res = session.run("MATCH ()-[r]->() RETURN count(r) AS c", timeout=5.0).single()
            same_person_res = session.run("MATCH ()-[r:SAME_PERSON_AS]->() RETURN count(r) AS c", timeout=5.0).single()

            nodes = node_res["c"] if node_res else 0
            relationships = rel_res["c"] if rel_res else 0
            same_person = same_person_res["c"] if same_person_res else 0

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        return {
            "status": "connected",
            "uri": _abstract_neo4j_uri(settings.NEO4J_URI),
            "database": _abstract_neo4j_database(db_name),
            "nodes": nodes,
            "relationships": relationships,
            "same_person_as": same_person,
            "elapsed_ms": round(elapsed_ms, 2),
            "error": None,
        }
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        logger.error("Neo4j health check failed: %s", str(e))
        return {
            "status": "unreachable",
            "uri": _abstract_neo4j_uri(settings.NEO4J_URI),
            "database": _abstract_neo4j_database(settings.NEO4J_DATABASE),
            "nodes": 0,
            "relationships": 0,
            "same_person_as": 0,
            "elapsed_ms": round(elapsed_ms, 2),
            "error": "Failed to connect to Neo4j database",
        }


def is_neo4j_scale_available() -> bool:
    """Checks whether the Neo4j scale database exists, is online, and has nodes."""
    try:
        driver = get_driver()
        with driver.session(database="system") as s:
            found = False
            for r in s.run("SHOW DATABASES"):
                if r.get("name") == settings.NEO4J_SCALE_DATABASE and r.get("currentStatus") == "online":
                    found = True
                    break
            if not found:
                return False

        with driver.session(database=settings.NEO4J_SCALE_DATABASE) as scale_s:
            cnt_res = scale_s.run("MATCH (n:Author) RETURN count(n) AS c", timeout=5.0).single()
            return bool(cnt_res and cnt_res["c"] > 0)
    except Exception:
        return False

