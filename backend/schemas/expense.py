from pydantic import BaseModel, validator
from typing import List, Optional, Dict
from datetime import datetime

class ExpenseSplitCreate(BaseModel):
    user_id: int
    amount: Optional[float] = None # For Exact
    percentage: Optional[float] = None # For Percentage

class ExpenseCreate(BaseModel):
    group_id: int
    description: str
    amount: float
    paid_by_user_id: int
    split_type: str # EQUAL, EXACT, PERCENTAGE
    category: Optional[str] = "General"
    splits: List[ExpenseSplitCreate] = []

    @validator('split_type')
    def validate_split_type(cls, v):
        if v not in ('EQUAL', 'EXACT', 'PERCENTAGE'):
            raise ValueError('Invalid split type. Must be EQUAL, EXACT, or PERCENTAGE')
        return v

class ExpenseSplit(BaseModel):
    user_id: int
    amount_owed: float
    status: Optional[str] = "PENDING"
    user_name: Optional[str] = None # Helper

    class Config:
        orm_mode = True

class Expense(BaseModel):
    id: int
    group_id: int
    description: str
    amount: float
    paid_by_user_id: int
    created_at: datetime
    split_type: str
    category: str
    is_deleted: bool
    splits: List[ExpenseSplit] = []

    class Config:
        orm_mode = True

class SettlementCreate(BaseModel):
    group_id: int
    from_user_id: int
    to_user_id: int
    amount: float
    status: Optional[str] = "PENDING"

class Settlement(SettlementCreate):
    id: int
    created_at: datetime
    status: str
    
    class Config:
        orm_mode = True
