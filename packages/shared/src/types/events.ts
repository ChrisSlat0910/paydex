export type WebhookEventStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'DUPLICATE';

export interface WebhookEvent {
  id: string;
  gatewayId: string;
  ownerId: string;
  externalId: string;
  eventType: string;
  status: WebhookEventStatus;
  rawPayload: unknown;
  normalizedPayload: unknown;
  idempotencyKey: string;
  eventHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventListItem {
  id: string;
  externalId: string;
  eventType: string;
  status: WebhookEventStatus;
  gatewayId: string;
  createdAt: string;
  updatedAt: string;
  latestDelivery?: {
    attemptNumber: number;
    httpStatus: number | null;
    attemptedAt: string;
  } | null;
}
