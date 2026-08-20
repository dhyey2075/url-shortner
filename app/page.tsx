import Link from 'next/link';

import LogoutButton from './components/LogoutButton';
import UrlShortener from './components/UrlShortener';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="w-full max-w-3xl mx-auto py-20 px-4 sm:px-8 text-center">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
            URL Shortener
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Create an account to shorten, edit, and manage your links.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-lg bg-black dark:bg-zinc-50 text-white dark:text-black"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700"
            >
              Sign up
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Logged in as <span className="font-medium">{profile?.username ?? user.email}</span>
          </p>
          <LogoutButton />
        </div>
        <UrlShortener />
      </main>
    </div>
  );
}
