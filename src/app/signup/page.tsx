'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { migrateLocalToSupabase } from '@/lib/data/migrate';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-500 font-mono text-xs">LOADING...</div>}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (data.user) {
        await migrateLocalToSupabase(supabase, data.user.id);
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          referral_code: data.user.id,
        });
        const trimmed = referralCode.trim();
        if (trimmed) {
          await supabase.from('referrals').insert({
            referrer_code: trimmed,
            referred_id: data.user.id,
          });
        }
      }
      router.push('/dashboard');
      router.refresh();
    }
  }

  const inputClass = "mt-1 block w-full border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 font-mono placeholder-gray-600 focus:border-[#ff8c00] focus:outline-none";

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center font-mono">
          <h1 className="text-xl font-bold tracking-widest">
            <span style={{ color: '#ff8c00' }}>SYSTEM</span><span className="text-gray-500">TRADER</span>
          </h1>
          <p className="mt-2 text-xs text-gray-600 uppercase tracking-wider">// CREATE ACCOUNT</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono">
          {error && (
            <div className="p-3 text-xs border" style={{ background: '#2a0a0a', borderColor: '#f44747', color: '#f44747' }}>
              ⚠ {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs text-gray-500 uppercase tracking-wider">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-gray-500 uppercase tracking-wider">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputClass} />
          </div>

          <div>
            <label htmlFor="referral" className="block text-xs text-gray-500 uppercase tracking-wider">
              Referral Code <span className="text-gray-700">(optional)</span>
            </label>
            <input id="referral" type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="Enter a referral code" className={inputClass} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 text-sm font-bold font-mono text-black uppercase tracking-wider disabled:opacity-50"
            style={{ background: '#ff8c00' }}
          >
            {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 font-mono">
          Already have an account?{' '}
          <Link href="/login" className="hover:underline" style={{ color: '#ff8c00' }}>SIGN IN</Link>
        </p>
      </div>
    </div>
  );
}
