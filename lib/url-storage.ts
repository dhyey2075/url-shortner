import { SupabaseClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase/admin';

const TABLE = 'URL';

export type UrlRow = {
  id: number;
  original_url: string | null;
  shorten_url_code: string | null;
  created_at: string;
  updated_at: string | null;
  user_id: string | null;
};

export async function getPublicOriginalUrlByCode(
  shortCode: string
): Promise<string | undefined> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('original_url')
    .eq('shorten_url_code', shortCode)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.original_url ?? undefined;
}

export async function getUserUrls(
  supabase: SupabaseClient,
  userId: string
): Promise<UrlRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, original_url, shorten_url_code, created_at, updated_at, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getUserCodeByUrl(
  supabase: SupabaseClient,
  userId: string,
  originalUrl: string
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('shorten_url_code')
    .eq('user_id', userId)
    .eq('original_url', originalUrl)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.shorten_url_code ?? undefined;
}

export async function hasCode(
  supabase: SupabaseClient,
  shortCode: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('shorten_url_code', shortCode);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createUserUrl(
  supabase: SupabaseClient,
  userId: string,
  originalUrl: string,
  shortCode: string
): Promise<void> {
  const { error } = await supabase.from(TABLE).insert({
    user_id: userId,
    original_url: originalUrl,
    shorten_url_code: shortCode,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function removeByCodeForUser(
  supabase: SupabaseClient,
  userId: string,
  shortCode: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('shorten_url_code', shortCode);
  if (error) throw error;
}

export async function updateUrlForUser(
  supabase: SupabaseClient,
  userId: string,
  oldShortCode: string,
  newShortCode: string,
  originalUrl: string
): Promise<boolean> {
  const exists = await hasCode(supabaseAdmin, newShortCode);
  if (exists && newShortCode !== oldShortCode) return false;

  const { error } = await supabase
    .from(TABLE)
    .update({
      shorten_url_code: newShortCode,
      original_url: originalUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('shorten_url_code', oldShortCode);

  if (error) throw error;
  return true;
}
