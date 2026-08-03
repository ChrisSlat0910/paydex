# ADR-004: Cryptographic Chaining for Audit Log

**Status:** Accepted
**Date:** 2026-08-01

## Context

Paydex needs an audit trail that is tamper-evident and complete. Simply writing rows to a table provides no protection against silent modification or deletion of historical records.

## Decision

Each `audit_log` entry's `curr_hash` is computed as:

```
SHA-256(prevHash + eventId + action + actorId + timestamp)
```

The first entry uses `'GENESIS'` as `prevHash`. Entries are never updated or deleted.

`SELECT FOR UPDATE` on the last audit entry serializes writes to prevent chain forks under concurrency. Audit writes run on a dedicated BullMQ queue with `concurrency: 1` to further serialize at the queue level.

Chain integrity can be verified at any time via `GET /api/v1/audit-log/verify`.

## Rationale

- Changing any historical entry breaks all subsequent hashes — tampering is immediately detectable.
- A verified chain guarantees no entries were silently deleted from the middle.
- `SELECT FOR UPDATE` prevents two concurrent writes from reading the same `prevHash` and producing a fork.
- Serial audit queue reduces lock contention vs concurrent HTTP handlers racing for the lock.

## Alternatives Considered

- **Plain append-only table (no hashing):** Simpler, but provides no tamper evidence — any DB admin can modify rows. Rejected.
- **Merkle tree:** Stronger proof structure, enables efficient partial verification. Complexity not justified at v1 scale. Could be added in v2. Noted for future.
- **External audit service:** Correct for compliance at enterprise scale, wrong for a portfolio monolith. Rejected.

## Consequences

- Positive: `GET /audit-log/verify` provides a single, verifiable proof of chain integrity.
- Positive: CV claim "cryptographic event chaining" is backed by real, working code.
- Negative: `SELECT FOR UPDATE` serializes audit writes — throughput is bounded by single-row lock speed. Mitigated by the serial BullMQ audit queue keeping lock contention near zero.
- Negative: Chain verification requires a full table scan. Acceptable at demo scale.
