from typing import Optional
from fastapi import APIRouter, Header
from app.schemas import OracleAssignRequest
from app.services import oracle_service

router = APIRouter(prefix="/oracle", tags=["Oracle Operations"])


@router.post("/assign-reviewer")
def oracle_assign_reviewer_endpoint(
    payload: OracleAssignRequest,
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
):
    """
    Simulates or executes reviewer assignment on the Oracle database.
    - Default (commit=False): Safe DRY-RUN. Tests conflict via read-only SQL join.
      If conflict exists, calls sp_assign_reviewer (ORA-20001) and test insert (ORA-20002 from trigger),
      returning both real error texts. If no conflict, returns would_succeed: True without committing.
    - Live (commit=True): Calls sp_assign_reviewer and commits. Requires valid X-Admin-Token header
      and confirm: True.
    """
    return oracle_service.assign_reviewer_oracle(
        payload=payload,
        admin_token_header=x_admin_token,
    )
