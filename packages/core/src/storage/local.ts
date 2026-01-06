/**
 * Local filesystem storage backend
 */

import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ArtifactStorage, ArtifactMetadata, PutResult, GetResult } from './index';

export class LocalStorage implements ArtifactStorage {
  constructor(private basePath: string) {}

  /**
   * Ensure directory exists
   */
  private async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Get full file path
   */
  private getFilePath(key: string): string {
    // Sanitize key to prevent directory traversal
    const sanitized = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.basePath, sanitized);
  }

  /**
   * Get metadata file path
   */
  private getMetadataPath(key: string): string {
    return `${this.getFilePath(key)}.meta.json`;
  }

  /**
   * Store artifact
   */
  async put(key: string, data: Buffer | Readable, metadata?: ArtifactMetadata): Promise<PutResult> {
    const filePath = this.getFilePath(key);
    await this.ensureDir(filePath);

    let size = 0;
    let hash = crypto.createHash('md5');

    if (Buffer.isBuffer(data)) {
      // Write buffer directly
      await fs.writeFile(filePath, data);
      size = data.length;
      hash.update(data);
    } else {
      // Stream data to file with proper error handling
      const writeStream = createWriteStream(filePath);

      // Track size and hash while streaming
      data.on('data', (chunk: Buffer) => {
        size += chunk.length;
        hash.update(chunk);
      });

      try {
        await pipeline(data, writeStream);
      } catch (error) {
        // Clean up partial file on failure
        try {
          await fs.unlink(filePath);
        } catch {
          // Ignore cleanup errors (file may not exist)
        }
        throw error;
      }
    }

    const etag = hash.digest('hex');

    // Store metadata
    const meta: ArtifactMetadata = {
      ...metadata,
      contentLength: size,
      etag,
      storedAt: new Date().toISOString(),
    };

    await fs.writeFile(this.getMetadataPath(key), JSON.stringify(meta, null, 2));

    return { key, size, etag };
  }

  /**
   * Retrieve artifact
   */
  async get(key: string): Promise<GetResult> {
    const filePath = this.getFilePath(key);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`Artifact not found: ${key}`);
    }

    // Read metadata
    let metadata: ArtifactMetadata = {};
    try {
      const metaContent = await fs.readFile(this.getMetadataPath(key), 'utf8');
      metadata = JSON.parse(metaContent);
    } catch {
      // Metadata file might not exist for old artifacts
    }

    // Return as stream for memory efficiency
    const data = createReadStream(filePath);

    return { data, metadata };
  }

  /**
   * Delete artifact
   */
  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    const metaPath = this.getMetadataPath(key);

    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    try {
      await fs.unlink(metaPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  /**
   * Generate signed URL
   *
   * For local storage, returns file:// URL (not truly signed, but works for dev)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const filePath = this.getFilePath(key);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`Artifact not found: ${key}`);
    }

    // Return file:// URL for local development
    // In production with S3, this would be a proper signed URL
    return `file://${path.resolve(filePath)}`;
  }

  /**
   * Check if artifact exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getFilePath(key));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List artifacts with prefix
   */
  async list(prefix: string, maxKeys: number = 1000): Promise<string[]> {
    const prefixPath = this.getFilePath(prefix);
    const keys: string[] = [];

    const walk = async (dir: string, basePath: string = '') => {
      if (keys.length >= maxKeys) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (keys.length >= maxKeys) break;

          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(basePath, entry.name);

          if (entry.isDirectory()) {
            await walk(fullPath, relativePath);
          } else if (!entry.name.endsWith('.meta.json')) {
            // Skip metadata files
            keys.push(relativePath);
          }
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') throw err;
      }
    };

    await walk(path.dirname(prefixPath), path.basename(prefix));
    return keys;
  }
}
