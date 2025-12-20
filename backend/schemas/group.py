from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .user import User

class GroupBase(BaseModel):
    name: str

class GroupCreate(GroupBase):
    pass

class InviteBase(BaseModel):
    email: str

class InviteCreate(InviteBase):
    pass

class Invite(InviteBase):
    id: int
    group_id: int
    sender_id: int
    status: str
    created_at: datetime
    group_name: Optional[str] = None # For display

    class Config:
        orm_mode = True

class Group(GroupBase):
    id: int
    owner_id: int
    is_deleted: bool
    members: List[User] = []
    # invites: List[Invite] = [] # Optional to include

    class Config:
        orm_mode = True

class AddMember(BaseModel):
    user_id: int
