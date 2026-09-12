from datetime import datetime
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    bill_id: int | None
    message: str
    is_read: bool
    created_at: datetime
