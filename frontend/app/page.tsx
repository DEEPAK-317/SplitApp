'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { fetchGroups, createGroup, fetchMyInvites, acceptInvite, rejectInvite, getMe } from '@/services/api';
import Link from 'next/link';
import { Plus, ArrowRight, Check, X, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    try {
      const u = await getMe();
      setUser(u);
      const [g, i] = await Promise.all([fetchGroups(), fetchMyInvites()]);
      setGroups(g);
      setInvites(i);
    } catch (e) {
      console.error(e);
      // Assuming 401 handled by api interceptor redirection
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName) return;
    await createGroup(newGroupName);
    setNewGroupName('');
    setOpenCreate(false);
    loadData();
  };

  const handleInviteAction = async (id: number, action: 'accept' | 'reject') => {
      try {
          if (action === 'accept') await acceptInvite(id);
          else await rejectInvite(id);
          loadData();
      } catch (e) {
          alert("Failed to process invite");
      }
  };

  if (!user) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 md:p-12 space-y-8">
        
        <div className="flex justify-between items-center">
             <div>
                <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
                <p className="text-gray-500">Overview of your expenses</p>
             </div>
             <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2"/> New Group</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create a Group</DialogTitle>
                    </DialogHeader>
                    <div className="flex gap-2 mt-4">
                        <Input 
                            placeholder="Group Name" 
                            value={newGroupName} 
                            onChange={e => setNewGroupName(e.target.value)} 
                        />
                        <Button onClick={handleCreateGroup}>Create</Button>
                    </div>
                </DialogContent>
             </Dialog>
        </div>

        {invites.length > 0 && (
            <section className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Mail className="w-4 h-4" /> Pending Invites</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {invites.map(inv => (
                        <Card key={inv.id} className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-bold">{inv.group_name}</p>
                                    <p className="text-xs text-gray-500">From User#{inv.sender_id}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 hover:bg-green-100" onClick={() => handleInviteAction(inv.id, 'accept')}>
                                        <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 hover:bg-red-100" onClick={() => handleInviteAction(inv.id, 'reject')}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        )}

        <section className="space-y-4">
           <h2 className="text-xl font-bold">My Groups</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <Card className="hover:border-blue-500 cursor-pointer transition-all hover:shadow-md">
                        <CardHeader>
                            <CardTitle className="flex justify-between">
                                {group.name}
                                <ArrowRight className="w-5 h-5 text-gray-300" />
                            </CardTitle>
                            <CardDescription>{group.members?.length || 0} members</CardDescription>
                        </CardHeader>
                    </Card>
                  </Link>
                ))}
                
                {groups.length === 0 && (
                  <div className="col-span-full p-12 text-center text-gray-500 border-2 border-dashed rounded-xl">
                    You are not part of any groups yet.
                  </div>
                )}
           </div>
        </section>

      </main>
    </div>
  );
}
