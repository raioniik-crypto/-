from fastapi import APIRouter
from src.schema import ExecuteRequest, ExecuteResponse

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/execute", response_model=ExecuteResponse)
def execute(req: ExecuteRequest):
    return ExecuteResponse(
        status="completed",
        job_id=req.job_id,
        artifact_path=None,
        message="P0 stub: no actual execution yet",
    )
