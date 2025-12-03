from app.database import SessionLocal
from app import models, security

db = SessionLocal()

Model = None
if hasattr(models, "Employee"):
    Model = models.Employee
elif hasattr(models, "User"):
    Model = models.User
else:
    raise SystemExit("Né models.Employee né models.User trovati")

u = db.query(Model).filter(Model.username=="manager").first()
if not u:
    u = Model(username="manager", role="manager")
if hasattr(u, "is_active"):
    try:
        u.is_active = True
    except Exception:
        pass
u.hashed_password = security.get_password_hash("NuovaPasswordForte")
db.add(u)
db.commit()
print("OK:", Model.__name__)
