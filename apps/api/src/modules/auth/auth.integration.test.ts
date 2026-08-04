import request from 'supertest';

import { app } from '../../app';
import { pool } from '../../db/pool';
import { redisConnection } from '../../queue/bullmq.config';

describe('Auth Integration', () => {
  beforeEach(async () => {
    await pool.query('DELETE FROM audit_log');
    await pool.query('DELETE FROM delivery_logs');
    await pool.query('DELETE FROM idempotency_keys');
    await pool.query('DELETE FROM webhook_events');
    await pool.query('DELETE FROM endpoints');
    await pool.query('DELETE FROM gateways');
    await pool.query('DELETE FROM api_keys');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');
  });

  afterAll(async () => {
    await pool.end();
    await redisConnection.quit();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should return 409 if email already exists', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });
    });

    it('should return 401 with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });
});
