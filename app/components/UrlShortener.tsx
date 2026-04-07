'use client';

import { useState, useEffect, useMemo } from 'react';
import { urlStorage, SavedUrl } from '@/lib/localStorage';

const HISTORY_PAGE_SIZE = 10;

interface ShortUrlResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
}

function buildExportFileContents(urls: SavedUrl[]): string {
  return urls
    .map(
      (u) =>
        `Original: ${u.originalUrl}\nShort: ${u.shortUrl}\nCreated: ${u.createdAt}`
    )
    .join('\n\n---\n\n');
}

/** Tab-separated pairs: original URL, then short URL (per row). */
function buildClipboardKeyValuePairs(urls: SavedUrl[]): string {
  const lines = ['Original URL\tShort URL'];
  for (const u of urls) {
    lines.push(`${u.originalUrl}\t${u.shortUrl}`);
  }
  return lines.join('\n');
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
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

  // Load URLs from localStorage on mount and sync to backend
  useEffect(() => {
    const urls = urlStorage.getAll();
    setSavedUrls(urls);

    // Sync URLs to backend storage on mount
    if (urls.length > 0) {
      fetch('/api/sync-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls }),
      }).catch((err) => {
        console.error('Error syncing URLs to backend:', err);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(null);

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to shorten URL');
        return;
      }

      urlStorage.save({
        shortCode: data.shortCode,
        shortUrl: data.shortUrl,
        originalUrl: data.originalUrl,
      });
      setSavedUrls(urlStorage.getAll());
      setHistoryPage(1);
      setUrl('');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (shortUrl: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(id || 'result');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this URL?')) {
      return;
    }

    const urlToDelete = urlStorage.getById(id);
    if (!urlToDelete) return;

    try {
      // Remove from backend storage
      await fetch('/api/delete-shortcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shortCode: urlToDelete.shortCode }),
      });

      // Remove from localStorage
      urlStorage.delete(id);
      setSavedUrls(urlStorage.getAll());
    } catch (err) {
      console.error('Error deleting URL:', err);
      // Still remove from localStorage even if backend fails
      urlStorage.delete(id);
      setSavedUrls(urlStorage.getAll());
    }
  };

  const handleEdit = (savedUrl: SavedUrl) => {
    setEditingId(savedUrl.id);
    setEditUrl(savedUrl.originalUrl);
    setEditShortCode(savedUrl.shortCode);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditUrl('');
    setEditShortCode('');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setLoading(true);
    setError(null);

    try {
      const existingUrl = urlStorage.getById(editingId);
      if (!existingUrl) {
        setError('URL not found');
        return;
      }

      // Validate short code format if it changed
      if (editShortCode !== existingUrl.shortCode) {
        if (!/^[a-zA-Z0-9]+$/.test(editShortCode.trim())) {
          setError('Short code can only contain letters and numbers');
          setLoading(false);
          return;
        }

        // Check if short code already exists in localStorage (excluding current URL)
        const existingUrlWithCode = urlStorage.getByShortCode(editShortCode.trim());
        if (existingUrlWithCode && existingUrlWithCode.id !== editingId) {
          setError('This short code is already in use. Please choose a different one.');
          setLoading(false);
          return;
        }
      }

      let updatedData: Partial<SavedUrl> = {};

      if (editUrl !== existingUrl.originalUrl) {
        // URL changed, create new short URL and remove old one from DB
        const response = await fetch('/api/shorten', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: editUrl }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Failed to update URL');
          setLoading(false);
          return;
        }

        // Remove old short code from DB so the old link stops working
        await fetch('/api/delete-shortcode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ shortCode: existingUrl.shortCode }),
        }).catch(() => {});

        updatedData = {
          originalUrl: data.originalUrl,
          shortCode: data.shortCode,
          shortUrl: data.shortUrl,
        };
      } else if (editShortCode !== existingUrl.shortCode) {
        // Only short code changed - update both localStorage and backend
        const trimmedCode = editShortCode.trim();
        const baseUrl = window.location.origin;

        // Update backend storage via API
        const updateResponse = await fetch('/api/update-shortcode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oldShortCode: existingUrl.shortCode,
            newShortCode: trimmedCode,
            originalUrl: existingUrl.originalUrl,
          }),
        });

        const updateData = await updateResponse.json();
        if (!updateResponse.ok) {
          setError(updateData.error || 'Failed to update short code');
          setLoading(false);
          return;
        }

        updatedData = {
          shortCode: trimmedCode,
          shortUrl: `${baseUrl}/${trimmedCode}`,
        };
      }

      if (Object.keys(updatedData).length > 0) {
        urlStorage.update(editingId, updatedData);
        setSavedUrls(urlStorage.getAll());
      }

      setEditingId(null);
      setEditUrl('');
      setEditShortCode('');
    } catch (err) {
      setError('An error occurred while updating the URL.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
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

  const handleCopyAllPairs = async () => {
    try {
      await navigator.clipboard.writeText(buildClipboardKeyValuePairs(sortedUrls));
      setCopied('__all__');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy all:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
          URL Shortener
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Shorten your long URLs into shareable links
        </p>
      </div>

      {/* Shorten Form */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your URL here (e.g., https://example.com)"
              className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-50 focus:border-transparent"
              required
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-6 py-3 rounded-lg bg-black dark:bg-zinc-50 text-white dark:text-black font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Shortening...' : 'Shorten'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      {/* Saved URLs List */}
      {savedUrls.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
                Your Shortened URLs
              </h2>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {savedUrls.length} {savedUrls.length === 1 ? 'URL' : 'URLs'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportTxt}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-50 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Export .txt
              </button>
              <button
                type="button"
                onClick={handleCopyAllPairs}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-50 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {copied === '__all__' ? 'Copied all!' : 'Copy all pairs'}
              </button>
            </div>
          </div>

          {sortedUrls.length > HISTORY_PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Page {safeHistoryPage} of {historyTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={safeHistoryPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safeHistoryPage >= historyTotalPages}
                  onClick={() =>
                    setHistoryPage((p) => Math.min(historyTotalPages, p + 1))
                  }
                  className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {paginatedUrls.map((savedUrl) => (
              <div
                key={savedUrl.id}
                className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                {editingId === savedUrl.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Original URL:
                      </label>
                      <input
                        type="text"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Short Code:
                      </label>
                      <input
                        type="text"
                        value={editShortCode}
                        onChange={(e) => setEditShortCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Original URL
                          </p>
                          <p className="text-sm text-zinc-800 dark:text-zinc-200 break-all">
                            {savedUrl.originalUrl}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                            Short URL
                          </p>
                          <div className="flex items-center gap-2">
                            <a
                              href={savedUrl.shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                              {savedUrl.shortUrl}
                            </a>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Created: {formatDate(savedUrl.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(savedUrl.shortUrl, savedUrl.id)}
                          title={
                            copied === savedUrl.id
                              ? 'Copied to clipboard'
                              : 'Copy short URL'
                          }
                          aria-label={
                            copied === savedUrl.id
                              ? 'Copied to clipboard'
                              : 'Copy short URL'
                          }
                          className="inline-flex items-center justify-center rounded-lg p-2 bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-800"
                        >
                          {copied === savedUrl.id ? (
                            <IconCheck className="shrink-0" />
                          ) : (
                            <IconCopy className="shrink-0" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(savedUrl)}
                          title="Edit"
                          aria-label="Edit shortened URL"
                          className="inline-flex items-center justify-center rounded-lg p-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-800"
                        >
                          <IconPencil className="shrink-0" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(savedUrl.id)}
                          title="Delete"
                          aria-label="Delete shortened URL"
                          className="inline-flex items-center justify-center rounded-lg p-2 bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-800"
                        >
                          <IconTrash className="shrink-0" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
