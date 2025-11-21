'use client';

import { useState, useEffect } from 'react';
import { urlStorage, SavedUrl } from '@/lib/localStorage';

interface ShortUrlResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
}

export default function UrlShortener() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShortUrlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedUrls, setSavedUrls] = useState<SavedUrl[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editShortCode, setEditShortCode] = useState('');

  // Load URLs from localStorage on mount
  useEffect(() => {
    setSavedUrls(urlStorage.getAll());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
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

      setResult(data);
      
      // Save to localStorage
      const saved = urlStorage.save({
        shortCode: data.shortCode,
        shortUrl: data.shortUrl,
        originalUrl: data.originalUrl,
      });
      setSavedUrls(urlStorage.getAll());
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

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this URL?')) {
      urlStorage.delete(id);
      setSavedUrls(urlStorage.getAll());
      if (result && savedUrls.find((u) => u.id === id)) {
        setResult(null);
      }
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
      // If the original URL changed, we need to create a new short URL
      const existingUrl = urlStorage.getById(editingId);
      if (!existingUrl) return;

      let updatedData: Partial<SavedUrl> = {};

      if (editUrl !== existingUrl.originalUrl) {
        // URL changed, create new short URL
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
          return;
        }

        updatedData = {
          originalUrl: data.originalUrl,
          shortCode: data.shortCode,
          shortUrl: data.shortUrl,
        };
      } else if (editShortCode !== existingUrl.shortCode) {
        // Only short code changed (custom short code)
        // Note: In a real app, you'd need backend support for custom short codes
        // For now, we'll just update the display
        const baseUrl = window.location.origin;
        updatedData = {
          shortCode: editShortCode,
          shortUrl: `${baseUrl}/${editShortCode}`,
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

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Original URL:
              </p>
              <p className="text-sm text-zinc-800 dark:text-zinc-200 break-all">
                {result.originalUrl}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                Short URL:
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={result.shortUrl}
                  readOnly
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-50 text-sm"
                />
                <button
                  onClick={() => handleCopy(result.shortUrl, 'result')}
                  className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm"
                >
                  {copied === 'result' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Saved URLs List */}
      {savedUrls.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
              Your Shortened URLs
            </h2>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {savedUrls.length} {savedUrls.length === 1 ? 'URL' : 'URLs'}
            </span>
          </div>

          <div className="space-y-3">
            {savedUrls.map((savedUrl) => (
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
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleCopy(savedUrl.shortUrl, savedUrl.id)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm"
                        >
                          {copied === savedUrl.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={() => handleEdit(savedUrl)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(savedUrl.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm"
                        >
                          Delete
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
