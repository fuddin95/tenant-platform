import { makeS3Service } from '../s3';
import { StorageError } from '../../types/errors';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockRejectedValue(new Error('AWS SDK internal error: credentials not found')),
}));

// S3Client constructor must not throw — mock the client module too
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const fakeAwsErrorMessage = 'AWS SDK internal error: credentials not found';

const config = {
  region: 'ca-central-1',
  bucket: 'test-bucket',
  kmsKeyId: 'test-kms-key',
};

describe('makeS3Service — error wrapping', () => {
  const service = makeS3Service(config);

  describe('getPresignedPutUrl', () => {
    it('throws StorageError when getSignedUrl rejects', async () => {
      await expect(service.getPresignedPutUrl('docs/file.pdf', 'application/pdf')).rejects.toBeInstanceOf(StorageError);
    });

    it('throws StorageError (not the raw AWS error)', async () => {
      await expect(service.getPresignedPutUrl('docs/file.pdf', 'application/pdf')).rejects.not.toBeInstanceOf(Error.constructor);
      try {
        await service.getPresignedPutUrl('docs/file.pdf', 'application/pdf');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).message).not.toContain(fakeAwsErrorMessage);
      }
    });

    it('StorageError message does not leak the raw AWS error message', async () => {
      try {
        await service.getPresignedPutUrl('docs/file.pdf', 'application/pdf');
        fail('Expected StorageError to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).message).not.toContain(fakeAwsErrorMessage);
        expect((err as StorageError).statusCode).toBe(502);
        expect((err as StorageError).code).toBe('STORAGE_FAILURE');
      }
    });
  });

  describe('getPresignedGetUrl', () => {
    it('throws StorageError when getSignedUrl rejects', async () => {
      await expect(service.getPresignedGetUrl('docs/file.pdf')).rejects.toBeInstanceOf(StorageError);
    });

    it('throws StorageError (not the raw AWS error)', async () => {
      try {
        await service.getPresignedGetUrl('docs/file.pdf');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).message).not.toContain(fakeAwsErrorMessage);
      }
    });

    it('StorageError message does not leak the raw AWS error message', async () => {
      try {
        await service.getPresignedGetUrl('docs/file.pdf');
        fail('Expected StorageError to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).message).not.toContain(fakeAwsErrorMessage);
        expect((err as StorageError).statusCode).toBe(502);
        expect((err as StorageError).code).toBe('STORAGE_FAILURE');
      }
    });
  });
});
