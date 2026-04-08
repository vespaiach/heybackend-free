# FILEMAP

Project: **heybackend-free** — SaaS newsletter/subscriber management platform.

## Root Configuration

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and npm scripts |
| `tsconfig.json` | TypeScript config (ES2022, strict, `@/*` alias) |
| `next.config.ts` | Next.js config — enables React Compiler |
| `components.json` | shadcn/ui config (style: radix-vega, Lucide icons) |
| `biome.json` | Biome linter/formatter rules |
| `vitest.config.ts` | Vitest test runner config |
| `prisma.config.ts` | Prisma CLI config |
| `postcss.config.mjs` | PostCSS config for Tailwind CSS v4 |

## Database

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | MySQL schema — models: `User`, `Account`, `Session`, `VerificationToken`, `Tenant`, `Website`, `Subscriber`, `Tag`, `SubscriberTag`, `WebsiteField` |

## Authentication

| File | Purpose |
|------|---------|
| `src/auth.ts` | NextAuth v5 config — Google OAuth + email magic links, Prisma adapter |
| `src/auth.test.ts` | Auth configuration tests |

## App Router — Pages & Layouts

### Root

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout — theme provider, global CSS |
| `src/app/globals.css` | Tailwind v4 import + OKLCH CSS variables (light/dark) |
| `src/app/page.tsx` | Landing page |

### Login

| File | Purpose |
|------|---------|
| `src/app/login/page.tsx` | Login page |
| `src/app/login/_components/login-form.tsx` | Email input form for magic link sign-in |
| `src/app/login/_components/__tests__/login-form.test.tsx` | Login form tests |

### Onboarding

| File | Purpose |
|------|---------|
| `src/app/onboarding/page.tsx` | New-user setup page |
| `src/app/onboarding/schema.ts` | Valibot schema for onboarding form |
| `src/app/onboarding/actions.ts` | Server actions — create tenant and first website |
| `src/app/onboarding/_components/onboarding-form.tsx` | Onboarding form component |
| `src/app/onboarding/__tests__/actions.test.ts` | Onboarding server action tests |

### Dashboard

| File | Purpose |
|------|---------|
| `src/app/dashboard/layout.tsx` | Dashboard shell — sidebar + user menu |
| `src/app/dashboard/page.tsx` | Dashboard index — redirects to home |
| `src/app/dashboard/home/page.tsx` | Global dashboard home with analytics |
| `src/app/dashboard/websites/page.tsx` | Website list page |
| `src/app/dashboard/websites/websites-table.tsx` | Website data table with edit/delete |
| `src/app/dashboard/websites/actions.ts` | Server actions — website CRUD |
| `src/app/dashboard/websites/__tests__/websites-table.test.tsx` | Website table tests |
| `src/app/dashboard/websites/__tests__/website-form-modal.test.tsx` | Website form modal tests |
| `src/app/dashboard/[websiteId]/layout.tsx` | Per-website layout |
| `src/app/dashboard/[websiteId]/home/page.tsx` | Per-website analytics overview |
| `src/app/dashboard/[websiteId]/subscribers-list/page.tsx` | Subscriber list page |
| `src/app/dashboard/[websiteId]/subscribers-list/subscribers-table.tsx` | Subscriber table — search, sort, pagination, tags |
| `src/app/dashboard/[websiteId]/subscribers-list/actions.ts` | Server actions — subscriber list, delete, bulk tag |
| `src/app/dashboard/[websiteId]/subscribers-list/_components/subscriber-detail-dialog.tsx` | Subscriber detail/edit modal |
| `src/app/dashboard/[websiteId]/subscribers-list/__tests__/subscribers-table.test.tsx` | Subscriber table tests |

### API Routes

| File | Purpose |
|------|---------|
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler (OAuth callbacks) |
| `src/app/api/[websiteId]/subscribe/route.ts` | Public POST endpoint — subscribe a contact to a website |
| `src/app/api/[websiteId]/subscribe/__tests__/route.test.ts` | Subscribe endpoint tests |

## Components

### UI (shadcn/ui) — `src/components/ui/`

| File | Purpose |
|------|---------|
| `accordion.tsx` | Accordion |
| `alert-dialog.tsx` | Confirmation dialog |
| `avatar.tsx` | User avatar |
| `badge.tsx` | Badge/pill |
| `breadcrumb.tsx` | Breadcrumb nav |
| `button.tsx` | Base button |
| `card.tsx` | Card container |
| `chart.tsx` | Recharts wrapper |
| `checkbox.tsx` | Checkbox |
| `collapsible.tsx` | Collapsible section |
| `dialog.tsx` | Modal dialog |
| `dropdown-menu.tsx` | Dropdown menu |
| `field.tsx` | Form field wrapper |
| `input.tsx` | Text input |
| `label.tsx` | Form label |
| `popover.tsx` | Popover |
| `radio-group.tsx` | Radio group |
| `select.tsx` | Select dropdown |
| `separator.tsx` | Visual separator |
| `sheet.tsx` | Slide-out panel |
| `sidebar.tsx` | Sidebar layout primitive |
| `skeleton.tsx` | Loading skeleton |
| `sonner.tsx` | Toast notification wrapper |
| `submit-button.tsx` | Submit button with pending state |
| `table.tsx` | Data table |
| `tooltip.tsx` | Tooltip |

### App Components — `src/components/`

| File | Purpose |
|------|---------|
| `app-sidebar.tsx` | Main app sidebar with nav and website switcher |
| `nav-main.tsx` | Primary nav menu items |
| `nav-user.tsx` | User account dropdown in sidebar |
| `nav-user.test.tsx` | Nav user tests |
| `logo.tsx` | App logo |
| `theme-provider.tsx` | next-themes dark/light mode provider |
| `theme-provider.test.tsx` | Theme provider tests |
| `pagination-bar.tsx` | Table pagination controls |
| `pagination-bar.test.tsx` | Pagination tests |
| `relative-date.tsx` | Renders relative timestamps ("2 days ago") |
| `table-page-header.tsx` | Page header for table views (title + action slot) |
| `website-switcher.tsx` | Dropdown to switch between websites |
| `website-select-dialog.tsx` | Dialog to pick a website from a list |
| `website-form-modal.tsx` | Create/edit website modal |
| `website-form-modal.test.tsx` | Website form modal tests |
| `website-integration-modal.tsx` | Shows embed code and API key for a website |
| `website-fields-sheet.tsx` | Slide-out panel to manage custom form fields |
| `manage-tags-dialog.tsx` | Create/manage subscriber tags |
| `bulk-tag-popover.tsx` | Bulk-assign tags to selected subscribers |
| `first-website-setup.tsx` | Prompt shown when a user has no websites yet |

### Landing Components — `src/components/landing/`

| File | Purpose |
|------|---------|
| `landing-navbar.tsx` | Landing page navbar |
| `landing-footer.tsx` | Landing page footer |

## Hooks

| File | Purpose |
|------|---------|
| `src/hooks/use-mobile.ts` | Detects mobile viewport breakpoint |

## Library — `src/lib/`

### Domain Services

| File | Purpose |
|------|---------|
| `domain/index.ts` | Re-exports all domain services |
| `domain/types.ts` | Shared domain DTOs — `Website`, `Subscriber`, `Tag`, `Tenant`, `Contact`, analytics types |
| `domain/tenant/tenant-service.interface.ts` | `ITenantService` interface |
| `domain/tenant/tenant-service.ts` | Tenant service — create, get, update |
| `domain/website/website-service.interface.ts` | `IWebsiteService` interface |
| `domain/website/website-service.ts` | Website service — CRUD, key generation |
| `domain/subscriber/subscriber-service.interface.ts` | `ISubscriberService` interface |
| `domain/subscriber/subscriber-service.ts` | Subscriber service — list, upsert, delete, tag ops, export |

### Schemas — `src/lib/schemas/`

| File | Purpose |
|------|---------|
| `index.ts` | Exports all Valibot schemas |
| `website.ts` | Website create/update schemas |

### API Utilities — `src/lib/api/`

| File | Purpose |
|------|---------|
| `route-helpers.ts` | Typed response factories (`ok`, `created`, `validationError`, etc.) and CORS/origin guards |

### Utilities

| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Prisma client singleton — always import from here |
| `src/lib/utils.ts` | `cn()` (clsx + tailwind-merge), date helpers |
| `src/lib/logger.ts` | Error/debug logging utility |
| `src/lib/export-csv.ts` | CSV export for subscriber lists |
| `src/lib/route-helpers.ts` | Server-side route helpers (redirects, auth checks) |
| `src/lib/proxy.ts` | Proxy/middleware utilities |

## Test Setup

| File | Purpose |
|------|---------|
| `src/test/setup.ts` | Vitest global setup — mocks and test environment config |
