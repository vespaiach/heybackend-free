# Subscription Request Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a `SubscriptionRequest` audit-log table that records every subscribe/unsubscribe request (accepted or rejected) with geo/device enrichment, while stripping those enrichment fields from the lean `Subscriber` model.

**Architecture:** A new `SubscriptionRequest` Prisma model stores each request's type, status, rejection reason, email, and geo/device metadata (enriched async post-response just like before). Two new service methods (`logRequest`, `enrichRequest`) replace `enrichSubscriber`. The subscribe endpoint logs at every exit point; a new GET unsubscribe endpoint mirrors the same guard stack. Analytics queries shift from `Subscriber` to `SubscriptionRequest`.

**Tech Stack:** Prisma 6 (MySQL), TypeScript 5 (strict), Next.js 16 App Router, Valibot, Vitest, fast-geoip, ua-parser-js

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `prisma/schema.prisma` | Add enums + `SubscriptionRequest` model; drop 8 fields from `Subscriber` |
| Modify | `src/lib/domain/types.ts` | Add `SubscriptionRequest` interface + enum types; lean `Subscriber`; rename `os→platform` in `EnrichmentData` |
| Modify | `src/lib/domain/subscriber/subscriber-service.ts` | Remove `enrichSubscriber`; add `logRequest`+`enrichRequest`; fix `toSubscriber`; update `unsubscribeByEmail`; update `getAnalytics` |
| Modify | `src/lib/domain/subscriber/subscriber-service.interface.ts` | Remove `enrichSubscriber`; add `logRequest`+`enrichRequest`; update `unsubscribeByEmail` JSDoc |
| Create | `src/lib/domain/subscriber/__tests__/subscriber-service.test.ts` | Unit tests for `logRequest` + `enrichRequest` |
| Modify | `src/app/api/[websiteId]/subscribe/route.ts` | Log at every exit; replace `enrichSubscriber` → `enrichRequest` |
| Modify | `src/app/api/[websiteId]/subscribe/__tests__/route.test.ts` | Update mocks; add logRequest/enrichRequest assertions for each exit |
| Create | `src/app/api/[websiteId]/unsubscribe/route.ts` | GET handler: HMAC guard, rate limit, unsubscribe, log, async enrich |
| Create | `src/app/api/[websiteId]/unsubscribe/__tests__/route.test.ts` | Full test suite for unsubscribe endpoint |
| Modify | `src/app/dashboard/[websiteId]/subscribers-list/__tests__/subscribers-table.test.tsx` | Remove enrichment fields from `Subscriber` fixtures |

---

## Task 1: Create feature branch

- [ ] **Step 1: Create and switch to the feature branch**

```bash
git checkout -b feat/subscription-request-log
```

Expected: `Switched to a new branch 'feat/subscription-request-log'`

---

## Task 2: Update Prisma schema + migrate + generate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and `SubscriptionRequest` model to schema**

In `prisma/schema.prisma`, add the following **before** the `model Subscriber` block, and add a `subscriptionRequests` relation to `Website`:

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

model SubscriptionRequest {
  id              String                       @id @default(cuid())
  email           String
  websiteId       String
  type            SubscriptionRequestType
  status          SubscriptionRequestStatus
  rejectionReason SubscriptionRejectionReason?
  createdAt       DateTime                     @default(now())

  // Location (async-enriched post-response via fast-geoip)
  country         String?
  region          String?
  city            String?
  area            String?
  timezone        String?

  // Device (async-enriched post-response via ua-parser-js)
  platform        String?
  browser         String?
  deviceType      String?

  website Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  @@index([websiteId])
  @@index([email, websiteId])
  @@index([createdAt])
  @@index([type, status, websiteId])
}
```

Also update the `Website` model to add the relation field:

```prisma
model Website {
  // ... existing fields ...
  subscriptionRequests SubscriptionRequest[]
}
```

- [ ] **Step 2: Drop enrichment fields from `Subscriber`**

Replace the `Subscriber` model block with:

```prisma
model Subscriber {
  id             String    @id @default(cuid())
  email          String
  firstName      String?
  lastName       String?
  websiteId      String
  unsubscribedAt DateTime?
  createdAt      DateTime  @default(now())

  website Website         @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  tags    SubscriberTag[]

  @@unique([email, websiteId])
  @@index([websiteId])
}
```

- [ ] **Step 3: Run migration**

```bash
npm run db:migrate
```

At the prompt, name the migration: `add_subscription_request_log`

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 4: Regenerate Prisma client**

```bash
npm run db:generate
```

Expected: `Generated Prisma Client` (no errors)

---

## Task 3: Update domain types

**Files:**
- Modify: `src/lib/domain/types.ts`

- [ ] **Step 1: Add new types for SubscriptionRequest**

After the `Tenant` / `TenantWithWebsites` interfaces (around line 32), add:

```typescript
// ─── Subscription request log ─────────────────────────────────────────────────

export type SubscriptionRequestType = "SUBSCRIBE" | "UNSUBSCRIBE";
export type SubscriptionRequestStatus = "ACCEPTED" | "REJECTED";
export type SubscriptionRejectionReason =
  | "VALIDATION_ERROR"
  | "INVALID_TOKEN"
  | "RATE_LIMIT_IP"
  | "RATE_LIMIT_WEBSITE"
  | "HONEYPOT";

export interface SubscriptionRequest {
  id: string;
  email: string;
  websiteId: string;
  type: SubscriptionRequestType;
  status: SubscriptionRequestStatus;
  rejectionReason: SubscriptionRejectionReason | null;
  createdAt: Date;
  country: string | null;
  region: string | null;
  city: string | null;
  area: string | null;
  timezone: string | null;
  platform: string | null;
  browser: string | null;
  deviceType: string | null;
}

export interface LogRequestInput {
  email: string;
  websiteId: string;
  type: SubscriptionRequestType;
  status: SubscriptionRequestStatus;
  rejectionReason?: SubscriptionRejectionReason;
}
```

- [ ] **Step 2: Strip enrichment fields from `Subscriber` interface**

Replace the `Subscriber` interface (lines 97–114) with:

```typescript
export interface Subscriber {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  websiteId: string;
  createdAt: Date;
  unsubscribedAt: Date | null;
  tags: Pick<Tag, "id" | "name" | "color" | "description">[];
}
```

- [ ] **Step 3: Rename `os` → `platform` in `EnrichmentData`**

Replace the `EnrichmentData` interface (lines 162–170) with:

```typescript
export interface EnrichmentData {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  browser: string | null;
  deviceType: string | null;
  platform: string | null;
}
```

Also remove the `SubscriberMetadata` import/type usage if it was only used for the now-removed `metadata` field. Keep `SubscriberMetadata` if still referenced elsewhere (check: `updateSubscriberMetadata` uses it — keep it).

- [ ] **Step 4: Verify no TypeScript errors so far**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: errors in `subscriber-service.ts` and route files (expected — we haven't updated those yet). No errors in `types.ts` itself.

---

## Task 4: Fix `toSubscriber` mapper and subscriber-table test fixtures

**Files:**
- Modify: `src/lib/domain/subscriber/subscriber-service.ts`
- Modify: `src/app/dashboard/[websiteId]/subscribers-list/__tests__/subscribers-table.test.tsx`

- [ ] **Step 1: Update `toSubscriber` — remove enrichment fields**

In `subscriber-service.ts`, replace the `toSubscriber` function (around lines 83–107) with:

```typescript
function toSubscriber(row: SubscriberWithTags): Subscriber {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    websiteId: row.websiteId,
    createdAt: row.createdAt,
    unsubscribedAt: row.unsubscribedAt,
    tags: row.tags.map((st) => ({
      id: st.tag.id,
      name: st.tag.name,
      color: st.tag.color,
      description: st.tag.description,
    })),
  };
}
```

Also remove `SubscriberMetadata` from the import in `subscriber-service.ts` if it was only used in `toSubscriber`. Keep it if used in `updateSubscriberMetadata` (it is — keep the import).

- [ ] **Step 2: Fix subscriber-table test fixtures**

In `src/app/dashboard/[websiteId]/subscribers-list/__tests__/subscribers-table.test.tsx`:

Find and remove the `enrichmentDefaults` object:

```typescript
// DELETE this block entirely:
const enrichmentDefaults = {
  os: null,
  deviceType: null,
  browser: null,
  timezone: null,
  country: null,
  region: null,
  city: null,
  metadata: null,
};
```

And remove `...enrichmentDefaults` from every subscriber fixture object in the `subscribers` array. The `satisfies import("@/lib/domain/types").Subscriber[]` constraint will now pass with the lean type.

- [ ] **Step 3: Run tests to confirm only expected failures remain**

```bash
npm test 2>&1 | tail -30
```

Expected: `subscribers-table` tests pass. `subscriber-service.ts` compile errors remain (we haven't updated the service yet).

---

## Task 5: Write failing domain service unit tests

**Files:**
- Create: `src/lib/domain/subscriber/__tests__/subscriber-service.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// @vitest-environment node

// Hoist mock variables before vi.mock() calls
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscriptionRequest: {
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

import { PrismaSubscriberService } from "../subscriber-service";

const service = new PrismaSubscriberService();

// ─── Shared mock return value factory ─────────────────────────────────────────

function mockRequestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "req_1",
    email: "alice@example.com",
    websiteId: "site_1",
    type: "SUBSCRIBE",
    status: "ACCEPTED",
    rejectionReason: null,
    createdAt: new Date("2026-01-01"),
    country: null,
    region: null,
    city: null,
    area: null,
    timezone: null,
    platform: null,
    browser: null,
    deviceType: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── logRequest() ─────────────────────────────────────────────────────────────

describe("logRequest()", () => {
  it("creates a SubscriptionRequest record with correct fields", async () => {
    mockCreate.mockResolvedValue(mockRequestRow());

    const result = await service.logRequest({
      email: "alice@example.com",
      websiteId: "site_1",
      type: "SUBSCRIBE",
      status: "ACCEPTED",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: { email: "alice@example.com", websiteId: "site_1", type: "SUBSCRIBE", status: "ACCEPTED" },
    });
    expect(result.id).toBe("req_1");
    expect(result.rejectionReason).toBeNull();
  });

  it("includes rejectionReason in data when provided", async () => {
    mockCreate.mockResolvedValue(mockRequestRow({ status: "REJECTED", rejectionReason: "RATE_LIMIT_IP" }));

    await service.logRequest({
      email: "",
      websiteId: "site_1",
      type: "SUBSCRIBE",
      status: "REJECTED",
      rejectionReason: "RATE_LIMIT_IP",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: "",
        websiteId: "site_1",
        type: "SUBSCRIBE",
        status: "REJECTED",
        rejectionReason: "RATE_LIMIT_IP",
      },
    });
  });

  it("omits rejectionReason key from data when not provided", async () => {
    mockCreate.mockResolvedValue(mockRequestRow());

    await service.logRequest({ email: "a@b.com", websiteId: "site_1", type: "SUBSCRIBE", status: "ACCEPTED" });

    const callArg = mockCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect("rejectionReason" in callArg.data).toBe(false);
  });

  it("maps all returned fields to the SubscriptionRequest interface", async () => {
    const now = new Date("2026-01-01");
    mockCreate.mockResolvedValue(mockRequestRow({ createdAt: now, country: "US", platform: "macOS" }));

    const result = await service.logRequest({
      email: "alice@example.com",
      websiteId: "site_1",
      type: "SUBSCRIBE",
      status: "ACCEPTED",
    });

    expect(result).toEqual({
      id: "req_1",
      email: "alice@example.com",
      websiteId: "site_1",
      type: "SUBSCRIBE",
      status: "ACCEPTED",
      rejectionReason: null,
      createdAt: now,
      country: "US",
      region: null,
      city: null,
      area: null,
      timezone: null,
      platform: "macOS",
      browser: null,
      deviceType: null,
    });
  });
});

// ─── enrichRequest() ──────────────────────────────────────────────────────────

describe("enrichRequest()", () => {
  it("calls prisma update with the given id and all enrichment fields", async () => {
    mockUpdate.mockResolvedValue({});

    await service.enrichRequest("req_1", {
      country: "US",
      region: "CA",
      city: "San Francisco",
      timezone: "America/Los_Angeles",
      browser: "Chrome",
      deviceType: "desktop",
      platform: "macOS",
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "req_1" },
      data: {
        country: "US",
        region: "CA",
        city: "San Francisco",
        timezone: "America/Los_Angeles",
        browser: "Chrome",
        deviceType: "desktop",
        platform: "macOS",
      },
    });
  });

  it("writes null values as-is (does not filter them out)", async () => {
    mockUpdate.mockResolvedValue({});

    await service.enrichRequest("req_1", {
      country: null,
      region: null,
      city: null,
      timezone: null,
      browser: null,
      deviceType: null,
      platform: null,
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "req_1" },
      data: { country: null, region: null, city: null, timezone: null, browser: null, deviceType: null, platform: null },
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test src/lib/domain/subscriber/__tests__/subscriber-service.test.ts
```

Expected: FAIL — `service.logRequest is not a function` (or similar — the methods don't exist yet).

---

## Task 6: Implement `logRequest` + `enrichRequest`; fix `unsubscribeByEmail`; remove `enrichSubscriber`

**Files:**
- Modify: `src/lib/domain/subscriber/subscriber-service.interface.ts`
- Modify: `src/lib/domain/subscriber/subscriber-service.ts`

- [ ] **Step 1: Update the service interface**

In `subscriber-service.interface.ts`:

1. Update the import to add new types:

```typescript
import type {
  AnalyticsRange,
  EnrichmentData,
  ListSubscribersFilter,
  ListSubscribersResult,
  LogRequestInput,
  Subscriber,
  SubscriberAnalytics,
  SubscriptionRequest,
  Tag,
  UpdateSubscriberMetadataInput,
  UpsertSubscriberInput,
} from "@/lib/domain/types";
```

2. Remove the `enrichSubscriber` method.

3. Add `logRequest` and `enrichRequest` after `upsertSubscriber`:

```typescript
/**
 * Log a subscribe/unsubscribe request (accepted or rejected).
 * Called synchronously before sending the response so every request is audited.
 */
logRequest(input: LogRequestInput): Promise<SubscriptionRequest>;

/**
 * Enrich a request log record with geo/device data.
 * Called post-response via after() — zero latency impact.
 */
enrichRequest(id: string, data: EnrichmentData): Promise<void>;
```

4. Update `unsubscribeByEmail` JSDoc (it was wrong — make it accurate):

```typescript
/**
 * Set unsubscribedAt = now for a subscriber identified by email + websiteId.
 * Used by the public unsubscribe endpoint (no tenantId needed).
 * Returns false only when the subscriber is not found. Idempotent: calling on
 * an already-unsubscribed subscriber still returns true and updates the timestamp.
 */
unsubscribeByEmail(email: string, websiteId: string): Promise<boolean>;
```

- [ ] **Step 2: Remove `enrichSubscriber` from the service implementation**

In `subscriber-service.ts`, delete the entire `enrichSubscriber` method (lines 201–241). Also remove `EnrichmentData` from the import if it's no longer used by `enrichSubscriber` — but we'll need it for `enrichRequest`, so keep the import.

- [ ] **Step 3: Fix `unsubscribeByEmail` to be truly idempotent**

Replace the `unsubscribeByEmail` method (around lines 397–403) with:

```typescript
async unsubscribeByEmail(email: string, websiteId: string): Promise<boolean> {
  const subscriber = await prisma.subscriber.findUnique({
    where: { email_websiteId: { email, websiteId } },
    select: { id: true },
  });
  if (!subscriber) return false;
  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { unsubscribedAt: new Date() },
  });
  return true;
}
```

- [ ] **Step 4: Add `logRequest` implementation**

Add after the `upsertSubscriber` method:

```typescript
async logRequest(input: LogRequestInput): Promise<SubscriptionRequest> {
  const { email, websiteId, type, status, rejectionReason } = input;
  const row = await prisma.subscriptionRequest.create({
    data: {
      email,
      websiteId,
      type,
      status,
      ...(rejectionReason != null ? { rejectionReason } : {}),
    },
  });
  return {
    id: row.id,
    email: row.email,
    websiteId: row.websiteId,
    type: row.type as SubscriptionRequestType,
    status: row.status as SubscriptionRequestStatus,
    rejectionReason: row.rejectionReason as SubscriptionRejectionReason | null,
    createdAt: row.createdAt,
    country: row.country,
    region: row.region,
    city: row.city,
    area: row.area,
    timezone: row.timezone,
    platform: row.platform,
    browser: row.browser,
    deviceType: row.deviceType,
  };
}
```

- [ ] **Step 5: Add `enrichRequest` implementation**

Add after `logRequest`:

```typescript
async enrichRequest(id: string, data: EnrichmentData): Promise<void> {
  await prisma.subscriptionRequest.update({
    where: { id },
    data: {
      country: data.country,
      region: data.region,
      city: data.city,
      timezone: data.timezone,
      browser: data.browser,
      deviceType: data.deviceType,
      platform: data.platform,
    },
  });
}
```

- [ ] **Step 6: Update imports in `subscriber-service.ts`**

Update the import from `@/lib/domain/types` to include the new types:

```typescript
import type {
  AnalyticsRange,
  EnrichmentData,
  GrowthDataPoint,
  ListSubscribersFilter,
  ListSubscribersResult,
  LogRequestInput,
  Subscriber,
  SubscriberAnalytics,
  SubscriberMetadata,
  SubscriptionRejectionReason,
  SubscriptionRequest,
  SubscriptionRequestStatus,
  SubscriptionRequestType,
  Tag,
  UpdateSubscriberMetadataInput,
  UpsertSubscriberInput,
} from "@/lib/domain/types";
```

- [ ] **Step 7: Run domain service tests — confirm they pass**

```bash
npm test src/lib/domain/subscriber/__tests__/subscriber-service.test.ts
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma src/lib/domain/types.ts \
  src/lib/domain/subscriber/subscriber-service.interface.ts \
  src/lib/domain/subscriber/subscriber-service.ts \
  src/lib/domain/subscriber/__tests__/subscriber-service.test.ts \
  'src/app/dashboard/[websiteId]/subscribers-list/__tests__/subscribers-table.test.tsx'
git commit -m "feat: add SubscriptionRequest model and domain service methods"
```

---

## Task 7: Update `getAnalytics` to query `SubscriptionRequest`

**Files:**
- Modify: `src/lib/domain/subscriber/subscriber-service.ts`

- [ ] **Step 1: Replace the three `subscriber.groupBy` calls in `getAnalytics`**

In `getAnalytics` (around lines 474–502), replace:

```typescript
// Country breakdown
const countryRows = await prisma.subscriber.groupBy({
  by: ["country"],
  where: { websiteId, country: { not: null } },
  _count: { country: true },
  orderBy: { _count: { country: "desc" } },
  take: 10,
});

// Device breakdown
const deviceRows = await prisma.subscriber.groupBy({
  by: ["deviceType"],
  where: { websiteId },
  _count: { deviceType: true },
});

// Timezone breakdown
const timezoneRows = await prisma.subscriber.groupBy({
  by: ["timezone"],
  where: { websiteId, timezone: { not: null } },
  _count: { timezone: true },
  orderBy: { _count: { timezone: "desc" } },
  take: 10,
});
```

With:

```typescript
// Country breakdown — from accepted subscribe requests
const countryRows = await prisma.subscriptionRequest.groupBy({
  by: ["country"],
  where: { websiteId, type: "SUBSCRIBE", status: "ACCEPTED", country: { not: null } },
  _count: { country: true },
  orderBy: { _count: { country: "desc" } },
  take: 10,
});

// Device breakdown — from accepted subscribe requests
const deviceRows = await prisma.subscriptionRequest.groupBy({
  by: ["deviceType"],
  where: { websiteId, type: "SUBSCRIBE", status: "ACCEPTED" },
  _count: { deviceType: true },
});

// Timezone breakdown — from accepted subscribe requests
const timezoneRows = await prisma.subscriptionRequest.groupBy({
  by: ["timezone"],
  where: { websiteId, type: "SUBSCRIBE", status: "ACCEPTED", timezone: { not: null } },
  _count: { timezone: true },
  orderBy: { _count: { timezone: "desc" } },
  take: 10,
});
```

- [ ] **Step 2: Verify TypeScript compiles cleanly for the service file**

```bash
npx tsc --noEmit 2>&1 | grep subscriber-service
```

Expected: no errors for `subscriber-service.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/domain/subscriber/subscriber-service.ts
git commit -m "feat: analytics queries now use SubscriptionRequest table"
```

---

## Task 8: Update subscribe endpoint tests

**Files:**
- Modify: `src/app/api/[websiteId]/subscribe/__tests__/route.test.ts`

- [ ] **Step 1: Update the `vi.mock("@/lib/domain", ...)` factory**

Replace:

```typescript
vi.mock("@/lib/domain", () => ({
  websiteService: {
    getWebsiteForSigning: vi.fn(),
    getWebsiteById: vi.fn(),
  },
  subscriberService: {
    upsertSubscriber: vi.fn(),
    enrichSubscriber: vi.fn(),
  },
}));
```

With:

```typescript
vi.mock("@/lib/domain", () => ({
  websiteService: {
    getWebsiteForSigning: vi.fn(),
    getWebsiteById: vi.fn(),
  },
  subscriberService: {
    upsertSubscriber: vi.fn(),
    logRequest: vi.fn(),
    enrichRequest: vi.fn(),
  },
}));
```

- [ ] **Step 2: Update `beforeEach` to set up new mocks**

Replace the `enrichSubscriber` default mock line with:

```typescript
vi.mocked(subscriberService.logRequest).mockResolvedValue({ id: "req_1" } as never);
vi.mocked(subscriberService.enrichRequest).mockResolvedValue(undefined);
```

Remove: `vi.mocked(subscriberService.enrichSubscriber).mockResolvedValue(undefined);`

- [ ] **Step 3: Add logRequest assertions to the validation section**

In the `"POST — request parsing & validation"` describe block, add after the existing tests:

```typescript
it("logs REJECTED/VALIDATION_ERROR for malformed JSON", async () => {
  const req = new Request(`http://localhost/api/${WEBSITE_ID}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: WEBSITE_URL },
    body: "not-json{{{",
  });
  await POST(req, params());
  expect(subscriberService.logRequest).toHaveBeenCalledWith(
    expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "VALIDATION_ERROR" }),
  );
});

it("logs REJECTED/VALIDATION_ERROR for invalid email", async () => {
  await POST(makePost(validBody({ email: "not-an-email" })), params());
  expect(subscriberService.logRequest).toHaveBeenCalledWith(
    expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "VALIDATION_ERROR" }),
  );
});
```

- [ ] **Step 4: Add logRequest assertions to the token guard section**

In the `"POST — token & origin guard"` describe block, add:

```typescript
it("logs REJECTED/INVALID_TOKEN for a tampered token", async () => {
  await POST(makePost(validBody({ token: "tampered-token" })), params());
  expect(subscriberService.logRequest).toHaveBeenCalledWith(
    expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "INVALID_TOKEN" }),
  );
});

it("logs REJECTED/INVALID_TOKEN for an expired token", async () => {
  const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID, Date.now() - 16 * 60 * 1000);
  await POST(makePost(validBody({ token, expiresAt })), params());
  expect(subscriberService.logRequest).toHaveBeenCalledWith(
    expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "INVALID_TOKEN" }),
  );
});
```

- [ ] **Step 5: Update and add tests in the rate limiting section**

Replace the existing two rate-limit tests with:

```typescript
it("returns 429 with Retry-After when per-IP rate limit is exceeded", async () => {
  vi.mocked(checkRateLimit).mockReturnValue(false);
  const res = await POST(makePost(validBody()), params());
  expect(res.status).toBe(429);
  expect(res.headers.get("retry-after")).toBe("60");
});

it("includes CORS headers in the 429 response", async () => {
  vi.mocked(checkRateLimit).mockReturnValue(false);
  const res = await POST(makePost(validBody()), params());
  expect(res.headers.get("access-control-allow-origin")).toBe(WEBSITE_URL);
});

it("logs REJECTED/RATE_LIMIT_IP when per-IP limit exceeded", async () => {
  vi.mocked(checkRateLimit).mockReturnValue(false);
  await POST(makePost(validBody()), params());
  expect(subscriberService.logRequest).toHaveBeenCalledWith(
    expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "RATE_LIMIT_IP" }),
  );
});

it("logs REJECTED/RATE_LIMIT_WEBSITE when per-website limit exceeded", async () => {
  vi.mocked(checkRateLimit)
    .mockReturnValueOnce(true)   // per-IP passes
    .mockReturnValue(false);     // per-website fails
  await POST(makePost(validBody()), params());
  expect(subscriberService.logRequest).toHaveBeenCalledWith(
    expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "RATE_LIMIT_WEBSITE" }),
  );
});
```

- [ ] **Step 6: Update honeypot section**

Replace the existing honeypot test with:

```typescript
it("returns 201 silently without upserting when __hp is filled", async () => {
  const res = await POST(makePost(validBody({ __hp: "i-am-a-bot" })), params());
  expect(res.status).toBe(201);
  expect(subscriberService.upsertSubscriber).not.toHaveBeenCalled();
});

it("logs REJECTED/HONEYPOT when __hp is filled", async () => {
  await POST(makePost(validBody({ __hp: "i-am-a-bot" })), params());
  expect(subscriberService.logRequest).toHaveBeenCalledWith(
    expect.objectContaining({ type: "SUBSCRIBE", status: "REJECTED", rejectionReason: "HONEYPOT" }),
  );
});
```

- [ ] **Step 7: Update enrichment test in happy paths**

Replace the existing `"calls enrichSubscriber..."` test with:

```typescript
it("logs ACCEPTED with the normalized email and websiteId", async () => {
  await POST(makePost(validBody()), params());
  expect(subscriberService.logRequest).toHaveBeenCalledWith(
    expect.objectContaining({
      email: "alice@example.com",
      websiteId: WEBSITE_ID,
      type: "SUBSCRIBE",
      status: "ACCEPTED",
    }),
  );
});

it("calls enrichRequest on the logged request id after upsert", async () => {
  vi.mocked(subscriberService.logRequest).mockResolvedValue({ id: "req_1" } as never);
  await POST(makePost(validBody()), params());
  await vi.waitFor(() =>
    expect(subscriberService.enrichRequest).toHaveBeenCalledWith(
      "req_1",
      expect.objectContaining({ country: null, platform: "macOS" }),
    ),
  );
});

it("also calls enrichRequest for rate-limited (rejected) requests", async () => {
  vi.mocked(checkRateLimit).mockReturnValue(false);
  vi.mocked(subscriberService.logRequest).mockResolvedValue({ id: "req_rl" } as never);
  await POST(makePost(validBody()), params());
  await vi.waitFor(() =>
    expect(subscriberService.enrichRequest).toHaveBeenCalledWith("req_rl", expect.any(Object)),
  );
});

it("does NOT call enrichRequest for validation errors", async () => {
  await POST(makePost(validBody({ email: "bad-email" })), params());
  await new Promise<void>((r) => setTimeout(r, 0));
  expect(subscriberService.enrichRequest).not.toHaveBeenCalled();
});
```

- [ ] **Step 8: Run tests — confirm they fail with expected messages**

```bash
npm test 'src/app/api/\[websiteId\]/subscribe/__tests__/route.test.ts'
```

Expected: new logRequest/enrichRequest tests FAIL; existing tests also fail because the route still uses `enrichSubscriber`.

---

## Task 9: Update subscribe route

**Files:**
- Modify: `src/app/api/[websiteId]/subscribe/route.ts`

- [ ] **Step 1: Replace the route implementation**

Replace the entire file content with:

```typescript
import geoip from "fast-geoip";
import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import * as v from "valibot";

import {
  buildCorsHeaders,
  created,
  forbidden,
  getClientIp,
  ok,
  serverError,
  unauthorized,
  validateOrigin,
  validationError,
} from "@/lib/api/route-helpers";
import { subscriberService, websiteService } from "@/lib/domain";
import type { SubscriptionRejectionReason } from "@/lib/domain/types";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { SubscribeRequestSchema } from "@/lib/schemas/subscribe-request";
import { verifyToken } from "@/lib/signing";

// ─── OPTIONS (preflight) ──────────────────────────────────────────────────────

export async function OPTIONS(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  try {
    const { websiteId } = await params;
    const website = await websiteService.getWebsiteById(websiteId);
    if (!website || !website.isActive) return new Response(null, { status: 401 });

    const origin = request.headers.get("origin");
    if (!validateOrigin(origin, website.url)) return new Response(null, { status: 403 });

    return new Response(null, { status: 204, headers: buildCorsHeaders(website.url) });
  } catch {
    return new Response(null, { status: 500 });
  }
}

// ─── POST /api/[websiteId]/subscribe ─────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  const { websiteId } = await params;
  const website = await websiteService.getWebsiteForSigning(websiteId);
  if (!website) return unauthorized();
  const corsHeaders = buildCorsHeaders(website.url);
  if (!website.isActive) return unauthorized(corsHeaders);

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";

  // Logs the request and schedules async geo/UA enrichment (skipped for VALIDATION_ERROR).
  async function logAndEnrich(
    email: string,
    status: "ACCEPTED" | "REJECTED",
    rejectionReason?: SubscriptionRejectionReason,
  ): Promise<void> {
    const req = await subscriberService.logRequest({
      email,
      websiteId: website.id,
      type: "SUBSCRIBE",
      status,
      rejectionReason,
    });
    if (rejectionReason !== "VALIDATION_ERROR") {
      after(async () => {
        try {
          const geo = ip !== "unknown" ? await geoip.lookup(ip) : null;
          const parser = new UAParser(ua);
          await subscriberService.enrichRequest(req.id, {
            country: geo?.country ?? null,
            region: geo?.region || null,
            city: geo?.city || null,
            timezone: geo?.timezone || null,
            browser: parser.getBrowser().name ?? null,
            deviceType: parser.getDevice().type ?? null,
            platform: parser.getOS().name ?? null,
          });
        } catch (err) {
          logger.error("enrichRequest after()", err);
        }
      });
    }
  }

  // Parse body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await logAndEnrich("", "REJECTED", "VALIDATION_ERROR");
    return validationError("Invalid JSON body", corsHeaders);
  }

  // Validate with Valibot.
  const result = v.safeParse(SubscribeRequestSchema, body);
  if (!result.success) {
    const rawEmail =
      typeof body === "object" && body !== null && "email" in body
        ? String((body as Record<string, unknown>).email ?? "")
        : "";
    await logAndEnrich(rawEmail, "REJECTED", "VALIDATION_ERROR");
    return validationError(result.issues.map((i) => i.message), corsHeaders);
  }

  const { email, firstName, lastName, __hp, token, expiresAt } = result.output;

  try {
    // Token verification.
    if (!verifyToken(website.key, websiteId, token, expiresAt)) {
      await logAndEnrich(email, "REJECTED", "INVALID_TOKEN");
      return unauthorized(corsHeaders);
    }

    // Origin check.
    const origin = request.headers.get("origin");
    if (!validateOrigin(origin, website.url)) {
      await logAndEnrich(email, "REJECTED", "INVALID_TOKEN");
      return forbidden(corsHeaders);
    }

    // Rate limiting: per-IP bucket checked first.
    const ipWithinLimit = await checkRateLimit(`ip:${ip}:sub`, 5, 60_000);
    if (!ipWithinLimit) {
      await logAndEnrich(email, "REJECTED", "RATE_LIMIT_IP");
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
      });
    }

    const siteWithinLimit = await checkRateLimit(`site:${website.id}:sub`, 200, 60_000);
    if (!siteWithinLimit) {
      await logAndEnrich(email, "REJECTED", "RATE_LIMIT_WEBSITE");
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60", ...corsHeaders },
      });
    }

    // Honeypot: real users leave this blank; bots fill it in.
    if (__hp) {
      await logAndEnrich(email, "REJECTED", "HONEYPOT");
      return created({ message: "Subscribed" }, corsHeaders);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { created: isNew } = await subscriberService.upsertSubscriber({
      email: normalizedEmail,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      websiteId: website.id,
    });

    await logAndEnrich(normalizedEmail, "ACCEPTED");

    return isNew
      ? created({ message: "Subscribed" }, corsHeaders)
      : ok({ message: "Subscribed" }, corsHeaders);
  } catch (e) {
    logger.error("POST /api/[websiteId]/subscribe", e);
    return serverError(corsHeaders);
  }
}
```

- [ ] **Step 2: Run subscribe tests — all must pass**

```bash
npm test 'src/app/api/\[websiteId\]/subscribe/__tests__/route.test.ts'
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/api/[websiteId]/subscribe/route.ts' \
  'src/app/api/[websiteId]/subscribe/__tests__/route.test.ts'
git commit -m "feat: log all subscribe requests and enrich via SubscriptionRequest"
```

---

## Task 10: Write failing unsubscribe endpoint tests

**Files:**
- Create: `src/app/api/[websiteId]/unsubscribe/__tests__/route.test.ts`

- [ ] **Step 1: Create the test directory and file**

```bash
mkdir -p 'src/app/api/[websiteId]/unsubscribe/__tests__'
```

Create `src/app/api/[websiteId]/unsubscribe/__tests__/route.test.ts`:

```typescript
// @vitest-environment node

vi.mock("@/lib/domain", () => ({
  websiteService: { getWebsiteForSigning: vi.fn() },
  subscriberService: {
    unsubscribeByEmail: vi.fn(),
    logRequest: vi.fn(),
    enrichRequest: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("fast-geoip", () => ({ default: { lookup: vi.fn().mockResolvedValue(null) } }));
vi.mock("ua-parser-js", () => ({ UAParser: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/rate-limiter", () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));

import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import { subscriberService, websiteService } from "@/lib/domain";
import { checkRateLimit } from "@/lib/rate-limiter";
import { mintToken } from "@/lib/signing";
import { GET } from "../route";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEBSITE_ID = "site_abc123";
const WEBSITE_URL = "https://example.com";
const WEBSITE_KEY = "test-signing-secret-32chars!!!!!";

const mockWebsite = { id: WEBSITE_ID, url: WEBSITE_URL, isActive: true, key: WEBSITE_KEY };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGet(overrides: Record<string, string> = {}): Request {
  const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
  const qs = new URLSearchParams({
    email: "alice@example.com",
    token,
    expiresAt: String(expiresAt),
    ...overrides,
  });
  return new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function params(id = WEBSITE_ID) {
  return { params: Promise.resolve({ websiteId: id }) };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // biome-ignore lint/complexity/useArrowFunction: function keyword required — after() callback is awaited
  vi.mocked(after).mockImplementation(function (task) {
    void (task as () => Promise<void>)();
  });
  // biome-ignore lint/complexity/useArrowFunction: function keyword required — UAParser is called with `new`
  vi.mocked(UAParser).mockImplementation(function () {
    return {
      getBrowser: () => ({ name: "Firefox" }),
      getDevice: () => ({ type: undefined }),
      getOS: () => ({ name: "Linux" }),
    } as never;
  });
  vi.mocked(checkRateLimit).mockReturnValue(true);
  vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(mockWebsite);
  vi.mocked(subscriberService.unsubscribeByEmail).mockResolvedValue(true);
  vi.mocked(subscriberService.logRequest).mockResolvedValue({ id: "req_1" } as never);
  vi.mocked(subscriberService.enrichRequest).mockResolvedValue(undefined);
});

// ─── Query param validation ───────────────────────────────────────────────────

describe("GET — query param validation", () => {
  it("returns 400 when email is missing", async () => {
    const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ token, expiresAt: String(expiresAt) });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    expect((await GET(req, params())).status).toBe(400);
  });

  it("logs REJECTED/VALIDATION_ERROR when email is missing", async () => {
    const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ token, expiresAt: String(expiresAt) });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    await GET(req, params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "UNSUBSCRIBE", status: "REJECTED", rejectionReason: "VALIDATION_ERROR" }),
    );
  });

  it("returns 400 when email format is invalid", async () => {
    expect((await GET(makeGet({ email: "not-an-email" }), params())).status).toBe(400);
  });

  it("returns 400 when token is missing", async () => {
    const { expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ email: "alice@example.com", expiresAt: String(expiresAt) });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    expect((await GET(req, params())).status).toBe(400);
  });

  it("returns 400 when expiresAt is missing", async () => {
    const { token } = mintToken(WEBSITE_KEY, WEBSITE_ID);
    const qs = new URLSearchParams({ email: "alice@example.com", token });
    const req = new Request(`http://localhost/api/${WEBSITE_ID}/unsubscribe?${qs}`, { method: "GET" });
    expect((await GET(req, params())).status).toBe(400);
  });
});

// ─── Token guard ─────────────────────────────────────────────────────────────

describe("GET — token guard", () => {
  it("returns 401 when token is tampered", async () => {
    expect((await GET(makeGet({ token: "tampered" }), params())).status).toBe(401);
  });

  it("logs REJECTED/INVALID_TOKEN for tampered token", async () => {
    await GET(makeGet({ token: "tampered" }), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "UNSUBSCRIBE", status: "REJECTED", rejectionReason: "INVALID_TOKEN" }),
    );
  });

  it("returns 401 when token is expired", async () => {
    const { token, expiresAt } = mintToken(WEBSITE_KEY, WEBSITE_ID, Date.now() - 16 * 60 * 1000);
    expect((await GET(makeGet({ token, expiresAt: String(expiresAt) }), params())).status).toBe(401);
  });

  it("returns 401 when website is not found", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue(null);
    expect((await GET(makeGet(), params())).status).toBe(401);
  });

  it("returns 401 when website is inactive", async () => {
    vi.mocked(websiteService.getWebsiteForSigning).mockResolvedValue({ ...mockWebsite, isActive: false });
    expect((await GET(makeGet(), params())).status).toBe(401);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe("GET — rate limiting", () => {
  it("returns 429 with Retry-After when per-IP limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const res = await GET(makeGet(), params());
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("logs REJECTED/RATE_LIMIT_IP when per-IP limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    await GET(makeGet(), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "UNSUBSCRIBE", status: "REJECTED", rejectionReason: "RATE_LIMIT_IP" }),
    );
  });

  it("logs REJECTED/RATE_LIMIT_WEBSITE when per-website limit exceeded", async () => {
    vi.mocked(checkRateLimit)
      .mockReturnValueOnce(true)  // per-IP passes
      .mockReturnValue(false);    // per-website fails
    await GET(makeGet(), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "UNSUBSCRIBE", status: "REJECTED", rejectionReason: "RATE_LIMIT_WEBSITE" }),
    );
  });
});

// ─── Subscriber not found ─────────────────────────────────────────────────────

describe("GET — subscriber not found", () => {
  it("returns 404 when email is not subscribed to this website", async () => {
    vi.mocked(subscriberService.unsubscribeByEmail).mockResolvedValue(false);
    expect((await GET(makeGet(), params())).status).toBe(404);
  });

  it("logs REJECTED/VALIDATION_ERROR when subscriber not found", async () => {
    vi.mocked(subscriberService.unsubscribeByEmail).mockResolvedValue(false);
    await GET(makeGet(), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({ type: "UNSUBSCRIBE", status: "REJECTED", rejectionReason: "VALIDATION_ERROR" }),
    );
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe("GET — happy path", () => {
  it("returns 200 with Unsubscribed message", async () => {
    const res = await GET(makeGet(), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Unsubscribed" });
  });

  it("calls unsubscribeByEmail with normalised email and websiteId", async () => {
    await GET(makeGet({ email: "ALICE@EXAMPLE.COM" }), params());
    expect(subscriberService.unsubscribeByEmail).toHaveBeenCalledWith("alice@example.com", WEBSITE_ID);
  });

  it("logs ACCEPTED with normalised email and websiteId", async () => {
    await GET(makeGet(), params());
    expect(subscriberService.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "alice@example.com",
        websiteId: WEBSITE_ID,
        type: "UNSUBSCRIBE",
        status: "ACCEPTED",
      }),
    );
  });

  it("calls enrichRequest on the logged request id after unsubscribing", async () => {
    vi.mocked(subscriberService.logRequest).mockResolvedValue({ id: "req_1" } as never);
    await GET(makeGet(), params());
    await vi.waitFor(() =>
      expect(subscriberService.enrichRequest).toHaveBeenCalledWith(
        "req_1",
        expect.objectContaining({ country: null, platform: "Linux" }),
      ),
    );
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("GET — error handling", () => {
  it("returns 500 when unsubscribeByEmail throws", async () => {
    vi.mocked(subscriberService.unsubscribeByEmail).mockRejectedValue(new Error("DB error"));
    expect((await GET(makeGet(), params())).status).toBe(500);
  });

  it("does not leak error details in the 500 response", async () => {
    vi.mocked(subscriberService.unsubscribeByEmail).mockRejectedValue(new Error("DB error"));
    const res = await GET(makeGet(), params());
    const body = await res.json();
    expect(body.message).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("DB error");
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail (route doesn't exist yet)**

```bash
npm test 'src/app/api/\[websiteId\]/unsubscribe/__tests__/route.test.ts'
```

Expected: FAIL — `Cannot find module '../route'`

---

## Task 11: Implement unsubscribe route

**Files:**
- Create: `src/app/api/[websiteId]/unsubscribe/route.ts`

- [ ] **Step 1: Create the unsubscribe route**

```typescript
import geoip from "fast-geoip";
import { after } from "next/server";
import { UAParser } from "ua-parser-js";
import * as v from "valibot";

import { getClientIp, ok, serverError, unauthorized, validationError } from "@/lib/api/route-helpers";
import { subscriberService, websiteService } from "@/lib/domain";
import type { SubscriptionRejectionReason } from "@/lib/domain/types";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { verifyToken } from "@/lib/signing";

// ─── Schema ───────────────────────────────────────────────────────────────────

const UnsubscribeQuerySchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email(), v.maxLength(320)),
  token: v.pipe(v.string(), v.minLength(1)),
  expiresAt: v.pipe(
    v.string(),
    v.transform((s) => Number(s)),
    v.check((n) => Number.isFinite(n) && n >= 0, "expiresAt must be a valid timestamp"),
  ),
});

// ─── GET /api/[websiteId]/unsubscribe ─────────────────────────────────────────
// Intended for one-click unsubscribe links in emails.
// Parameters are passed as query string: ?email=...&token=...&expiresAt=...

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
): Promise<Response> {
  const { websiteId } = await params;
  const website = await websiteService.getWebsiteForSigning(websiteId);
  if (!website || !website.isActive) return unauthorized();

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";

  async function logAndEnrich(
    email: string,
    status: "ACCEPTED" | "REJECTED",
    rejectionReason?: SubscriptionRejectionReason,
  ): Promise<void> {
    const req = await subscriberService.logRequest({
      email,
      websiteId: website.id,
      type: "UNSUBSCRIBE",
      status,
      rejectionReason,
    });
    if (rejectionReason !== "VALIDATION_ERROR") {
      after(async () => {
        try {
          const geo = ip !== "unknown" ? await geoip.lookup(ip) : null;
          const parser = new UAParser(ua);
          await subscriberService.enrichRequest(req.id, {
            country: geo?.country ?? null,
            region: geo?.region || null,
            city: geo?.city || null,
            timezone: geo?.timezone || null,
            browser: parser.getBrowser().name ?? null,
            deviceType: parser.getDevice().type ?? null,
            platform: parser.getOS().name ?? null,
          });
        } catch (err) {
          logger.error("enrichRequest after()", err);
        }
      });
    }
  }

  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());

  const result = v.safeParse(UnsubscribeQuerySchema, rawQuery);
  if (!result.success) {
    await logAndEnrich("", "REJECTED", "VALIDATION_ERROR");
    return validationError(result.issues.map((i) => i.message));
  }

  const { email, token, expiresAt } = result.output;

  try {
    if (!verifyToken(website.key, websiteId, token, expiresAt)) {
      await logAndEnrich(email, "REJECTED", "INVALID_TOKEN");
      return unauthorized();
    }

    const ipWithinLimit = await checkRateLimit(`ip:${ip}:unsub`, 5, 60_000);
    if (!ipWithinLimit) {
      await logAndEnrich(email, "REJECTED", "RATE_LIMIT_IP");
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const siteWithinLimit = await checkRateLimit(`site:${website.id}:unsub`, 200, 60_000);
    if (!siteWithinLimit) {
      await logAndEnrich(email, "REJECTED", "RATE_LIMIT_WEBSITE");
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const found = await subscriberService.unsubscribeByEmail(normalizedEmail, website.id);

    if (!found) {
      await logAndEnrich(normalizedEmail, "REJECTED", "VALIDATION_ERROR");
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await logAndEnrich(normalizedEmail, "ACCEPTED");
    return ok({ message: "Unsubscribed" });
  } catch (e) {
    logger.error("GET /api/[websiteId]/unsubscribe", e);
    return serverError();
  }
}
```

- [ ] **Step 2: Run unsubscribe tests — all must pass**

```bash
npm test 'src/app/api/\[websiteId\]/unsubscribe/__tests__/route.test.ts'
```

Expected: all tests PASS.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests PASS (zero failures).

- [ ] **Step 4: Commit**

```bash
git add 'src/app/api/[websiteId]/unsubscribe/route.ts' \
  'src/app/api/[websiteId]/unsubscribe/__tests__/route.test.ts'
git commit -m "feat: add GET /api/[websiteId]/unsubscribe endpoint"
```

---

## Task 12: Final verification

- [ ] **Step 1: Full test suite**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 2: TypeScript strict check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors. If Biome flags anything, run `npm run lint:fix` and re-check.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final lint and build fixes for subscription request log"
```

> If there are no changes (everything was already committed), skip this step.
