import { createHash } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../errors/app-error';
import { query } from '../../db/pool';

interface UserRow {
  id: string;
  email: string;
  bcrypt_hash: string;
  role: 'admin' | 'developer';
}

interface RefreshTokenRow {
  id: string;
  user_id: string;
  expires_at: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function signAccessToken(userId: string, role: string): string {
  return sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: '15m' });
}

function signRefreshToken(userId: string): string {
  return sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function register(email: string, password: string): Promise<TokenPair> {
  const existing = await query<UserRow>('SELECT id FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    throw new AppError('Email already registered', 'EMAIL_ALREADY_EXISTS', 409);
  }

  const bcryptHash = await hash(password, 12);
  const userId = uuidv4();

  await query('INSERT INTO users (id, email, bcrypt_hash, role) VALUES ($1, $2, $3, $4)', [
    userId,
    email,
    bcryptHash,
    'developer',
  ]);

  const accessToken = signAccessToken(userId, 'developer');
  const refreshToken = signRefreshToken(userId);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), userId, tokenHash, expiresAt],
  );

  logger.info('User registered', { userId });

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string): Promise<TokenPair> {
  const result = await query<UserRow>(
    'SELECT id, email, bcrypt_hash, role FROM users WHERE email = $1',
    [email],
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  const user = result.rows[0];
  const valid = await compare(password, user.bcrypt_hash);

  if (!valid) {
    throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), user.id, tokenHash, expiresAt],
  );

  logger.info('User logged in', { userId: user.id });

  return { accessToken, refreshToken };
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  let payload: { sub: string };

  try {
    payload = verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch {
    throw new AppError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401);
  }

  const tokenHash = hashToken(refreshToken);
  const result = await query<RefreshTokenRow>(
    'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash],
  );

  if (result.rows.length === 0) {
    throw new AppError('Refresh token revoked', 'REFRESH_TOKEN_REVOKED', 401);
  }

  const storedToken = result.rows[0];

  if (new Date(storedToken.expires_at) < new Date()) {
    throw new AppError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED', 401);
  }

  const userResult = await query<UserRow>('SELECT id, role FROM users WHERE id = $1', [
    payload.sub,
  ]);

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 'USER_NOT_FOUND', 404);
  }

  const user = userResult.rows[0];
  const accessToken = signAccessToken(user.id, user.role);

  return { accessToken };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);

  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}
