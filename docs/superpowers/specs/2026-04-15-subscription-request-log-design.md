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

**Method: GET** — users click an unsubscribe link from an email, e.g.:
`https://app.heybackend.com/api/[websiteId]/unsubscribe?email=alice%40example.com&token=...&expiresAt=...`

No OPTIONS preflight needed (browser GET from email client does not trigger CORS preflight). No honeypot needed.

Query params: `email`, `token`, `expiresAt`

Flow:
1. Validate query params (Valibot schema)
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

## Tests

Tests are written **before** implementation (TDD). All test files use Vitest globals (`describe`, `it`, `expect`, `vi`) — no imports needed. API route tests add `// @vitest-environment node` at the top.

### Mocking conventions (consistent with existing tests)

```typescript
vi.mock("@/lib/domain", () => ({
  websiteService: { getWebsiteForSigning: vi.fn(), getWebsiteById: vi.fn() },
  subscriberService: {
    upsertSubscriber: vi.fn(),
    logRequest: vi.fn(),
    enrichRequest: vi.fn(),
    unsubscribeByEmail: vi.fn(),
  },
}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("fast-geoip", () => ({ default: { lookup: vi.fn().mockResolvedValue(null) } }));
vi.mock("ua-parser-js", () => ({ UAParser: vi.fn() }));
vi.mock("@/lib/rate-limiter", () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
```

`after()` is mocked to execute synchronously so enrichment assertions don't need `setTimeout`:

```typescript
vi.mocked(after).mockImplementation((task) => void (task as () => Promise<void>)());
```

---

### 1. Subscribe endpoint — updated tests

**File:** `src/app/api/[websiteId]/subscribe/__tests__/route.test.ts`

Update existing tests: replace all `enrichSubscriber` references with `logRequest` + `enrichRequest`. Add the following new cases:

#### Logging — rejected requests

| Test | Assertion |
|---|---|
| Malformed JSON body | `logRequest` called with `{ type: SUBSCRIBE, status: REJECTED, rejectionReason: VALIDATION_ERROR }` |
| Missing/invalid email | same as above |
| Invalid HMAC token | `logRequest` called with `{ type: SUBSCRIBE, status: REJECTED, rejectionReason: INVALID_TOKEN }` |
| Expired token | same as above |
| Per-IP rate limited | `logRequest` called with `{ type: SUBSCRIBE, status: REJECTED, rejectionReason: RATE_LIMIT_IP }` |
| Per-website rate limited | `logRequest` called with `{ type: SUBSCRIBE, status: REJECTED, rejectionReason: RATE_LIMIT_WEBSITE }` |
| Honeypot filled | `logRequest` called with `{ type: SUBSCRIBE, status: REJECTED, rejectionReason: HONEYPOT }`; `upsertSubscriber` NOT called |

#### Logging — accepted requests

| Test | Assertion |
|---|---|
| New subscriber (201) | `logRequest` called with `{ type: SUBSCRIBE, status: ACCEPTED, rejectionReason: undefined }` |
| Returning subscriber (200) | same |

#### Async enrichment

| Test | Assertion |
|---|---|
| Accepted request triggers enrichment | `enrichRequest` called via `after()` with the request id returned by `logRequest`, and `{ country, region, city, timezone, browser, deviceType, platform }` |
| Rejected request (rate limit) also triggers enrichment | `enrichRequest` also called for rejected requests |
| Validation error does NOT trigger enrichment | `enrichRequest` NOT called when body is invalid (no request id to enrich at that stage) |

> **Note:** For validation errors, `logRequest` is called without email (or with the raw email string), and enrichment is still attempted. If email is unavailable at validation stage, log with `email: ""` and still enrich.

---

### 2. Unsubscribe endpoint — new tests

**File:** `src/app/api/[websiteId]/unsubscribe/__tests__/route.test.ts`

GET-based test suite. Request helpers use query string params instead of a body:

```typescript
function makeGet(query: Record<string, string>, ip = "1.2.3.4"): Request {
  const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
  const qs = new URLSearchParams({ email: "alice@example.com", token, expiresAt, ...query });
  return new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}
```

#### Query param validation (no OPTIONS preflight — GET from email link)

| Test | Expected | `logRequest` called? |
|---|---|---|
| Missing `email` | 422 | Yes — REJECTED / VALIDATION_ERROR |
| Invalid email format | 422 | Yes — REJECTED / VALIDATION_ERROR |
| Missing `token` | 422 | Yes — REJECTED / VALIDATION_ERROR |
| Missing `expiresAt` | 422 | Yes — REJECTED / VALIDATION_ERROR |

#### Token guard

| Test | Expected | `logRequest` called? |
|---|---|---|
| Token signed with wrong key | 401 | Yes — REJECTED / INVALID_TOKEN |
| Expired token | 401 | Yes — REJECTED / INVALID_TOKEN |
| Website inactive | 403 | Yes — REJECTED / INVALID_TOKEN |

#### Rate limiting

| Test | Expected | `logRequest` called? |
|---|---|---|
| Per-IP limit exceeded | 429 with `Retry-After` header + CORS headers | Yes — REJECTED / RATE_LIMIT_IP |
| Per-website limit exceeded | 429 with `Retry-After` header + CORS headers | Yes — REJECTED / RATE_LIMIT_WEBSITE |

#### Subscriber not found

| Test | Expected | `logRequest` called? |
|---|---|---|
| Email not subscribed to this website | 404 | Yes — REJECTED / VALIDATION_ERROR |

#### Happy path

| Test | Expected |
|---|---|
| Valid request for subscribed email | 200, `unsubscribeByEmail` called with `(email, websiteId)` |
| `logRequest` called | `{ type: UNSUBSCRIBE, status: ACCEPTED, email, websiteId }` |
| Async enrichment | `enrichRequest` called via `after()` with request id + enrichment data |
| CORS headers present on 200 | `Access-Control-Allow-Origin` set correctly |

#### Error handling

| Test | Expected |
|---|---|
| `unsubscribeByEmail` throws | 500, error message not leaked in response body |

---

### 3. Domain service — unit tests

**File:** `src/lib/domain/subscriber/__tests__/subscriber-service.test.ts`

Prisma client is mocked via `vi.mock("@/lib/prisma", ...)`.

#### `logRequest()`

| Test | Assertion |
|---|---|
| Creates record with correct fields | `prisma.subscriptionRequest.create` called with `{ data: { email, websiteId, type, status, rejectionReason } }` |
| Returns created record | resolves to the Prisma return value |
| `rejectionReason` omitted when undefined | field not present in `data` |

#### `enrichRequest()`

| Test | Assertion |
|---|---|
| Updates only provided fields | `prisma.subscriptionRequest.update` called with `{ where: { id }, data: enrichmentData }` |
| Null values written as-is | null fields are passed through (not filtered out) |

---

## Verification

1. **Tests first**: write all test files above before touching implementation.
2. **Run tests red**: `npm test` — all new tests should fail (expected at this stage).
3. **Implement**: make all tests green.
4. **Build**: `npm run build` — no type errors.
5. **Lint**: `npm run lint` — no issues.
