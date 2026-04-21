from pydantic import BaseModel


class ExecuteRequest(BaseModel):
    job_id: str
    source_text: str
    template: str = "default"


class ExecuteResponse(BaseModel):
    status: str
    job_id: str
    artifact_path: str | None = None
    message: str | None = None
