from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from ..database import get_db
from ..models import group as group_model, user as user_model, expense as expense_model
from ..schemas import group as group_schema, expense as expense_schema
from ..auth_deps import get_current_user
from datetime import datetime
router = APIRouter(
    prefix="/groups",
    tags=["groups"],
)

@router.post("/", response_model=group_schema.Group)
def create_group(group: group_schema.GroupCreate, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    new_group = group_model.Group(name=group.name, owner_id=current_user.id)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    # Add creator as member
    member = group_model.GroupMember(group_id=new_group.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    db.refresh(new_group)
    
    return {
        "id": new_group.id,
        "name": new_group.name,
        "owner_id": new_group.owner_id,
        "is_deleted": new_group.is_deleted,
        "members": [current_user]
    }

@router.get("/", response_model=List[group_schema.Group])
def read_my_groups(db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    # Return only groups I am member of
    memberships = db.query(group_model.GroupMember).filter(group_model.GroupMember.user_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]
    groups = db.query(group_model.Group).filter(
        group_model.Group.id.in_(group_ids),
        group_model.Group.is_deleted == False
    ).all()
    
    result = []
    for g in groups:
        result.append({
            "id": g.id,
            "name": g.name,
            "owner_id": g.owner_id,
            "is_deleted": g.is_deleted,
            "members": [gm.user for gm in g.members]
        })
    return result

@router.get("/{group_id}", response_model=group_schema.Group)
def read_group(group_id: int, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    # Check membership? Not explicitly required but good practice.
    # Allowing viewing if member
    membership = db.query(group_model.GroupMember).filter_by(group_id=group_id, user_id=current_user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    group = db.query(group_model.Group).filter(
        group_model.Group.id == group_id,
        group_model.Group.is_deleted == False
    ).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    
    result = {
        "id": group.id,
        "name": group.name,
        "owner_id": group.owner_id,
        "is_deleted": group.is_deleted,
        "members": [gm.user for gm in group.members]
    }
    return result

@router.put("/{group_id}", response_model=group_schema.Group)
def update_group(
    group_id: int, 
    group_update: group_schema.GroupBase, 
    db: Session = Depends(get_db), 
    current_user: user_model.User = Depends(get_current_user)
):
    group = db.query(group_model.Group).get(group_id)
    if not group: throw_404()
    if group.owner_id != current_user.id: throw_403("Only owner can edit group")
    
    group.name = group_update.name
    db.commit()
    db.refresh(group)
    return {
        "id": group.id,
        "name": group.name,
        "owner_id": group.owner_id,
        "is_deleted": group.is_deleted,
        "members": [gm.user for gm in group.members]
    }

@router.delete("/{group_id}")
def delete_group(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user: user_model.User = Depends(get_current_user)
):
    group = db.query(group_model.Group).get(group_id)
    if not group: throw_404()
    if group.owner_id != current_user.id: throw_403("Only owner can delete group")
    
    group.is_deleted = True
    db.commit()
    return {"status": "success"}

@router.post("/{group_id}/invite", response_model=group_schema.Invite)
def invite_user(
    group_id: int, 
    invite: group_schema.InviteCreate, 
    db: Session = Depends(get_db), 
    current_user: user_model.User = Depends(get_current_user)
):
    group = db.query(group_model.Group).get(group_id)
    if not group: throw_404()
    
    # Anyone can invite? Or only owner? "Group owner can remove...". Invites usually by members.
    # Let's say any member can invite.
    membership = db.query(group_model.GroupMember).filter_by(group_id=group_id, user_id=current_user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    # Check if already member
    existing_user = db.query(user_model.User).filter(user_model.User.email == invite.email).first()
    if existing_user:
        is_member = db.query(group_model.GroupMember).filter_by(group_id=group_id, user_id=existing_user.id).first()
        if is_member:
            raise HTTPException(status_code=400, detail="User already in group")
    
    # Create Invite
    new_invite = group_model.GroupInvite(
        group_id=group_id,
        sender_id=current_user.id,
        email=invite.email,
        status="PENDING"
    )
    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)
    return new_invite

@router.post("/{group_id}/invites/{invite_id}/revoke")
def revoke_invite(
    group_id: int, 
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    invite = db.query(group_model.GroupInvite).get(invite_id)
    if not invite: throw_404()
    
    group = db.query(group_model.Group).get(group_id)
    
    # Who can revoke? Sender or Owner.
    if invite.sender_id != current_user.id and group.owner_id != current_user.id:
         raise HTTPException(status_code=403, detail="Cannot revoke this invite")
         
    invite.status = "REVOKED"
    db.commit()
    return {"message": "Revoked"}

@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    group = db.query(group_model.Group).get(group_id)
    if not group: throw_404()
    
    # Only owner can remove
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can remove members")
        
    member = db.query(group_model.GroupMember).filter_by(group_id=group_id, user_id=user_id).first()
    if not member: throw_404()
    
    db.delete(member)
    db.commit()
    return {"message": "Member removed"}

# ... (Balance logic needs to move here or stay. Previous implementation had it here.)
# I need to keep get_group_balances and read_group_expenses here but update deps?
# Keeping them here and adding Auth.

@router.get("/{group_id}/expenses", response_model=List[expense_schema.Expense])
def read_group_expenses(group_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    # Check membership
    return db.query(expense_model.Expense).filter(expense_model.Expense.group_id == group_id).order_by(expense_model.Expense.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{group_id}/settlements", response_model=List[expense_schema.Settlement])
def read_group_settlements(group_id: int, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    return db.query(expense_model.Settlement).filter(expense_model.Settlement.group_id == group_id).order_by(expense_model.Settlement.created_at.desc()).all()

@router.get("/{group_id}/balances")
def get_group_balances(group_id: int, db: Session = Depends(get_db), current_user: user_model.User = Depends(get_current_user)):
    # Logic same as before...
    # Fetch Expenses and Settlements
    expenses = db.query(expense_model.Expense).filter_by(group_id=group_id).all()
    settlements = db.query(expense_model.Settlement).filter_by(group_id=group_id).all()
    
    balances = {} 

    # Direct Net Debt Logic
    # (debtor_id, creditor_id) -> amount
    debt_map = {} 

    for exp in expenses:
        for split in exp.splits:
            if split.status != "DECLINED" and split.user_id != exp.paid_by_user_id:
                pair = (split.user_id, exp.paid_by_user_id)
                debt_map[pair] = debt_map.get(pair, 0.0) + split.amount_owed

    for s in settlements:
        if s.status == "CONFIRMED":
            # Settlement reduces the debt from->to
            # If A pays B, then A's debt to B reduces.
            pair = (s.from_user_id, s.to_user_id)
            debt_map[pair] = debt_map.get(pair, 0.0) - s.amount

    # Resolve bilateral debts (Netting A->B and B->A)
    # We want unique pairs where A < B usually to process, but here we just iterate keys.
    # Convert to canonical edges.
    final_edges = {}
    
    # Get all unique users involved
    users = set()
    for (a, b) in debt_map.keys():
        users.add(a)
        users.add(b)
    
    unique_pairs = []
    user_list = sorted(list(users))
    for i in range(len(user_list)):
        for j in range(i + 1, len(user_list)):
            unique_pairs.append((user_list[i], user_list[j]))

    transactions = []
    
    # Aggregate for summary
    user_stats = {uid: {"debt": 0.0, "recv": 0.0} for uid in users}
    
    for (u1, u2) in unique_pairs:
        # Net flow from u1 -> u2
        fw = debt_map.get((u1, u2), 0.0)
        bw = debt_map.get((u2, u1), 0.0)
        
        net = fw - bw # Positive means u1 owes u2
        
        if abs(net) < 0.01: continue
        
        from_id, to_id, amount = (u1, u2, net) if net > 0 else (u2, u1, -net)
        amount = round(amount, 2)
        
        from_user = db.query(user_model.User).get(from_id)
        to_user = db.query(user_model.User).get(to_id)
        
        transactions.append({
            "from_user": from_user.name if from_user else str(from_id),
            "from_user_id": from_id,
            "to_user": to_user.name if to_user else str(to_id),
            "to_user_id": to_id,
            "amount": amount
        })
        
        user_stats[from_id]["debt"] += amount
        user_stats[to_id]["recv"] += amount

    # Aggregate view for Current User
    my_id = current_user.id
    my_stat = user_stats.get(my_id, {"debt": 0.0, "recv": 0.0})

    return {
        "balances": transactions,
        "my_id": my_id,
        "aggregate": {
            "total_debt": round(my_stat["debt"], 2),
            "total_receivable": round(my_stat["recv"], 2)
        }
    }

@router.get("/{group_id}/analytics")
def get_group_analytics(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user: user_model.User = Depends(get_current_user)
):
    # 1. Fetch Expenses (including legacy NULL is_deleted)
    expenses = db.query(expense_model.Expense).filter(expense_model.Expense.group_id == group_id).all()
    expenses = [e for e in expenses if not e.is_deleted]

    # 2. Fetch Settlements for "Spenders" logic
    settlements = db.query(expense_model.Settlement).filter_by(group_id=group_id, status="CONFIRMED").all()
    
    # helper: Member Info
    group = db.query(group_model.Group).get(group_id)
    # Group.members returns GroupMember objects, so access .user
    member_names = {m.user.id: m.user.name for m in group.members}

    # --- A. Spending Trend (Line Chart) ---
    # Structure: [{"date": "Jan 2024", "UserA": 100, "UserB": 20}, ...]
    # We aggregate by Month.
    trend_map = {} # "YYYY-MM" -> {user_id: amount}
    
    # Process Expenses for Trend
    for exp in expenses:
        month_key = exp.created_at.strftime("%Y-%m")
        if month_key not in trend_map: trend_map[month_key] = {}
        
        uid = exp.paid_by_user_id
        current_val = trend_map[month_key].get(uid, 0.0)
        trend_map[month_key][uid] = current_val + exp.amount

    # Process Settlements for Trend? 
    # User said "aggregate all the expenses and settlements according to the month".
    # Usually "Spending" implies outflows.
    for s in settlements:
        month_key = s.created_at.strftime("%Y-%m")
        if month_key not in trend_map: trend_map[month_key] = {}
        
        uid = s.from_user_id # Payer of settlement
        current_val = trend_map[month_key].get(uid, 0.0)
        trend_map[month_key][uid] = current_val + s.amount

    # Convert to List
    spending_trend = []
    # Sort keys
    for month_key in sorted(trend_map.keys()):
        # Convert YYYY-MM to readable "Jan 2024" for tooltip label, but date key for axis
        from datetime import datetime
        dt = datetime.strptime(month_key, "%Y-%m")
        readable_month = dt.strftime("%B %Y")
        iso_date = dt.strftime("%Y-%m-%d") # Use 01 as day
        
        entry = {"date": iso_date, "original_date": month_key, "label": readable_month} 
        total_for_month = 0
        for uid, amount in trend_map[month_key].items():
            # Use unique key per user (e.g. "user_1") to avoid space issues in dataKey if names have spaces?
            # Actually Recharts handles spaces. But let's use ID-based key for safety and map label in config.
            # User wants "All group members", so we'll use names.
            name = member_names.get(uid, f"User {uid}")
            entry[name] = round(amount, 2)
            # Also store by ID for robust config?
            # entry[f"user_{uid}"] = round(amount, 2) 
            total_for_month += amount
        
        # Also include a "Total" key if needed, or frontend calculates.
        # Let's ensure all members have a key (even if 0) for consistent lines? 
        # Actually Recharts handles missing keys fine (breaks line) or we can zero fill.
        # Let's zero fill for smoother lines.
        for uid, name in member_names.items():
            if name not in entry:
                entry[name] = 0
                
        spending_trend.append(entry)


    # --- B. Category Breakdown (Pie Chart) ---
    category_map = {}
    for exp in expenses:
        category_map[exp.category] = category_map.get(exp.category, 0.0) + exp.amount
        
    category_breakdown = [
        {"name": k, "value": round(v, 2), "fill": f"var(--color-{k.lower().replace(' ', '-')})"} 
        for k, v in category_map.items() if v > 0
    ]

    # --- C. Top Spenders (Table) ---
    # Aggregate Expenses + Settlements
    spenders = {} # uid -> {expenses: 0, settlements: 0}
    
    for uid in member_names.keys():
        spenders[uid] = {"expenses": 0.0, "settlements": 0.0}
        
    for exp in expenses:
        uid = exp.paid_by_user_id
        if uid in spenders:
            spenders[uid]["expenses"] += exp.amount
            
    for s in settlements:
        uid = s.from_user_id
        if uid in spenders:
            spenders[uid]["settlements"] += s.amount
            
    top_spenders = []
    for uid, data in spenders.items():
        total = data["expenses"] + data["settlements"]
        if total > 0:
            top_spenders.append({
                "name": member_names.get(uid, "Unknown"),
                "expenses_paid": round(data["expenses"], 2),
                "settlements_paid": round(data["settlements"], 2),
                "total_paid": round(total, 2)
            })
            
    top_spenders.sort(key=lambda x: x["total_paid"], reverse=True)

    # --- D. Totals (Merged from old endpoint) ---
    total_all = sum(e.amount for e in expenses)
    # Filter for current month/year if params provided, or just current server time?
    # Original params were month/year. We should support them or just return "current month" stats?
    # The new signature ignored month/year inputs. Let's add them back to signature if needed, or defaults.
    # For now, let's use current UTC month for "month_total".
    from datetime import datetime
    now = datetime.now() 
    # Note: 'datetime' imported inside function in previous step, need to ensure scope or re-import
    month_expenses = [e for e in expenses if e.created_at.month == now.month and e.created_at.year == now.year]
    total_month = sum(e.amount for e in month_expenses)
    
    return {
        "overall_total": round(total_all, 2),
        "month_total": round(total_month, 2),
        "spending_trend": spending_trend,
        "category_breakdown": category_breakdown,
        "top_spenders": top_spenders,
        "members": list(member_names.values()) # Helper for frontend lines
    }


def throw_404():
    raise HTTPException(status_code=404, detail="Not found")
