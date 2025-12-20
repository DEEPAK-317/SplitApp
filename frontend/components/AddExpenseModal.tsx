import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Props {
    groupMembers: User[];
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

export default function AddExpenseModal({ groupMembers, onClose, onSubmit }: Props) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState<number>(groupMembers[0]?.id || 0);
    const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE'>('EQUAL');
    
    // Splits state: { user_id: number, val: string } (val is amount or percentage)
    const [splits, setSplits] = useState<{ userId: number, val: string }[]>(
        groupMembers.map(u => ({ userId: u.id, val: '' }))
    );

    const handleSubmit = async () => {
        const amtFloat = parseFloat(amount);
        if (isNaN(amtFloat) || amtFloat <= 0) {
            alert("Invalid amount");
            return;
        }

        const payload: any = {
            description,
            amount: amtFloat,
            paid_by_user_id: paidBy,
            split_type: splitType,
            splits: []
        };

        if (splitType === 'EQUAL') {
            // Send empty splits to imply all, or send specific if we implemented selection
            // For now sending empty to use backend default (ALL)
        } else if (splitType === 'EXACT') {
            payload.splits = splits
              .filter(s => s.val && parseFloat(s.val) > 0)
              .map(s => ({
                user_id: s.userId,
                amount: parseFloat(s.val)
            }));
            
            // Validation
            const sum = payload.splits.reduce((acc: number, cur: any) => acc + cur.amount, 0);
            if (Math.abs(sum - amtFloat) > 0.01) {
                alert(`Sum of splits (${sum}) must equal total amount (${amtFloat})`);
                return;
            }
        } else if (splitType === 'PERCENTAGE') {
            payload.splits = splits
              .filter(s => s.val && parseFloat(s.val) > 0)
              .map(s => ({
                user_id: s.userId,
                percentage: parseFloat(s.val)
            }));

             const sum = payload.splits.reduce((acc: number, cur: any) => acc + cur.percentage, 0);
             if (Math.abs(sum - 100) > 0.01) {
                 alert(`Sum of percentages (${sum}) must equal 100%`);
                 return;
             }
        }

        await onSubmit(payload);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Add Expense</h2>
                        <button onClick={onClose}><X /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <input 
                                className="input-field" 
                                value={description} 
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Dinner, Taxi, etc."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount ($)</label>
                                <input 
                                    type="number" 
                                    className="input-field" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Paid By</label>
                                <select 
                                    className="input-field"
                                    value={paidBy}
                                    onChange={e => setPaidBy(Number(e.target.value))}
                                >
                                    {groupMembers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Split Type</label>
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                {['EQUAL', 'EXACT', 'PERCENTAGE'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSplitType(type as any)}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                                            splitType === type 
                                            ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {splitType !== 'EQUAL' && (
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border dark:border-gray-800">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    Split Details ({splitType === 'PERCENTAGE' ? '%' : '$'})
                                </h3>
                                {groupMembers.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{u.name}</span>
                                        <input
                                            type="number"
                                            className="input-field w-24 text-right py-1 h-8"
                                            placeholder="0"
                                            value={splits.find(s => s.userId === u.id)?.val || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSplits(prev => prev.map(p => p.userId === u.id ? { ...p, val } : p));
                                            }}
                                        />
                                    </div>
                                ))}
                                {splitType === 'EXACT' && (
                                    <div className="text-right text-xs text-gray-500 pt-2 border-t">
                                        Remaining: {(parseFloat(amount || '0') - splits.reduce((acc, curr) => acc + (parseFloat(curr.val)||0), 0)).toFixed(2)}
                                    </div>
                                )}
                                {splitType === 'PERCENTAGE' && (
                                    <div className="text-right text-xs text-gray-500 pt-2 border-t">
                                        Total: {splits.reduce((acc, curr) => acc + (parseFloat(curr.val)||0), 0)}%
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={handleSubmit} className="btn-primary w-full py-3">
                            Save Expense
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
