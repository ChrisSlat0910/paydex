export type DeliveryStatus = 'SUCCESS' | 'FAILED';

export interface DeliveryLog {
  id: string;
  eventId: string;
  endpointId: string;
  attemptNumber: number;
  httpStatus: number | null;
  responseBody: string | null;
  durationMs: number | null;
  status: DeliveryStatus;
  errorMessage: string | null;
  attemptedAt: string;
}
