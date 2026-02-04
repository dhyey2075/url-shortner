// URL mappings stored in Supabase (table: public."URL" or "url")

import { supabase } from '@/lib/supabase';

const TABLE = 'URL';

const PGRST002 = 'PGRST002';
const RETRY_DELAY_MS = 2500;
const MAX_TRIES = 3;

/** Retry on PostgREST schema cache error (PGRST002). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let tryCount = 1; tryCount <= MAX_TRIES; tryCount++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const code = (e as { code?: string })?.code;
      if (code === PGRST002 && tryCount < MAX_TRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

class UrlStorage {
  async set(originalUrl: string, shortCode: string): Promise<void> {
    await withRetry(async () => {
      const { error } = await supabase.from(TABLE).insert({
        original_url: originalUrl,
        shorten_url_code: shortCode,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    });
  }

  async getByCode(shortCode: string): Promise<string | undefined> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('original_url')
        .eq('shorten_url_code', shortCode)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.original_url ?? undefined;
    });
  }

  async getByUrl(originalUrl: string): Promise<string | undefined> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('shorten_url_code')
        .eq('original_url', originalUrl)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.shorten_url_code ?? undefined;
    });
  }

  async hasCode(shortCode: string): Promise<boolean> {
    return withRetry(async () => {
      const { count, error } = await supabase
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('shorten_url_code', shortCode);
      if (error) throw error;
      return (count ?? 0) > 0;
    });
  }

  async hasUrl(originalUrl: string): Promise<boolean> {
    return withRetry(async () => {
      const { count, error } = await supabase
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('original_url', originalUrl);
      if (error) throw error;
      return (count ?? 0) > 0;
    });
  }

  async updateShortCode(
    oldShortCode: string,
    newShortCode: string,
    originalUrl: string
  ): Promise<boolean> {
    const exists = await this.hasCode(newShortCode);
    if (exists && newShortCode !== oldShortCode) return false;

    await withRetry(async () => {
      const { error: deleteErr } = await supabase
        .from(TABLE)
        .delete()
        .eq('shorten_url_code', oldShortCode);
      if (deleteErr) throw deleteErr;

      const { error: insertErr } = await supabase.from(TABLE).insert({
        original_url: originalUrl,
        shorten_url_code: newShortCode,
        updated_at: new Date().toISOString(),
      });
      if (insertErr) throw insertErr;
    });
    return true;
  }

  async removeByCode(shortCode: string): Promise<void> {
    await withRetry(async () => {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('shorten_url_code', shortCode);
      if (error) throw error;
    });
  }
}

export const urlStorage = new UrlStorage();
