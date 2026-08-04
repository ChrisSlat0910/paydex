import { login, register } from './auth.service';
import { query } from '../../db/pool';

jest.mock('../../db/pool');
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));
jest.mock('../../queue/bullmq.config', () => ({
  redisConnection: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

const mockQuery = query as jest.MockedFunction<typeof query>;
const { compare } = jest.requireMock<{ compare: jest.Mock }>('bcryptjs');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await register('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw if email already exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }],
        rowCount: 1,
      } as any);

      await expect(register('existing@example.com', 'password123')).rejects.toThrow(
        'Email already registered',
      );
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return tokens', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-id',
              email: 'test@example.com',
              bcrypt_hash: 'hashed-password',
              role: 'developer',
            },
          ],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      compare.mockResolvedValueOnce(true);

      const result = await login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw with invalid credentials', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(login('wrong@example.com', 'password123')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw when password does not match', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-id',
            email: 'test@example.com',
            bcrypt_hash: 'hashed-password',
            role: 'developer',
          },
        ],
        rowCount: 1,
      } as any);

      compare.mockResolvedValueOnce(false);

      await expect(login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });
});
