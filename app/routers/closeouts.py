from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
import json
from ..database import get_db
from ..security import require_authenticated, require_manager
from ..import schemas, crud, models

router = APIRouter()

DENOMS = [0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50]

def _as_out(obj: models.Closeout) -> schemas.CloseoutOut:
    cash = {}
    try:
        raw = json.loads(obj.cash_counts or "{}")
        for d in DENOMS:
            k = f"{d:.2f}" if d < 1 else str(int(d))
            cash[k] = int(raw.get(k, 0) or 0)
    except Exception:
        pass

    cash_total_cents = sum(int(round(d*100))*cash.get((f"{d:.2f}" if d<1 else str(int(d))), 0) for d in DENOMS)

    bottles = []
    kegs = []
    try: bottles = json.loads(obj.bottles_finished or "[]")
    except Exception: pass
    try: kegs = json.loads(obj.kegs_finished or "[]")
    except Exception: pass

    return schemas.CloseoutOut(
        id=obj.id,
        date=obj.date,
        created_at=obj.created_at,
        created_by=obj.created_by,
        cash=cash,
        cash_total_eur=round(cash_total_cents/100.0, 2),
        pos_eur=round((obj.pos_amount_cents or 0)/100.0, 2),
        satispay_eur=round((obj.satispay_amount_cents or 0)/100.0, 2),
        bottles_finished=bottles,
        kegs_finished=kegs,
        notes=obj.notes,
    )

@router.post("", response_model=schemas.CloseoutOut)
def create_closeout(payload: schemas.CloseoutCreate, user=Depends(require_manager), db: Session = Depends(get_db)):
    obj = crud.create_closeout(db, payload, created_by=getattr(user, "username", None))
    return _as_out(obj)

@router.get("", response_model=list[schemas.CloseoutOut])
def list_closeouts(
    start: date | None = Query(None),
    end: date | None = Query(None),
    _=Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    rows = crud.list_closeouts(db, start, end)
    return [_as_out(r) for r in rows]

@router.get("/{closeout_id}", response_model=schemas.CloseoutOut)
def get_closeout(closeout_id: int, _=Depends(require_authenticated), db: Session = Depends(get_db)):
    obj = crud.get_closeout(db, closeout_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Closeout non trovato")
    return _as_out(obj)
