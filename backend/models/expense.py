from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    description = Column(String)
    amount = Column(Float)
    paid_by_user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    split_type = Column(String) # EQUAL, EXACT, PERCENTAGE
    category = Column(String, default="General")
    is_deleted = Column(Boolean, default=False)

    # Relationships
    group = relationship("Group", back_populates="expenses")
    payer = relationship("User", back_populates="expenses_paid")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    amount_owed = Column(Float)
    status = Column(String, default="PENDING") # PENDING, DECLINED, PAID

    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="expense_splits")

class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    from_user_id = Column(Integer, ForeignKey("users.id"))
    to_user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="PENDING") # PENDING, CONFIRMED, DECLINED

    group = relationship("Group", back_populates="settlements")
    payer = relationship("User", foreign_keys=[from_user_id], back_populates="settlements_paid")
    receiver = relationship("User", foreign_keys=[to_user_id], back_populates="settlements_received")
