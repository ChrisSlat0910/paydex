import type { NormalizedWebhookEvent } from '@paydex/shared';

export interface IGateway {
  validateSignature(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string,
  ): boolean;

  normalizeEvent(rawPayload: unknown): NormalizedWebhookEvent;
}
