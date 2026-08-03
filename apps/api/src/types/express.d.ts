declare namespace Express {
  interface Request {
    correlationId: string;
    isDuplicate?: boolean;
    gatewayName?: string;
    externalId?: string;
    user?: {
      id: string;
      email: string;
      role: 'admin' | 'developer';
      apiKeyId?: string;
    };
  }
}
