from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    is_deleted = Column(Boolean, default=False)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    members = relationship("GroupMember", back_populates="group")
    expenses = relationship("Expense", back_populates="group")
    settlements = relationship("Settlement", back_populates="group")
    invites = relationship("GroupInvite", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="groups")

class GroupInvite(Base):
    __tablename__ = "group_invites"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    email = Column(String, index=True) # Send to email
    status = Column(String, default="PENDING") # PENDING, ACCEPTED, REJECTED, REVOKED
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="invites")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="invites_sent")
