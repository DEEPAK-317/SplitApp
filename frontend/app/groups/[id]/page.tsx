'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AddExpenseModal from '@/components/AddExpenseModal';
import { fetchGroupDetails, fetchGroupBalances, createExpense, settleBalance, fetchGroupExpenses, fetchGroupSettlements, sendInvite, revokeInvite, removeMember, getMe, updateGroup, deleteGroup, deleteExpense, updateExpense, updateSettlementStatus, fetchGroupAnalytics, declineExpenseShare, payExpenseShare } from '@/services/api';
import { Plus, UserPlus, Trash2, Shield, XCircle, DollarSign, MoreVertical, Pencil, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MonthlySummary } from '@/components/analytics/MonthlySummary';
import { AnalyticsTab } from '@/components/analytics/AnalyticsTab';
import { SettlementDialog } from '@/components/SettlementDialog';

export default function GroupPage() {
    const params = useParams();
    const id = Number(params?.id);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [group, setGroup] = useState<any>(null);
    const [activity, setActivity] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [balances, setBalances] = useState<any>(null); // { balances: [], my_id: int, aggregate: {} }
    const [user, setUser] = useState<any>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [openInvite, setOpenInvite] = useState(false);
    const [openExpense, setOpenExpense] = useState(false);
    const [analytics, setAnalytics] = useState<any>(null);
    const [openSettle, setOpenSettle] = useState(false);

    const loadData = async () => {
        try {
            const [me, g, e, s, b, a] = await Promise.all([
                getMe(),
                fetchGroupDetails(id),
                fetchGroupExpenses(id),
                fetchGroupSettlements(id),
                fetchGroupBalances(id),
                fetchGroupAnalytics(id)
            ]);
            setUser(me);
            setGroup(g);
            setExpenses(e);
            setBalances(b);
            setAnalytics(a);
            
            // Merge and sort for activity log
            const combined = [
                ...e.map((x: any) => ({ ...x, type: 'expense' })),
                ...s.map((x: any) => ({ ...x, type: 'settlement' }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setActivity(combined);

        } catch (e) {
            console.error(e);
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleSendInvite = async () => {
        if (!inviteEmail) return;
        try {
            await sendInvite(id, inviteEmail);
            setInviteEmail('');
            setOpenInvite(false);
            alert("Invite sent!");
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!confirm("Remove this member?")) return;
        try {
            await removeMember(id, userId);
            loadData();
        } catch (e: any) { alert(e.message); }
    };

    const handleSettleTotal = async () => {
        // Settle my total debt.
        if (!balances || !balances.balances) return;
        
        const myDebts = balances.balances.filter((t: any) => t.from_user_id === user.id);
        
        try {
            await Promise.all(myDebts.map((d: any) => 
                settleBalance({
                    group_id: id,
                    from_user_id: user.id,
                    to_user_id: d.to_user_id,
                    amount: d.amount
                })
            ));
            loadData();
        } catch(e: any) { alert("Error settling: " + e.message); }
    };

    if (loading) return <div>Loading...</div>;
    if (!group) return <div>Group not found</div>;

    const isOwner = group.owner_id === user.id;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            <Navbar />
            <main className="max-w-6xl mx-auto p-6 space-y-8">
                
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            {group.name} 
                            {isOwner && <Badge variant="outline"><Shield className="w-3 h-3 mr-1"/> Owner</Badge>}
                        </h1>
                        <p className="text-gray-500">{group.members.length} members</p>
                    </div>
                    <div className="flex gap-2">
                         {isOwner && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={async () => {
                                        const name = prompt("New Group Name:", group.name);
                                        if(name && name !== group.name) {
                                            await updateGroup(id, { name });
                                            loadData();
                                        }
                                    }}>
                                        <Pencil className="h-4 w-4 mr-2"/> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={async () => {
                                        if(confirm("Delete group permanently?")) {
                                            await deleteGroup(id);
                                            router.push('/');
                                        }
                                    }}>
                                        <Trash2 className="h-4 w-4 mr-2"/> Delete Group
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                         )}
                         <Dialog open={openInvite} onOpenChange={setOpenInvite}>
                            <DialogTrigger asChild>
                                <Button variant="secondary"><UserPlus className="w-4 h-4 mr-2"/> Invite</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
                                <div className="flex gap-2 mt-4">
                                    <Input placeholder="Email (e.g. friend@test.com)" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                                    <Button onClick={handleSendInvite}>Send</Button>
                                </div>
                            </DialogContent>
                         </Dialog>
                         
                         <Button onClick={() => setOpenExpense(true)}><Plus className="w-4 h-4 mr-2"/> Add Expense</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left: Balances & Members */}
                    <div className="space-y-6">
                        
                        {/* Aggregate Balance Card */}
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10 border-blue-100">
                             <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <DollarSign className="w-5 h-5"/> Your Standing
                                </CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-4">
                                 <div className="flex justify-between items-end">
                                     <span className="text-sm text-gray-500">You Owe</span>
                                     <span className="text-xl font-bold text-red-600">${balances?.aggregate?.total_debt || 0}</span>
                                 </div>
                                 <div className="flex justify-between items-end">
                                     <span className="text-sm text-gray-500">You are Owed</span>
                                     <span className="text-xl font-bold text-green-600">${balances?.aggregate?.total_receivable || 0}</span>
                                 </div>
                             </CardContent>
                             {(balances?.aggregate?.total_debt || 0) > 0 && (
                                 <CardFooter>
                                     <Button className="w-full" variant="destructive" onClick={() => setOpenSettle(true)}>
                                         Settle Debts
                                     </Button>
                                 </CardFooter>
                             )}
                        </Card>

                        {/* Detailed Debts */}
                        <Card>
                             <CardHeader><CardTitle className="text-lg">All Debts</CardTitle></CardHeader>
                             <CardContent className="space-y-3">
                                {balances?.balances?.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No pending debts.</p>
                                ) : (
                                    balances.balances.map((b: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-red-500">{b.from_user}</span>
                                                <span className="text-xs">➔</span>
                                                <span className="font-semibold text-green-500">{b.to_user}</span>
                                            </div>
                                            <div className="font-bold">${b.amount}</div>
                                        </div>
                                    ))
                                )}
                             </CardContent>
                        </Card>

                        {/* Members List */}
                        <Card>
                             <CardHeader><CardTitle className="text-lg">Members</CardTitle></CardHeader>
                             <CardContent className="space-y-2">
                                {group.members.map((m: any) => (
                                    <div key={m.id} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-xs">
                                                {m.name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium">{m.name}</span>
                                            {m.id === group.owner_id && <Shield className="w-3 h-3 text-blue-500"/>}
                                        </div>
                                        {isOwner && m.id !== user.id && (
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => handleRemoveMember(m.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                             </CardContent>
                        </Card>
                    </div>

                    {/* Right: Expenses & Activity */}
                    <div className="lg:col-span-2">
                         <Tabs defaultValue="expenses">
                            <TabsList>
                                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                                <TabsTrigger value="activity">Activity Log</TabsTrigger>
                                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                            </TabsList>
                            <TabsContent value="expenses" className="space-y-4 mt-4">
                                <MonthlySummary data={analytics} />
                                {expenses.map((exp: any) => (
                                    <Card key={exp.id}>
                                        <CardContent className="p-4 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-lg">{exp.description}</p>
                                                <div className="flex gap-2 text-xs text-gray-500 mt-1">
                                                     <Badge variant="outline">{exp.split_type}</Badge>
                                                     <span>Paid by {group.members.find((m: any) => m.id === exp.paid_by_user_id)?.name || `User#${exp.paid_by_user_id}`}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-xl">${exp.amount}</div>
                                                <div className="text-xs text-gray-400">{new Date(exp.created_at).toLocaleDateString()}</div>
                                                {user.id === exp.paid_by_user_id && (
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={async () => {
                                                            const desc = prompt("Edit Description:", exp.description);
                                                            if(desc && desc !== exp.description) {
                                                                await updateExpense(exp.id, { description: desc, category: exp.category });
                                                                loadData();
                                                            }
                                                        }}>
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={async () => {
                                                            if(confirm("Delete expense?")) {
                                                                await deleteExpense(exp.id);
                                                                loadData();
                                                            }
                                                        }}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                )}
                                                
                                                {/* Debtor Actions */}
                                                {(() => {
                                                    const mySplit = exp.splits?.find((s: any) => s.user_id === user.id);
                                                    if (exp.paid_by_user_id === user.id) return null; // Logic for Creator handled above

                                                    if (mySplit) {
                                                        if (mySplit.status === 'PAID') {
                                                            return <div className="mt-2 text-right"><Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Paid</Badge></div>;
                                                        }
                                                        if (mySplit.status === 'DECLINED') {
                                                            return <div className="mt-2 text-right"><Badge variant="destructive">Declined</Badge></div>;
                                                        }

                                                        // Pending
                                                        return (
                                                            <div className="flex justify-end gap-2 mt-2">
                                                                <p className="text-xs text-red-500 font-semibold self-center mr-2">
                                                                    You owe ${mySplit.amount_owed}
                                                                </p>
                                                                <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                                                                    if(confirm(`Pay $${mySplit.amount_owed} to ${group.members.find((m:any) => m.id === exp.paid_by_user_id)?.name}?`)) {
                                                                        await payExpenseShare(exp.id);
                                                                        alert("Payment recorded!");
                                                                        loadData();
                                                                    }
                                                                }}>
                                                                    Pay
                                                                </Button>
                                                                <Button size="sm" variant="outline" className="h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={async () => {
                                                                    if(confirm("Decline this share? This will remove your debt for this expense.")) {
                                                                        await declineExpenseShare(exp.id);
                                                                        loadData();
                                                                    }
                                                                }}>
                                                                    Decline
                                                                </Button>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {expenses.length === 0 && <div className="text-center p-10 text-gray-500">No expenses recorded yet.</div>}
                            </TabsContent>
                            <TabsContent value="activity">
                                <div className="space-y-4 mt-4">
                                     {activity.map((item: any) => (
                                         <Card key={`${item.type}-${item.id}`} className={item.type === 'settlement' ? 'bg-green-50 dark:bg-green-900/10 border-green-200' : ''}>
                                             <CardContent className="p-4 flex justify-between items-center">
                                                 <div>
                                                     {item.type === 'expense' ? (
                                                         <>
                                                             <p className="font-bold text-lg">{item.description}</p>
                                                             <div className="flex gap-2 text-xs text-gray-500 mt-1">
                                                                  <Badge variant="outline">Expense</Badge>
                                                                  <span>Paid by {group.members.find((m: any) => m.id === item.paid_by_user_id)?.name || `User#${item.paid_by_user_id}`}</span>
                                                             </div>
                                                         </>
                                                     ) : (
                                                         <>
                                                              <p className="font-bold text-lg text-green-700 dark:text-green-400">Settlement</p>
                                                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                                  {group.members.find((m: any) => m.id === item.from_user_id)?.name || 'Someone'} 
                                                                  <span className="mx-1">paid</span> 
                                                                  {group.members.find((m: any) => m.id === item.to_user_id)?.name || 'Someone'}
                                                              </div>
                                                              <div className="mt-2">
                                                                  <Badge variant={item.status === 'CONFIRMED' ? 'default' : item.status === 'DECLINED' ? 'destructive' : 'secondary'}>
                                                                    {item.status || 'PENDING'}
                                                                  </Badge>
                                                                  {item.status === 'PENDING' && user.id === item.to_user_id && (
                                                                      <div className="flex gap-2 mt-2">
                                                                          <Button size="sm" variant="outline" className="h-7 text-green-600 border-green-200 hover:bg-green-50" onClick={async () => {
                                                                               await updateSettlementStatus(item.id, "CONFIRMED");
                                                                               loadData();
                                                                          }}>
                                                                              <Check className="h-3 w-3 mr-1"/> Confirm
                                                                          </Button>
                                                                          <Button size="sm" variant="outline" className="h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={async () => {
                                                                               await updateSettlementStatus(item.id, "DECLINED");
                                                                               loadData();
                                                                          }}>
                                                                              <X className="h-3 w-3 mr-1"/> Reject
                                                                          </Button>
                                                                      </div>
                                                                  )}
                                                              </div>
                                                         </>
                                                     )}
                                                 </div>
                                                 <div className="text-right">
                                                     <div className={`font-bold text-xl ${item.type === 'settlement' ? 'text-green-600' : ''}`}>
                                                         ${item.amount}
                                                     </div>
                                                     <div className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</div>
                                                 </div>
                                             </CardContent>
                                         </Card>
                                     ))}
                                     {activity.length === 0 && <div className="text-center p-10 text-gray-500">No activity yet.</div>}
                                </div>
                            </TabsContent>

                             <TabsContent value="analytics">
                                 <AnalyticsTab data={analytics} />
                             </TabsContent>
                         </Tabs>
                    </div>

                </div>

                {openExpense && (
                    <AddExpenseModal 
                        groupMembers={group.members}
                        onClose={() => setOpenExpense(false)}
                        onSubmit={async (data) => {
                            await createExpense({ ...data, group_id: id });
                            setOpenExpense(false);
                            loadData();
                        }}
                    />
                )}
                
                {balances && (
                    <SettlementDialog 
                        open={openSettle} 
                        onClose={() => setOpenSettle(false)}
                        members={group.members}
                        debts={balances.balances ? balances.balances.filter((b:any) => b.from_user_id === user.id) : []}
                        expenses={expenses}
                        currentUserId={user ? user.id : 0}
                        onSettle={async (expenseIds) => {
                             try {
                                 await Promise.all(expenseIds.map(id => payExpenseShare(id)));
                                 alert(`Successfully settled ${expenseIds.length} expenses!`);
                                 loadData();
                             } catch(e: any) {
                                 alert(`Error: ${e.message}`);
                             }
                        }}
                    />
                )}
                

            </main>
        </div>
    );
}
