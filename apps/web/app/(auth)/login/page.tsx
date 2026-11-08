'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      switch (user.role) {
        case 'STORE_MANAGER': router.replace('/store'); break;
        case 'DRIVER': router.replace('/driver'); break;
        default: router.replace('/customer');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.textContent = '';
    try {
      await login(fd.get('email') as string, fd.get('password') as string);
    } catch (err: unknown) {
      if (errorEl) errorEl.textContent = (err as Error).message || 'Login failed';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg border border-slate-100">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-500/20">
            🥬
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            Groce<span className="text-emerald-600">Real</span>
          </span>
        </div>
        <h1 className="mb-1 text-center text-2xl font-bold text-slate-800">Welcome back</h1>
        <p className="text-center text-sm text-slate-500 mb-6">Sign in to your account</p>
        <p id="login-error" className="mb-4 text-center text-sm text-red-600 min-h-[1.25rem]" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 transition text-sm"
          >
            Sign In
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <a href="/register" className="font-semibold text-emerald-600 hover:underline">Create one</a>
        </p>
      </div>
    </div>
  );
}
