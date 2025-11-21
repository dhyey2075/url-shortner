// LocalStorage utility for URL management

export interface SavedUrl {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'url-shortener-urls';

export const urlStorage = {
  // Get all saved URLs
  getAll(): SavedUrl[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  },

  // Save a new URL
  save(url: Omit<SavedUrl, 'id' | 'createdAt' | 'updatedAt'>): SavedUrl {
    const urls = this.getAll();
    const newUrl: SavedUrl = {
      ...url,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    urls.push(newUrl);
    this.setAll(urls);
    return newUrl;
  },

  // Update an existing URL
  update(id: string, updates: Partial<Omit<SavedUrl, 'id' | 'createdAt'>>): SavedUrl | null {
    const urls = this.getAll();
    const index = urls.findIndex((url) => url.id === id);
    if (index === -1) return null;

    urls[index] = {
      ...urls[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.setAll(urls);
    return urls[index];
  },

  // Delete a URL
  delete(id: string): boolean {
    const urls = this.getAll();
    const filtered = urls.filter((url) => url.id !== id);
    if (filtered.length === urls.length) return false;
    this.setAll(filtered);
    return true;
  },

  // Get a URL by ID
  getById(id: string): SavedUrl | null {
    const urls = this.getAll();
    return urls.find((url) => url.id === id) || null;
  },

  // Get a URL by short code
  getByShortCode(shortCode: string): SavedUrl | null {
    const urls = this.getAll();
    return urls.find((url) => url.shortCode === shortCode) || null;
  },

  // Save all URLs (internal method)
  setAll(urls: SavedUrl[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },

  // Clear all URLs
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  },
};

