'use client';

import { useEffect, useMemo, useState } from 'react';

type SavedUrl = {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  updatedAt: string;
};

const HISTORY_PAGE_SIZE = 10;

type UrlApiRow = {
  id: string | number;
  original_url: string | null;
  shorten_url_code: string | null;
  created_at: string;
  updated_at: string | null;
};

function toSavedUrls(rows: UrlApiRow[], origin: string): SavedUrl[] {
  return rows
    .filter((row) => row.original_url && row.shorten_url_code)
    .map((row) => ({
      id: String(row.id),
      shortCode: row.shorten_url_code as string,
      shortUrl: `${origin}/${row.shorten_url_code as string}`,
      originalUrl: row.original_url as string,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
    }));
}

function buildExportFileContents(urls: SavedUrl[]): string {
  return urls
    .map(
      (u) =>
        `Original: ${u.originalUrl}\nShort: ${u.shortUrl}\nCreated: ${new Date(u.createdAt).toISOString()}`
    )
    .join('\n\n---\n\n');
}

export default function UrlShortener() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedUrls, setSavedUrls] = useState<SavedUrl[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editShortCode, setEditShortCode] = useState('');

  const sortedUrls = useMemo(
    () =>
      [...savedUrls].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [savedUrls]
  );

  const historyTotalPages = Math.max(
    1,
    Math.ceil(sortedUrls.length / HISTORY_PAGE_SIZE)
  );
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedUrls = sortedUrls.slice(
    (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE
  );

  useEffect(() => {
    setHistoryPage((p) => Math.min(p, historyTotalPages));
  }, [historyTotalPages]);

  async function loadUrls() {
    const response = await fetch('/api/urls', { method: 'GET' });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? 'Failed to load URLs');
    }
    const data = await response.json();
    setSavedUrls(toSavedUrls(data.urls ?? [], window.location.origin));
  }

  useEffect(() => {
    loadUrls().catch((err) => setError(err.message));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to shorten URL');
        return;
      }

      const item: SavedUrl = {
        id: crypto.randomUUID(),
        shortCode: data.shortCode,
        shortUrl: data.shortUrl,
        originalUrl: data.originalUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSavedUrls((prev) => [item, ...prev.filter((u) => u.shortCode !== item.shortCode)]);
      setUrl('');
      setHistoryPage(1);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = savedUrls.find((u) => u.id === id);
    if (!target) return;
    if (!confirm('Are you sure you want to delete this URL?')) return;

    try {
      const response = await fetch('/api/delete-shortcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode: target.shortCode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Delete failed');
      }
      setSavedUrls((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to delete URL');
    }
  };

  const handleCopy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const target = savedUrls.find((u) => u.id === editingId);
    if (!target) return;

    try {
      const response = await fetch('/api/update-shortcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldShortCode: target.shortCode,
          newShortCode: editShortCode.trim(),
          originalUrl: editUrl.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Failed to update URL');
        return;
      }

      setSavedUrls((prev) =>
        prev.map((u) =>
          u.id === editingId
            ? {
                ...u,
                originalUrl: editUrl.trim(),
                shortCode: editShortCode.trim(),
                shortUrl: `${window.location.origin}/${editShortCode.trim()}`,
                updatedAt: new Date().toISOString(),
              }
            : u
        )
      );
      setEditingId(null);
      setEditShortCode('');
      setEditUrl('');
    } catch (err) {
      setError('Failed to update URL');
      console.error(err);
    }
  };

  const handleExportTxt = () => {
    const text = buildExportFileContents(sortedUrls);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = `url-shortener-export-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(urlObj);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your URL here"
              className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50"
              required
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-6 py-3 rounded-lg bg-black dark:bg-zinc-50 text-white dark:text-black"
            >
              {loading ? 'Shortening...' : 'Shorten'}
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-xl font-semibold">Your URLs</h2>
          <button
            type="button"
            onClick={handleExportTxt}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm"
          >
            Export .txt
          </button>
        </div>

        {paginatedUrls.length === 0 ? (
          <p className="text-zinc-500">No URLs yet.</p>
        ) : (
          <div className="space-y-3">
            {paginatedUrls.map((savedUrl) => (
              <div
                key={savedUrl.id}
                className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                {editingId === savedUrl.id ? (
                  <div className="space-y-2">
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <input
                      value={editShortCode}
                      onChange={(e) => setEditShortCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 rounded bg-green-600 text-white text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded bg-zinc-200 dark:bg-zinc-700 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-500">Original URL</p>
                      <p className="break-all text-sm">{savedUrl.originalUrl}</p>
                      <p className="text-xs text-zinc-500 mt-2">Short URL</p>
                      <a
                        href={savedUrl.shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 break-all"
                      >
                        {savedUrl.shortUrl}
                      </a>
                      <p className="text-xs text-zinc-500 mt-2">
                        Created: {formatDate(savedUrl.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(savedUrl.shortUrl, savedUrl.id)}
                        className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 text-sm"
                      >
                        {copied === savedUrl.id ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(savedUrl.id);
                          setEditUrl(savedUrl.originalUrl);
                          setEditShortCode(savedUrl.shortCode);
                        }}
                        className="px-2 py-1 rounded bg-blue-600 text-white text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(savedUrl.id)}
                        className="px-2 py-1 rounded bg-red-600 text-white text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {sortedUrls.length > HISTORY_PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              disabled={safeHistoryPage <= 1}
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 text-sm"
            >
              Previous
            </button>
            <p className="text-sm text-zinc-500">
              Page {safeHistoryPage} of {historyTotalPages}
            </p>
            <button
              type="button"
              disabled={safeHistoryPage >= historyTotalPages}
              onClick={() =>
                setHistoryPage((p) => Math.min(historyTotalPages, p + 1))
              }
              className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
