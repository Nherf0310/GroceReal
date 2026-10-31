import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CUSTOMER' as const,
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register(form);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-800">Create an Account</h1>
        {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="STORE_MANAGER">Store Manager</option>
              <option value="DRIVER">Driver</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
