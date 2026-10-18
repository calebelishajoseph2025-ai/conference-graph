import time
from fastapi import APIRouter
from app.db_neo4j import check_neo4j_health
from app.db_oracle import check_oracle_health

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health():
    """
    Checks reachability of both Neo4j and Oracle, returning node/rel counts and table row counts.
    """
    start = time.perf_counter()
    neo_health = check_neo4j_health()
    ora_health = check_oracle_health()
    elapsed_ms = (time.perf_counter() - start) * 1000.0

    overall_status = "healthy" if (neo_health["status"] == "connected" and ora_health["status"] == "connected") else "degraded"

    return {
        "status": overall_status,
        "neo4j": neo_health,
        "oracle": ora_health,
        "meta": {
            "engine": "both",
            "elapsed_ms": round(elapsed_ms, 2),
        },
    }
