# Contact List Page Design

**Date:** 2026-04-16  
**Scope:** Dashboard page to view, search, filter, and manage contact form submissions with read status tracking.

## Overview

Add a new **Contacts List** page under `/dashboard/[websiteId]/contacts-list/` that mirrors the existing Subscribers List page. Users can view contact form submissions, search/filter them, mark contacts as read, and view full details in a modal dialog.

## Data Model

### Schema Changes

Add `readAt` timestamp to `ContactRequest` model in `prisma/schema.prisma`:

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
  readAt        DateTime?           // NEW: timestamp when contact was marked as read
  createdAt     DateTime  @default(now())

  website Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  @@index([websiteId])
}
```

## Service Layer

### ContactRequestService Enhancement

Add method to `src/lib/domain/contact-request/contact-request-service.interface.ts`:

```typescript
markContactAsRead(contactRequestId: string, tenantId: string): Promise<void>;
```

Implement in `src/lib/domain/contact-request/contact-request-service.ts`:
- Verify contact exists and belongs to tenant's website
- Set `readAt` to current timestamp
- Return void or throw error if not found

## UI Layer

### File Structure

```
src/app/dashboard/[websiteId]/contacts-list/
├── page.tsx                                 # Page component (RSC)
├── actions.ts                               # Server actions
└── _components/
    ├── contacts-table.tsx                   # Main table component (client)
    ├── contact-detail-modal.tsx             # Detail view modal (client)
    ├── contacts-filter-popover.tsx          # Filter/search popover (client)
    └── contacts-active-filters.tsx          # Active filter display (client)
```

### Page Component (`page.tsx`)

**Responsibilities:**
- Authenticate user and redirect if not logged in
- Parse URL search params: `page`, `pageSize`, `q` (search), `country`, `fromDate`, `toDate`, `readStatus` (all/read/unread)
- Validate and normalize params (page ≥ 1, pageSize in [10, 20, 50, 100])
- Fetch contacts and available countries via `contactRequestService.listContactRequests()`
- Render header with breadcrumb and sidebar trigger
- Render `ContactsTable` with fetched data

**Key Data:**
- `page`, `pageSize`, `q`, `country`, `fromDate`, `toDate`, `readStatus`
- `contacts` array, `total` count, `availableCountries` list

### Table Component (`contacts-table.tsx`)

**Columns:**
| Column | Key | Default Visible | Sortable |
|--------|-----|-----------------|----------|
| Name | name | true | yes |
| Email | email | true | yes |
| Company | company | false | no |
| Message | message | false | no |
| Country | country | true | yes |
| Created Date | createdAt | true | yes |
| Read Status | readAt | true | no |

**Functionality:**
- Display paginated contacts with column visibility toggles
- Sorting: click headers to sort by name, email, country, or createdAt (asc/desc)
- Row click → open detail modal
- Read status badge: "Unread" (red/orange) or "Read on [date]" (gray)
- Pagination controls with page size dropdown
- Search and filter UI integration

**State Management:**
- Use `useRouter` and URL search params for state persistence
- Update URL on sort, pagination, search, filter changes
- Show active filters above table

### Detail Modal (`contact-detail-modal.tsx`)

**Trigger:** Click any contact row

**Content:**
- Name, email, company (if present)
- Phone (if present)
- Full message text
- Metadata section: Country, Region, City, Timezone
- Device info: OS, Device Type, Browser
- Created date and read date (if applicable)

**Actions:**
- "Mark as Read" button (prominent) → calls server action, modal closes on success
- "Close" button (or close icon)

**Behavior:**
- Only show "Mark as Read" button if `readAt` is null
- If already read, show "Marked as read on [date]" text instead
- On success, refetch contacts list to update read badge

### Filter Popover (`contacts-filter-popover.tsx`)

**Filters:**
- **Search**: Text input for name/email search
- **Read Status**: Dropdown (All / Read / Unread)
- **Country**: Dropdown with available countries
- **Date Range**: Two date inputs (from/to)

**Behavior:**
- Apply filters button updates URL search params
- Clear filters button resets to defaults

### Active Filters Display (`contacts-active-filters.tsx`)

Show active filters as removable chips/badges above the table (like subscribers page).

## Server Actions (`actions.ts`)

### `markContactAsRead(contactRequestId: string)`

- Verify authentication
- Get tenant ID from session
- Call `contactRequestService.markContactAsRead(contactRequestId, tenantId)`
- Return `{ error?: string }` for error handling
- Log errors via logger

## Key Behaviors

1. **Read Status Lifecycle:**
   - New contacts: `readAt = null` (unread)
   - User clicks "Mark as Read" → sets `readAt = now()`
   - Unread contacts appear with "Unread" badge, read contacts show "Read on [date]"

2. **Filtering & Sorting:**
   - Search by name or email (case-insensitive substring match)
   - Filter by country, date range, or read status
   - Sort by any column (persisted in URL)
   - Filters and sorts combined in single query

3. **Pagination:**
   - Default page size: 20
   - Options: 10, 20, 50, 100
   - URL params: `?page=1&pageSize=20&q=...&country=...&readStatus=...`

4. **Modal Interaction:**
   - Click row → detail modal opens
   - Mark as read → server action, list refreshes, modal closes
   - Closing modal does NOT auto-refresh list (user can manually refresh or see stale state briefly)

## Testing

- Unit tests for `markContactAsRead` server action
- Unit tests for contacts table rendering with sample data
- Unit tests for filter popover state management
- Integration tests for list filtering and sorting
- Component test for detail modal interaction

## Constraints & Assumptions

- No bulk actions (as requested)
- No delete functionality
- No tagging support (simple version)
- `ContactRequest` has all necessary geo/device fields already in schema
- Contacts belong to websites, which belong to tenants (ownership verified via tenant ID)
- Single modal instance (not multiple simultaneous modals)
- No real-time updates (manual refresh)

## Success Criteria

✅ Users can view all contacts for a website with pagination  
✅ Users can search contacts by name or email  
✅ Users can filter by country, date range, or read status  
✅ Users can sort by name, email, country, or creation date  
✅ Users can click a contact to view full details in a modal  
✅ Users can mark a contact as read from the detail modal  
✅ Read status is persisted and displayed as a badge  
✅ All functionality requires authentication and tenant ownership verification  
✅ URL state persists across navigation (bookmarkable filters/sorts)
