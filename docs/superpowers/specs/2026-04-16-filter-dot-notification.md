---
title: Filter Dot Notification for Contacts List
date: 2026-04-16
status: approved
---

# Filter Dot Notification for Contacts List

## Summary
Add a visual dot notification to the **Contacts List** filter button to indicate when filters are active, matching the existing pattern in the **Subscribers List**.

## Problem
The contacts list currently shows an inactive state that's visually indistinct from when filters are applied. While a Badge displays the count when filters are active, a small dot notification would provide better visual consistency with the subscribers list and make the filtered state immediately obvious at a glance.

## Solution
Add a small dot notification (2×2px) to the top-right corner of the filters button in the contacts list, positioned absolutely, using the primary color. This dot appears whenever `hasActiveFilters` is `true`.

## Design Details

### Component Change
**File:** `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx`

**Current Button Structure:**
```tsx
<Button variant="outline" size="sm" className="gap-2">
  <SlidersHorizontalIcon className="h-4 w-4" />
  Filters
  {hasActiveFilters && (
    <Badge variant="secondary" className="ml-0.5 rounded-full px-1.5 text-xs font-normal">
      {total}
    </Badge>
  )}
</Button>
```

**New Button Structure:**
```tsx
<Button variant="outline" size="sm" className="relative gap-2">
  <SlidersHorizontalIcon className="h-4 w-4" />
  Filters
  {hasActiveFilters && (
    <Badge variant="secondary" className="ml-0.5 rounded-full px-1.5 text-xs font-normal">
      {total}
    </Badge>
  )}
  {hasActiveFilters && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />}
</Button>
```

### Changes Required
1. Add `className="relative"` to the Button to enable absolute positioning of the dot
2. Add the dot span after the Badge (when `hasActiveFilters` is true)
3. No new props, state, or logic needed — uses existing `hasActiveFilters` boolean

### Visual Parity
This implementation matches the exact pattern used in the **Subscribers List** (`subscribers-filter-popover.tsx` line 64):
```tsx
{hasActiveFilters && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />}
```

## Testing
- **Visual:** Verify dot appears top-right corner when filters are active
- **Consistency:** Confirm appearance matches subscribers list filter button
- **Interaction:** Confirm dot disappears when all filters are cleared
- **Existing Functionality:** Ensure Badge still displays count correctly

## Files Modified
- `src/app/dashboard/[websiteId]/contacts-list/_components/contacts-filter-popover.tsx`

## Backwards Compatibility
No breaking changes. This is a purely visual enhancement using existing props and state.
