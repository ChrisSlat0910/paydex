-- Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  email VARCHAR(255) NOT NULL UNIQUE,
  bcrypt_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'developer' CHECK (role IN ('admin', 'developer')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prefix VARCHAR(20) NOT NULL UNIQUE,
  hashed_key VARCHAR(255) NOT NULL,
  environment VARCHAR(10) NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),
  is_active INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Gateways
CREATE TABLE IF NOT EXISTS gateways (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  adapter_type VARCHAR(20) NOT NULL CHECK (adapter_type IN ('midtrans', 'stripe', 'xendit')),
  encrypted_credentials TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Endpoints
CREATE TABLE IF NOT EXISTS endpoints (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gateway_id VARCHAR(36) NOT NULL REFERENCES gateways(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  hashed_secret VARCHAR(255),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Webhook events
CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  gateway_id VARCHAR(36) NOT NULL REFERENCES gateways(id),
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
  external_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED', 'DUPLICATE')),
  raw_payload TEXT NOT NULL,
  normalized_payload TEXT NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  event_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Delivery logs
CREATE TABLE IF NOT EXISTS delivery_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  event_id VARCHAR(36) NOT NULL REFERENCES webhook_events(id),
  endpoint_id VARCHAR(36) NOT NULL REFERENCES endpoints(id),
  attempt_number INTEGER NOT NULL,
  http_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
  error_message TEXT,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  event_id VARCHAR(36) NOT NULL REFERENCES webhook_events(id),
  actor_id VARCHAR(36) NOT NULL,
  action VARCHAR(50) NOT NULL,
  prev_hash VARCHAR(64) NOT NULL,
  curr_hash VARCHAR(64) NOT NULL UNIQUE,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Idempotency keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  key VARCHAR(255) NOT NULL UNIQUE,
  event_id VARCHAR(36) NOT NULL REFERENCES webhook_events(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (prefix);

CREATE INDEX IF NOT EXISTS idx_gateways_owner_id ON gateways (owner_id);

CREATE INDEX IF NOT EXISTS idx_endpoints_owner_id ON endpoints (owner_id);

CREATE INDEX IF NOT EXISTS idx_endpoints_gateway_id ON endpoints (gateway_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway_id ON webhook_events (gateway_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_owner_id ON webhook_events (owner_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events (status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency_key ON webhook_events (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_event_id ON delivery_logs (event_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_id ON audit_log (event_id);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys (key);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys (expires_at);