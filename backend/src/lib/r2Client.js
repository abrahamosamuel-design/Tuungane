import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tuungane-media';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let s3 = null;

if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
} else {
  console.warn('R2 credentials not fully configured in environment.');
}

/**
 * Generate a presigned URL for direct upload to R2
 * @param {string} key The object key (path/filename)
 * @param {string} contentType The MIME type of the file
 * @param {number} expiresIn Expiry time in seconds (default 3600)
 * @returns {Promise<string>} The presigned PUT URL
 */
export const getPresignedUploadUrl = async (key, contentType, expiresIn = 3600) => {
  if (!s3) throw new Error('R2 Client is not configured');

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3, command, { expiresIn });
};

/**
 * Get the public URL for an R2 object
 * @param {string} key The object key
 * @returns {string} The public HTTP URL
 */
export const getPublicUrl = (key) => {
  if (!R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL is not configured');
  }
  // Ensure we don't double slash if the public URL has a trailing slash
  const base = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
  const path = key.startsWith('/') ? key : `/${key}`;
  return `${base}${path}`;
};

/**
 * Delete an object from R2
 * @param {string} key The object key
 */
export const deleteObject = async (key) => {
  if (!s3) throw new Error('R2 Client is not configured');
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return await s3.send(command);
};
