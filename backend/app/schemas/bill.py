from datetime import datetime
from pydantic import BaseModel


class BillResponse(BaseModel):
    id: int
    event_name: str
    amount: float
    description: str | None
    original_filename: str
    uploaded_by: int
    uploader_name: str
    status: str
    rejection_reason: str | None
    created_at: datetime
    executive_reviewed_at: datetime | None
    admin_reviewed_at: datetime | None


class RejectRequest(BaseModel):
    reason: str
