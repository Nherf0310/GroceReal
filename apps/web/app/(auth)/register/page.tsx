'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';

type Role = 'CUSTOMER' | 'STORE_MANAGER' | 'DRIVER';

const ROLE_CARDS: { role: Role; title: string; emoji: string; desc: string }[] = [
  { role: 'CUSTOMER', title: 'Customer', emoji: '🛒', desc: 'Shop for groceries and get them delivered to your door.' },
  { role: 'STORE_MANAGER', title: 'Store Manager', emoji: '🏪', desc: 'Manage your store, inventory, orders, and delivery slots.' },
  { role: 'DRIVER', title: 'Driver', emoji: '🚚', desc: 'Accept delivery jobs and earn on your own schedule.' },
];

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleRoleSelect = (r: Role) => {
    setRole(r);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!role) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = fd.get('password') as string;
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    const data: Record<string, string> = {
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      password,
      role,
    };
    if (role === 'STORE_MANAGER') {
      data.storeName = fd.get('storeName') as string;
      data.storeAddress = fd.get('storeAddress') as string;
      data.storePhone = fd.get('storePhone') as string;
    }
    setSubmitting(true);
    try {
      await register(data as unknown as Parameters<typeof register>[0]);
      // useEffect will redirect
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration failed');
      setSubmitting(false);
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg border border-slate-100">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-500/20">
            🥬
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            Groce<span className="text-emerald-600">Real</span>
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
          <div className={`h-0.5 w-12 ${step >= 2 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
        </div>

        {step === 1 ? (
          <>
            <h1 className="text-center text-xl font-bold text-slate-800 mb-1">Choose your role</h1>
            <p className="text-center text-sm text-slate-500 mb-6">How will you use GroceReal?</p>
            <div className="grid gap-3">
              {ROLE_CARDS.map(({ role: r, title, emoji, desc }) => (
                <button
                  key={r}
                  onClick={() => handleRoleSelect(r)}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                >
                  <span className="text-3xl mt-0.5">{emoji}</span>
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-emerald-700">{title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(1)} className="text-sm text-emerald-600 hover:underline font-medium">← Back</button>
              <span className="text-sm text-slate-500">|</span>
              <span className="text-sm font-semibold text-slate-700">
                {ROLE_CARDS.find(r => r.role === role)?.emoji} Registering as {ROLE_CARDS.find(r => r.role === role)?.title}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-1">Create your account</h1>
            <p className="text-sm text-slate-500 mb-5">Fill in your details to get started.</p>
            {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input name="name" type="text" required className="input-field" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input name="email" type="email" required className="input-field" placeholder="jane@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input name="phone" type="tel" className="input-field" placeholder="+1 555 000 0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-slate-400 font-normal">(min 6 chars)</span></label>
                <input name="password" type="password" required minLength={6} className="input-field" placeholder="••••••••" />
              </div>

              {role === 'STORE_MANAGER' && (
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Store Details</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
                    <input name="storeName" type="text" required className="input-field" placeholder="FreshValley Supermarket" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Store Address</label>
                    <input name="storeAddress" type="text" required className="input-field" placeholder="100 Market Sq, Downtown" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Store Phone</label>
                    <input name="storePhone" type="tel" required className="input-field" placeholder="+1 555 000 0001" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 transition text-sm disabled:opacity-50"
              >
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </>
        )}

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-emerald-600 hover:underline">Sign in</a>
        </p>
      </div>

      <style jsx>{`
        .input-field {
          display: block;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #cbd5e1;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-field:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
      `}</style>
    </div>
  );
}
