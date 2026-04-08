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
| Linting/Formatting | Biome v2 |
| Build | React Compiler enabled (`reactCompiler: true`) |

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm start            # start production server
npm test             # run tests (vitest)
npm run test:watch   # run tests in watch mode
npm run lint         # run Biome linter
npm run format       # run Biome formatter (write mode)
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout — fonts, metadata, global CSS
│   ├── page.tsx         # Home page
│   └── globals.css      # Tailwind v4 + CSS theme variables (light/dark)
├── components/
│   └── ui/              # shadcn/ui components live here
│       └── button.tsx
└── lib/
    └── utils.ts         # cn() helper (clsx + tailwind-merge)
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
- Test files live alongside the code they test: `foo.test.tsx` next to `foo.tsx`.
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