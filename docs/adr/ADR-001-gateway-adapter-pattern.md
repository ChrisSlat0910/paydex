# ADR-001: Gateway-Agnostic Adapter Pattern

**Status:** Accepted
**Date:** 2026-08-01

## Context

Paydex needs to support Midtrans in v1 with a clear path to Stripe and Xendit in v2. Baking Midtrans-specific logic throughout WebhookService would require widespread refactoring for every new gateway.

## Decision

Implement an `IGateway` interface with two methods every adapter must implement:

- `validateSignature(rawBody, headers, secret): boolean`
- `normalizeEvent(rawPayload): NormalizedWebhookEvent`

`GatewayAdapterFactory.create(type)` returns the correct adapter at runtime based on the gateway record's `adapter_type` field. `WebhookService` depends only on `IGateway`, never on `MidtransAdapter` directly.

## Rationale

- Adding a new gateway requires implementing `IGateway` only — zero changes to `WebhookService`, middleware, or DB schema.
- The interface is testable in isolation — mock `IGateway` in `WebhookService` unit tests without any Midtrans SDK dependency.
- The CV claim "extensible to Stripe/Xendit via adapter pattern" is backed by real code.

## Alternatives Considered

- **Direct implementation (no interface):** Faster v1, but v2 requires refactoring `WebhookService`. Rejected.
- **Plugin registry pattern:** Dynamically load adapter modules at runtime. More flexible, adds complexity not needed at v1 scale. Rejected.
- **External adapter microservice:** Correct at scale, wrong for a portfolio monolith. Rejected.

## Consequences

- Positive: v2 gateway adapters are 1-2 files each with no core changes.
- Positive: `WebhookService` unit tests run without network calls or Midtrans SDK.
- Negative: One additional indirection layer (factory → adapter → interface). Acceptable tradeoff.
