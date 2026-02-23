import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../config/index.js';

let _client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_client) {
    const config = getConfig();
    _client = new S3Client({
      region: config.S3_REGION,
      endpoint: config.S3_ENDPOINT,
      forcePathStyle: true, // Required for MinIO
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
    });
  }
  return _client;
}

/**
 * Upload a file to S3/MinIO.
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const config = getConfig();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

/**
 * Get a pre-signed URL for downloading a file.
 */
export async function getSignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const config = getConfig();
  const command = new GetObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
  });
  return s3GetSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Delete a file from S3/MinIO.
 */
export async function deleteFile(key: string): Promise<void> {
  const config = getConfig();
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    }),
  );
}
