from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import group as group_model, user as user_model
from ..schemas import group as group_schema
from ..auth_deps import get_current_user

router = APIRouter(
    prefix="/invites",
    tags=["invites"],
)

@router.post("/", response_model=group_schema.Invite)
def send_invite(
    # We need group_id and email. Usually in body.
    # Creating a schema for InviteRequest
    invite_req: group_schema.InviteCreate, # Only has email? We need group_id too.
    group_id: int, # Pass as query or part of path? Or body?
    # Let's use path: /groups/{id}/invite
    # Wait, this router is /invites. 
    # Let's change design: POST /groups/{id}/invites
    # But for "Accept/Reject", meaningful resource is /invites/{id}/accept
    
    # Let's keep /invites for accepting/rejecting
    # And allow sending via THIS endpoint if we pass group_id in body
    # Or strict REST: POST /groups/{id}/invites
    # I'll implement SEND in groups router.
    # This router is for user to view their pending invites and act on them.
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pass # Placeholder. I will implement GET /invites (my invites) and PATCH /invites/{id} (accept/reject)

@router.get("/", response_model=List[group_schema.Invite])
def get_my_invites(
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find invites SENT TO my email
    invites = db.query(group_model.GroupInvite).filter(
        group_model.GroupInvite.email == current_user.email, 
        group_model.GroupInvite.status == "PENDING"
    ).all()
    # Populate group_name for display
    for i in invites:
        i.group_name = i.group.name
    return invites

@router.post("/{invite_id}/accept")
def accept_invite(
    invite_id: int,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invite = db.query(group_model.GroupInvite).filter(group_model.GroupInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if invite.email != current_user.email:
         raise HTTPException(status_code=403, detail="Not your invite")
         
    if invite.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Invite is {invite.status}")
        
    # Add to group
    member = group_model.GroupMember(group_id=invite.group_id, user_id=current_user.id)
    db.add(member)
    
    invite.status = "ACCEPTED"
    db.commit()
    return {"message": "Invite accepted"}

@router.post("/{invite_id}/reject")
def reject_invite(
    invite_id: int,
    current_user: user_model.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invite = db.query(group_model.GroupInvite).filter(group_model.GroupInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if invite.email != current_user.email:
         raise HTTPException(status_code=403, detail="Not your invite")
    
    invite.status = "REJECTED"
    db.commit()
    return {"message": "Invite rejected"}
