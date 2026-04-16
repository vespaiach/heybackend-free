# Company Filter Design Spec

**Date:** 2026-04-16  
**Status:** Approved  
**Scope:** Replace country filtering with company filtering in contacts-list table

## Overview

Replace the existing country filter dropdown with a company filter dropdown in the contacts-list page. The country column remains visible in the table and toggleable via column visibility, but the filtering capability is removed.

## Current State

- Contacts-list table displays contacts with filters: query (search), country (dropdown), and readStatus (radio group)
- Country filter fetches available countries from all contacts and displays them in a dropdown in `ContactsFilterPopover`
- Country filter value is stored in URL search params as `?country=XX`
- `ContactsActiveFilters` component displays active filters including country

## Changes

### 1. Page Layer (`src/app/dashboard/[websiteId]/contacts-list/page.tsx`)

**Remove:**
- `country` variable parsing from `searchParams`
- Country fetch logic (the Promise.all second item that extracts unique countries)
- `availableCountries` variable and state

**Add:**
- `company` variable parsing from `searchParams` (similar to `country`)
- Company fetch logic: extract unique company names from `contactRequests` (same pattern as countries)
- `availableCompanies` variable
- Pass `availableCompanies` to `ContactsTable`

**Affected lines:**
- Remove: lines 34 (country parsing), lines 49-82 (availableCountries, countries, Promise.all)
- Add: similar parsing for company, similar fetch for companies
- Update: line 112, replace `availableCountries={availableCountries}` with `availableCompanies={availableCompanies}`

### 2. Filter Popover (`src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx`)

**Update `ContactFilterValues` interface:**
```typescript
// OLD
country: string; // "__all__" means no filter

// NEW
company: string; // "__all__" means no filter
```

**Update popover UI:**
- Replace the "Country" Select section with "Company" Select section
- Keep the same dropdown structure and sentinel value logic
- Update label and placeholder to reference company instead of country
- Update the select id from `countrySelectId` to `companySelectId`

**Update state management:**
- Update draft state to use `company` instead of `country`
- Update `setDraft` callbacks accordingly

**Affected lines:**
- Line 18: update interface property
- Lines 90-109: replace Country Select with Company Select

### 3. Table Component (`src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx`)

**Update props interface:**
```typescript
// OLD
availableCountries: string[];

// NEW
availableCompanies: string[];
```

**Update URL building:**
- In `buildParams()`: replace country param handling with company param handling
- In `handleApplyFilters()`: change `filters.country` to `filters.company`
- In `handleResetAllFilters()`: change `country: ""` to `company: ""`
- In `handleRemoveFilter()`: add case for `"company"` type, handle company clearing

**Update filter state:**
- Update `hasActiveFilters` check: use `company !== ""` instead of `country !== ""`

**Update filter popover call:**
- Pass `availableCompanies` instead of `availableCountries` to `ContactsFilterPopover`
- Update `currentFilters` to use `company` instead of `country`

**Affected lines:**
- Line 29: update country prop to company
- Line 32: update availableCountries prop to availableCompanies
- Line 90: update hasActiveFilters check
- Line 109: pass availableCompanies
- Line 144: replace country param handling with company
- Line 173-182: update handleApplyFilters to use company
- Line 196-205: update handleRemoveFilter to handle company type
- Line 220: update currentFilters object

### 4. Active Filters Component (`src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.tsx`)

**No changes needed if component is already generalized.** If it has hardcoded "Country" text, update to "Company".

### 5. Domain Service Layer

**Update `ListContactRequestsFilter` interface** (`src/lib/domain/types.ts`):
```typescript
// OLD
country?: string;

// NEW
company?: string;
```

**Update service implementation** (`src/lib/domain/contact-request/`):
- Update the contact request service to filter by `company` field instead of `country`
- Apply company filter in the same way country was filtered (exact match or LIKE query depending on implementation)

## Data Flow

1. **Page load:** Fetch all contacts with high pageSize (1000), extract unique non-null company values, sort alphabetically
2. **User interaction:** User selects a company from dropdown in filter popover → Apply filters
3. **URL update:** URL params updated with `?company=ACME` (or `company=__all__` for no filter)
4. **Service call:** `contactRequestService.listContactRequests()` called with `company` filter param
5. **Display:** Filtered results shown; active filter badge displayed if company filter is active
6. **Clear:** User clicks "Clear all" → company param removed from URL, results reset

## Testing Considerations

- Unit tests for `ContactsFilterPopover` should verify company filter values
- Unit tests for `ContactsTable` should verify company param in URL building
- Integration test should verify filtering works end-to-end
- Verify existing tests referencing country filtering are updated or removed
- Column visibility toggle for country column should still work (no changes needed)

## Backwards Compatibility

- Old URLs with `?country=XX` params will be ignored (not explicitly handled)
- No data migration needed; company field already exists in database

## Files Modified

1. `src/app/dashboard/[websiteId]/contacts-list/page.tsx`
2. `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx`
3. `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-table.tsx`
4. `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-active-filters.tsx` (if needed)
5. `src/lib/domain/types.ts`
6. `src/lib/domain/contact-request/contact-request-service.ts` (or similar service file)
