from app.core.security import hash_password
from app.database.database import Base, SessionLocal, engine
from app.database.models import User, UserRole

Base.metadata.create_all(bind=engine)

db = SessionLocal()

users = [
    ("ACES Core Member", "core@aces.com", "Core@123", UserRole.CORE),
    ("ACES Executive", "executive@aces.com", "Executive@123", UserRole.EXECUTIVE),
    ("Dswapnil Patil", "admin@aces.com", "Admin@123", UserRole.ADMIN),
]

for name, email, password, role in users:
    existing = db.query(User).filter(User.email == email).first()
    if not existing:
        db.add(
            User(
                name=name,
                email=email,
                password_hash=hash_password(password),
                role=role,
            )
        )

db.commit()
db.close()

print("\nACES demo users created/verified.")
print("CORE      : core@aces.com / Core@123")
print("EXECUTIVE : executive@aces.com / Executive@123")
print("ADMIN     : admin@aces.com / Admin@123\n")
