from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, Date, func
)
from sqlalchemy.orm import relationship
from datetime import datetime, date
from .database import Base

# === Products & Stock Movements ===
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True, index=True)
    sku = Column(String(100), nullable=True, unique=True, index=True)
    price_cents = Column(Integer, nullable=False, default=0)
    unit = Column(String(20), nullable=False, default="pz")
    quantity = Column(Float, nullable=False, default=0.0)
    min_quantity = Column(Float, nullable=False, default=0.0)
    is_active = Column(Boolean, nullable=False, default=True)
    supplier = Column(String(200), nullable=True)
    expiry_date = Column(Date, nullable=True)
    vat_rate = Column(Integer, nullable=False, default=22)
    discount_percent = Column(Float, nullable=False, default=0.0)

    movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")


class Lot(Base):
    __tablename__ = "lots"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    # codice alfanumerico del produttore
    lot_code = Column(String(100), nullable=False, default="", server_default="")

    supplier = Column(String, nullable=True)
    expiry_date = Column(Date, nullable=True)
    quantity = Column(Float, nullable=False, default=0.0)
    cost_cents = Column(Integer, nullable=True)

    # magazzino del lotto
    location = Column(String(20), nullable=False, default="generale", server_default="generale")

    # stato del lotto: ok (utilizzabile), blocked (bloccato), discarded (scartato)
    status = Column(String(20), nullable=False, default="ok", server_default="ok")
    block_reason = Column(String(255), nullable=True)

    created_at = Column(DateTime, server_default=func.current_timestamp())

    product = relationship("Product", backref="lots")

class StockMovement(Base):
    """
    Movimento di magazzino.

    Registra ogni variazione di stock:
    - carichi (acquisti, inventario, resi da cliente)
    - scarichi (vendite, scarti, resi a fornitore)
    - trasferimenti tra magazzini
    """

    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)

    # Oggetto del movimento
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    lot_id = Column(Integer, ForeignKey("lots.id", ondelete="SET NULL"), nullable=True)

    # Da dove a dove si muove lo stock
    # Esempi:
    #   None        -> "cantina"   : carico in cantina
    #   "cantina"   -> "banco"     : trasferimento interno
    #   "banco"     -> None        : scarico (vendita/scarto)
    from_location = Column(String(20), nullable=True)
    to_location = Column(String(20), nullable=True)

    # Quantità sempre positiva; il "segno" lo deduci da from/to
    quantity = Column(Float, nullable=False, default=0.0)

    # Tipo di movimento (semantica di business)
    # es. "PURCHASE", "INVENTORY_ADJUST", "TRANSFER", "SALE", "WASTE", "RETURN_TO_SUPPLIER"
    movement_type = Column(String(30), nullable=False)

    # Riferimento a documento esterno (DDT, fattura, scontrino, comanda, ecc.)
    document_ref = Column(String(100), nullable=True)

    # Chi ha fatto l’operazione (se conosciuto)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())

    # Relazioni per comodo
    product = relationship("Product", backref="stock_movements")
    lot = relationship("Lot", backref="stock_movements")
    user = relationship("User", backref="stock_movements")


# === Employees ===
class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False, index=True)
    role = Column(String(50), nullable=False, default="staff")
    phone = Column(String(50), nullable=True)
    email = Column(String(200), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    hired_at = Column(Date, nullable=False, default=date.today)


# === Closeouts ===
class Closeout(Base):
    __tablename__ = "closeouts"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, default=date.today, nullable=False)

    # JSON testuali (serializzati nel router)
    cash_counts = Column(Text, nullable=False, default="{}")
    bottles_finished = Column(Text, nullable=True, default="[]")
    kegs_finished = Column(Text, nullable=True, default="[]")

    pos_amount_cents = Column(Integer, nullable=False, default=0)
    satispay_amount_cents = Column(Integer, nullable=False, default=0)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(String(100), nullable=True)


# === Users (compatibile con il tuo DB esistente) ===
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)

    # entrambi presenti per retrocompatibilità
    password_hash = Column(String(255), nullable=True)   # nuovo (bcrypt)
    hashed_password = Column(String, nullable=True)      # legacy

    role = Column(String(20), nullable=False, default="staff")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
