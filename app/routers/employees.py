from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..security import require_authenticated, require_manager
from ..import schemas, crud

router = APIRouter()

@router.get("", response_model=List[schemas.EmployeeOut])
def list_(db: Session = Depends(get_db), _=Depends(require_authenticated)):
    return crud.list_employees(db)

@router.post("", response_model=schemas.EmployeeOut)
def create(data: schemas.EmployeeCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    return crud.create_employee(db, data)

@router.put("/{emp_id}", response_model=schemas.EmployeeOut)
def update(emp_id: int, data: schemas.EmployeeUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    obj = crud.get_employee(db, emp_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Employee not found")
    return crud.update_employee(db, obj, data)

@router.delete("/{emp_id}")
def delete(emp_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    obj = crud.get_employee(db, emp_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Employee not found")
    crud.delete_employee(db, obj)
    return {"status": "ok"}
