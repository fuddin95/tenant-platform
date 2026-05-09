import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  AWS_REGION: z.string().default('ca-central-1'),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_KMS_KEY_ID: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

export const env = EnvSchema.parse(process.env);
