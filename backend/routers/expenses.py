from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import expense as expense_model, group as group_model, user as user_model
from ..schemas import expense as expense_schema
from ..auth_deps import get_current_user

router = APIRouter(
    prefix="/expenses",
    tags=["expenses"],
)

@router.post("/", response_model=expense_schema.Expense)
def create_expense(
    expense: expense_schema.ExpenseCreate, 
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    # 1. Validate Group
    group = db.query(group_model.Group).filter(group_model.Group.id == expense.group_id).first()
    if not group: throw_404("Group not found")

    # 2. Check Membership
    member = db.query(group_model.GroupMember).filter_by(group_id=group.id, user_id=current_user.id).first()
    if not member: throw_403("You are not a member of this group")

    # 3. Validate Payer (Must be the current user or someone in group? Usually current user pays or records it)
    # The Schema has `paid_by_user_id`. One can record expense paid by another? 
    # Let's allow it but verify payer is in group.
    payer_in_group = db.query(group_model.GroupMember).filter_by(group_id=group.id, user_id=expense.paid_by_user_id).first()
    if not payer_in_group: throw_400("Payer is not in the group")

    # 4. Handle Split Logic (Same as before)
    final_splits = [] 

    if expense.split_type == 'EQUAL':
        user_ids = [s.user_id for s in expense.splits] if expense.splits else [m.user_id for m in group.members]
        if not user_ids: throw_400("No users for split")
        
        split_amount = round(expense.amount / len(user_ids), 2)
        remainder = round(expense.amount - (split_amount * len(user_ids)), 2)
        
        for idx, uid in enumerate(user_ids):
            amt = split_amount + (remainder if idx == 0 else 0)
            final_splits.append({"user_id": uid, "amount_owed": amt})

    elif expense.split_type == 'EXACT':
        total = sum(s.amount for s in expense.splits if s.amount)
        if abs(total - expense.amount) > 0.01: throw_400("Split amounts must equal total")
        final_splits = [{"user_id": s.user_id, "amount_owed": s.amount} for s in expense.splits]

    elif expense.split_type == 'PERCENTAGE':
        total_pct = sum(s.percentage for s in expense.splits if s.percentage)
        if abs(total_pct - 100.0) > 0.01: throw_400("Percentages must equal 100")
        
        for s in expense.splits:
            amt = round((s.percentage / 100.0) * expense.amount, 2)
            final_splits.append({"user_id": s.user_id, "amount_owed": amt})
            
        current_sum = sum(s['amount_owed'] for s in final_splits)
        diff = round(expense.amount - current_sum, 2)
        if diff != 0 and final_splits: final_splits[0]['amount_owed'] += diff

    # 5. Create
    new_expense = expense_model.Expense(
        group_id=expense.group_id,
        description=expense.description,
        amount=expense.amount,
        paid_by_user_id=expense.paid_by_user_id,
        split_type=expense.split_type,
        category=expense.category
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    for s in final_splits:
        db.add(expense_model.ExpenseSplit(expense_id=new_expense.id, user_id=s['user_id'], amount_owed=s['amount_owed']))
    
    db.commit()
    return new_expense

@router.post("/settle", response_model=expense_schema.Settlement)
def settle_balance(
    settlement: expense_schema.SettlementCreate, 
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    # Verify Group and Membership
    if settlement.from_user_id != current_user.id:
         throw_403("You can only settle your own debts")
         
    group = db.query(group_model.Group).get(settlement.group_id)
    if not group: throw_404("Group not found")
    
    # Check if To_User is in group
    to_mem = db.query(group_model.GroupMember).filter_by(group_id=group.id, user_id=settlement.to_user_id).first()
    if not to_mem: throw_400("Receiver not in group")

    new_settlement = expense_model.Settlement(
        group_id=settlement.group_id,
        from_user_id=settlement.from_user_id,
        to_user_id=settlement.to_user_id,
        amount=settlement.amount,
        status=settlement.status or "PENDING" # Allow status override
    )
    db.add(new_settlement)
    db.commit()
    db.refresh(new_settlement)
    return new_settlement



@router.post("/{expense_id}/decline")
def decline_expense_share(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    # Find split
    split = db.query(expense_model.ExpenseSplit).filter_by(expense_id=expense_id, user_id=current_user.id).first()
    if not split: throw_404("You are not part of this expense")
    
    # Update Split
    split.status = "DECLINED"
    
    # Create Settlement Log (Status=DECLINED)
    # Get expense to know payer logic? 
    # Used for "Activity Log": "User X declined payment to User Y"
    # User Y is Expense Payer.
    expense = db.query(expense_model.Expense).get(expense_id)
    
    log_entry = expense_model.Settlement(
        group_id=expense.group_id,
        from_user_id=current_user.id,
        to_user_id=expense.paid_by_user_id,
        amount=split.amount_owed,
        status="DECLINED"
    )
    db.add(log_entry)
    
    db.commit()
    return {"message": "Expense share declined"}

@router.post("/{expense_id}/pay")
def pay_expense_share(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    # Find split for this user
    split = db.query(expense_model.ExpenseSplit).filter_by(expense_id=expense_id, user_id=current_user.id).first()
    if not split: throw_404("You are not part of this expense")
    
    if split.status == "PAID": throw_400("Already paid")
    
    # Create Settlement (Confirmed)
    expense = db.query(expense_model.Expense).get(expense_id)
    
    settlement = expense_model.Settlement(
        group_id=expense.group_id,
        from_user_id=current_user.id,
        to_user_id=expense.paid_by_user_id,
        amount=split.amount_owed,
        status="CONFIRMED"
    )
    db.add(settlement)
    
    # Update Split Status
    split.status = "PAID"
    
    db.commit()
    return {"message": "Expense share paid"}

@router.put("/{expense_id}", response_model=expense_schema.Expense)
def update_expense(
    expense_id: int,
    expense_update: expense_schema.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    exp = db.query(expense_model.Expense).get(expense_id)
    if not exp: throw_404()
    if exp.paid_by_user_id != current_user.id: throw_403("Only the creator can edit this expense")
    
    exp.description = expense_update.description
    exp.category = expense_update.category
    db.commit()
    db.refresh(exp)
    return exp

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    exp = db.query(expense_model.Expense).get(expense_id)
    if not exp: throw_404()
    if exp.paid_by_user_id != current_user.id: throw_403("Only the creator can delete this expense")
    
    exp.is_deleted = True
    db.commit()
    return {"status": "success"}

@router.put("/settlements/{settlement_id}/status", response_model=expense_schema.Settlement)
def update_settlement_status(
    settlement_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user)
):
    settlement = db.query(expense_model.Settlement).get(settlement_id)
    if not settlement: throw_404()
    
    new_status = status_update.get("status")
    if new_status not in ["CONFIRMED", "DECLINED"]: throw_400("Invalid status")
    
    if settlement.to_user_id != current_user.id:
        throw_403("Only the receiver can update status")
        
    settlement.status = new_status
    db.commit()
    db.refresh(settlement)
    return settlement



def throw_404(msg="Not Found"): raise HTTPException(404, detail=msg)
def throw_403(msg="Forbidden"): raise HTTPException(403, detail=msg)
def throw_400(msg="Bad Request"): raise HTTPException(400, detail=msg)
