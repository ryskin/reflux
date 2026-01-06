/**
 * Artifact storage abstraction
 *
 * Provides pluggable storage backends for large workflow outputs.
 * Supports local filesystem and S3-compatible storage.
 */

import { Readable } from 'stream';

export interface ArtifactMetadata {
  contentType?: string;
  contentLength?: number;
  [key: string]: any;
}

export interface PutResult {
  key: string;
  size: number;
  etag?: string;
}

export interface GetResult {
  data: Buffer | Readable;
  metadata: ArtifactMetadata;
}

/**
 * Storage backend interface
 */
export interface ArtifactStorage {
  /**
   * Store an artifact
   *
   * @param key - Storage key (path)
   * @param data - Data to store (Buffer or Stream)
   * @param metadata - Optional metadata
   * @returns Storage result with key and size
   */
  put(key: string, data: Buffer | Readable, metadata?: ArtifactMetadata): Promise<PutResult>;

  /**
   * Retrieve an artifact
   *
   * @param key - Storage key
   * @returns Data and metadata
   */
  get(key: string): Promise<GetResult>;

  /**
   * Delete an artifact
   *
   * @param key - Storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Generate a signed URL for temporary access
   *
   * @param key - Storage key
   * @param expiresIn - Expiration time in seconds (default: 3600)
   * @returns Signed URL
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Check if artifact exists
   *
   * @param key - Storage key
   * @returns True if exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * List artifacts with prefix
   *
   * @param prefix - Key prefix
   * @param maxKeys - Maximum keys to return
   * @returns List of keys
   */
  list(prefix: string, maxKeys?: number): Promise<string[]>;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  backend: 'local' | 's3';

  // Local filesystem options
  localPath?: string;

  // S3 options
  s3Endpoint?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3Region?: string;
  s3ForcePathStyle?: boolean;
}

/**
 * Factory function to create storage backend
 */
export async function createStorage(config: StorageConfig): Promise<ArtifactStorage> {
  if (config.backend === 's3') {
    const { S3Storage } = await import('./s3');
    return new S3Storage({
      endpoint: config.s3Endpoint,
      bucket: config.s3Bucket!,
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
      region: config.s3Region || 'us-east-1',
      forcePathStyle: config.s3ForcePathStyle ?? true,
    });
  }

  // Default to local storage
  const { LocalStorage } = await import('./local');
  return new LocalStorage(config.localPath || './storage/artifacts');
}

/**
 * Generate artifact key from run and step IDs
 */
export function generateArtifactKey(runId: string, stepId: string, filename: string): string {
  const timestamp = Date.now();
  return `runs/${runId}/steps/${stepId}/${timestamp}-${filename}`;
}

/**
 * Check if data should be stored as artifact (>1MB threshold)
 */
export function shouldStoreAsArtifact(data: any): boolean {
  if (Buffer.isBuffer(data)) {
    return data.length > 1024 * 1024; // 1MB
  }

  if (typeof data === 'string') {
    return Buffer.byteLength(data, 'utf8') > 1024 * 1024;
  }

  if (data && typeof data === 'object') {
    try {
      const json = JSON.stringify(data);
      return Buffer.byteLength(json, 'utf8') > 1024 * 1024;
    } catch {
      return false;
    }
  }

  return false;
}

export * from './local';
export * from './s3';
