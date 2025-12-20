'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/services/api';
import { Button } from "@/components/ui/button";
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
          <div className="p-1 bg-blue-600 rounded text-white size-8 flex items-center justify-center">S</div>
          SplitApp
        </Link>
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="w-4 h-4 mr-2" /> Logout
           </Button>
        </div>
      </div>
    </nav>
  );
}
