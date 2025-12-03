import json
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from datetime import date
from . import models, schemas
from fastapi import HTTPException

# ===== USERS =====
def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, username: str, password_hash: str, role: str = "staff") -> models.User:
    u = models.User(username=username, password_hash=password_hash, role=role, is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

# ===== PRODUCTS =====
def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
    obj = models.Product(
        name=data.name,
        sku=data.sku,
        price_cents=data.price_cents,
        unit=data.unit,
        quantity=data.quantity,
        min_quantity=data.min_quantity,
        is_active=data.is_active,
        supplier=data.supplier,
        expiry_date=data.expiry_date,
        vat_rate=data.vat_rate,
        discount_percent=data.discount_percent,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_products(db: Session):
    return db.query(models.Product).order_by(models.Product.name).all()

def get_product(db: Session, product_id: int) -> models.Product | None:
    return db.get(models.Product, product_id)

def update_product(db: Session, product: models.Product, data: schemas.ProductUpdate) -> models.Product:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(product, k, v)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

def delete_product(db: Session, product: models.Product) -> None:
    db.delete(product)
    db.commit()

# ===== LOTS =====
def list_lots(db: Session, product_id: int, location: str | None = None):
    q = db.query(models.Lot).filter(models.Lot.product_id == product_id)
    if location is not None:
        q = q.filter(models.Lot.location == location)

    return q.order_by(
        models.Lot.expiry_date.is_(None),
        models.Lot.expiry_date.asc(),
        models.Lot.id.asc()
    ).all()


def create_lot(db: Session, product_id: int, data: schemas.LotCreate) -> models.Lot:
    lot = models.Lot(product_id=product_id, **data.model_dump())
    db.add(lot)
    db.commit()
    db.refresh(lot)
    # riallinea la giacenza totale del prodotto con la somma dei lotti
    recalc_product_quantity_from_lots(db, product_id)
    return lot


def update_lot(db: Session, lot_id: int, data: schemas.LotUpdate) -> models.Lot | None:
    lot = db.query(models.Lot).get(lot_id)
    if not lot:
        return None

    old_product_id = lot.product_id

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(lot, k, v)

    db.add(lot)
    db.commit()
    db.refresh(lot)

    # se in futuro permetti spostamento di lotto su altro prodotto:
    recalc_product_quantity_from_lots(db, old_product_id)
    if lot.product_id != old_product_id:
        recalc_product_quantity_from_lots(db, lot.product_id)

    return lot


def delete_lot(db: Session, lot_id: int) -> bool:
    lot = db.query(models.Lot).get(lot_id)
    if not lot:
        return False

    product_id = lot.product_id
    db.delete(lot)
    db.commit()

    recalc_product_quantity_from_lots(db, product_id)
    return True


def sum_lots_quantity(db: Session, product_id: int) -> float:
    q = db.query(func.coalesce(func.sum(models.Lot.quantity), 0.0)).filter(
        models.Lot.product_id == product_id
    )
    return float(q.scalar() or 0.0)


def consume_product_fefo(db: Session, product_id: int, quantity: float):
    """Scarico quantità per FEFO (prima scadenza)."""
    remaining = float(quantity)
    used: list[tuple[int, float]] = []
    q = db.query(models.Lot).filter(models.Lot.product_id == product_id).order_by(
        models.Lot.expiry_date.is_(None), models.Lot.expiry_date.asc(), models.Lot.id.asc()
    )
    for lot in q:
        if remaining <= 0:
            break
        take = min(lot.quantity, remaining)
        if take > 0:
            lot.quantity -= take
            used.append((lot.id, take))
            remaining -= take
    db.commit()
    # riallinea quantità totale prodotto
    recalc_product_quantity_from_lots(db, product_id)
    return used, remaining

def search_lots_by_code(db: Session, lot_code: str, location: str | None = None):
    """
    Ricerca globale di lotti per codice lotto.
    Opzionale filtro per location.
    """
    q = db.query(models.Lot).join(models.Product).filter(models.Lot.lot_code == lot_code)
    if location is not None:
        q = q.filter(models.Lot.location == location)

    return q.order_by(
        models.Product.name.asc(),
        models.Lot.location.asc(),
        models.Lot.expiry_date.is_(None),
        models.Lot.expiry_date.asc(),
        models.Lot.id.asc(),
    ).all()


def recalc_product_quantity_from_lots(db: Session, product_id: int) -> float:
    """
    Ricalcola products.quantity come somma dei lotti di quel prodotto.
    Ritorna il totale calcolato.
    """
    total = sum_lots_quantity(db, product_id)
    product = db.get(models.Product, product_id)
    if product:
        product.quantity = total
        db.add(product)
        db.commit()
        db.refresh(product)
    return total

# ===== INVENTORY =====
def apply_inventory(db: Session, items: list[schemas.InventoryItem]):
    ids = [it.id for it in items]
    products = db.query(models.Product).filter(models.Product.id.in_(ids)).all()
    by_id = {it.id: float(it.quantity) for it in items}
    for p in products:
        p.quantity = by_id.get(p.id, p.quantity)
        db.add(p)
    db.commit()
    for p in products:
        db.refresh(p)
    return products

# ===== STOCK MOVEMENTS =====

def create_stock_movement(db: Session, data: schemas.StockMovementCreate) -> models.StockMovement:
    """
    Crea un movimento di magazzino.

    NON tocca ancora le quantità dei prodotti/lotti: per ora ci limitiamo
    alla tracciatura storica. Più avanti potremo fare in modo che ogni
    funzione di carico/scarico chiami SEMPRE questo helper.
    """
    mv = models.StockMovement(
        product_id=data.product_id,
        lot_id=data.lot_id,
        from_location=data.from_location,
        to_location=data.to_location,
        quantity=data.quantity,
        movement_type=data.movement_type,
        document_ref=data.document_ref,
        user_id=data.user_id,
    )
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv


def list_movements(
    db: Session,
    product_id: int | None = None,
    lot_id: int | None = None,
    limit: int = 200,
):
    """
    Lista movimenti di magazzino:

    - se product_id è impostato, filtra per prodotto;
    - se lot_id è impostato, filtra per lotto;
    - altrimenti ritorna gli ultimi 'limit' movimenti globali.
    """
    q = db.query(models.StockMovement)

    if product_id is not None:
        q = q.filter(models.StockMovement.product_id == product_id)
    if lot_id is not None:
        q = q.filter(models.StockMovement.lot_id == lot_id)

    return (
        q.order_by(models.StockMovement.created_at.desc(), models.StockMovement.id.desc())
        .limit(limit)
        .all()
    )

# ===== UTILITY =====
def ensure_stock_can_decrease(product: models.Product, requested_delta: float) -> None:
    """
    Verifica che un'uscita di magazzino non mandi la giacenza sotto zero.
    requested_delta è sempre > 0 (quantità da scalare).
    """
    if requested_delta < 0:
        raise ValueError("requested_delta deve essere positivo")

    if product.quantity is None:
        current = 0.0
    else:
        current = float(product.quantity)

    if requested_delta > current:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insufficiente per il prodotto {product.id}: "
                   f"richiesti {requested_delta}, disponibili {current}",
        )
# ===== EMPLOYEES =====
def create_employee(db: Session, data: schemas.EmployeeCreate) -> models.Employee:
    obj = models.Employee(
        full_name=data.full_name,
        role=data.role,
        phone=data.phone,
        email=data.email,
        is_active=data.is_active,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_employees(db: Session):
    return db.query(models.Employee).order_by(models.Employee.full_name).all()

def get_employee(db: Session, emp_id: int) -> models.Employee | None:
    return db.get(models.Employee, emp_id)

def update_employee(db: Session, emp: models.Employee, data: schemas.EmployeeUpdate) -> models.Employee:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(emp, k, v)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

def delete_employee(db: Session, emp: models.Employee):
    db.delete(emp)
    db.commit()

# ===== CLOSEOUTS =====
def create_closeout(db: Session, payload: schemas.CloseoutCreate, created_by: str | None = None) -> models.Closeout:
    cash = payload.cash or {}
    bottles = payload.bottles_finished or []
    kegs = payload.kegs_finished or []
    obj = models.Closeout(
        date=payload.date or date.today(),
        cash_counts=json.dumps(cash, ensure_ascii=False),
        bottles_finished=json.dumps(bottles, ensure_ascii=False),
        kegs_finished=json.dumps(kegs, ensure_ascii=False),
        pos_amount_cents=int(round((payload.pos_eur or 0.0) * 100)),
        satispay_amount_cents=int(round((payload.satispay_eur or 0.0) * 100)),
        notes=payload.notes,
        created_by=created_by,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_closeouts(db: Session, start: date | None, end: date | None):
    q = db.query(models.Closeout)
    if start:
        q = q.filter(models.Closeout.date >= start)
    if end:
        q = q.filter(models.Closeout.date <= end)
    return q.order_by(models.Closeout.date.desc(), models.Closeout.id.desc()).all()

def get_closeout(db: Session, closeout_id: int) -> models.Closeout | None:
    return db.get(models.Closeout, closeout_id)
