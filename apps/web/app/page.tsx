'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/auth-context';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    switch (user.role) {
      case 'STORE_MANAGER':
        router.replace('/store');
        break;
      case 'DRIVER':
        router.replace('/driver');
        break;
      default:
        router.replace('/customer');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
