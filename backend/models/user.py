from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)

    # Relationships
    groups = relationship("GroupMember", back_populates="user")
    invites_sent = relationship("GroupInvite", foreign_keys="GroupInvite.sender_id", back_populates="sender")
    expenses_paid = relationship("Expense", back_populates="payer")
    expense_splits = relationship("ExpenseSplit", back_populates="user")
    settlements_paid = relationship("Settlement", foreign_keys="Settlement.from_user_id", back_populates="payer")
    settlements_received = relationship("Settlement", foreign_keys="Settlement.to_user_id", back_populates="receiver")
