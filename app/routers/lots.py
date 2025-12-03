from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..security import require_authenticated, require_manager
from ..import schemas, crud


router = APIRouter()

@router.get("/product/{product_id}", response_model=List[schemas.LotOut])
def list_product_lots(
    product_id: int,
    location: str | None = Query(None),
    db: Session = Depends(get_db),
    _ = Depends(require_authenticated),
):
    return crud.list_lots(db, product_id, location=location)


@router.post("/product/{product_id}", response_model=schemas.LotOut)
def create_product_lot(product_id: int, body: schemas.LotCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    return crud.create_lot(db, product_id, body)

@router.put("/{lot_id}", response_model=schemas.LotOut)
def update_lot(lot_id: int, body: schemas.LotUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    lot = crud.update_lot(db, lot_id, body)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    return lot

@router.delete("/{lot_id}")
def delete_lot(lot_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    ok = crud.delete_lot(db, lot_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Lot not found")
    return {"status": "ok"}

@router.get("/search/by-code", response_model=List[schemas.LotWithProductOut])
def search_by_code(
    lot_code: str = Query(..., min_length=1),
    location: str | None = Query(None),
    db: Session = Depends(get_db),
    _ = Depends(require_authenticated),
):
    """
    Ricerca lotti per codice lotto (globale, su tutti i prodotti).
    Opzionale filtro per location.
    """
    lots = crud.search_lots_by_code(db, lot_code=lot_code, location=location)

    results: list[schemas.LotWithProductOut] = []
    for l in lots:
        results.append(
            schemas.LotWithProductOut(
                id=l.id,
                product_id=l.product_id,
                lot_code=l.lot_code,
                supplier=l.supplier,
                expiry_date=l.expiry_date,
                quantity=l.quantity,
                cost_cents=l.cost_cents,
                location=l.location,
                status=l.status,
                block_reason=l.block_reason,
                created_at=l.created_at,
                product_name=l.product.name if l.product else "",
            )
        )
    return results