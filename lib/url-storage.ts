// Shared in-memory storage for URL mappings
// In production, replace this with a database (e.g., PostgreSQL, MongoDB, Redis)

interface UrlMapping {
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
}

class UrlStorage {
  private urlMap = new Map<string, string>(); // originalUrl -> shortCode
  private codeMap = new Map<string, string>(); // shortCode -> originalUrl
  private metadata = new Map<string, { createdAt: Date }>(); // shortCode -> metadata

  set(originalUrl: string, shortCode: string): void {
    this.urlMap.set(originalUrl, shortCode);
    this.codeMap.set(shortCode, originalUrl);
    this.metadata.set(shortCode, { createdAt: new Date() });
  }

  getByCode(shortCode: string): string | undefined {
    return this.codeMap.get(shortCode);
  }

  getByUrl(originalUrl: string): string | undefined {
    return this.urlMap.get(originalUrl);
  }

  hasCode(shortCode: string): boolean {
    return this.codeMap.has(shortCode);
  }

  hasUrl(originalUrl: string): boolean {
    return this.urlMap.has(originalUrl);
  }
}

// Export a singleton instance
export const urlStorage = new UrlStorage();

