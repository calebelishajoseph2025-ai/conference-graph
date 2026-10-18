import time
import logging
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Tuple
import oracledb
from app.config import settings

logger = logging.getLogger("backend.oracle")

_pool: Optional[oracledb.ConnectionPool] = None
_scale_pool: Optional[oracledb.ConnectionPool] = None

# Relational tables in schema
ORACLE_TABLES = [
    "CONFERENCE",
    "TRACK",
    "SESSION_TBL",
    "AUTHOR",
    "REVIEWER",
    "PAPER",
    "PAPER_AUTHOR",
    "PAPER_REVIEWER",
    "REVIEW",
    "SUBMISSION",
    "KEYWORD",
    "PAPER_KEYWORD",
    "PRESENTATION",
]


def init_oracle_pool() -> None:
    global _pool
    if _pool is None:
        try:
            logger.info("Initializing Oracle connection pool for DSN: %s, user: %s", settings.ORACLE_DSN, settings.ORACLE_USER)
            _pool = oracledb.create_pool(
                user=settings.ORACLE_USER,
                password=settings.ORACLE_PASSWORD,
                dsn=settings.ORACLE_DSN,
                min=1,
                max=4,
                increment=1,
                wait_timeout=10,
            )
            logger.info("Oracle connection pool initialized successfully.")
        except Exception as e:
            logger.error("Failed to initialize Oracle connection pool: %s", str(e))
            _pool = None


def init_oracle_scale_pool() -> None:
    global _scale_pool
    if _scale_pool is None:
        try:
            logger.info("Initializing Oracle scale pool for DSN: %s, user: %s", settings.ORACLE_DSN, settings.ORACLE_SCALE_USER)
            _scale_pool = oracledb.create_pool(
                user=settings.ORACLE_SCALE_USER,
                password=settings.ORACLE_SCALE_PASSWORD,
                dsn=settings.ORACLE_DSN,
                min=1,
                max=4,
                increment=1,
                wait_timeout=15,
            )
            logger.info("Oracle scale connection pool initialized successfully.")
        except Exception as e:
            logger.warning("Scale Oracle connection pool not available: %s", str(e))
            _scale_pool = None


def close_oracle_pool() -> None:
    global _pool, _scale_pool
    if _pool is not None:
        try:
            _pool.close()
            logger.info("Oracle connection pool closed.")
        except Exception as e:
            logger.warning("Error closing Oracle connection pool: %s", str(e))
        finally:
            _pool = None

    if _scale_pool is not None:
        try:
            _scale_pool.close()
            logger.info("Oracle scale connection pool closed.")
        except Exception as e:
            logger.warning("Error closing Oracle scale connection pool: %s", str(e))
        finally:
            _scale_pool = None


@contextmanager
def get_oracle_connection(dataset: str = "demo"):
    if dataset == "scale":
        global _scale_pool
        if _scale_pool is None:
            init_oracle_scale_pool()
        if _scale_pool is None:
            raise RuntimeError(
                f"Oracle scale database is not available for user '{settings.ORACLE_SCALE_USER}'. "
                "Ensure data/oracle_setup/02_create_scale_user.sql was executed."
            )
        conn = _scale_pool.acquire()
        try:
            conn.call_timeout = 15000  # 15s timeout for scale queries
            yield conn
        finally:
            _scale_pool.release(conn)
    else:
        global _pool
        if _pool is None:
            init_oracle_pool()
        if _pool is None:
            raise RuntimeError("Oracle connection pool is not available")

        conn = _pool.acquire()
        try:
            conn.call_timeout = 10000  # 10 seconds
            yield conn
        finally:
            _pool.release(conn)


def is_oracle_scale_available() -> bool:
    """Checks whether the Oracle scale user exists and has tables provisioned."""
    try:
        with get_oracle_connection(dataset="scale") as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM AUTHOR")
                cnt = cursor.fetchone()[0]
                return cnt > 0
    except Exception:
        return False


def query_oracle(
    sql: str,
    params: Optional[Dict[str, Any]] = None,
    dataset: str = "demo",
) -> Tuple[List[Dict[str, Any]], float]:
    """
    Executes a parameterised read query on Oracle and returns (rows as dicts, elapsed_ms).
    """
    params = params or {}
    start = time.perf_counter()
    with get_oracle_connection(dataset=dataset) as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            if cursor.description:
                columns = [col[0].lower() for col in cursor.description]
                rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
            else:
                rows = []
            elapsed_ms = (time.perf_counter() - start) * 1000.0

    logger.info("Oracle (%s) query executed in %.2f ms: %.80s", dataset, elapsed_ms, sql.strip().replace("\n", " "))
    return rows, elapsed_ms


def check_oracle_health() -> Dict[str, Any]:
    """
    Checks Oracle reachability and returns row counts for all application tables.
    """
    start = time.perf_counter()
    try:
        counts = {}
        total_rows = 0
        with get_oracle_connection() as conn:
            with conn.cursor() as cursor:
                for table in ORACLE_TABLES:
                    # Table names are static and internal constants from ORACLE_TABLES
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    cnt = cursor.fetchone()[0]
                    counts[table] = cnt
                    total_rows += cnt

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        return {
            "status": "connected",
            "dsn": settings.ORACLE_DSN,
            "user": settings.ORACLE_USER,
            "tables": counts,
            "total_rows": total_rows,
            "elapsed_ms": round(elapsed_ms, 2),
            "error": None,
        }
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        logger.error("Oracle health check failed: %s", str(e))
        return {
            "status": "unreachable",
            "dsn": settings.ORACLE_DSN,
            "user": settings.ORACLE_USER,
            "tables": {},
            "total_rows": 0,
            "elapsed_ms": round(elapsed_ms, 2),
            "error": "Failed to connect to Oracle database",
        }
