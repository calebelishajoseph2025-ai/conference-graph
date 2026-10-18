import time
import logging
import secrets
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from app.config import settings
from app.db_oracle import get_oracle_connection
from app.schemas import OracleAssignRequest

logger = logging.getLogger("backend.oracle_service")


def assign_reviewer_oracle(
    payload: OracleAssignRequest,
    admin_token_header: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Handles Oracle reviewer assignment test / live execution.
    By default (commit=False), performs a DRY RUN:
      1. Validates paper, reviewer existence and duplicate assignment (B6).
      2. Checks conflict via read-only SQL join using LOWER(email) (B6).
      3. If conflict exists, calls sp_assign_reviewer (which raises ORA-20001) and attempts a direct
         INSERT inside a rolled-back transaction (which raises ORA-20002 from trigger trg_no_self_review),
         returning the real ORA error texts.
      4. If no conflict exists, tests the insert inside a transaction that is immediately rolled back
         to guarantee would_succeed: True (B6).
    If commit=True:
      - Requires X-Admin-Token header matching ADMIN_TOKEN (constant-time secrets.compare_digest)
        and confirm: True. Uses 403 status for consistency (B19).
      - Calls sp_assign_reviewer and commits the change. Returns 409 on conflict (B19).
    """
    start = time.perf_counter()
    paper_id = payload.paperId
    reviewer_id = payload.reviewerId

    # 1. LIVE COMMIT MODE
    if payload.commit:
        if not settings.ADMIN_TOKEN or not admin_token_header or not secrets.compare_digest(admin_token_header.strip(), settings.ADMIN_TOKEN.strip()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Valid X-Admin-Token header is required for committing Oracle database assignments.",
            )
        if not payload.confirm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="confirm: true is required when commit is enabled.",
            )

        with get_oracle_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.callproc("sp_assign_reviewer", [paper_id, reviewer_id])
                    elapsed_ms = (time.perf_counter() - start) * 1000.0
                    return {
                        "data": {
                            "success": True,
                            "committed": True,
                            "paperId": paper_id,
                            "reviewerId": reviewer_id,
                            "message": f"Oracle PL/SQL procedure sp_assign_reviewer assigned reviewer {reviewer_id} to paper {paper_id}.",
                        },
                        "meta": {
                            "engine": "oracle",
                            "query": "CALL sp_assign_reviewer(:paperId, :reviewerId)",
                            "params": {"paperId": paper_id, "reviewerId": reviewer_id},
                            "elapsed_ms": round(elapsed_ms, 2),
                        },
                    }
                except Exception as e:
                    elapsed_ms = (time.perf_counter() - start) * 1000.0
                    err_msg = str(e)
                    first_line = err_msg.splitlines()[0] if err_msg else "Oracle execution error"
                    if "ORA-20001" in err_msg or "ORA-20002" in err_msg:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail={"error": "CONFLICT_OF_INTEREST", "message": first_line},
                        )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Oracle assignment execution failed: {first_line}",
                    )

    # 2. DRY-RUN MODE (Default)
    check_sql = """
    SELECT a.AuthorID, a.Name AS AuthorName, a.Email AS AuthorEmail,
           rv.ReviewerID, rv.Name AS ReviewerName, rv.Email AS ReviewerEmail,
           p.PaperID, p.Title
    FROM PAPER_AUTHOR pa
    JOIN AUTHOR a ON pa.AuthorID = a.AuthorID
    JOIN REVIEWER rv ON LOWER(rv.Email) = LOWER(a.Email)
    JOIN PAPER p ON pa.PaperID = p.PaperID
    WHERE pa.PaperID = :paperId AND rv.ReviewerID = :reviewerId
    """

    with get_oracle_connection() as conn:
        with conn.cursor() as cur:
            # Step A: Verify paper and reviewer existence and duplicates (B6)
            cur.execute("SELECT COUNT(*) FROM PAPER WHERE PaperID = :paperId", {"paperId": paper_id})
            if cur.fetchone()[0] == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Paper ID {paper_id} not found in Oracle database.",
                )

            cur.execute("SELECT COUNT(*) FROM REVIEWER WHERE ReviewerID = :reviewerId", {"reviewerId": reviewer_id})
            if cur.fetchone()[0] == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Reviewer ID {reviewer_id} not found in Oracle database.",
                )

            cur.execute(
                "SELECT COUNT(*) FROM PAPER_REVIEWER WHERE PaperID = :paperId AND ReviewerID = :reviewerId",
                {"paperId": paper_id, "reviewerId": reviewer_id},
            )
            if cur.fetchone()[0] > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Reviewer ID {reviewer_id} is already assigned to Paper ID {paper_id} in Oracle.",
                )

            # Step B: Check conflict via case-insensitive email join (B6)
            cur.execute(check_sql, {"paperId": paper_id, "reviewerId": reviewer_id})
            conflict_rows = cur.fetchall()

            if not conflict_rows:
                # Test the actual insert inside a rolled-back transaction to ensure success (B6)
                try:
                    cur.execute(
                        "INSERT INTO PAPER_REVIEWER (PaperID, ReviewerID, AssignedDate) VALUES (:1, :2, SYSDATE)",
                        [paper_id, reviewer_id],
                    )
                    conn.rollback()
                except Exception as ex:
                    conn.rollback()
                    err = str(ex).splitlines()[0]
                    return {
                        "data": {
                            "dry_run": True,
                            "conflict": False,
                            "would_succeed": False,
                            "error": err,
                            "message": f"Assignment pre-check failed in Oracle: {err}",
                            "paperId": paper_id,
                            "reviewerId": reviewer_id,
                        },
                        "meta": {
                            "engine": "oracle",
                            "query": "TEST INSERT (rolled back)",
                            "params": {"paperId": paper_id, "reviewerId": reviewer_id},
                            "elapsed_ms": round((time.perf_counter() - start) * 1000.0, 2),
                        },
                    }

                elapsed_ms = (time.perf_counter() - start) * 1000.0
                return {
                    "data": {
                        "dry_run": True,
                        "conflict": False,
                        "would_succeed": True,
                        "message": "No conflict of interest detected in Oracle. The assignment would succeed.",
                        "paperId": paper_id,
                        "reviewerId": reviewer_id,
                    },
                    "meta": {
                        "engine": "oracle",
                        "query": check_sql.strip(),
                        "params": {"paperId": paper_id, "reviewerId": reviewer_id},
                        "elapsed_ms": round(elapsed_ms, 2),
                    },
                }

            # Conflict exists! Trigger real ORA errors safely
            proc_err = ""
            trig_err = ""

            # Call sp_assign_reviewer to capture real ORA-20001
            try:
                cur.callproc("sp_assign_reviewer", [paper_id, reviewer_id])
            except Exception as e:
                proc_err = str(e).splitlines()[0]

            # Direct insert inside transaction to capture real trigger ORA-20002
            try:
                cur.execute(
                    "INSERT INTO PAPER_REVIEWER (PaperID, ReviewerID, AssignedDate) VALUES (:1, :2, SYSDATE)",
                    [paper_id, reviewer_id],
                )
                conn.rollback()
            except Exception as e:
                conn.rollback()
                trig_err = str(e).splitlines()[0]

            elapsed_ms = (time.perf_counter() - start) * 1000.0

            return {
                "data": {
                    "dry_run": True,
                    "conflict": True,
                    "would_succeed": False,
                    "procedure_error": proc_err,
                    "trigger_error": trig_err,
                    "explanation": (
                        "Oracle blocked the assignment: both PL/SQL procedure sp_assign_reviewer and "
                        "trigger trg_no_self_review verified that this reviewer is a co-author of the paper."
                    ),
                    "paperId": paper_id,
                    "reviewerId": reviewer_id,
                },
                "meta": {
                    "engine": "oracle",
                    "query": "CALL sp_assign_reviewer(:paperId, :reviewerId) & INSERT INTO PAPER_REVIEWER",
                    "params": {"paperId": paper_id, "reviewerId": reviewer_id},
                    "elapsed_ms": round(elapsed_ms, 2),
                },
            }
