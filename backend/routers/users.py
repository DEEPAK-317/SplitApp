from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import user as user_model
from ..schemas import user as user_schema
from ..auth_deps import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

# Removed Create User (handled by Auth/Register)

@router.get("/", response_model=List[user_schema.User])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    return db.query(user_model.User).offset(skip).limit(limit).all()

@router.get("/{user_id}", response_model=user_schema.User)
def read_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    db_user = db.query(user_model.User).filter(user_model.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
