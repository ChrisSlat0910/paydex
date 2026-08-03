export interface DeliveryJobData {
  eventId: string;
  endpointId: string;
  endpointUrl: string;
  payload: unknown;
  attemptNumber: number;
}

export interface AuditJobData {
  eventId: string;
  action: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}
