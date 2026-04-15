# GitHub OAuth Login Implementation

**Date:** 2026-04-15  
**Status:** Design Approved  
**Scope:** Add GitHub as a third OAuth provider alongside email magic links and Google OAuth

## Problem Statement

The application currently supports email magic links and Google OAuth for authentication. GitHub OAuth needs to be added as an alternative login method, providing users another way to sign in without adding complexity to the existing auth architecture.

## Current State

- **Email provider:** Nodemailer-based magic links (development uses console log, production uses SMTP)
- **Google provider:** NextAuth's built-in Google provider with client ID/secret
- **Database:** Prisma adapter with User/Account/Session/VerificationToken models (no schema changes needed)
- **UI:** Login form with Apple (disabled placeholder), Google (enabled), email separator, and email magic link input

## Proposed Approach

Add GitHub provider to the existing NextAuth v5 configuration, following the same pattern as Google:

1. **Provider configuration** — register GitHub provider with client credentials in `src/auth.ts`
2. **Login UI** — add GitHub button alongside Google in `src/app/login/_components/login-form.tsx`
3. **User creation** — Prisma adapter auto-creates users with GitHub email/name, same as Google
4. **Tests** — add GitHub button test matching Google's test pattern
5. **Environment setup** — document `GITHUB_ID` and `GITHUB_SECRET` in `.env.local.example`

## Architecture Details

### Authentication Flow
```
User clicks "Login with GitHub"
    ↓
NextAuth redirects to GitHub OAuth
    ↓
GitHub redirects back with auth code
    ↓
NextAuth exchanges code for access token
    ↓
Prisma adapter finds or creates User (by GitHub email)
    ↓
Account record links GitHub identity to User
    ↓
Session created, user redirected to /dashboard/home
```

### User Creation (Auto)
- **Email:** GitHub's primary email (required by GitHub OAuth)
- **Name:** GitHub user's display name
- **Image:** GitHub user's avatar URL
- **Verification:** GitHub emails are pre-verified, so `emailVerified` is automatically set to current timestamp
- **Permissions:** Same as Google/email users (no role differentiation)

### No Schema Changes
The existing `Account` model already supports the GitHub provider:
```prisma
model Account {
  provider          String  # "github" will be stored here
  providerAccountId String  # GitHub user's numeric ID
  // ... other fields auto-populated by NextAuth
}
```

## Implementation Tasks

1. Update `src/auth.ts` — add GitHub provider with environment variables
2. Update `src/app/login/_components/login-form.tsx` — add GitHub button and handler
3. Update test file — add GitHub button tests
4. Update `.env.local.example` — document GitHub credentials
5. Manual setup: User obtains GitHub OAuth credentials from GitHub Developer Settings
6. Verify: Test GitHub login flow end-to-end

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| `src/auth.ts` | ~10 | Add `GitHub()` provider import and config |
| `src/app/login/_components/login-form.tsx` | ~15 | Add GitHub button + `handleGitHubSignIn()` handler |
| `src/app/login/_components/__tests__/login-form.test.tsx` | ~10 | Add GitHub button tests |
| `.env.local.example` | ~2 | Document `GITHUB_ID` and `GITHUB_SECRET` |

## Testing Strategy

- **Unit:** Login form renders GitHub button, calls `signIn("github", ...)` on click
- **Integration:** GitHub button enabled by default, not disabled like Apple
- **Manual:** Test full OAuth flow with a test GitHub account

## Rollout

No migration needed. GitHub provider can be enabled immediately once credentials are configured. Existing email/Google users unaffected.

## Success Criteria

✅ GitHub button appears on login page alongside Google  
✅ Clicking GitHub button initiates OAuth flow  
✅ First-time GitHub user auto-created with email/name/avatar  
✅ Returning GitHub user logs in without duplication  
✅ GitHub users have same permissions as email/Google users  
✅ All tests pass
