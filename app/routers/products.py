from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..security import require_authenticated, require_manager
from ..import schemas, crud

router = APIRouter()

@router.get("", response_model=List[schemas.ProductOut])
def list_(db: Session = Depends(get_db), _=Depends(require_authenticated)):
    return crud.list_products(db)

@router.post("", response_model=schemas.ProductOut)
def create(data: schemas.ProductCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    return crud.create_product(db, data)

@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_(product_id: int, db: Session = Depends(get_db), _=Depends(require_authenticated)):
    obj = crud.get_product(db, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Product not found")
    return obj

@router.put("/{product_id}", response_model=schemas.ProductOut)
def update(product_id: int, data: schemas.ProductUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    obj = crud.get_product(db, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Product not found")
    return crud.update_product(db, obj, data)

@router.delete("/{product_id}")
def delete(product_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    obj = crud.get_product(db, product_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Product not found")
    crud.delete_product(db, obj)
    return {"status": "ok"}

# === Inventory bulk ===
@router.post("/inventory", response_model=List[schemas.ProductOut])
def inventory_bulk(payload: schemas.InventoryBulkRequest, db: Session = Depends(get_db), _=Depends(require_manager)):
    return crud.apply_inventory(db, payload.items)

# === Stock movements ===
@router.post("/{product_id}/stock_in", response_model=schemas.ProductWithMovements)
def stock_in(
    product_id: int,
    body: schemas.StockMovementBase,
    db: Session = Depends(get_db),
    _ = Depends(require_manager),
):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # body.delta è già > 0 per validazione schema
    product, _ = crud.add_stock(
        db,
        product,
        body.delta,
        reason=body.reason or "stock_in",
        note=body.note,
    )
    mvs = crud.list_movements(db, product_id)
    return schemas.ProductWithMovements(
        **schemas.ProductOut.model_validate(product).model_dump(),
        movements=mvs,
    )

@router.post("/{product_id}/stock_out", response_model=schemas.ProductWithMovements)
def stock_out(
    product_id: int,
    body: schemas.StockMovementBase,
    db: Session = Depends(get_db),
    _ = Depends(require_manager),
):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Verifica che non andiamo sotto zero
    crud.ensure_stock_can_decrease(product, body.delta)

    # Applichiamo lo scarico come delta negativo
    product, _ = crud.add_stock(
        db,
        product,
        -body.delta,
        reason=body.reason or "stock_out",
        note=body.note,
    )
    mvs = crud.list_movements(db, product_id)
    return schemas.ProductWithMovements(
        **schemas.ProductOut.model_validate(product).model_dump(),
        movements=mvs,
    )

@router.get("/{product_id}/movements", response_model=List[schemas.StockMovementOut])
def movements(product_id: int, db: Session = Depends(get_db), _=Depends(require_authenticated)):
    return crud.list_movements(db, product_id)
