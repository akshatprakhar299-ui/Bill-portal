from sqlalchemy.orm import Session

from app.database.models import Notification, User, UserRole


def notify_role(db: Session, role: UserRole, bill_id: int, message: str):
    users = db.query(User).filter(User.role == role).all()
    for user in users:
        db.add(Notification(user_id=user.id, bill_id=bill_id, message=message))
