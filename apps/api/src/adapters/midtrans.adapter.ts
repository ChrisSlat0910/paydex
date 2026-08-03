import { createHash, timingSafeEqual } from 'crypto';

import type { NormalizedWebhookEvent } from '@paydex/shared';

import type { IGateway } from './gateway.interface';

interface MidtransPayload {
  order_id: string;
  transaction_status: string;
  gross_amount: string;
  status_code: string;
  signature_key?: string;
  payment_type?: string;
  transaction_id?: string;
  transaction_time?: string;
}

export class MidtransAdapter implements IGateway {
  validateSignature(
    _rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string,
  ): boolean {
    const payload = JSON.parse(_rawBody.toString('utf-8')) as MidtransPayload;
    const { order_id, status_code, gross_amount, signature_key } = payload;

    if (!signature_key) return false;

    const computed = createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${secret}`)
      .digest('hex');

    try {
      return timingSafeEqual(Buffer.from(signature_key, 'hex'), Buffer.from(computed, 'hex'));
    } catch {
      return false;
    }
  }

  normalizeEvent(rawPayload: unknown): NormalizedWebhookEvent {
    const p = rawPayload as MidtransPayload;

    return {
      externalId: p.order_id,
      eventType: p.transaction_status,
      amount: parseFloat(p.gross_amount),
      currency: 'IDR',
      status: p.transaction_status,
      rawPayload: p,
      metadata: {
        paymentType: p.payment_type,
        transactionId: p.transaction_id,
        transactionTime: p.transaction_time,
      },
    };
  }
}
