import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type S3Config = {
  region: string;
  bucket: string;
  kmsKeyId: string;
};

export type S3Service = {
  getPresignedPutUrl: (key: string, mimeType: string, expiresIn?: number) => Promise<string>;
  getPresignedGetUrl: (key: string, expiresIn?: number) => Promise<string>;
};

export const makeS3Service = (config: S3Config): S3Service => {
  const client = new S3Client({ region: config.region });
  return {
    getPresignedPutUrl: (key, mimeType, expiresIn = 900) =>
      getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ContentType: mimeType,
          ServerSideEncryption: 'aws:kms',
          SSEKMSKeyId: config.kmsKeyId,
        }),
        { expiresIn },
      ),
    getPresignedGetUrl: (key, expiresIn = 3600) =>
      getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn },
      ),
  };
};
