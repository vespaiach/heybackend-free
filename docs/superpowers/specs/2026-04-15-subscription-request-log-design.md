# Subscription Request Log — Design Spec

**Date:** 2026-04-15  
**Status:** Approved

---

## Context

The `Subscriber` model currently holds enrichment metadata (location, timezone, device, OS, browser) alongside identity fields. This conflates two concerns: _who the subscriber is_ and _how each request arrived_. Additionally, there is no audit trail for rejected requests (rate-limited, invalid token, honeypot, validation errors) or for unsubscribe events.

This change introduces a `SubscriptionRequest` table that logs every subscribe and unsubscribe request — accepted or rejected — with full context (geo, device, request type, rejection reason). The enrichment fields are removed from `Subscriber`, which becomes a lean identity + subscription-state record. Analytics that previously queried `Subscriber` enrichment fields will query `SubscriptionRequest` instead, giving richer traffic-based insights across all requests.

---

## Schema

### New enums

```prisma
enum SubscriptionRequestType {
  SUBSCRIBE
  UNSUBSCRIBE
}

enum SubscriptionRequestStatus {
  ACCEPTED
  REJECTED
}

enum SubscriptionRejectionReason {
  VALIDATION_ERROR
  INVALID_TOKEN
  RATE_LIMIT_IP
  RATE_LIMIT_WEBSITE
  HONEYPOT
}
```

### New model: `SubscriptionRequest`

```prisma
model SubscriptionRequest {
  id              String                        @id @default(cuid())
  email           String
  websiteId       String
  type            SubscriptionRequestType
  status          SubscriptionRequestStatus
  rejectionReason SubscriptionRejectionReason?
  createdAt       DateTime                      @default(now())

  // Location (async-enriched post-response)
  country         String?
  region          String?
  city            String?
  area            String?   // sub-city granularity; may be null with current fast-geoip
  timezone        String?

  // Device (async-enriched post-response)
  platform        String?   // OS name: Windows, macOS, iOS, Android…
  browser         String?
  deviceType      String?   // desktop | mobile | tablet

  website Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  @@index([websiteId])
  @@index([email, websiteId])
  @@index([createdAt])
  @@index([type, status, websiteId])
}
```

### `Subscriber` fields removed

Drop these columns (no migration of data — existing rows are seed data):

`timezone`, `country`, `region`, `city`, `os`, `deviceType`, `browser`, `metadata`

---

## API Changes

### Subscribe endpoint — `src/app/api/[websiteId]/subscribe/route.ts`

Log a `SubscriptionRequest` record at every exit point:

| Exit point | `type` | `status` | `rejectionReason` |
|---|---|---|---|
| 422 validation error | SUBSCRIBE | REJECTED | VALIDATION_ERROR |
| 401 invalid token | SUBSCRIBE | REJECTED | INVALID_TOKEN |
| 429 per-IP rate limit | SUBSCRIBE | REJECTED | RATE_LIMIT_IP |
| 429 per-website rate limit | SUBSCRIBE | REJECTED | RATE_LIMIT_WEBSITE |
| Honeypot (silent 201) | SUBSCRIBE | REJECTED | HONEYPOT |
| 200/201 success | SUBSCRIBE | ACCEPTED | null |

After logging, the `after()` async enrichment call updates `SubscriptionRequest` (geo-IP + UA) instead of `Subscriber`.

### New unsubscribe endpoint — `src/app/api/[websiteId]/unsubscribe/route.ts`

Same guard stack as subscribe: CORS preflight, HMAC token verification, shared rate limits. No honeypot needed.

Request body: `{ email, token, expiresAt }`

Flow:
1. Validate body (Valibot schema)
2. Verify HMAC token
3. Check rate limits (per-IP + per-website, same limits as subscribe)
4. Look up subscriber by `(email, websiteId)` — not found → log `REJECTED / VALIDATION_ERROR`, return 404
5. Set `unsubscribedAt = now()` on `Subscriber`
6. Log `SubscriptionRequest` with `type: UNSUBSCRIBE, status: ACCEPTED`
7. `after()` → async enrichment on the new request record

---

## Domain Layer Changes

### Files affected

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add enums + `SubscriptionRequest` model; remove 8 fields from `Subscriber` |
| `src/lib/domain/types.ts` | Add `SubscriptionRequest` interface + enum types; remove enrichment fields from `Subscriber` interface; repurpose `EnrichmentData` for request enrichment |
| `src/lib/domain/subscriber/subscriber-service.ts` | Remove `enrichSubscriber()`; add `logRequest()` + `enrichRequest()` |
| `src/lib/domain/subscriber/subscriber-service.interface.ts` | Add `logRequest()` + `enrichRequest()` signatures; remove `enrichSubscriber()` |
| `src/lib/domain/index.ts` | Re-export new types if needed |
| `src/app/api/[websiteId]/subscribe/route.ts` | Log requests at all exit points; shift async enrichment to request record |
| `src/app/api/[websiteId]/unsubscribe/route.ts` | New file — full subscribe-equivalent guard stack |

### New service methods

```typescript
// Create a request log record (synchronous, called before response)
logRequest(data: {
  email: string;
  websiteId: string;
  type: SubscriptionRequestType;
  status: SubscriptionRequestStatus;
  rejectionReason?: SubscriptionRejectionReason;
}): Promise<SubscriptionRequest>

// Enrich a request record with geo/device data (called async via after())
enrichRequest(id: string, data: EnrichmentData): Promise<void>
```

### Analytics methods

Update existing analytics methods to query `SubscriptionRequest` instead of `Subscriber` for geo/device breakdowns:

- Geographic breakdown → `SubscriptionRequest.country`
- Device breakdown → `SubscriptionRequest.deviceType`, `SubscriptionRequest.browser`
- Timezone analysis → `SubscriptionRequest.timezone`

Default filter for subscriber-oriented analytics: `type: SUBSCRIBE, status: ACCEPTED`.  
Traffic analytics can include all statuses.

---

## Migration

1. Run `npm run db:migrate` — generates and applies two migrations:
   - Add `SubscriptionRequest` table + enums
   - Drop 8 columns from `Subscriber` (destructive; existing data is seed data)
2. Run `npm run db:generate` to regenerate Prisma client

---

## Verification

1. **Unit tests** — update/add tests in `src/lib/domain/subscriber/__tests__/` for `logRequest()` and `enrichRequest()`
2. **API tests** — add tests in `sdk/src/__tests__/` or co-located `__tests__/` for the new unsubscribe route
3. **Manual flow**:
   - POST to `/api/[websiteId]/subscribe` with valid payload → check `SubscriptionRequest` row created with `ACCEPTED`
   - POST with invalid token → check `REJECTED / INVALID_TOKEN` row
   - POST with rate-limit exceeded → check `REJECTED / RATE_LIMIT_*` row
   - POST to `/api/[websiteId]/unsubscribe` → check `Subscriber.unsubscribedAt` set + `SubscriptionRequest` row created
   - Confirm `Subscriber` rows no longer have enrichment fields
4. **Build** — `npm run build` must pass with no type errors
5. **Lint** — `npm run lint` must pass
