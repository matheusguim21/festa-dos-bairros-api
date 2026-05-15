import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string(),
  PORT: z.coerce.number().default(3333),
  JWT_PUBLIC_KEY: z.string(),
  JWT_PRIVATE_KEY: z.string(),
  /** Segredo HS256 para assinar/validar o refresh token */
  JWT_REFRESH_SECRET: z.string().min(10),
  /** Base URL do microserviço payments-ms (ex.: http://localhost:3334) */
  PAYMENTS_MS_URL: z.string().url(),
  /** Mesmo valor que FESTA_HMAC_SECRET no payments-ms */
  INTERNAL_PAYMENTS_HMAC_SECRET: z.string().min(8),
  /** Bucket S3 público para assets do site da festa (logos, galeria, vídeo) */
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_FESTA_BUCKET: z.string().optional(),
  /** Opcional: URL base (ex. CloudFront) sem barra final; se vazio, usa virtual-hosted S3 */
  AWS_S3_FESTA_PUBLIC_BASE_URL: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>
