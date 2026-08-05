import { verify } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

import { env } from '../config/env';
import { AppError } from '../errors/app-error';
import { query } from '../db/pool';
import { redisConnection } from '../queue/bullmq.config';

interface JwtPayload {
  sub: string;
  role: 'admin' | 'developer';
}

interface UserRow {
  id: string;
  email: string;
  role: 'admin' | 'developer';
}

interface ApiKeyRow {
  id: string;
  user_id: string;
  hashed_key: string;
  is_active: number;
}

async function validateApiKey(token: string, req: Request): Promise<void> {
  const parts = token.split('_');

  if (parts.length < 3) {
    throw new AppError('Invalid API key format', 'UNAUTHORIZED', 401);
  }

  const prefix = `${parts[0]}_${parts[1]}_${parts[2].substring(0, 8)}`;

  const cacheKey = `apikey:${prefix}`;
  const cached = await redisConnection.get(cacheKey).catch(() => null);

  let apiKey: ApiKeyRow;

  if (cached) {
    apiKey = JSON.parse(cached) as ApiKeyRow;
  } else {
    const result = await query<ApiKeyRow>(
      'SELECT id, user_id, hashed_key, is_active FROM api_keys WHERE prefix = $1',
      [prefix],
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid API key', 'UNAUTHORIZED', 401);
    }

    apiKey = result.rows[0];
    await redisConnection.set(cacheKey, JSON.stringify(apiKey), 'EX', 300).catch(() => null);
  }

  if (!apiKey.is_active) {
    throw new AppError('API key revoked', 'API_KEY_REVOKED', 401);
  }

  const { compare } = await import('bcryptjs');
  const valid = await compare(token, apiKey.hashed_key);

  if (!valid) {
    throw new AppError('Invalid API key', 'UNAUTHORIZED', 401);
  }

  const userResult = await query<UserRow>('SELECT id, email, role FROM users WHERE id = $1', [
    apiKey.user_id,
  ]);

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 'UNAUTHORIZED', 401);
  }

  const user = userResult.rows[0];

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    apiKeyId: apiKey.id,
  };
}

async function validateJwt(token: string, req: Request): Promise<void> {
  let payload: JwtPayload;

  try {
    payload = verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError('Invalid or expired token', 'UNAUTHORIZED', 401);
  }

  const userResult = await query<UserRow>('SELECT id, email, role FROM users WHERE id = $1', [
    payload.sub,
  ]);

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 'UNAUTHORIZED', 401);
  }

  const user = userResult.rows[0];

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Missing or invalid authorization header', 'UNAUTHORIZED', 401));
    return;
  }

  const token = authHeader.slice(7);
  const isApiKey = token.startsWith('pd_live_') || token.startsWith('pd_test_');

  const handler = isApiKey ? validateApiKey(token, req) : validateJwt(token, req);

  handler.then(() => next()).catch((err: unknown) => next(err));
}

export function optionalAuthMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
