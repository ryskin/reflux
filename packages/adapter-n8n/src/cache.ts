/**
 * In-memory cache for n8n node descriptions
 * Prevents repeated loading from disk
 */

interface CachedNode {
  data: any;
  expiresAt: number;
}

export class N8nNodeCache {
  private cache = new Map<string, CachedNode>();
  private TTL = 3600000; // 1 hour in milliseconds

  async get(nodeName: string): Promise<any | null> {
    const cached = this.cache.get(nodeName);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() >= cached.expiresAt) {
      this.cache.delete(nodeName);
      return null;
    }

    return cached.data;
  }

  set(nodeName: string, data: any): void {
    this.cache.set(nodeName, {
      data,
      expiresAt: Date.now() + this.TTL,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(nodeName: string): boolean {
    return this.cache.delete(nodeName);
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const nodeCache = new N8nNodeCache();
