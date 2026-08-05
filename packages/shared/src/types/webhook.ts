export interface NormalizedWebhookEvent {
  externalId: string;
  eventType: string;
  amount: number;
  currency: string;
  status: string;
  rawPayload: unknown;
  metadata?: Record<string, unknown>;
}
