import dotenv from 'dotenv';
dotenv.config();

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

// console.log('process.env:', process.env);

// Initialize R2 client (R2 uses the S3 API)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

// Upload a file to R2
export async function uploadFileToR2(fileBuffer, originalFilename) {
  // Generate a unique filename to avoid collisions
  const uniqueId = crypto.randomUUID();
  const filename = `${uniqueId}-${originalFilename}`;

  try {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename,
        Body: fileBuffer,
        ContentType: 'application/pdf',
      })
    );

    return {
      success: true,
      filename: filename,
      originalFilename: originalFilename,
    };
  } catch (error) {
    console.error('Error uploading file to R2:', error);
    throw new Error('Failed to upload file to R2');
  }
}
