import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || '';

/**
 * Generate a unique file name with UUID
 * @param originalFileName - Original file name (optional)
 * @param prefix - Optional prefix for the file path
 * @returns Unique file name
 */
function generateUniqueFileName(originalFileName?: string, prefix?: string): string {
  const uuid = uuidv4();
  const extension = originalFileName ? originalFileName.split('.').pop() : '';
  const fileName = extension ? `${uuid}.${extension}` : uuid;
  
  return prefix ? `${prefix}/${fileName}` : fileName;
}

/**
 * Upload a file to S3
 * @param file - File buffer or stream
 * @param contentType - MIME type of the file (e.g., 'application/pdf', 'image/jpeg')
 * @param originalFileName - Original file name (optional, used for extension)
 * @param prefix - Optional prefix for the file path (e.g., 'pdfs', 'images')
 * @returns Promise resolving to the S3 key (file path)
 * @throws Error if upload fails or AWS credentials are missing
 */
export async function uploadFile(
  file: Buffer | Uint8Array,
  contentType: string,
  originalFileName?: string,
  prefix?: string
): Promise<string> {
  try {
    // Validate environment variables
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    }

    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET environment variable is not set');
    }

    // Generate unique file name
    const key = generateUniqueFileName(originalFileName, prefix);

    // Create PutObject command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    // Upload file
    await s3Client.send(command);

    return key;
  } catch (error) {
    console.error('S3 upload error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
    throw new Error('Failed to upload file to S3: Unknown error');
  }
}

/**
 * Delete a file from S3
 * @param key - S3 key (file path) to delete
 * @returns Promise resolving to void
 * @throws Error if deletion fails or AWS credentials are missing
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    // Validate environment variables
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    }

    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET environment variable is not set');
    }

    // Create DeleteObject command
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Delete file
    await s3Client.send(command);
  } catch (error) {
    console.error('S3 delete error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
    throw new Error('Failed to delete file from S3: Unknown error');
  }
}

/**
 * Get a presigned URL for a file in S3
 * @param key - S3 key (file path)
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Promise resolving to presigned URL
 * @throws Error if URL generation fails or AWS credentials are missing
 */
export async function getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    // Validate environment variables
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    }

    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET environment variable is not set');
    }

    // Create GetObject command
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Generate presigned URL
    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return url;
  } catch (error) {
    console.error('S3 get URL error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate file URL: ${error.message}`);
    }
    throw new Error('Failed to generate file URL: Unknown error');
  }
}

/**
 * Get the public URL for a file (if bucket is public)
 * @param key - S3 key (file path)
 * @returns Public URL string
 */
export function getPublicUrl(key: string): string {
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}

