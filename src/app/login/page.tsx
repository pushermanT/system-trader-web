'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { migrateLocalToSupabase } from '@/lib/data/migrate';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (data.user) {
        await migrateLocalToSupabase(supabase, data.user.id);
      }
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-sm font-mono">
        <div className="border p-6" style={{ borderColor: '#333', background: '#111' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2" style={{ background: '#ff8c00' }} />
            <span className="text-[13px] uppercase tracking-widest text-gray-500">Terminal Auth</span>
          </div>
          <h1 className="text-lg font-bold tracking-wider mb-1" style={{ color: '#ff8c00' }}>
            SYSTEM TRADER
          </h1>
          <p className="text-[14px] text-gray-500 mb-6">// SIGN IN</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border px-3 py-2 text-[14px]" style={{ borderColor: '#f44747', color: '#f44747', background: '#1a0a0a' }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[13px] uppercase tracking-wider text-gray-500 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border bg-black px-3 py-2 text-[15px] text-gray-200 font-mono placeholder-gray-700 focus:outline-none"
                style={{ borderColor: '#333' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#ff8c00'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#333'}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] uppercase tracking-wider text-gray-500 mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border bg-black px-3 py-2 text-[15px] text-gray-200 font-mono placeholder-gray-700 focus:outline-none"
                style={{ borderColor: '#333' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#ff8c00'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#333'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-[14px] font-bold uppercase tracking-wider text-black disabled:opacity-50 transition-opacity"
              style={{ background: '#ff8c00' }}
            >
              {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
            </button>
          </form>

          <p className="text-center text-[14px] text-gray-500 mt-5">
            No account?{' '}
            <Link href="/signup" className="hover:text-white transition-colors" style={{ color: '#569cd6' }}>SIGN UP</Link>
          </p>
        </div>

        <div className="text-center mt-3">
          <Link href="/dashboard" className="text-[13px] text-gray-600 hover:text-gray-400 transition-colors">
            CONTINUE WITHOUT ACCOUNT
          </Link>
        </div>
      </div>
    </div>
  );
}
