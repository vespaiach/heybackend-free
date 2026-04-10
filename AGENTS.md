<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Project: heybackend-free

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| UI | React 19 + shadcn/ui v4 + Radix UI |
| Styling | Tailwind CSS v4 + CSS variables (OKLCH) |
| Icons | lucide-react |
| Forms | Formisch + Valibot |
| Auth | NextAuth v5 (email magic links + Google OAuth) |
| Database | MySQL + Prisma 6 |
| Linting/Formatting | Biome v2 |
| Build | React Compiler enabled (`reactCompiler: true`) |

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build — NOTE: automatically runs db_prod:migrate (Prisma migration) via prebuild hook
npm start            # start production server — NOTE: runs scripts/poststart.mjs via poststart hook
npm test             # run tests (vitest)
npm run test:watch   # run tests in watch mode
npm run lint         # run Biome linter
npm run lint:fix     # run Biome linter with auto-fix
npm run format       # run Biome formatter (write mode)
npm run db:generate  # generate Prisma client
npm run db:migrate   # run Prisma dev migrations
npm run db:push      # push schema changes (no migration file)
npm run db:studio    # open Prisma Studio UI
```

## Project Structure

```
prisma/
└── schema.prisma            # MySQL schema (User, Tenant, Website, Subscriber, Tag, WebsiteField)
src/
├── app/
│   ├── layout.tsx           # Root layout — fonts, metadata, global CSS
│   ├── page.tsx             # Landing page
│   ├── globals.css          # Tailwind v4 + CSS theme variables (light/dark)
│   ├── api/
│   │   ├── [websiteId]/subscribe/route.ts  # Public subscriber POST endpoint
│   │   └── auth/[...nextauth]/route.ts     # NextAuth handlers
│   ├── login/               # Magic link + Google OAuth login
│   ├── onboarding/          # New user onboarding form
│   └── dashboard/
│       ├── home/            # Dashboard home
│       ├── websites/        # Website management
│       └── [websiteId]/
│           ├── home/        # Per-website analytics
│           └── subscribers-list/  # Subscriber management (tags, export)
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── *.tsx                # Shared app components (sidebar, modals, etc.)
├── lib/
│   ├── utils.ts             # cn() helper (clsx + tailwind-merge)
│   ├── prisma.ts            # Prisma client singleton
│   ├── logger.ts            # Error logging
│   ├── export-csv.ts        # CSV export utility
│   ├── route-helpers.ts     # RSC/server helpers: getSession(), getLoggedInTenant()
│   ├── schemas/             # Valibot schemas
│   ├── api/
│   │   └── route-helpers.ts # API response factories: ok(), created(), validationError(), etc.
│   └── domain/              # Clean Architecture service layer
│       ├── subscriber/      # Subscriber service (CRUD, tags, analytics, export)
│       ├── website/         # Website service (CRUD, fields)
│       └── tenant/          # Tenant service (multi-tenancy)
├── hooks/
│   └── use-mobile.ts
├── auth.ts                  # NextAuth configuration (email + Google providers)
└── test/
    └── setup.ts             # Vitest global setup
```

## Development Rules

### Imports
- Use `@/*` alias for all internal imports (maps to `./src/*`)
- e.g. `import { cn } from "@/lib/utils"`

### Styling
- Tailwind CSS v4 — import with `@import "tailwindcss"` in CSS, not `@tailwind` directives
- Use `cn()` from `@/lib/utils` for all conditional/merged class names
- Theme is defined as CSS variables in `globals.css` using OKLCH color space
- Dark mode is supported via `.dark` class on `<html>`

### Components
- shadcn/ui components go in `src/components/ui/`
- Use `npx shadcn@latest add <component>` to add new shadcn components (see `components.json`)
- shadcn style: `radix-vega`, RSC enabled, icon library: lucide

### Forms & Validation
- Use **Formisch** (`@formisch/react`) for form state management
- Use **Valibot** for schema validation — define schemas in `src/lib/schemas/` or co-located `schema.ts`
- Do not use React Hook Form or Zod

### Database
- ORM: **Prisma 6** with MySQL
- Prisma client singleton is in `src/lib/prisma.ts` — always import from there, never instantiate directly
- Schema is in `prisma/schema.prisma` — run `npm run db:generate` after schema changes
- Use `npm run db:migrate` for migrations in development; `npm run db:push` for quick schema sync without a migration file

### Authentication
- Auth is handled by **NextAuth v5** — config is in `src/auth.ts`
- Providers: email magic links (Nodemailer) and Google OAuth
- Session and user data is persisted via `@auth/prisma-adapter`
- Environment variables required:
  - `AUTH_SECRET` — NextAuth v5 signing secret
  - `DATABASE_URL` — MySQL connection string for Prisma
  - `EMAIL_FROM` — sender address for magic links
  - `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_SECURE` — SMTP server config
  - `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD` — SMTP credentials
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth app credentials

### Architecture
- Business logic lives in `src/lib/domain/` — keep HTTP, UI, and DB concerns out of the domain layer
- Each domain module exports a service interface and a Prisma-backed implementation
- API route helpers (`src/lib/api/route-helpers.ts`) provide typed response factories (`ok()`, `created()`, `validationError()`, etc.) and origin guards — use them in all API routes

### TypeScript
- `strict: true` is required — do not disable
- Module resolution: `bundler`
- Path alias: `@/*` → `./src/*`
- Target: ES2022 (set in tsconfig — avoid ES5/AMD/UMD)

### Linting & Formatting
- Biome handles both lint and format — do not add ESLint or Prettier
- Line width: 110 characters, indent: 2 spaces
- Imports are auto-organized by Biome
- Run `npm run lint` before committing

### React & Next.js
- React Compiler is enabled — do not manually add `useMemo`/`useCallback` for performance
- Use React Server Components (RSC) by default; add `"use client"` only when needed
- Use Next.js `<Image>` for all images (optimization built-in)
- Use Next.js Metadata API (`export const metadata`) for SEO — not `<head>` tags

### Branching
- Always create a feature branch before writing any code. Never commit directly to `main` or `master`.
- Branch naming convention: `feat/<short-description>`, `fix/<short-description>`, or `chore/<short-description>`.
- Example: `git checkout -b feat/add-user-authentication`

### Implementation
- Make small, focused commits with clear messages following Conventional Commits format.
  - Examples: `feat: add login endpoint`, `fix: handle null user session`
- Never leave debug logs, commented-out code, or TODO stubs unless explicitly asked.

### Testing
- Framework: **Vitest** + **React Testing Library** (`@testing-library/react`, `@testing-library/user-event`).
- Test files live in a `__tests__/` subdirectory next to the code they test (e.g. `foo/__tests__/bar.test.ts`).
- Every new UI component in `src/components/` must have a corresponding `.test.tsx` file.
- Every new function, module, or feature must have corresponding unit tests.
- Every bug fix must include a regression test that would have caught the bug.
- Update existing tests if your changes affect their behavior — do not leave broken tests.
- Aim for meaningful coverage, not just line coverage. Test edge cases and failure paths.
- Use `vi.fn()` for mocks and `userEvent` (not `fireEvent`) for user interactions.
- Global test APIs (`describe`, `it`, `expect`, `vi`) are available without imports (`globals: true` in vitest config).
- Run `npm test` before marking work as done.

## Pull Requests & CI
- Before opening a PR, verify all of the following pass locally:
  1. `npm test` — all tests green
  2. `npm run lint` — no linting errors
  3. `npm run build` — project builds without errors
- Do not open a PR if any CI check is failing. Fix the issue first.
- PR title must follow Conventional Commits format: `feat: ...`, `fix: ...`, etc.
- PR description must include: what changed, why it changed, and how to test it.