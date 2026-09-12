from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    CORE = "CORE"
    EXECUTIVE = "EXECUTIVE"
    ADMIN = "ADMIN"


class BillStatus(str, Enum):
    PENDING_EXECUTIVE = "PENDING_EXECUTIVE"
    EXECUTIVE_REJECTED = "EXECUTIVE_REJECTED"
    PENDING_ADMIN = "PENDING_ADMIN"
    ADMIN_APPROVED = "ADMIN_APPROVED"
    ADMIN_REJECTED = "ADMIN_REJECTED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    bills: Mapped[list["Bill"]] = relationship(back_populates="uploader")


class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)

    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[BillStatus] = mapped_column(
        SAEnum(BillStatus), nullable=False, default=BillStatus.PENDING_EXECUTIVE, index=True
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    executive_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    admin_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    uploader: Mapped["User"] = relationship(back_populates="bills")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="bill")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    bill_id: Mapped[int | None] = mapped_column(ForeignKey("bills.id"), nullable=True)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    is_read: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    bill: Mapped["Bill | None"] = relationship(back_populates="notifications")
