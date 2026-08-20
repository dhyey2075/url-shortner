'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifySignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(sessionStorage.getItem('signup_email') ?? '');
  }, []);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'OTP verification failed');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError('Email is required to resend OTP.');
      return;
    }
    const response = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Failed to resend OTP');
      return;
    }
    setInfo('OTP sent again. Check your inbox.');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-1">Verify OTP</h1>
        <p className="text-sm text-zinc-500 mb-5">Enter the 6-digit code from your email.</p>
        <form onSubmit={onVerify} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="6-digit OTP"
            required
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-green-600">{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-black dark:bg-zinc-50 text-white dark:text-black"
          >
            {loading ? 'Verifying...' : 'Verify and continue'}
          </button>
        </form>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={resendOtp} className="text-sm text-blue-600">
            Resend OTP
          </button>
          <Link href="/login" className="text-sm text-zinc-500">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
