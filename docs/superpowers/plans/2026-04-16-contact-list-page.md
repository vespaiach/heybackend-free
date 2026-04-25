# Contact List Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a contact list dashboard page with read status tracking, filtering, sorting, and a detail modal to view full contact information.

**Architecture:** Implement bottom-up following TDD: (1) Add `readAt` field to schema and migrate, (2) Extend service layer with `markContactAsRead`, (3) Write server actions, (4) Build UI components, (5) Integrate into page.

**Tech Stack:** TypeScript, React 19, shadcn/ui, Tailwind CSS, Prisma 6, Valibot (for schemas), Vitest + React Testing Library

---

## File Structure

**New Files:**
- `prisma/schema.prisma` — Update `ContactRequest` model with `readAt` field
- `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts` — Service layer tests (phase 1)
- `src/app/dashboard/[websiteId]/contacts-list/page.tsx` — Page component (RSC)
- `src/app/dashboard/[websiteId]/contacts-list/actions.ts` — Server actions
- `src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts` — Server action tests
- `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx` — Table component
- `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx` — Table tests
- `src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.tsx` — Detail modal
- `src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx` — Modal tests
- `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx` — Filter UI
- `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx` — Filter tests
- `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.tsx` — Active filters display
- `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx` — Active filters tests

**Modified Files:**
- `src/lib/domain/contact-request/contact-request-service.interface.ts` — Add `markContactAsRead` method signature
- `src/lib/domain/contact-request/contact-request-service.ts` — Implement service methods
- `src/lib/domain/types.ts` — Add `readStatus` to filter types
- `src/app/dashboard/[websiteId]/layout.tsx` — Add contacts link to navigation (if needed)

---

## Phase 1: Schema & Migration

### Task 1: Add readAt field to ContactRequest model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Open schema and locate ContactRequest model**

Open `prisma/schema.prisma` and find the `ContactRequest` model (around line 169).

- [ ] **Step 2: Add readAt field**

Update the model to include the new field:

```prisma
model ContactRequest {
  id            String    @id @default(cuid())
  websiteId     String
  email         String
  name          String
  company       String?
  phone         String?
  message       String
  metadata      Json?
  timezone      String?
  country       String?
  region        String?
  city          String?
  os            String?
  deviceType    String?
  browser       String?
  readAt        DateTime?                    // NEW: timestamp when contact was marked as read
  createdAt     DateTime  @default(now())

  website Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  @@index([websiteId])
}
```

- [ ] **Step 3: Generate Prisma client**

```bash
npm run db:generate
```

Expected: Success, no errors. Prisma client updated with new field.

- [ ] **Step 4: Create and run migration**

```bash
npm run db:migrate
```

Provide a migration name: `add_readAt_to_contact_request`

Expected: Migration created in `prisma/migrations/` and applied to database.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add readAt timestamp to ContactRequest model"
```

---

## Phase 2: Service Layer (TDD)

### Task 2: Service test - markContactAsRead sets readAt timestamp

**Files:**
- Create: `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts`

- [ ] **Step 1: Create test file with first failing test**

Create `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { PrismaContactRequestService } from '../contact-request-service';

describe('ContactRequestService', () => {
  let service: PrismaContactRequestService;
  let testWebsiteId: string;
  let testTenantId: string;

  beforeEach(async () => {
    service = new PrismaContactRequestService();
    // Create test tenant and website
    const tenant = await prisma.tenant.create({
      data: {
        fullName: 'Test Tenant',
        email: 'test@example.com',
        userId: 'test-user-' + Date.now(),
        user: {
          create: {
            email: 'test-' + Date.now() + '@example.com',
            emailVerified: new Date(),
          },
        },
      },
    });
    testTenantId = tenant.id;

    const website = await prisma.website.create({
      data: {
        name: 'Test Site',
        url: 'https://test.com',
        key: 'test-key-' + Date.now(),
        tenantId: testTenantId,
      },
    });
    testWebsiteId = website.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.contactRequest.deleteMany({ where: { websiteId: testWebsiteId } });
    await prisma.website.deleteMany({ where: { id: testWebsiteId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } });
  });

  describe('markContactAsRead', () => {
    it('sets readAt to current timestamp', async () => {
      const contact = await prisma.contactRequest.create({
        data: {
          websiteId: testWebsiteId,
          email: 'test@example.com',
          name: 'John Doe',
          message: 'Hello',
          readAt: null,
        },
      });

      const before = new Date();
      await service.markContactAsRead(contact.id, testTenantId);
      const after = new Date();

      const updated = await prisma.contactRequest.findUnique({
        where: { id: contact.id },
      });

      expect(updated?.readAt).not.toBeNull();
      expect(updated!.readAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated!.readAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/domain/contact-request/__tests__/contact-request-service.test.ts
```

Expected: FAIL with "markContactAsRead is not defined"

- [ ] **Step 3: Add method to interface**

Open `src/lib/domain/contact-request/contact-request-service.interface.ts` and add:

```typescript
/**
 * Mark a contact as read by setting readAt to current timestamp.
 * Verifies ownership via tenantId.
 */
markContactAsRead(contactRequestId: string, tenantId: string): Promise<void>;
```

- [ ] **Step 4: Implement the method in service**

Open `src/lib/domain/contact-request/contact-request-service.ts` and add this method to the `PrismaContactRequestService` class (before the private `mapToContactRequest` method):

```typescript
async markContactAsRead(contactRequestId: string, tenantId: string): Promise<void> {
  const contactRequest = await prisma.contactRequest.findUnique({
    where: { id: contactRequestId },
    include: {
      website: {
        include: {
          tenant: true,
        },
      },
    },
  });

  // Check ownership: does the website belong to the tenant?
  if (!contactRequest || contactRequest.website.tenant.id !== tenantId) {
    throw new Error('Contact not found or access denied');
  }

  await prisma.contactRequest.update({
    where: { id: contactRequestId },
    data: {
      readAt: new Date(),
    },
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test src/lib/domain/contact-request/__tests__/contact-request-service.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/contact-request/
git commit -m "feat: add markContactAsRead method to service"
```

---

### Task 3: Service test - markContactAsRead verifies tenant ownership

- [ ] **Step 1: Write the failing test**

Add this test to `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts` (after the previous test):

```typescript
it('throws if contact does not belong to tenant', async () => {
  // Create a different tenant
  const otherTenant = await prisma.tenant.create({
    data: {
      fullName: 'Other Tenant',
      email: 'other@example.com',
      userId: 'other-user-' + Date.now(),
      user: {
        create: {
          email: 'other-' + Date.now() + '@example.com',
          emailVerified: new Date(),
        },
      },
    },
  });

  const contact = await prisma.contactRequest.create({
    data: {
      websiteId: testWebsiteId,
      email: 'test@example.com',
      name: 'John',
      message: 'Hello',
    },
  });

  // Try to mark as read with wrong tenant
  await expect(service.markContactAsRead(contact.id, otherTenant.id)).rejects.toThrow(
    /Contact not found or access denied/
  );

  // Contact should still be unread
  const updated = await prisma.contactRequest.findUnique({
    where: { id: contact.id },
  });
  expect(updated?.readAt).toBeNull();

  // Cleanup
  await prisma.tenant.delete({ where: { id: otherTenant.id } });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/domain/contact-request/__tests__/contact-request-service.test.ts -- --reporter=verbose
```

Expected: FAIL because test expects error but none is thrown

- [ ] **Step 3: Implementation already handles this**

The implementation in Task 2 already includes the ownership check, so no changes needed.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/lib/domain/contact-request/__tests__/contact-request-service.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/contact-request/__tests__/contact-request-service.test.ts
git commit -m "test: add ownership verification test for markContactAsRead"
```

---

### Task 4: Service test - markContactAsRead throws if contact not found

- [ ] **Step 1: Write the failing test**

Add to `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts`:

```typescript
it('throws if contact not found', async () => {
  await expect(
    service.markContactAsRead('nonexistent-id', testTenantId)
  ).rejects.toThrow(/Contact not found/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/domain/contact-request/__tests__/contact-request-service.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implementation already handles this**

The existing implementation throws for missing contacts.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/lib/domain/contact-request/__tests__/contact-request-service.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/contact-request/__tests__/contact-request-service.test.ts
git commit -m "test: add test for markContactAsRead with missing contact"
```

---

### Task 5: Service test - listContactRequests filters by readStatus

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts` (in a new `describe` block):

```typescript
describe('listContactRequests', () => {
  beforeEach(async () => {
    // Create unread contact
    await prisma.contactRequest.create({
      data: {
        websiteId: testWebsiteId,
        email: 'unread@example.com',
        name: 'Unread Contact',
        message: 'Message',
        readAt: null,
      },
    });

    // Create read contact
    await prisma.contactRequest.create({
      data: {
        websiteId: testWebsiteId,
        email: 'read@example.com',
        name: 'Read Contact',
        message: 'Message',
        readAt: new Date('2026-04-15'),
      },
    });
  });

  it('returns only unread contacts when readStatus=unread', async () => {
    const result = await service.listContactRequests({
      websiteId: testWebsiteId,
      readStatus: 'unread',
    });

    expect(result.contactRequests).toHaveLength(1);
    expect(result.contactRequests[0].email).toBe('unread@example.com');
  });

  it('returns only read contacts when readStatus=read', async () => {
    const result = await service.listContactRequests({
      websiteId: testWebsiteId,
      readStatus: 'read',
    });

    expect(result.contactRequests).toHaveLength(1);
    expect(result.contactRequests[0].email).toBe('read@example.com');
  });

  it('returns all contacts when readStatus=all', async () => {
    const result = await service.listContactRequests({
      websiteId: testWebsiteId,
      readStatus: 'all',
    });

    expect(result.contactRequests).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test src/lib/domain/contact-request/__tests__/contact-request-service.test.ts -- -t "listContactRequests"
```

Expected: FAIL because `readStatus` is not in filter type

- [ ] **Step 3: Update types**

Open `src/lib/domain/types.ts` and update `ListContactRequestsFilter`:

```typescript
export interface ListContactRequestsFilter {
  websiteId: string;
  q?: string;
  country?: string;
  fromDate?: string;
  toDate?: string;
  readStatus?: 'all' | 'read' | 'unread';  // NEW
  page?: number;
  pageSize?: number;
  sortField?: 'createdAt' | 'email' | 'name' | 'country';
  sortDir?: 'asc' | 'desc';
}
```

- [ ] **Step 4: Update service implementation**

Open `src/lib/domain/contact-request/contact-request-service.ts` and update the `listContactRequests` method. Replace the existing method with:

```typescript
async listContactRequests(filter: ListContactRequestsFilter): Promise<ListContactRequestsResult> {
  const pageSize = filter.pageSize ?? 10;
  const page = filter.page ?? 1;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ContactRequestWhereInput = {
    websiteId: filter.websiteId,
  };

  // Search by name or email
  if (filter.q) {
    where.OR = [{ name: { contains: filter.q } }, { email: { contains: filter.q } }];
  }

  // Filter by country
  if (filter.country) {
    where.country = filter.country;
  }

  // Filter by read status
  if (filter.readStatus === 'read') {
    where.readAt = { not: null };
  } else if (filter.readStatus === 'unread') {
    where.readAt = null;
  }
  // 'all' or undefined: no filter

  // Filter by date range
  if (filter.fromDate || filter.toDate) {
    const createdAt: Prisma.DateTimeFilter = {};

    if (filter.fromDate) {
      createdAt.gte = new Date(filter.fromDate);
    }

    if (filter.toDate) {
      createdAt.lte = new Date(filter.toDate);
    }

    where.createdAt = createdAt;
  }

  const sortableFields = {
    createdAt: 'createdAt',
    email: 'email',
    name: 'name',
    country: 'country',
  } satisfies Record<string, keyof Prisma.ContactRequestOrderByWithRelationInput>;

  const sortField = sortableFields[filter.sortField ?? 'createdAt'] ?? sortableFields.createdAt;
  const sortDir: Prisma.SortOrder = filter.sortDir === 'asc' ? 'asc' : 'desc';
  const orderBy: Prisma.ContactRequestOrderByWithRelationInput = {
    [sortField]: sortDir,
  };

  const [contactRequests, total] = await Promise.all([
    prisma.contactRequest.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.contactRequest.count({ where }),
  ]);

  return {
    contactRequests: contactRequests.map((cr) => this.mapToContactRequest(cr)),
    total,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test src/lib/domain/contact-request/__tests__/contact-request-service.test.ts
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/types.ts src/lib/domain/contact-request/
git commit -m "feat: add readStatus filtering to listContactRequests"
```

---

## Phase 3: Server Actions (TDD)

### Task 6: Server action test - markContactAsRead succeeds for authorized user

**Files:**
- Create: `src/app/dashboard/[websiteId]/contacts-list/actions.ts`
- Create: `src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts`

- [ ] **Step 1: Create test file**

Create `src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { markContactAsRead } from '../actions';

vi.mock('@/auth');

describe('Contact List Actions', () => {
  let testWebsiteId: string;
  let testTenantId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        email: 'test-' + Date.now() + '@example.com',
        emailVerified: new Date(),
      },
    });
    testUserId = user.id;

    const tenant = await prisma.tenant.create({
      data: {
        fullName: 'Test Tenant',
        email: 'tenant@example.com',
        userId: testUserId,
      },
    });
    testTenantId = tenant.id;

    const website = await prisma.website.create({
      data: {
        name: 'Test Site',
        url: 'https://test.com',
        key: 'test-key-' + Date.now(),
        tenantId: testTenantId,
      },
    });
    testWebsiteId = website.id;
  });

  afterEach(async () => {
    await prisma.contactRequest.deleteMany({ where: { websiteId: testWebsiteId } });
    await prisma.website.deleteMany({ where: { id: testWebsiteId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe('markContactAsRead', () => {
    it('marks contact as read for authorized user', async () => {
      const contact = await prisma.contactRequest.create({
        data: {
          websiteId: testWebsiteId,
          email: 'test@example.com',
          name: 'John',
          message: 'Hello',
          readAt: null,
        },
      });

      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId },
      } as any);

      const result = await markContactAsRead(contact.id);

      expect(result.error).toBeUndefined();

      const updated = await prisma.contactRequest.findUnique({
        where: { id: contact.id },
      });
      expect(updated?.readAt).not.toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts
```

Expected: FAIL with "markContactAsRead is not a function"

- [ ] **Step 3: Create actions file with minimal implementation**

Create `src/app/dashboard/[websiteId]/contacts-list/actions.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import { contactRequestService, tenantService } from "@/lib/domain";
import { logger } from "@/lib/logger";

export async function markContactAsRead(
  contactRequestId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const tenantId = await tenantService.getTenantIdByUserId(session.user.id);
    if (!tenantId) return { error: "Tenant not found" };

    await contactRequestService.markContactAsRead(contactRequestId, tenantId);
    return {};
  } catch (e) {
    logger.error("markContactAsRead", e);
    return { error: "Failed to mark contact as read" };
  }
}
```

- [ ] **Step 4: Export service from domain index**

Open `src/lib/domain/index.ts` and verify `contactRequestService` is exported. If not, add:

```typescript
export { PrismaContactRequestService } from "./contact-request/contact-request-service";
export type { ContactRequestService } from "./contact-request/contact-request-service.interface";

const contactRequestService = new PrismaContactRequestService();
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/actions.ts
git add src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts
git add src/lib/domain/index.ts
git commit -m "feat: add markContactAsRead server action"
```

---

### Task 7: Server action test - markContactAsRead returns error if unauthorized

- [ ] **Step 1: Write the failing test**

Add to `src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts`:

```typescript
it('returns error if user not authenticated', async () => {
  vi.mocked(auth).mockResolvedValue(null);

  const result = await markContactAsRead('any-id');

  expect(result.error).toBe('Unauthorized');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts -- -t "unauthorized"
```

Expected: FAIL

- [ ] **Step 3: Implementation already handles this**

The implementation in Task 6 already checks for authentication.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts
git commit -m "test: add authorization check for markContactAsRead"
```

---

### Task 8: Server action test - markContactAsRead returns error if contact not found

- [ ] **Step 1: Write the failing test**

Add to `src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts`:

```typescript
it('returns error if contact not found', async () => {
  vi.mocked(auth).mockResolvedValue({
    user: { id: testUserId },
  } as any);

  const result = await markContactAsRead('nonexistent-id');

  expect(result.error).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts -- -t "not found"
```

Expected: FAIL

- [ ] **Step 3: Implementation already handles this**

The service throws, and the action catches and returns error.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/__tests__/actions.test.ts
git commit -m "test: add error handling for missing contact"
```

---

## Phase 4: UI Components (TDD)

### Task 9: Contact detail modal - render contact data

**Files:**
- Create: `src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.tsx`
- Create: `src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx`

- [ ] **Step 1: Create test file**

Create `src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactDetailModal } from './contact-detail-modal';

describe('ContactDetailModal', () => {
  const mockContact = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp',
    phone: '+1234567890',
    message: 'I am interested in your product',
    country: 'US',
    region: 'CA',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    os: 'Windows',
    deviceType: 'Desktop',
    browser: 'Chrome',
    websiteId: 'site1',
    createdAt: new Date('2026-04-16'),
    readAt: null,
    metadata: null,
  };

  it('displays contact information', () => {
    render(
      <ContactDetailModal
        contact={mockContact}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('I am interested in your product')).toBeInTheDocument();
  });

  it('displays location and device metadata', () => {
    render(
      <ContactDetailModal
        contact={mockContact}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('San Francisco')).toBeInTheDocument();
    expect(screen.getByText('Windows')).toBeInTheDocument();
    expect(screen.getByText('Chrome')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx
```

Expected: FAIL with "ContactDetailModal is not a component"

- [ ] **Step 3: Create minimal component**

Create `src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.tsx`:

```typescript
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ContactRequest } from "@/lib/domain/types";

interface ContactDetailModalProps {
  contact: ContactRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailModal({
  contact,
  open,
  onOpenChange,
}: ContactDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold">{contact.name}</h2>
            <p className="text-sm text-gray-600">{contact.email}</p>
            {contact.company && <p className="text-sm text-gray-600">{contact.company}</p>}
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-2">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {contact.phone && (
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p>{contact.phone}</p>
                </div>
              )}
              {contact.email && (
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p>{contact.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          <div>
            <h3 className="font-semibold mb-2">Message</h3>
            <p className="whitespace-pre-wrap text-sm">{contact.message}</p>
          </div>

          {/* Location & Metadata */}
          <div>
            <h3 className="font-semibold mb-2">Location & Device</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {contact.country && (
                <div>
                  <span className="text-gray-600">Country:</span>
                  <p>{contact.country}</p>
                </div>
              )}
              {contact.region && (
                <div>
                  <span className="text-gray-600">Region:</span>
                  <p>{contact.region}</p>
                </div>
              )}
              {contact.city && (
                <div>
                  <span className="text-gray-600">City:</span>
                  <p>{contact.city}</p>
                </div>
              )}
              {contact.timezone && (
                <div>
                  <span className="text-gray-600">Timezone:</span>
                  <p>{contact.timezone}</p>
                </div>
              )}
              {contact.os && (
                <div>
                  <span className="text-gray-600">OS:</span>
                  <p>{contact.os}</p>
                </div>
              )}
              {contact.deviceType && (
                <div>
                  <span className="text-gray-600">Device:</span>
                  <p>{contact.deviceType}</p>
                </div>
              )}
              {contact.browser && (
                <div>
                  <span className="text-gray-600">Browser:</span>
                  <p>{contact.browser}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.tsx
git add src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx
git commit -m "feat: add contact detail modal component"
```

---

### Task 10: Contact detail modal - show "Mark as Read" button when unread

- [ ] **Step 1: Write the failing test**

Add to `contact-detail-modal.test.tsx`:

```typescript
it('shows "Mark as Read" button when contact is unread', () => {
  render(
    <ContactDetailModal
      contact={mockContact}
      open={true}
      onOpenChange={() => {}}
    />
  );

  expect(screen.getByRole('button', { name: /mark as read/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx -- -t "Mark as Read"
```

Expected: FAIL

- [ ] **Step 3: Update component to add button**

Update `contact-detail-modal.tsx` to add a button section after the message section:

```typescript
{/* Mark as Read */}
<div className="border-t pt-4">
  {contact.readAt ? (
    <p className="text-sm text-gray-600">
      Read on {contact.readAt.toLocaleDateString()} at {contact.readAt.toLocaleTimeString()}
    </p>
  ) : (
    <button
      onClick={() => {/* will be implemented in next task */}}
      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
    >
      Mark as Read
    </button>
  )}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.tsx
git add src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx
git commit -m "feat: add Mark as Read button to contact detail modal"
```

---

### Task 11: Contact detail modal - call server action on Mark as Read

- [ ] **Step 1: Write the failing test**

Add to `contact-detail-modal.test.tsx`:

```typescript
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';

vi.mock('../actions', () => ({
  markContactAsRead: vi.fn(),
}));

import { markContactAsRead as mockMarkContactAsRead } from '../actions';

it('calls markContactAsRead on button click', async () => {
  vi.mocked(mockMarkContactAsRead).mockResolvedValue({});

  const mockOpenChange = vi.fn();
  render(
    <ContactDetailModal
      contact={mockContact}
      open={true}
      onOpenChange={mockOpenChange}
    />
  );

  const button = screen.getByRole('button', { name: /mark as read/i });
  await userEvent.click(button);

  expect(mockMarkContactAsRead).toHaveBeenCalledWith(mockContact.id);
  expect(mockOpenChange).toHaveBeenCalledWith(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx -- -t "calls markContactAsRead"
```

Expected: FAIL

- [ ] **Step 3: Update component to handle button click**

Update `contact-detail-modal.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ContactRequest } from "@/lib/domain/types";
import { markContactAsRead } from "../actions";

interface ContactDetailModalProps {
  contact: ContactRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailModal({
  contact,
  open,
  onOpenChange,
}: ContactDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAsRead = async () => {
    setIsLoading(true);
    try {
      const result = await markContactAsRead(contact.id);
      if (!result.error) {
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ... rest of content ... */}

      {/* Mark as Read section */}
      <div className="border-t pt-4">
        {contact.readAt ? (
          <p className="text-sm text-gray-600">
            Read on {contact.readAt.toLocaleDateString()} at {contact.readAt.toLocaleTimeString()}
          </p>
        ) : (
          <button
            onClick={handleMarkAsRead}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Marking...' : 'Mark as Read'}
          </button>
        )}
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.tsx
git add src/app/dashboard/[websiteId]/contacts-list/_components/contact-detail-modal.test.tsx
git commit -m "feat: implement Mark as Read action in contact detail modal"
```

---

### Task 12: Contacts table - render contacts with correct columns

**Files:**
- Create: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx`
- Create: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx`

- [ ] **Step 1: Create test file**

Create `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactsTable } from './contacts-table';
import type { ContactRequest } from '@/lib/domain/types';

describe('ContactsTable', () => {
  const mockContacts: ContactRequest[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Acme',
      phone: null,
      message: 'Hello world',
      country: 'US',
      region: null,
      city: null,
      timezone: null,
      os: null,
      deviceType: null,
      browser: null,
      websiteId: 'site1',
      metadata: null,
      createdAt: new Date('2026-04-16'),
      readAt: null,
    },
  ];

  it('displays contacts with name, email, country, and created date', () => {
    render(
      <ContactsTable
        selectedWebsiteId="site1"
        contacts={mockContacts}
        total={1}
        page={1}
        pageSize={20}
        availableCountries={['US']}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx
```

Expected: FAIL with "ContactsTable is not a component"

- [ ] **Step 3: Create minimal component**

Create `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx`:

```typescript
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RelativeDate } from "@/components/relative-date";
import type { ContactRequest } from "@/lib/domain/types";

interface ContactsTableProps {
  selectedWebsiteId: string;
  contacts: ContactRequest[];
  total: number;
  page: number;
  pageSize: number;
  availableCountries: string[];
}

export function ContactsTable({
  contacts,
  total,
  page,
  pageSize,
}: ContactsTableProps) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Read Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell>{contact.name}</TableCell>
              <TableCell>{contact.email}</TableCell>
              <TableCell>{contact.company || '-'}</TableCell>
              <TableCell>{contact.country || '-'}</TableCell>
              <TableCell>
                <RelativeDate date={contact.createdAt} />
              </TableCell>
              <TableCell>
                {contact.readAt ? (
                  <span className="text-xs text-gray-600">Read</span>
                ) : (
                  <span className="text-xs text-red-600">Unread</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination info */}
      <div className="text-sm text-gray-600">
        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx
git commit -m "feat: add contacts table component"
```

---

### Task 13: Contacts table - show read status badge

- [ ] **Step 1: Write the failing test**

Add to `contacts-table.test.tsx`:

```typescript
it('shows "Unread" badge for unread contacts', () => {
  render(
    <ContactsTable
      selectedWebsiteId="site1"
      contacts={mockContacts}
      total={1}
      page={1}
      pageSize={20}
      availableCountries={[]}
    />
  );

  expect(screen.getByText('Unread')).toBeInTheDocument();
});

it('shows read date for read contacts', () => {
  const readContact = {
    ...mockContacts[0],
    readAt: new Date('2026-04-15'),
  };

  render(
    <ContactsTable
      selectedWebsiteId="site1"
      contacts={[readContact]}
      total={1}
      page={1}
      pageSize={20}
      availableCountries={[]}
    />
  );

  expect(screen.getByText(/read/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx -- -t "badge"
```

Expected: FAIL

- [ ] **Step 3: Update component to use badges**

Update the read status cell in `contacts-table.tsx`:

```typescript
import { Badge } from "@/components/ui/badge";

// In TableRow:
<TableCell>
  {contact.readAt ? (
    <Badge variant="secondary">
      Read on <RelativeDate date={contact.readAt} />
    </Badge>
  ) : (
    <Badge variant="destructive">Unread</Badge>
  )}
</TableCell>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx
git commit -m "feat: add read status badges to contacts table"
```

---

### Task 14: Contacts table - open detail modal on row click

- [ ] **Step 1: Write the failing test**

Add to `contacts-table.test.tsx`:

```typescript
import userEvent from '@testing-library/user-event';

it('opens contact detail modal on row click', async () => {
  const { rerender } = render(
    <ContactsTable
      selectedWebsiteId="site1"
      contacts={mockContacts}
      total={1}
      page={1}
      pageSize={20}
      availableCountries={[]}
    />
  );

  const row = screen.getByRole('row', { name: /john doe/i });
  await userEvent.click(row);

  // Component should manage modal state and show it
  // This requires adding state to the table
});
```

Actually, for this feature we need to think about state management. The simplest approach is to add state to the table component.

- [ ] **Step 2: Update component to manage modal state**

Update `contacts-table.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RelativeDate } from "@/components/relative-date";
import { ContactDetailModal } from "./contact-detail-modal";
import type { ContactRequest } from "@/lib/domain/types";

interface ContactsTableProps {
  selectedWebsiteId: string;
  contacts: ContactRequest[];
  total: number;
  page: number;
  pageSize: number;
  availableCountries: string[];
}

export function ContactsTable({
  contacts,
  total,
  page,
  pageSize,
}: ContactsTableProps) {
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Read Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <TableCell>{contact.name}</TableCell>
              <TableCell>{contact.email}</TableCell>
              <TableCell>{contact.company || '-'}</TableCell>
              <TableCell>{contact.country || '-'}</TableCell>
              <TableCell>
                <RelativeDate date={contact.createdAt} />
              </TableCell>
              <TableCell>
                {contact.readAt ? (
                  <Badge variant="secondary">
                    Read on <RelativeDate date={contact.readAt} />
                  </Badge>
                ) : (
                  <Badge variant="destructive">Unread</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Detail Modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          open={!!selectedContact}
          onOpenChange={(open) => {
            if (!open) setSelectedContact(null);
          }}
        />
      )}

      {/* Pagination info */}
      <div className="text-sm text-gray-600">
        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run test (simple version without assertions)**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx
```

Expected: PASS (component still renders correctly)

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx
git commit -m "feat: add click-to-open detail modal to contacts table"
```

---

### Task 15: Contacts filter popover - create filter UI

**Files:**
- Create: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx`
- Create: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx`

- [ ] **Step 1: Create test file**

Create `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactsFilterPopover } from './contacts-filter-popover';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('ContactsFilterPopover', () => {
  it('renders filter fields', () => {
    render(
      <ContactsFilterPopover
        availableCountries={['US', 'UK']}
        onFilterChange={() => {}}
      />
    );

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /country/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Create minimal component**

Create `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterIcon } from "lucide-react";

interface ContactsFilterPopoverProps {
  availableCountries: string[];
  onFilterChange: () => void;
}

export function ContactsFilterPopover({
  availableCountries,
  onFilterChange,
}: ContactsFilterPopoverProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [readStatus, setReadStatus] = useState("all");

  const handleApply = () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (country) params.set("country", country);
    if (readStatus !== "all") params.set("readStatus", readStatus);
    params.set("page", "1"); // Reset to page 1

    router.push(`?${params.toString()}`);
    onFilterChange();
  };

  const handleClear = () => {
    setSearch("");
    setCountry("");
    setReadStatus("all");
    router.push("?page=1");
    onFilterChange();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <FilterIcon className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Country</label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Countries</SelectItem>
                {availableCountries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Read Status</label>
            <Select value={readStatus} onValueChange={setReadStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx
git commit -m "feat: add contacts filter popover component"
```

---

### Task 16: Contacts active filters - show and remove filters

**Files:**
- Create: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.tsx`
- Create: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx`

- [ ] **Step 1: Create test file**

Create `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactsActiveFilters } from './contacts-active-filters';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('ContactsActiveFilters', () => {
  it('displays applied filter chips', () => {
    render(
      <ContactsActiveFilters
        search={{ q: 'John', readStatus: 'unread' }}
        country="US"
        onRemoveFilter={() => {}}
      />
    );

    expect(screen.getByText(/john/i)).toBeInTheDocument();
    expect(screen.getByText(/unread/i)).toBeInTheDocument();
    expect(screen.getByText(/US/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Create minimal component**

Create `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ContactsActiveFiltersProps {
  search: { q: string; readStatus: string };
  country?: string;
  onRemoveFilter: () => void;
}

export function ContactsActiveFilters({
  search,
  country,
  onRemoveFilter,
}: ContactsActiveFiltersProps) {
  const router = useRouter();

  const filters = [
    ...(search.q ? [{ key: "q", label: `Search: ${search.q}` }] : []),
    ...(search.readStatus && search.readStatus !== "all"
      ? [{ key: "readStatus", label: `Status: ${search.readStatus}` }]
      : []),
    ...(country ? [{ key: "country", label: `Country: ${country}` }] : []),
  ];

  if (filters.length === 0) return null;

  const handleRemove = (key: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete(key);
    if (key === "readStatus") params.set("readStatus", "all");
    router.push(`?${params.toString()}`);
    onRemoveFilter();
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map((filter) => (
        <Badge key={filter.key} variant="outline" className="gap-1">
          {filter.label}
          <button
            onClick={() => handleRemove(filter.key)}
            className="ml-1 hover:opacity-70"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.tsx
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx
git commit -m "feat: add contacts active filters display"
```

---

## Phase 5: Page Integration

### Task 17: Contacts list page - page component with data fetching

**Files:**
- Create: `src/app/dashboard/[websiteId]/contacts-list/page.tsx`

- [ ] **Step 1: Create page component**

Create `src/app/dashboard/[websiteId]/contacts-list/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import Separator from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { contactRequestService, tenantService } from "@/lib/domain";
import { ContactsTable } from "./_components/contacts-table";
import { ContactsFilterPopover } from "./_components/contacts-filter-popover";
import { ContactsActiveFilters } from "./_components/contacts-active-filters";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { websiteId } = await params;
  const sp = await searchParams;

  // Parse and validate search params
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const pageSizeRaw = parseInt(typeof sp.pageSize === "string" ? sp.pageSize : "20", 10);
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSizeRaw)
    ? pageSizeRaw
    : 20;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const readStatusRaw = typeof sp.readStatus === "string" ? sp.readStatus : "all";
  const readStatus = (["all", "read", "unread"] as const).includes(
    readStatusRaw as "all" | "read" | "unread",
  )
    ? (readStatusRaw as "all" | "read" | "unread")
    : "all";

  // Get tenant and verify website access
  const tenant = await tenantService.getTenantWithWebsitesByUserId(session.user.id);

  if (!tenant) redirect("/onboarding");

  const resolvedId = tenant.websites.find((w) => w.id === websiteId)?.id;

  let contacts = [];
  let total = 0;
  let availableCountries: string[] = [];

  if (resolvedId) {
    const [result, countries] = await Promise.all([
      contactRequestService.listContactRequests({
        websiteId: resolvedId,
        q: q || undefined,
        country: country || undefined,
        readStatus,
        page,
        pageSize,
      }),
      // Get unique countries from all contacts (or use a separate method)
      contactRequestService.listContactRequests({
        websiteId: resolvedId,
        pageSize: 1000,
      }).then((r) => [...new Set(r.contactRequests.map((c) => c.country).filter(Boolean))]),
    ]);

    contacts = result.contactRequests;
    total = result.total;
    availableCountries = countries;
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Contacts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Contacts</h1>
          <ContactsFilterPopover
            availableCountries={availableCountries}
            onFilterChange={() => {}}
          />
        </div>

        <ContactsActiveFilters
          search={{ q, readStatus }}
          country={country}
          onRemoveFilter={() => {}}
        />

        <Suspense fallback={<div>Loading...</div>}>
          <ContactsTable
            selectedWebsiteId={resolvedId ?? ""}
            contacts={contacts}
            total={total}
            page={page}
            pageSize={pageSize}
            availableCountries={availableCountries}
          />
        </Suspense>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Run the app to verify page loads**

```bash
npm run dev
```

Navigate to `/dashboard/[websiteId]/contacts-list` and verify the page loads without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/page.tsx
git commit -m "feat: add contacts list page"
```

---

### Task 18: Run all tests and verify everything works

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 2: Run linting**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify all contact list tests pass"
```

---

## Summary

This plan implements a complete contacts list page with:
- Service layer with `markContactAsRead` and filtering by read status
- Server actions for marking contacts as read
- UI components for table, detail modal, filtering, and active filters
- Full RSC page with authentication, pagination, filtering, sorting
- Comprehensive tests throughout (TDD approach)

All tests follow the TDD cycle: RED → GREEN → REFACTOR, with frequent commits.

Total tasks: 18 (each 5-10 minutes with proper TDD)

---

## Plan Document Completion

Plan complete and saved to `docs/superpowers/plans/2026-04-16-contact-list-page.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with feedback loops.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for your review.

**Which approach would you prefer?**