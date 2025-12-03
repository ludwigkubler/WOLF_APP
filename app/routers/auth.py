from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from ..database import get_db
from ..import schemas, crud
from ..security import verify_password, create_access_token, hash_password, require_authenticated

router = APIRouter()

@router.post("/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, data.username)
    if not user:
        raise HTTPException(status_code=400, detail="Username o password non validi")
    ok = verify_password(data.password, user.password_hash)
    # fallback legacy (solo se il DB aveva password in chiaro o altro meccanismo)
    if not ok and user.hashed_password and data.password == user.hashed_password:
        ok = True
    if not ok:
        raise HTTPException(status_code=400, detail="Username o password non validi")

    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

# Supporto Swagger: form-data grant
@router.post("/token")
def token(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, form.username)
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Username o password non validi")
    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def me(user = Depends(require_authenticated)):
    return user
