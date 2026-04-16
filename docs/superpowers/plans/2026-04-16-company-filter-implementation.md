# Company Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace country filtering with company filtering in the contacts-list table while keeping the country column visible.

**Architecture:** Update the domain layer types and service to filter by company instead of country, then cascade changes through the page component, filter popover, table component, and active filters display. All changes follow the existing filter pattern.

**Tech Stack:** TypeScript, React 19, Next.js 16, Prisma 6, shadcn/ui v4, Valibot

---

## File Map

**Files to Modify:**
1. `src/lib/domain/types.ts` — Update `ListContactRequestsFilter` interface
2. `src/lib/domain/contact-request/contact-request-service.ts` — Update filtering logic
3. `src/app/dashboard/[websiteId]/contacts-list/page.tsx` — Fetch companies instead of countries
4. `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx` — Replace country select with company select
5. `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx` — Update props and URL building
6. `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.tsx` — Display company instead of country

**Tests to Update:**
1. `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts` — Update service tests
2. `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx` — Update filter popover tests
3. `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx` — Update table tests
4. `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx` — Update active filters tests

---

## Task 1: Update Domain Types

**Files:**
- Modify: `src/lib/domain/types.ts` (lines 188-199)

- [ ] **Step 1: Update ListContactRequestsFilter interface**

Replace the `country?: string;` line with `company?: string;` in the `ListContactRequestsFilter` interface:

```typescript
export interface ListContactRequestsFilter {
  websiteId: string;
  q?: string;
  fromDate?: string;
  toDate?: string;
  readStatus?: "all" | "read" | "unread";
  company?: string;  // Changed from country
  sortField?: "name" | "email" | "country" | "createdAt";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/domain/types.ts
git commit -m "refactor: replace country filter with company in ListContactRequestsFilter interface"
```

---

## Task 2: Update Contact Request Service

**Files:**
- Modify: `src/lib/domain/contact-request/contact-request-service.ts` (lines 44-114)

- [ ] **Step 1: Update service filtering logic**

Replace the country filtering block (lines 58-61) with company filtering:

```typescript
// In the listContactRequests method, replace this:
// if (filter.country) {
//   where.country = filter.country;
// }

// With this:
if (filter.company) {
  where.company = filter.company;
}
```

The updated `listContactRequests` method should look like:

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

  // Filter by company (changed from country)
  if (filter.company) {
    where.company = filter.company;
  }

  // Filter by read status
  if (filter.readStatus === "read") {
    where.readAt = { not: null };
  } else if (filter.readStatus === "unread") {
    where.readAt = null;
  }

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
    createdAt: "createdAt",
    email: "email",
    name: "name",
    country: "country",
  } satisfies Record<string, keyof Prisma.ContactRequestOrderByWithRelationInput>;

  const sortField = sortableFields[filter.sortField ?? "createdAt"] ?? sortableFields.createdAt;
  const sortDir: Prisma.SortOrder = filter.sortDir === "asc" ? "asc" : "desc";
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

- [ ] **Step 2: Commit**

```bash
git add src/lib/domain/contact-request/contact-request-service.ts
git commit -m "refactor: update contact request service to filter by company instead of country"
```

---

## Task 3: Update Page Component

**Files:**
- Modify: `src/app/dashboard/[websiteId]/contacts-list/page.tsx` (lines 29-82, 109-113)

- [ ] **Step 1: Replace country with company in search params parsing**

Replace lines 34 with company parsing:

```typescript
const company = typeof sp.company === "string" ? sp.company : "";
```

Remove this line:
```typescript
const country = typeof sp.country === "string" ? sp.country : "";
```

- [ ] **Step 2: Replace country fetch with company fetch**

Replace the Promise.all block (lines 51-78) with company extraction:

```typescript
const [result, companies] = await Promise.all([
  contactRequestService.listContactRequests({
    websiteId: (await getWebsite(websiteId)).id,
    q: q || undefined,
    company: company || undefined,
    readStatus,
    sortField,
    sortDir,
    page,
    pageSize,
  }),
  // Get unique companies from all contacts
  contactRequestService
    .listContactRequests({
      websiteId: (await getWebsite(websiteId)).id,
      pageSize: 1000,
    })
    .then(
      (r) =>
        [
          ...new Set(
            r.contactRequests
              .map((c) => c.company)
              .filter((company): company is string => company !== null),
          ),
        ] as string[],
    ),
]);

contacts = result.contactRequests;
total = result.total;
availableCompanies = companies;
```

- [ ] **Step 3: Update prop passed to ContactsTable**

Replace line 112:
```typescript
availableCountries={availableCountries}
```

With:
```typescript
availableCompanies={availableCompanies}
```

And update line 109 to pass company instead of country:
```typescript
company={company}
```

Remove the `country={country}` line if it exists.

- [ ] **Step 4: Update variable declarations**

Remove this line:
```typescript
let availableCountries: string[] = [];
```

Add:
```typescript
let availableCompanies: string[] = [];
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/page.tsx
git commit -m "feat: replace country filter fetch with company filter fetch in page component"
```

---

## Task 4: Update Filter Popover Component

**Files:**
- Modify: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx` (lines 16-154)

- [ ] **Step 1: Update ContactFilterValues interface**

Replace line 18 (`country: string;`) with:

```typescript
export interface ContactFilterValues {
  query: string;
  company: string; // "__all__" means no filter
  readStatus: ContactReadStatus;
}
```

- [ ] **Step 2: Update component props interface**

Update `ContactsFilterPopoverProps` (line 22-29) to replace `availableCountries` with `availableCompanies`:

```typescript
interface ContactsFilterPopoverProps {
  availableCompanies: string[];
  currentFilters: ContactFilterValues;
  total: number;
  hasActiveFilters: boolean;
  onApply: (filters: ContactFilterValues) => void;
  onReset: () => void;
}
```

- [ ] **Step 3: Update function signature**

Update the function destructuring (lines 31-38) to use `availableCompanies`:

```typescript
export function ContactsFilterPopover({
  availableCompanies,
  currentFilters,
  total,
  hasActiveFilters,
  onApply,
  onReset,
}: ContactsFilterPopoverProps) {
```

- [ ] **Step 4: Replace Country Select with Company Select**

Replace the entire "Country" Select section (lines 90-109) with:

```typescript
<div>
  <label htmlFor={companySelectId} className="text-sm font-medium">
    Company
  </label>
  <Select
    value={draft.company}
    onValueChange={(value) => setDraft((prev) => ({ ...prev, company: value }))}>
    <SelectTrigger id={companySelectId} className="mt-1">
      <SelectValue placeholder="Select company" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__all__">All Companies</SelectItem>
      {availableCompanies.map((c) => (
        <SelectItem key={c} value={c}>
          {c}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 5: Update select ID variable**

Replace:
```typescript
const countrySelectId = "contacts-country-select";
```

With:
```typescript
const companySelectId = "contacts-company-select";
```

Remove the `countrySelectId` line.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx
git commit -m "refactor: replace country filter with company filter in filter popover"
```

---

## Task 5: Update Table Component

**Files:**
- Modify: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx` (lines 22-242)

- [ ] **Step 1: Update component props interface**

Replace line 29:
```typescript
country: string;
availableCountries: string[];
```

With:
```typescript
company: string;
availableCompanies: string[];
```

Updated props interface:
```typescript
interface ContactsTableProps {
  selectedWebsiteId: string;
  contacts: ContactRequest[];
  total: number;
  page: number;
  pageSize: number;
  search: { q: string; readStatus: "all" | "read" | "unread" };
  company: string;
  sortField: ContactSortField;
  sortDir: ContactSortDir;
  availableCompanies: string[];
}
```

- [ ] **Step 2: Update function signature**

Replace destructuring in function parameters (lines 63-74) to use `company` and `availableCompanies`:

```typescript
export function ContactsTable({
  selectedWebsiteId,
  contacts,
  total,
  page,
  pageSize,
  search,
  company,
  sortField,
  sortDir,
  availableCompanies,
}: ContactsTableProps) {
```

- [ ] **Step 3: Update hasActiveFilters check**

Replace line 90:
```typescript
const hasActiveFilters = search.q !== "" || search.readStatus !== "all" || country !== "";
```

With:
```typescript
const hasActiveFilters = search.q !== "" || search.readStatus !== "all" || company !== "";
```

- [ ] **Step 4: Update buildParams function**

Replace the buildParams function (lines 138-152) to handle company instead of country:

```typescript
function buildParams(overrides: Record<string, string>) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (search.q) params.set("q", search.q);
  if (search.readStatus !== "all") params.set("readStatus", search.readStatus);
  if (company) params.set("company", company);
  params.set("sortField", sortField);
  params.set("sortDir", sortDir);
  for (const [k, v] of Object.entries(overrides)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  return params.toString();
}
```

- [ ] **Step 5: Update handleApplyFilters function**

Replace the handleApplyFilters function (lines 173-183):

```typescript
function handleApplyFilters(filters: ContactFilterValues) {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("pageSize", String(pageSize));
  params.set("sortField", sortField);
  params.set("sortDir", sortDir);
  if (filters.query) params.set("q", filters.query);
  if (filters.company && filters.company !== "__all__") params.set("company", filters.company);
  if (filters.readStatus !== "all") params.set("readStatus", filters.readStatus);
  router.push(`${baseUrl}?${params.toString()}`);
}
```

- [ ] **Step 6: Update handleResetAllFilters function**

Replace line 189:
```typescript
country: "",
```

With:
```typescript
company: "",
```

- [ ] **Step 7: Update handleRemoveFilter function**

Replace the handleRemoveFilter function (lines 196-205):

```typescript
function handleRemoveFilter(type: "query" | "readStatus" | "company") {
  router.push(
    `${baseUrl}?${buildParams({
      page: "1",
      q: type === "query" ? "" : search.q,
      readStatus: type === "readStatus" ? "" : search.readStatus === "all" ? "" : search.readStatus,
      company: type === "company" ? "" : company,
    })}`,
  );
}
```

- [ ] **Step 8: Update ContactsFilterPopover call**

Replace the ContactsFilterPopover component invocation (lines 216-227):

```typescript
filterSlot={
  <ContactsFilterPopover
    availableCompanies={availableCompanies}
    currentFilters={{
      query: search.q,
      company: company || "__all__",
      readStatus: search.readStatus,
    }}
    total={total}
    hasActiveFilters={hasActiveFilters}
    onApply={handleApplyFilters}
    onReset={handleResetAllFilters}
  />
}
```

- [ ] **Step 9: Update handleExport call**

Replace line 109:
```typescript
country: country || undefined,
```

With:
```typescript
company: company || undefined,
```

- [ ] **Step 10: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx
git commit -m "refactor: update table component to use company filter instead of country filter"
```

---

## Task 6: Update Active Filters Component

**Files:**
- Modify: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.tsx` (lines 7-28)

- [ ] **Step 1: Update RemoveFilterType**

Replace line 7:
```typescript
type RemoveFilterType = "query" | "readStatus" | "country";
```

With:
```typescript
type RemoveFilterType = "query" | "readStatus" | "company";
```

- [ ] **Step 2: Update component props interface**

Replace line 11:
```typescript
country: string;
```

With:
```typescript
company: string;
```

Updated interface:
```typescript
interface ContactsActiveFiltersProps {
  search: { q: string; readStatus: string };
  company: string;
  onRemoveFilter: (type: RemoveFilterType) => void;
  onResetAll: () => void;
}
```

- [ ] **Step 3: Update component function signature**

Replace destructuring (lines 16-21):

```typescript
export function ContactsActiveFilters({
  search,
  company,
  onRemoveFilter,
  onResetAll,
}: ContactsActiveFiltersProps) {
```

- [ ] **Step 4: Update filters array**

Replace lines 22-28 with:

```typescript
const filters = [
  ...(search.q ? [{ key: "query", label: `Search: ${search.q}` }] : []),
  ...(search.readStatus && search.readStatus !== "all"
    ? [{ key: "readStatus", label: `Status: ${search.readStatus}` }]
    : []),
  ...(company ? [{ key: "company", label: `Company: ${company}` }] : []),
];
```

- [ ] **Step 5: Update ContactsTable call in page component**

Now update the page component to pass `company` instead of `country` to `ContactsActiveFilters`. In `src/app/dashboard/[websiteId]/contacts-list/page.tsx`, update the `activeFiltersContent` prop (around line 231-236):

```typescript
activeFiltersContent={
  hasActiveFilters ? (
    <ContactsActiveFilters
      search={search}
      company={company}
      onRemoveFilter={handleRemoveFilter}
      onResetAll={handleResetAllFilters}
    />
  ) : undefined
}
```

Wait, you need to check the page.tsx file to find where `ContactsActiveFilters` is called. Let me update this task.

Actually, this should be done as part of updating the ContactsTable. Let me check if this is passed through ContactsTable or directly from page.tsx.

Looking back at the code, I see it's passed to ContactsTable as `activeFiltersContent`, which means we need to update how ContactsTable calls it. This is already covered in Task 5 step 8, but we need to ensure the activeFiltersContent in the page is set up correctly.

Let me revise: The activeFiltersContent is generated in ContactsTable and passed to TablePageHeader. So the filters display should work correctly after Task 5 is complete.

Actually, looking more carefully, I see the ContactsActiveFilters is called inside ContactsTable (line 231). So we only need to update it there, which we do in Task 5 step 8. But we also need to update the props passed to it.

Let me check the exact code again in my notes... Yes, in contacts-table.tsx around line 231:
```typescript
activeFiltersContent={
  hasActiveFilters ? (
    <ContactsActiveFilters
      search={search}
      country={country}
      onRemoveFilter={handleRemoveFilter}
      onResetAll={handleResetAllFilters}
    />
  ) : undefined
}
```

This needs to change to use `company` instead of `country`. This should be included in Task 5, Step 8. Let me revise that step.

Actually, I already included that in the ContactsTable call update. So this task is about updating the ContactsActiveFilters component itself, and the integration is already covered.

But wait, the activeFiltersContent is part of the TablePageHeader call in ContactsTable. So the component props are passed from ContactsTable. So I need to ensure that when we call ContactsActiveFilters from within ContactsTable, we pass company instead of country.

Let me trace through: page.tsx calls ContactsTable with `company={company}`. ContactsTable should pass that to ContactsActiveFilters. So I need to make sure that's updated in Task 5.

Looking at my Task 5, Step 8, I need to also update the activeFiltersContent call. Let me revise that step to include the full TablePageHeader call with correct activeFiltersContent.

Actually, I realize I need to be more complete in my task definitions. Let me reconsider...

Actually, looking at my earlier code read, the activeFiltersContent is passed to TablePageHeader inside ContactsTable. So when we update ContactsTable to use company, we need to ensure the activeFiltersContent call also uses company.

Let me just make sure Task 5 Step 8 is complete with the full context.
</thinking>

- [ ] **Step 1: Update RemoveFilterType**

Replace line 7:
```typescript
type RemoveFilterType = "query" | "readStatus" | "company";
```

- [ ] **Step 2: Update component props interface**

Replace line 11:
```typescript
company: string;
```

Updated full interface:
```typescript
interface ContactsActiveFiltersProps {
  search: { q: string; readStatus: string };
  company: string;
  onRemoveFilter: (type: RemoveFilterType) => void;
  onResetAll: () => void;
}
```

- [ ] **Step 3: Update function signature**

Replace lines 16-21:
```typescript
export function ContactsActiveFilters({
  search,
  company,
  onRemoveFilter,
  onResetAll,
}: ContactsActiveFiltersProps) {
```

- [ ] **Step 4: Update filters array**

Replace lines 22-28:
```typescript
const filters = [
  ...(search.q ? [{ key: "query", label: `Search: ${search.q}` }] : []),
  ...(search.readStatus && search.readStatus !== "all"
    ? [{ key: "readStatus", label: `Status: ${search.readStatus}` }]
    : []),
  ...(company ? [{ key: "company", label: `Company: ${company}` }] : []),
];
```

- [ ] **Step 5: Update activeFiltersContent call in ContactsTable**

In `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx`, update the `activeFiltersContent` prop (around line 231-236) to pass `company` instead of `country`:

```typescript
activeFiltersContent={
  hasActiveFilters ? (
    <ContactsActiveFilters
      search={search}
      company={company}
      onRemoveFilter={handleRemoveFilter}
      onResetAll={handleResetAllFilters}
    />
  ) : undefined
}
```

This should already be partially done in Task 5, so ensure this is included.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.tsx
git commit -m "refactor: update active filters to display company instead of country"
```

---

## Task 7: Update Component Tests

**Files:**
- Modify: `src/lib/domain/contact-request/__tests__/contact-request-service.test.ts`
- Modify: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx`
- Modify: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx`
- Modify: `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx`

- [ ] **Step 1: Run existing tests to identify failures**

```bash
npm test -- --run 2>&1 | tee test-output.txt
```

Expected output: Some tests will fail due to country → company changes.

- [ ] **Step 2: Update contact-request-service.test.ts**

Find any tests that reference `country` filter and replace with `company`. If there's a test like:
```typescript
it('filters by country', async () => {
  const result = await service.listContactRequests({
    websiteId: 'site1',
    country: 'US',
  });
  expect(result.contactRequests).toHaveLength(1);
});
```

Replace with:
```typescript
it('filters by company', async () => {
  const result = await service.listContactRequests({
    websiteId: 'site1',
    company: 'ACME',
  });
  expect(result.contactRequests).toHaveLength(1);
});
```

Run:
```bash
npm test -- src/lib/domain/contact-request/__tests__/contact-request-service.test.ts --run
```

- [ ] **Step 3: Update contacts-filter-popover.test.tsx**

Find tests that check the country filter and update them. For example, if there's:
```typescript
it('renders country select with available countries', () => {
  render(
    <ContactsFilterPopover
      availableCountries={['US', 'CA']}
      ...
    />
  );
  expect(screen.getByText('US')).toBeInTheDocument();
});
```

Replace with:
```typescript
it('renders company select with available companies', () => {
  render(
    <ContactsFilterPopover
      availableCompanies={['ACME', 'TechCorp']}
      ...
    />
  );
  expect(screen.getByText('ACME')).toBeInTheDocument();
});
```

Also update any test props that pass `country` to pass `company` instead:
```typescript
// OLD
currentFilters={{ query: '', country: '__all__', readStatus: 'all' }}

// NEW
currentFilters={{ query: '', company: '__all__', readStatus: 'all' }}
```

Run:
```bash
npm test -- src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx --run
```

- [ ] **Step 4: Update contacts-table.test.tsx**

Find tests that verify country filter is in the URL params or verify the country prop, and update them. For example:
```typescript
// OLD
it('includes country in URL when filtering', () => {
  render(<ContactsTable country="US" ... />);
  // assertions...
});

// NEW
it('includes company in URL when filtering', () => {
  render(<ContactsTable company="ACME" ... />);
  // assertions...
});
```

Update any snapshot tests if they exist:
```bash
npm test -- src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx --run
```

If snapshots fail, review the diff and update with:
```bash
npm test -- src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx --run -- -u
```

- [ ] **Step 5: Update contacts-active-filters.test.tsx**

Find tests that verify country filter display and update them:
```typescript
// OLD
it('displays country filter badge when country is set', () => {
  render(<ContactsActiveFilters country="US" ... />);
  expect(screen.getByText('Country: US')).toBeInTheDocument();
});

// NEW
it('displays company filter badge when company is set', () => {
  render(<ContactsActiveFilters company="ACME" ... />);
  expect(screen.getByText('Company: ACME')).toBeInTheDocument();
});
```

Run:
```bash
npm test -- src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx --run
```

- [ ] **Step 6: Run all tests**

```bash
npm test -- --run
```

Expected: All tests should pass.

- [ ] **Step 7: Commit**

```bash
git add 'src/lib/domain/contact-request/__tests__/contact-request-service.test.ts' \
  'src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.test.tsx' \
  'src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.test.tsx' \
  'src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.test.tsx'
git commit -m "test: update tests to use company filter instead of country"
```

---

## Task 8: Verify Build and Final Testing

**Files:**
- None (verification only)

- [ ] **Step 1: Run linter to ensure no style issues**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 2: Build the project**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 4: Verify sorting and other functionality still works**

In your browser (if testing locally):
1. Navigate to a contacts-list page
2. Verify the company filter dropdown appears instead of country
3. Verify the country column is still visible and can be toggled
4. Select a company from the filter dropdown
5. Verify URL updates with `?company=XXXX`
6. Verify results are filtered correctly
7. Verify clicking "Clear all" removes the company filter
8. Verify sorting by name, email, and date still works
9. Verify search still works alongside company filter

- [ ] **Step 5: Commit verification**

```bash
git log --oneline -10
```

Expected: Should see your 7 commits in order:
1. docs: add design spec for company filter feature
2. refactor: replace country filter with company in ListContactRequestsFilter interface
3. refactor: update contact request service to filter by company instead of country
4. feat: replace country filter fetch with company filter fetch in page component
5. refactor: replace country filter with company filter in filter popover
6. refactor: update table component to use company filter instead of country filter
7. refactor: update active filters to display company instead of country
8. test: update tests to use company filter instead of country

- [ ] **Step 6: Final status check**

```bash
git status
```

Expected: No uncommitted changes (working tree clean).

---

## Summary

This implementation replaces the country filter with a company filter across all components while maintaining the country column visibility. The changes follow the existing filter pattern in the codebase and preserve all other functionality like search, read status filtering, sorting, pagination, and column visibility toggling.

**Key changes:**
- Domain layer updated to filter by `company` field
- Page component fetches available companies instead of countries
- Filter popover displays company dropdown instead of country
- Table component passes company props and builds URLs with company param
- Active filters display company instead of country
- All tests updated to reflect the new filter field
- Country column remains visible and toggleable
