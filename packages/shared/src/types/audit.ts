export type AuditAction =
  | 'EVENT_RECEIVED'
  | 'EVENT_DUPLICATE'
  | 'DELIVERY_ATTEMPT'
  | 'DELIVERY_SUCCESS'
  | 'DELIVERY_FAILED'
  | 'DELIVERY_EXHAUSTED'
  | 'GATEWAY_CREATED'
  | 'GATEWAY_UPDATED'
  | 'GATEWAY_DEACTIVATED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'API_KEY_ROTATED';

export interface AuditLogEntry {
  id: string;
  eventId: string;
  actorId: string;
  action: AuditAction;
  prevHash: string;
  currHash: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditChainVerifyResult {
  valid: boolean;
  totalEntries: number;
  brokenAt?: string;
}
