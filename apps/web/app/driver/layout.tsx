'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import DashboardShell, { NavItem } from '../components/dashboard-shell';

const NAV_ITEMS: NavItem[] = [
  { label: 'Available', href: '/driver', icon: '📡' },
  { label: 'Active Delivery', href: '/driver/active', icon: '🚚' },
  { label: 'History', href: '/driver/history', icon: '📜' },
  { label: 'Profile', href: '/driver/profile', icon: '👤' },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'DRIVER') {
      if (user.role === 'CUSTOMER') { router.replace('/customer'); return; }
      if (user.role === 'STORE_MANAGER') { router.replace('/store'); return; }
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="space-y-3 w-full max-w-sm px-6">
          <div className="h-8 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'DRIVER') return null;

  return <DashboardShell navItems={NAV_ITEMS}>{children}</DashboardShell>;
}

