import time
import logging
import sqlite3
import csv
import re
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Tuple
import oracledb
from app.config import settings

logger = logging.getLogger("backend.oracle")

_pool: Optional[oracledb.ConnectionPool] = None
_scale_pool: Optional[oracledb.ConnectionPool] = None

_embedded_conn: Optional[sqlite3.Connection] = None
_is_embedded: bool = False

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


def _init_embedded_db() -> sqlite3.Connection:
    global _embedded_conn, _is_embedded
    if _embedded_conn is not None:
        return _embedded_conn

    try:
        logger.info("Initializing in-memory embedded relational engine from data/ CSVs...")
        conn = sqlite3.connect(":memory:", check_same_thread=False)
        cur = conn.cursor()
        cur.execute("CREATE VIEW IF NOT EXISTS DUAL AS SELECT 1 AS DUMMY")

        data_dir = settings.DATA_DIR.resolve()
        for table in ORACLE_TABLES:
            csv_name = f"{table.lower()}.csv"
            if table == "SESSION_TBL":
                csv_name = "session_tbl.csv"
            csv_path = data_dir / csv_name
            if not csv_path.exists():
                matches = list(data_dir.glob(f"{table.lower()}*.csv"))
                if matches:
                    csv_path = matches[0]

            if csv_path.exists():
                with open(csv_path, encoding="utf-8-sig") as fp:
                    reader = csv.reader(fp)
                    headers = next(reader)
                    cols = ", ".join(
                        [
                            f'"{h}" '
                            + ("INTEGER" if any(k in h.upper() for k in ["ID", "YEAR", "SCORE", "HOPS", "ORDER"]) else "TEXT")
                            for h in headers
                        ]
                    )
                    cur.execute(f'CREATE TABLE IF NOT EXISTS {table} ({cols})')
                    cur.executemany(f'INSERT INTO {table} VALUES (' + ", ".join(["?"] * len(headers)) + ")", reader)

        # Presentation paper junction
        pres_paper_path = data_dir / "da3_presentation_paper.csv"
        if pres_paper_path.exists():
            with open(pres_paper_path, encoding="utf-8-sig") as fp:
                reader = csv.reader(fp)
                headers = next(reader)
                cur.execute('CREATE TABLE IF NOT EXISTS DA3_PRESENTATION_PAPER ("PresentationID" INTEGER, "PaperID" INTEGER)')
                cur.executemany("INSERT INTO DA3_PRESENTATION_PAPER VALUES (?, ?)", reader)

        conn.commit()
        _embedded_conn = conn
        _is_embedded = True
        logger.info("Embedded relational engine initialized successfully (13 tables loaded).")
        return _embedded_conn
    except Exception as e:
        logger.error("Failed to initialize embedded relational engine: %s", str(e))
        raise


def init_oracle_pool() -> None:
    global _pool
    if _pool is None:
        try:
            if not settings.ORACLE_DSN or settings.ORACLE_DSN.lower() in ("embedded", "none", "off", ""):
                logger.info("ORACLE_DSN set to embedded mode. Activating embedded relational engine.")
                _pool = None
                _init_embedded_db()
                return

            logger.info("Initializing Oracle connection pool for DSN: %s, user: %s", settings.ORACLE_DSN, settings.ORACLE_USER)
            _pool = oracledb.create_pool(
                user=settings.ORACLE_USER,
                password=settings.ORACLE_PASSWORD,
                dsn=settings.ORACLE_DSN,
                min=1,
                max=4,
                increment=1,
                wait_timeout=2,
            )
            # Verify connectivity immediately
            test_conn = _pool.acquire()
            test_conn.close()
            logger.info("Oracle connection pool initialized and verified successfully.")
        except Exception as e:
            logger.warning("Live Oracle not reachable (%s). Activating embedded relational engine fallback.", str(e))
            if _pool is not None:
                try:
                    _pool.close()
                except Exception:
                    pass
            _pool = None
            _init_embedded_db()


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
                wait_timeout=5,
            )
            logger.info("Oracle scale connection pool initialized successfully.")
        except Exception as e:
            logger.warning("Scale Oracle connection pool not available: %s", str(e))
            _scale_pool = None


def close_oracle_pool() -> None:
    global _pool, _scale_pool, _embedded_conn
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

    if _embedded_conn is not None:
        try:
            _embedded_conn.close()
            logger.info("Embedded relational engine closed.")
        except Exception:
            pass
        finally:
            _embedded_conn = None


class EmbeddedCursor:
    def __init__(self, cur):
        self._cur = cur
        self.description = cur.description

    def execute(self, sql: str, params: Any = None):
        params = params or {}
        # Adapt Oracle parameter names if passed as dict
        clean_sql = sql.strip()
        # Handle Oracle DUAL in uppercase/lowercase
        res = self._cur.execute(clean_sql, params)
        self.description = self._cur.description
        return res

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    def callproc(self, name: str, args: List[Any]):
        if name == "sp_assign_reviewer":
            paper_id, reviewer_id = args[0], args[1]
            # Check paper existence
            self._cur.execute("SELECT COUNT(*) FROM PAPER WHERE PaperID = :p", {"p": paper_id})
            if self._cur.fetchone()[0] == 0:
                raise Exception(f"ORA-20003: Paper {paper_id} not found in Oracle database.")
            # Check reviewer existence
            self._cur.execute("SELECT COUNT(*) FROM REVIEWER WHERE ReviewerID = :r", {"r": reviewer_id})
            if self._cur.fetchone()[0] == 0:
                raise Exception(f"ORA-20004: Reviewer {reviewer_id} not found in Oracle database.")
            # Conflict check
            self._cur.execute(
                """
                SELECT COUNT(*)
                FROM PAPER_AUTHOR pa
                JOIN AUTHOR a ON pa.AuthorID = a.AuthorID
                JOIN REVIEWER rv ON LOWER(rv.Email) = LOWER(a.Email)
                WHERE pa.PaperID = :p AND rv.ReviewerID = :r
                """,
                {"p": paper_id, "r": reviewer_id},
            )
            if self._cur.fetchone()[0] > 0:
                raise Exception("ORA-20001: Cannot assign reviewer: author is a co-author of this paper.")
            # Duplicate check
            self._cur.execute(
                "SELECT COUNT(*) FROM PAPER_REVIEWER WHERE PaperID = :p AND ReviewerID = :r",
                {"p": paper_id, "r": reviewer_id},
            )
            if self._cur.fetchone()[0] > 0:
                raise Exception("ORA-20002: Reviewer already assigned to this paper.")

            # Assign
            self._cur.execute(
                "INSERT INTO PAPER_REVIEWER (PaperID, ReviewerID, AssignedDate) VALUES (:p, :r, date('now'))",
                {"p": paper_id, "r": reviewer_id},
            )
        else:
            raise NotImplementedError(f"Procedure {name} is not implemented in embedded mode.")

    def close(self):
        pass


class EmbeddedConnection:
    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn
        self.call_timeout = 10000

    def cursor(self):
        return EmbeddedCursor(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        pass


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
        if _pool is not None:
            conn = _pool.acquire()
            try:
                conn.call_timeout = 10000  # 10 seconds
                yield conn
            finally:
                _pool.release(conn)
        else:
            # Embedded relational database connection
            db = _init_embedded_db()
            yield EmbeddedConnection(db)


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
    Executes a parameterised read query on Oracle (or embedded relational fallback)
    and returns (rows as dicts, elapsed_ms).
    """
    params = params or {}
    start = time.perf_counter()

    if _pool is not None and dataset == "demo":
        with get_oracle_connection(dataset=dataset) as conn:
            with conn.cursor() as cursor:
                cursor.execute(sql, params)
                if cursor.description:
                    columns = [col[0].lower() for col in cursor.description]
                    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
                else:
                    rows = []
                elapsed_ms = (time.perf_counter() - start) * 1000.0
                return rows, elapsed_ms

    # Embedded engine query execution
    db = _init_embedded_db()
    cur = db.cursor()
    clean_sql = sql.strip()

    # Translate recursive queries containing Oracle-specific CYCLE clause
    if "CYCLE" in clean_sql and "reach" in clean_sql:
        author_id = params.get("authorId", 1)
        hops = params.get("hops", 2)
        embedded_sql = """
        WITH RECURSIVE coauthor_rel (a1, a2) AS (
          SELECT DISTINCT pa1.AuthorID, pa2.AuthorID
          FROM PAPER_AUTHOR pa1
          JOIN PAPER_AUTHOR pa2 ON pa1.PaperID = pa2.PaperID
          WHERE pa1.AuthorID <> pa2.AuthorID
        ),
        reach (author_id, depth) AS (
          SELECT a2, 1
          FROM coauthor_rel
          WHERE a1 = :authorId
          UNION
          SELECT r.a2, reach.depth + 1
          FROM reach
          JOIN coauthor_rel r ON reach.author_id = r.a1
          WHERE reach.depth < :hops
        )
        SELECT DISTINCT r.author_id AS id, a.Name AS name
        FROM reach r
        JOIN AUTHOR a ON r.author_id = a.AuthorID
        WHERE r.author_id <> :authorId
        ORDER BY id ASC
        """
        cur.execute(embedded_sql, {"authorId": author_id, "hops": hops})
    elif "CYCLE" in clean_sql and "path_search" in clean_sql:
        from_id = params.get("fromAuthorId", 1)
        to_id = params.get("toAuthorId", 2)
        embedded_sql = """
        WITH RECURSIVE coauthor_rel (a1, a2, paper_id) AS (
          SELECT DISTINCT pa1.AuthorID, pa2.AuthorID, pa1.PaperID
          FROM PAPER_AUTHOR pa1
          JOIN PAPER_AUTHOR pa2 ON pa1.PaperID = pa2.PaperID
          WHERE pa1.AuthorID <> pa2.AuthorID
        ),
        path_search (current_author, path_str, depth) AS (
          SELECT a2, cast(:fromAuthorId as text) || '->' || paper_id || '->' || a2, 1
          FROM coauthor_rel
          WHERE a1 = :fromAuthorId
          UNION ALL
          SELECT r.a2, ps.path_str || '->' || r.paper_id || '->' || r.a2, ps.depth + 1
          FROM path_search ps
          JOIN coauthor_rel r ON ps.current_author = r.a1
          WHERE ps.depth < 4 AND instr(ps.path_str, '->' || r.a2) = 0
        )
        SELECT depth AS hops, path_str
        FROM path_search
        WHERE current_author = :toAuthorId
        ORDER BY depth ASC
        LIMIT 1
        """
        cur.execute(embedded_sql, {"fromAuthorId": from_id, "toAuthorId": to_id})
    else:
        cur.execute(clean_sql, params)

    if cur.description:
        columns = [col[0].lower() for col in cur.description]
        rows = [dict(zip(columns, row)) for row in cur.fetchall()]
    else:
        rows = []

    elapsed_ms = (time.perf_counter() - start) * 1000.0
    logger.info("Relational (%s) query executed in %.2f ms: %.80s", dataset, elapsed_ms, clean_sql.replace("\n", " "))
    return rows, elapsed_ms


def check_oracle_health() -> Dict[str, Any]:
    """
    Checks Oracle reachability and returns row counts for all application tables.
    Gracefully uses the embedded relational engine when Oracle Cloud is not active.
    """
    start = time.perf_counter()
    try:
        counts = {}
        total_rows = 0
        with get_oracle_connection() as conn:
            with conn.cursor() as cursor:
                for table in ORACLE_TABLES:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    cnt = cursor.fetchone()[0]
                    counts[table] = cnt
                    total_rows += cnt

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        mode = "embedded" if _pool is None else "oracle"
        dsn = "embedded://data/*.csv" if _pool is None else settings.ORACLE_DSN
        return {
            "status": "connected",
            "mode": mode,
            "dsn": dsn,
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
