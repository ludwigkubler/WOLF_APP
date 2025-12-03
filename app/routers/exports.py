from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from io import StringIO
import csv
from ..database import get_db
from ..security import require_manager
from ..import models

router = APIRouter()

@router.get("/products.csv")
def products_csv(db: Session = Depends(get_db), _=Depends(require_manager)):
    rows = db.query(models.Product).order_by(models.Product.name).all()
    buf = StringIO()
    w = csv.writer(buf, delimiter=';')
    w.writerow(["id","name","sku","quantity","unit","price_cents","supplier","expiry_date","min_quantity","is_active","vat_rate","discount_percent"])
    for p in rows:
        w.writerow([p.id,p.name,p.sku,p.quantity,p.unit,p.price_cents,p.supplier,
                    p.expiry_date.isoformat() if p.expiry_date else "", p.min_quantity,
                    1 if p.is_active else 0, p.vat_rate, p.discount_percent])
    return Response(content=buf.getvalue(), media_type="text/csv")
