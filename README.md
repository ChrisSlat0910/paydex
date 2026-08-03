# Paydex

**Never lose a payment event again**

Paydex is a Payment Event Gateway & Audit Platform — the reliability layer that sits between payment providers and your application. When Midtrans fires a webhook, Paydex catches it, validates the signature, persists the event, retries failed deliveries, and gives you a real-time dashboard to see every event.

> **Demo:** [Live demo coming after Phase 4 deployment]
>
> Demo credentials: `admin@paydex.dev / demo1234` and `dev@paydex.dev / demo1234`
>
> First request may take 30s on cold start (free tier infrastructure).

## Architecture

![Architecture Overview](docs/architecture-overview.png)

## Tech Stack

| Layer               | Technology                     | Reasoning                                                           |
| ------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Frontend            | Next.js 15 + TypeScript        | App Router, server components, zero-config Vercel deploy            |
| Backend             | Node.js + Express + TypeScript | Explicit middleware chain, non-blocking I/O for webhook concurrency |
| Database            | PostgreSQL 16 (Supabase)       | ACID transactions for audit chain writes, JSONB for payloads        |
| Cache / Queue store | Redis 7 (Upstash)              | BullMQ backing store + rate limit counters + idempotency keys       |
| Queue               | BullMQ                         | Native exponential backoff, DLQ, job persistence                    |
| Auth                | JWT + bcryptjs                 | 15min access token, 7d refresh token, bcrypt cost 12                |
| Styling             | Tailwind CSS                   | Utility-first, dark mode via class strategy                         |

## Key Engineering Decisions

**Gateway-agnostic adapter pattern** — `IGateway` interface with `validateSignature()` and `normalizeEvent()`. `GatewayAdapterFactory.create(type)` returns the correct adapter. Adding Stripe or Xendit requires implementing `IGateway` only — zero changes to `WebhookService`.

**Exponential backoff retry** — BullMQ delivery queue with 6 attempts: 1s → 2s → 4s → 8s → 16s. After exhaustion, event status becomes `FAILED` and a `DELIVERY_EXHAUSTED` audit entry is written.

**Idempotency** — Redis `SET NX` with 24h TTL as primary. PostgreSQL `idempotency_keys` table with `SELECT FOR UPDATE` as fallback. Duplicates always return `200 OK` to prevent gateway retries.

**Cryptographic audit chaining** — `SHA-256(prevHash + eventId + action + actorId + timestamp)`. `SELECT FOR UPDATE` prevents concurrent chain forks. Verifiable at `GET /api/v1/audit-log/verify`.

**Sliding window rate limiting** — Redis ZSET with `ZREMRANGEBYSCORE + ZADD + ZCARD + EXPIRE` in a single pipeline. Prevents boundary bursts that fixed-window allows.

## CV Metrics

| Metric                     | Target                  | Measured          |
| -------------------------- | ----------------------- | ----------------- |
| p95 read endpoint latency  | < 200ms                 | TBD after Phase 4 |
| p99 write endpoint latency | < 500ms                 | TBD after Phase 4 |
| Rate limit enforcement     | 1,000 req/min           | TBD               |
| Idempotency dedup rate     | 0% duplicate processing | TBD               |
| CI/CD pipeline duration    | < 5 minutes             | TBD               |
| Test coverage              | >= 70%                  | TBD               |

## Local Setup

```bash
# 1. Clone and install
git clone https://github.com/ChrisSlat0910/paydex.git
cd paydex
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start infrastructure
docker-compose up -d

# 4. Run migrations
npm run migrate --workspace=apps/api

# 5. Start development server
npm run dev --workspace=apps/api
```

API available at `http://localhost:3001`
Swagger UI at `http://localhost:3001/api/docs`

## API Documentation

Swagger UI: `/api/docs` (no auth required)

## Architecture Decision Records

- [ADR-001: Gateway-Agnostic Adapter Pattern](docs/adr/ADR-001-gateway-adapter-pattern.md)
- [ADR-002: BullMQ Over Native Redis Pub/Sub](docs/adr/ADR-002-bullmq-delivery-queue.md)
- [ADR-003: Sliding Window Rate Limiting](docs/adr/ADR-003-sliding-window-rate-limiting.md)
- [ADR-004: Cryptographic Audit Chaining](docs/adr/ADR-004-cryptographic-audit-chaining.md)

## Project Structure

```
paydex/
├── apps/
│   ├── api/src/
│   │   ├── adapters/       IGateway, MidtransAdapter, AdapterFactory
│   │   ├── config/         env.ts (Zod), logger.ts
│   │   ├── db/             pool.ts, migrate.ts, migrations/
│   │   ├── middleware/     correlation-id, error, auth, rbac, rate-limit, idempotency
│   │   ├── modules/        auth, api-keys, gateways, endpoints, webhooks, events, delivery, audit
│   │   ├── queue/          bullmq.config.ts, job-types.ts
│   │   ├── types/          express.d.ts
│   │   ├── websocket/      ws.server.ts
│   │   ├── app.ts
│   │   └── server.ts
│   └── web/src/app/        Next.js 15 App Router pages
├── packages/shared/src/    Shared TypeScript types
├── docs/adr/               Architecture Decision Records
├── nginx/                  Nginx config
└── docker-compose.yml
```

---

Built by [Christovel Clever Slat](https://github.com/ChrisSlat0910) as a production-grade portfolio project.
