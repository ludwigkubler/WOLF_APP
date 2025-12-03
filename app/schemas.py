from __future__ import annotations
from typing import Optional, List, Literal
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

ORM = ConfigDict(from_attributes=True)

# ===== USERS =====
class UserBase(BaseModel):
    username: str
    role: Literal["manager", "staff"] = "staff"
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(UserBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ORM

# ===== PRODUCTS =====
class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    price_cents: int = Field(0, ge=0)
    unit: str = Field("pz", min_length=1)
    min_quantity: float = Field(0.0, ge=0)
    is_active: bool = True
    supplier: Optional[str] = None
    expiry_date: Optional[date] = None
    vat_rate: int = Field(22)
    discount_percent: float = Field(0, ge=0, le=100)

class ProductCreate(ProductBase):
    quantity: float = Field(0.0, ge=0)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    price_cents: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = None
    min_quantity: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None
    supplier: Optional[str] = None
    expiry_date: Optional[date] = None
    quantity: Optional[float] = Field(None, ge=0)
    vat_rate: Optional[int] = None
    discount_percent: Optional[float] = Field(None, ge=0, le=100)

class ProductOut(ProductBase):
    id: int
    quantity: float
    model_config = ORM

# ===== INVENTORY BULK =====
class InventoryItem(BaseModel):
    id: int
    quantity: float = Field(0.0, ge=0)

class InventoryBulkRequest(BaseModel):
    items: List[InventoryItem]

# ===== STOCK MOVEMENTS =====

# Tipi "semantici" per location e tipo movimento
StockLocation = Literal["generale", "banco", "cantina"]
MovementType = Literal[
    "PURCHASE",            # carico da fornitore
    "INVENTORY_ADJUST",    # rettifica inventario
    "TRANSFER",            # spostamento interno
    "SALE",                # vendita
    "WASTE",               # scarto / rottura / perdita
    "RETURN_TO_SUPPLIER",  # reso a fornitore
]

class StockMovementBase(BaseModel):
    product_id: int
    lot_id: Optional[int] = None

    from_location: Optional[StockLocation] = None
    to_location: Optional[StockLocation] = None

    quantity: float = Field(..., gt=0, description="Quantità sempre positiva")

    movement_type: MovementType
    document_ref: Optional[str] = Field(
        default=None,
        description="Riferimento documento (DDT, fattura, scontrino, comanda, ecc.)",
    )

    user_id: Optional[int] = None


class StockMovementCreate(StockMovementBase):
    """
    Payload completo per creare un movimento.
    In futuro potremo avere varianti più specifiche (es. per singolo prodotto/lotto).
    """
    pass


class StockMovementOut(StockMovementBase):
    id: int
    created_at: datetime
    model_config = ORM


class ProductWithMovements(ProductOut):
    movements: List[StockMovementOut] = Field(default_factory=list)

# ===== LOTS =====
class LotBase(BaseModel):
    lot_code: str = Field(..., min_length=1, max_length=100)
    supplier: Optional[str] = None
    expiry_date: Optional[date] = None
    quantity: float = Field(0.0, ge=0)
    cost_cents: Optional[int] = Field(None, ge=0)
    # magazzino del lotto
    location: Literal["generale", "banco", "cantina"] = "generale"
    # stato logistico
    status: Literal["ok", "blocked", "discarded"] = "ok"
    block_reason: Optional[str] = None


class LotCreate(LotBase):
    pass


class LotUpdate(BaseModel):
    lot_code: Optional[str] = Field(None, min_length=1, max_length=100)
    supplier: Optional[str] = None
    expiry_date: Optional[date] = None
    quantity: Optional[float] = Field(None, ge=0)
    cost_cents: Optional[int] = Field(None, ge=0)
    location: Optional[Literal["generale", "banco", "cantina"]] = None
    status: Optional[Literal["ok", "blocked", "discarded"]] = None
    block_reason: Optional[str] = None


class LotOut(LotBase):
    id: int
    product_id: int
    created_at: Optional[datetime] = None
    model_config = ORM


class LotWithProductOut(LotOut):
    product_name: str

# ===== EMPLOYEES =====
class EmployeeBase(BaseModel):
    full_name: str
    role: str = "staff"
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

class EmployeeOut(EmployeeBase):
    id: int
    hired_at: date
    model_config = ORM

# ===== CLOSEOUTS =====
class CloseoutCreate(BaseModel):
    date: Optional[date] = None
    cash: dict[str, int] = Field(default_factory=dict)         # {"0.01":3,"0.02":0,}
    bottles_finished: List[str] = Field(default_factory=list)
    kegs_finished: List[str] = Field(default_factory=list)
    pos_eur: float = 0.0
    satispay_eur: float = 0.0
    notes: Optional[str] = None

class CloseoutOut(BaseModel):
    id: int
    date: date
    created_at: datetime
    created_by: Optional[str] = None
    cash: dict[str, int]
    cash_total_eur: float
    pos_eur: float
    satispay_eur: float
    bottles_finished: List[str]
    kegs_finished: List[str]
    notes: Optional[str] = None
    model_config = ORM
