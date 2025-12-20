import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SettlementDialogProps {
    open: boolean;
    onClose: () => void;
    onSettle: (expenseIds: number[]) => Promise<void>; 
    members: any[];
    debts: any[]; 
    expenses: any[]; // Full list of expenses to link
    currentUserId: number;
}

export function SettlementDialog({ open, onClose, onSettle, members, debts, expenses, currentUserId }: SettlementDialogProps) {
    const [mode, setMode] = useState<"ALL" | "USER">("ALL");
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);

    // Filter expenses that I OWE
    const myPendingExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const mySplit = exp.splits?.find((s: any) => s.user_id === currentUserId);
            return mySplit && mySplit.status === 'PENDING' && exp.paid_by_user_id !== currentUserId;
        });
    }, [expenses, currentUserId]);

    // Filter based on selection
    const displayedExpenses = useMemo(() => {
        if (mode === "ALL") return myPendingExpenses;
        if (selectedUserId) {
            return myPendingExpenses.filter(e => e.paid_by_user_id.toString() === selectedUserId);
        }
        return [];
    }, [mode, selectedUserId, myPendingExpenses]);

    // Calculate total of selected
    const totalAmount = useMemo(() => {
        return displayedExpenses
            .filter(e => selectedExpenseIds.includes(e.id))
            .reduce((sum, e) => {
                const s = e.splits.find((s: any) => s.user_id === currentUserId);
                return sum + (s ? s.amount_owed : 0);
            }, 0);
    }, [displayedExpenses, selectedExpenseIds, currentUserId]);

    // Auto-select logic
    useEffect(() => {
        if (open) {
            setMode("ALL");
            setSelectedUserId("");
            // Default select all
            setSelectedExpenseIds(myPendingExpenses.map(e => e.id));
        }
    }, [open, myPendingExpenses]); // Reset when opening

    useEffect(() => {
        // When switching modes or user, reset selection to ALL visible
        setSelectedExpenseIds(displayedExpenses.map(e => e.id));
    }, [mode, selectedUserId, displayedExpenses]);

    const toggleSelection = (id: number) => {
        setSelectedExpenseIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (selectedExpenseIds.length === 0) return;
        await onSettle(selectedExpenseIds);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Settle Debts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex flex-col space-y-2">
                        <Label>Settlement Type</Label>
                        <Select value={mode} onValueChange={(v: "ALL" | "USER") => setMode(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Outstanding Expenses</SelectItem>
                                <SelectItem value="USER">Pay Specific Person</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {mode === "USER" && (
                         <div className="flex flex-col space-y-2">
                            <Label>Select Person</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select who to pay" />
                                </SelectTrigger>
                                <SelectContent>
                                    {debts.map(d => (
                                        <SelectItem key={d.to_user_id} value={d.to_user_id.toString()}>
                                            {d.to_user_name || `User#${d.to_user_id}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         </div>
                    )}

                    <div className="flex flex-col space-y-2">
                        <Label className="flex justify-between">
                            <span>Select Expenses to Pay</span>
                            <span className="font-bold text-green-600">${totalAmount.toFixed(2)}</span>
                        </Label>
                        <div className="border rounded-md h-48 overflow-y-auto p-2 space-y-2">
                             {displayedExpenses.length === 0 ? (
                                 <p className="text-gray-400 text-sm text-center mt-10">No pending expenses.</p>
                             ) : (
                                 displayedExpenses.map(exp => {
                                     const mySplit = exp.splits.find((s:any) => s.user_id === currentUserId);
                                     const payerName = members.find((m:any) => m.id === exp.paid_by_user_id)?.name;
                                     
                                     return (
                                         <div key={exp.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleSelection(exp.id)}>
                                             <Checkbox 
                                                 checked={selectedExpenseIds.includes(exp.id)} 
                                                 onCheckedChange={() => toggleSelection(exp.id)}
                                             />
                                             <div className="flex-1 text-sm">
                                                 <div className="font-semibold">{exp.description}</div>
                                                 <div className="text-xs text-gray-500">{new Date(exp.created_at).toLocaleDateString()} • owed to {payerName}</div>
                                             </div>
                                             <div className="font-bold text-sm">${mySplit?.amount_owed}</div>
                                         </div>
                                     );
                                 })
                             )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={selectedExpenseIds.length === 0}>
                        Pay ${totalAmount.toFixed(2)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
