# create_manager.py
from app.database import SessionLocal
from app.models import User
from app.security import hash_password

USERNAME = "manager"
PASSWORD = "password"      # cambia dopo il primo accesso!

db = SessionLocal()
u = db.query(User).filter(User.username == USERNAME).first()
if not u:
    u = User(
        username=USERNAME,
        role="manager",
        is_active=True,
    )
    db.add(u)
# Per sicurezza scriviamo su entrambi i campi possibili:
bcrypt_hash = hash_password(PASSWORD)
if hasattr(u, "password_hash"):
    u.password_hash = bcrypt_hash
if hasattr(u, "hashed_password"):
    u.hashed_password = bcrypt_hash

db.commit()
db.close()
print("OK: utente manager pronto.")
