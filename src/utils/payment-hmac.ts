import * as crypto from "crypto";

export type PaymentConfirmedBody = {
  external_reference: string;
  payment_id: string;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  metadata?: Record<string, unknown>;
};

export function verifyPaymentSignature(
  payload: PaymentConfirmedBody,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const input = `${payload.external_reference}|${payload.payment_id}|${payload.status}|${String(payload.transaction_amount)}`;
  const expected = crypto.createHmac("sha256", secret).update(input).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
