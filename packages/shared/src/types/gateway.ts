export type GatewayAdapterType = 'midtrans' | 'stripe' | 'xendit';

export interface Gateway {
  id: string;
  ownerId: string;
  name: string;
  adapterType: GatewayAdapterType;
  isActive: boolean;
  createdAt: string;
}

export interface Endpoint {
  id: string;
  ownerId: string;
  gatewayId: string;
  url: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  prefix: string;
  environment: 'live' | 'test';
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}
