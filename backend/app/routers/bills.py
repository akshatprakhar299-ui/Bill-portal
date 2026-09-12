from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.database.models import Bill, BillStatus, User, UserRole
from app.schemas.bill import BillResponse, RejectRequest
from app.services.notification_service import notify_role


router = APIRouter(prefix="/bills", tags=["Bills"])

UPLOAD_DIR = Path("uploads/bills")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def serialize_bill(bill: Bill) -> BillResponse:
    return BillResponse(
        id=bill.id,
        event_name=bill.event_name,
        amount=bill.amount,
        description=bill.description,
        original_filename=bill.original_filename,
        uploaded_by=bill.uploaded_by,
        uploader_name=bill.uploader.name,
        status=bill.status.value,
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
def upload_bill(
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

    content = file.file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Maximum file size is 10 MB"
        )

    stored_name = f"{uuid4().hex}{extension}"
    stored_path = UPLOAD_DIR / stored_name

    stored_path.write_bytes(content)

    bill = Bill(
        event_name=event_name,
        amount=amount,
        description=description.strip() if description else None,
        file_path=str(stored_path),
        original_filename=file.filename or stored_name,
        uploaded_by=current_user.id,
        status=BillStatus.PENDING_EXECUTIVE,
    )

    db.add(bill)
    db.flush()

    notify_role(
        db,
        UserRole.EXECUTIVE,
        bill.id,
        f"New bill uploaded for {bill.event_name} by {current_user.name}.",
    )

    db.commit()
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
        .filter(Bill.status == BillStatus.PENDING_EXECUTIVE)
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
def get_bill_file(
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

    path = Path(bill.file_path)

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="Bill file is missing"
        )

    extension = path.suffix.lower()

    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }

    media_type = media_types.get(
        extension,
        "application/octet-stream"
    )

    return FileResponse(
        path=str(path),
        media_type=media_type,
        headers={
            "Content-Disposition": (
                f'inline; filename="{bill.original_filename}"'
            )
        },
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

    if bill.status != BillStatus.PENDING_EXECUTIVE:
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

    if bill.status != BillStatus.PENDING_EXECUTIVE:
        raise HTTPException(
            status_code=400,
            detail="Bill is not pending executive approval"
        )

    reason = request.reason.strip()

    if not reason:
        raise HTTPException(
            status_code=400,
            detail="Rejection reason is required"
        )

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
def delete_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = get_bill_or_404(bill_id, db)

    # Admin can delete any bill
    # Core can delete only their own bills
    if current_user.role != UserRole.ADMIN:
        if bill.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own bills",
            )

    # Delete the uploaded file from disk
    path = Path(bill.file_path)

    if path.exists():
        try:
            path.unlink()
        except OSError:
            pass

    # Delete the bill from database
    db.delete(bill)
    db.commit()

    return {
        "message": "Bill deleted successfully",
        "bill_id": bill_id,
    }