import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string(),
  PORT: z.coerce.number().default(3333),
  JWT_PUBLIC_KEY: z.string(),
  JWT_PRIVATE_KEY: z.string(),
  /** Base URL do microserviço payments-ms (ex.: http://localhost:3334) */
  PAYMENTS_MS_URL: z.string().url(),
  /** Mesmo valor que FESTA_HMAC_SECRET no payments-ms */
  INTERNAL_PAYMENTS_HMAC_SECRET: z.string().min(8),
})

export type Env = z.infer<typeof envSchema>
