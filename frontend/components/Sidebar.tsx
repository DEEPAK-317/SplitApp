'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Users, Plus, Settings, LogOut, Flag } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function Sidebar() {
    const pathname = usePathname();
    
    return (
        <div className="w-64 border-r h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-blue-600">SplitApp</span>
                </h1>
            </div>
            
            <ScrollArea className="flex-1 px-4">
                <div className="space-y-2">
                    <Button variant={pathname === '/' ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
                        <Link href="/">
                            <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                        </Link>
                    </Button>
                     {/* Placeholder for groups list if we want it in sidebar */}
                </div>
            </ScrollArea>

            <div className="p-4 border-t">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src="/placeholder-user.jpg" />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-medium">User</p>
                        <p className="text-xs text-gray-500">user@example.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
