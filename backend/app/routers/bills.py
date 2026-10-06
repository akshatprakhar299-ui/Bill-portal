from datetime import datetime, timezone
import logging
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from vercel.blob import BlobError, BlobNotFoundError

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.database.models import Bill, BillStatus, Notification, User, UserRole
from app.schemas.bill import BillResponse, RejectRequest
from app.services.bill_file_storage import (
    BLOB_FILE_PREFIX,
    bill_file_path,
    delete_bill_file,
    read_blob_file,
    store_bill_file,
)
from app.services.notification_service import notify_role


router = APIRouter(prefix="/bills", tags=["Bills"])
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def file_media_type(filename: str) -> str:
    return {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }.get(Path(filename).suffix.lower(), "application/octet-stream")


def inline_content_disposition(filename: str) -> str:
    return f"inline; filename*=UTF-8''{quote(filename, safe='')}"


async def cleanup_bill_file(file_path: str, bill_id: int) -> None:
    try:
        await delete_bill_file(file_path)
    except (BlobError, OSError):
        logger.exception("Could not clean up bill file for bill %s", bill_id)


def serialize_bill(bill: Bill) -> BillResponse:
    return BillResponse(
        id=bill.id,
        event_name=bill.event_name,
        amount=bill.amount,
        description=bill.description,
        original_filename=bill.original_filename,
        uploaded_by=bill.uploaded_by,
        uploader_name=bill.uploader.name,
        status=(
            "CHANGES_REQUESTED"
            if bill.status == BillStatus.PENDING_EXECUTIVE and bill.rejection_reason
            else bill.status.value
        ),
        rejection_reason=bill.rejection_reason,
        created_at=bill.created_at,
        executive_reviewed_at=bill.executive_reviewed_at,
        admin_reviewed_at=bill.admin_reviewed_at,
    )


def get_bill_or_404(bill_id: int, db: Session) -> Bill:
    bill = db.get(Bill, bill_id)

    if not bill:
        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    return bill


def can_view(bill: Bill, user: User) -> bool:
    return (
        user.role in {UserRole.EXECUTIVE, UserRole.ADMIN}
        or bill.uploaded_by == user.id
    )


@router.post("/upload", response_model=BillResponse)
async def upload_bill(
    event_name: str = Form(...),
    amount: float = Form(...),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.CORE:
        raise HTTPException(
            status_code=403,
            detail="Only Core Members can upload bills"
        )

    event_name = event_name.strip()

    if not event_name:
        raise HTTPException(
            status_code=400,
            detail="Event name is required"
        )

    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be greater than zero"
        )

    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Allowed files: PDF, PNG, JPG, JPEG"
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Maximum file size is 10 MB"
        )

    stored_name = f"{uuid4().hex}{extension}"
    stored_path = await store_bill_file(
        stored_name,
        content,
        file_media_type(stored_name),
    )

    bill = Bill(
        event_name=event_name,
        amount=amount,
        description=description.strip() if description else None,
        file_path=stored_path,
        original_filename=file.filename or stored_name,
        uploaded_by=current_user.id,
        status=BillStatus.PENDING_EXECUTIVE,
    )

    try:
        db.add(bill)
        db.flush()

        notify_role(
            db,
            UserRole.EXECUTIVE,
            bill.id,
            f"New bill uploaded for {bill.event_name} by {current_user.name}.",
        )

        db.commit()
    except SQLAlchemyError:
        db.rollback()
        await cleanup_bill_file(stored_path, bill.id or 0)
        raise

    db.refresh(bill)

    return serialize_bill(bill)


@router.get("/my", response_model=list[BillResponse])
def my_bills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bills = (
        db.query(Bill)
        .filter(Bill.uploaded_by == current_user.id)
        .order_by(Bill.created_at.desc())
        .all()
    )

    return [serialize_bill(b) for b in bills]


@router.get("/pending-executive", response_model=list[BillResponse])
def pending_executive(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.EXECUTIVE:
        raise HTTPException(
            status_code=403,
            detail="Executive access required"
        )

    bills = (
        db.query(Bill)
        .filter(
            Bill.status == BillStatus.PENDING_EXECUTIVE,
            Bill.rejection_reason.is_(None),
        )
        .order_by(Bill.created_at.desc())
        .all()
    )

    return [serialize_bill(b) for b in bills]


@router.get("/pending-admin", response_model=list[BillResponse])
def pending_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    bills = (
        db.query(Bill)
        .filter(Bill.status == BillStatus.PENDING_ADMIN)
        .order_by(Bill.created_at.desc())
        .all()
    )

    return [serialize_bill(b) for b in bills]


@router.get("/all", response_model=list[BillResponse])
def all_bills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    bills = (
        db.query(Bill)
        .order_by(Bill.created_at.desc())
        .all()
    )

    return [serialize_bill(b) for b in bills]


@router.get("/{bill_id}", response_model=BillResponse)
def get_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = get_bill_or_404(bill_id, db)

    if not can_view(bill, current_user):
        raise HTTPException(
            status_code=403,
            detail="You cannot view this bill"
        )

    return serialize_bill(bill)


# ============================================================
# VIEW / OPEN BILL FILE
# ============================================================

@router.get("/{bill_id}/file")
async def get_bill_file(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = get_bill_or_404(bill_id, db)

    if not can_view(bill, current_user):
        raise HTTPException(
            status_code=403,
            detail="You cannot view this file"
        )

    media_type = file_media_type(bill.original_filename)
    disposition = inline_content_disposition(bill.original_filename)

    if bill.file_path.startswith(BLOB_FILE_PREFIX):
        try:
            content = await read_blob_file(bill.file_path)
        except BlobNotFoundError as error:
            raise HTTPException(status_code=404, detail="Bill file is missing") from error

        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": disposition},
        )

    path = bill_file_path(bill.file_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Bill file is missing")

    return FileResponse(
        path=str(path),
        media_type=media_type,
        headers={"Content-Disposition": disposition},
    )


@router.post("/{bill_id}/executive-approve", response_model=BillResponse)
def executive_approve(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.EXECUTIVE:
        raise HTTPException(
            status_code=403,
            detail="Executive access required"
        )

    bill = get_bill_or_404(bill_id, db)

    if bill.status != BillStatus.PENDING_EXECUTIVE or bill.rejection_reason:
        raise HTTPException(
            status_code=400,
            detail="Bill is not pending executive approval"
        )

    bill.status = BillStatus.PENDING_ADMIN
    bill.executive_reviewed_at = datetime.now(timezone.utc)
    bill.rejection_reason = None

    notify_role(
        db,
        UserRole.ADMIN,
        bill.id,
        f"Bill for {bill.event_name} was approved by an Executive and needs final approval.",
    )

    db.commit()
    db.refresh(bill)

    return serialize_bill(bill)


@router.post("/{bill_id}/executive-request-changes", response_model=BillResponse)
def executive_request_changes(
    bill_id: int,
    request: RejectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.EXECUTIVE:
        raise HTTPException(
            status_code=403,
            detail="Executive access required"
        )

    bill = get_bill_or_404(bill_id, db)

    if bill.status != BillStatus.PENDING_EXECUTIVE or bill.rejection_reason:
        raise HTTPException(
            status_code=400,
            detail="Bill is not pending executive approval"
        )

    reason = request.reason.strip()

    if not reason:
        raise HTTPException(
            status_code=400,
            detail="Feedback is required"
        )

    bill.executive_reviewed_at = datetime.now(timezone.utc)
    bill.rejection_reason = reason

    notify_role(
        db,
        UserRole.CORE,
        bill.id,
        f"Changes requested for your bill for {bill.event_name}: {reason}",
    )

    db.commit()
    db.refresh(bill)

    return serialize_bill(bill)


@router.post("/{bill_id}/executive-reject", response_model=BillResponse)
def executive_reject(
    bill_id: int,
    request: RejectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.EXECUTIVE:
        raise HTTPException(
            status_code=403,
            detail="Executive access required"
        )

    bill = get_bill_or_404(bill_id, db)

    if bill.status != BillStatus.PENDING_EXECUTIVE or bill.rejection_reason:
        raise HTTPException(
            status_code=400,
            detail="Bill is not pending executive approval"
        )

    reason = request.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    bill.status = BillStatus.EXECUTIVE_REJECTED
    bill.executive_reviewed_at = datetime.now(timezone.utc)
    bill.rejection_reason = reason

    notify_role(
        db,
        UserRole.CORE,
        bill.id,
        f"Your bill for {bill.event_name} was rejected by an Executive: {reason}",
    )

    db.commit()
    db.refresh(bill)

    return serialize_bill(bill)


@router.post("/{bill_id}/resubmit", response_model=BillResponse)
async def resubmit_bill(
    bill_id: int,
    event_name: str = Form(...),
    amount: float = Form(...),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = get_bill_or_404(bill_id, db)

    if bill.uploaded_by != current_user.id or current_user.role != UserRole.CORE:
        raise HTTPException(
            status_code=403,
            detail="Only the Core Member who uploaded this bill can resubmit it",
        )

    if bill.status != BillStatus.PENDING_EXECUTIVE or not bill.rejection_reason:
        raise HTTPException(
            status_code=400,
            detail="This bill does not have requested changes",
        )

    event_name = event_name.strip()
    if not event_name:
        raise HTTPException(status_code=400, detail="Event name is required")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Allowed files: PDF, PNG, JPG, JPEG",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Maximum file size is 10 MB")

    old_path = bill.file_path
    stored_name = f"{uuid4().hex}{extension}"
    stored_path = await store_bill_file(
        stored_name,
        content,
        file_media_type(stored_name),
    )

    bill.event_name = event_name
    bill.amount = amount
    bill.description = description.strip() if description else None
    bill.file_path = stored_path
    bill.original_filename = file.filename or stored_name
    bill.status = BillStatus.PENDING_EXECUTIVE
    bill.rejection_reason = None
    bill.executive_reviewed_at = None

    try:
        notify_role(
            db,
            UserRole.EXECUTIVE,
            bill.id,
            f"A revised bill for {bill.event_name} has been submitted for review.",
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        await cleanup_bill_file(stored_path, bill.id)
        raise

    if old_path != stored_path:
        await cleanup_bill_file(old_path, bill.id)

    db.refresh(bill)

    return serialize_bill(bill)


@router.post("/{bill_id}/admin-approve", response_model=BillResponse)
def admin_approve(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    bill = get_bill_or_404(bill_id, db)

    if bill.status != BillStatus.PENDING_ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Bill is not pending admin approval"
        )

    bill.status = BillStatus.ADMIN_APPROVED
    bill.admin_reviewed_at = datetime.now(timezone.utc)
    bill.rejection_reason = None

    notify_role(
        db,
        UserRole.CORE,
        bill.id,
        f"Final approval completed for your bill: {bill.event_name}.",
    )

    db.commit()
    db.refresh(bill)

    return serialize_bill(bill)


@router.post("/{bill_id}/admin-reject", response_model=BillResponse)
def admin_reject(
    bill_id: int,
    request: RejectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    bill = get_bill_or_404(bill_id, db)

    if bill.status != BillStatus.PENDING_ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Bill is not pending admin approval"
        )

    reason = request.reason.strip()

    if not reason:
        raise HTTPException(
            status_code=400,
            detail="Rejection reason is required"
        )

    bill.status = BillStatus.ADMIN_REJECTED
    bill.admin_reviewed_at = datetime.now(timezone.utc)
    bill.rejection_reason = reason

    notify_role(
        db,
        UserRole.CORE,
        bill.id,
        f"Your bill for {bill.event_name} was rejected by Admin: {reason}",
    )

    db.commit()
    db.refresh(bill)

    return serialize_bill(bill)

@router.delete("/{bill_id}")
async def delete_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = get_bill_or_404(bill_id, db)

    # Admin can delete any bill
    # Core can delete only their own bills
    if current_user.role != UserRole.ADMIN and (
        current_user.role != UserRole.CORE or bill.uploaded_by != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Only Admin or the Core Member who uploaded this bill can delete it",
        )

    stored_path = bill.file_path
    db.query(Notification).filter(Notification.bill_id == bill.id).update(
        {Notification.bill_id: None},
        synchronize_session=False,
    )
    db.delete(bill)

    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Could not delete bill %s", bill_id)
        raise HTTPException(
            status_code=500,
            detail="Unable to delete this bill. Please try again.",
        ) from error

    await cleanup_bill_file(stored_path, bill_id)

    return {
        "message": "Bill deleted successfully",
        "bill_id": bill_id,
    }