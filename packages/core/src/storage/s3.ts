/**
 * S3-compatible storage backend
 *
 * Works with AWS S3, MinIO, and other S3-compatible object stores.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import type { ArtifactStorage, ArtifactMetadata, PutResult, GetResult } from './index';

export interface S3Config {
  endpoint?: string;
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
}

export class S3Storage implements ArtifactStorage {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || 'us-east-1',
      credentials: config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          }
        : undefined,
      forcePathStyle: config.forcePathStyle ?? true,
    });
  }

  /**
   * Convert data to Buffer
   */
  private async toBuffer(data: Buffer | Readable): Promise<Buffer> {
    if (Buffer.isBuffer(data)) {
      return data;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Store artifact in S3
   */
  async put(key: string, data: Buffer | Readable, metadata?: ArtifactMetadata): Promise<PutResult> {
    const body = await this.toBuffer(data);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: metadata?.contentType || 'application/octet-stream',
      Metadata: this.serializeMetadata(metadata),
    });

    const result = await this.client.send(command);

    return {
      key,
      size: body.length,
      etag: result.ETag?.replace(/"/g, ''),
    };
  }

  /**
   * Retrieve artifact from S3
   */
  async get(key: string): Promise<GetResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const result = await this.client.send(command);

      if (!result.Body) {
        throw new Error(`Empty response for key: ${key}`);
      }

      // Convert SDK stream to Node.js Readable
      const data = result.Body as Readable;

      const metadata: ArtifactMetadata = {
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        ...this.deserializeMetadata(result.Metadata),
        etag: result.ETag?.replace(/"/g, ''),
        lastModified: result.LastModified?.toISOString(),
      };

      return { data, metadata };
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        throw new Error(`Artifact not found: ${key}`);
      }
      throw error;
    }
  }

  /**
   * Delete artifact from S3
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Generate presigned URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Check if artifact exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * List artifacts with prefix
   */
  async list(prefix: string, maxKeys: number = 1000): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const result = await this.client.send(command);
    return (result.Contents || []).map((obj) => obj.Key!).filter(Boolean);
  }

  /**
   * Serialize metadata for S3 (only string values allowed)
   */
  private serializeMetadata(metadata?: ArtifactMetadata): Record<string, string> | undefined {
    if (!metadata) return undefined;

    const serialized: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        serialized[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    return Object.keys(serialized).length > 0 ? serialized : undefined;
  }

  /**
   * Deserialize metadata from S3
   */
  private deserializeMetadata(metadata?: Record<string, string>): ArtifactMetadata {
    if (!metadata) return {};

    const deserialized: ArtifactMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      try {
        // Try to parse as JSON
        deserialized[key] = JSON.parse(value);
      } catch {
        // Keep as string if not valid JSON
        deserialized[key] = value;
      }
    }
    return deserialized;
  }
}
