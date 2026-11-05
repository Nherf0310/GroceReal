'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { Menu, X, LogOut } from 'lucide-react';
import CurrencyToggle from './currency-toggle';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  CUSTOMER: { label: 'Customer', color: 'bg-blue-100 text-blue-800' },
  STORE_MANAGER: { label: 'Store Manager', color: 'bg-amber-100 text-amber-800' },
  DRIVER: { label: 'Driver', color: 'bg-purple-100 text-purple-800' },
  ADMIN: { label: 'Admin', color: 'bg-rose-100 text-rose-800' },
};

export default function DashboardShell({
  navItems,
  children,
}: {
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const badge = user ? ROLE_BADGE[user.role] ?? ROLE_BADGE.CUSTOMER : ROLE_BADGE.CUSTOMER;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-slate-200">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white font-bold shadow-sm">
            🥬
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">
            Groce<span className="text-emerald-600">Real</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm uppercase">
              {user?.name?.[0] || user?.email?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{user?.name || user?.email}</div>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white font-bold text-sm">
            🥬
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900">
            Groce<span className="text-emerald-600">Real</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyToggle />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-white h-full flex flex-col shadow-xl">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                Groce<span className="text-emerald-600">Real</span>
              </span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm uppercase">
                  {user?.name?.[0] || user?.email?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{user?.name || user?.email}</div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 md:pt-0 pt-14 flex flex-col overflow-auto">
        <header className="hidden md:flex h-14 border-b border-slate-200 bg-white items-center justify-end px-6 shrink-0">
          <CurrencyToggle />
        </header>
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

