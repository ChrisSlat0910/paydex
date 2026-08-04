export default async function globalSetup() {
  process.env['NODE_ENV'] = 'test';
  process.env['DATABASE_URL'] = 'postgresql://postgres:password@localhost:5432/paydex_test';
  process.env['REDIS_URL'] = 'redis://localhost:6379';
  process.env['JWT_SECRET'] = 'test-jwt-secret-minimum-32-characters-long';
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-minimum-32-characters-xx';
  process.env['GATEWAY_ENCRYPTION_KEY'] = '0'.repeat(64);
  process.env['CORS_ORIGIN'] = 'http://localhost:3000';
}
