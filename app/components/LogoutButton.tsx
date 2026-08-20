'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
    router.push('/login');
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm"
    >
      {loading ? 'Logging out...' : 'Log out'}
    </button>
  );
}
