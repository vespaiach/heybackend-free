# SDK Integration Guide Page Design
**Date:** 2026-04-17  
**Feature:** Integration page with AI-assisted form generation and developer code snippets

## Overview

Create a new page at `/dashboard/[websiteId]/integration` that helps users integrate the heybackend subscriber form SDK into their websites. The page offers two distinct modes:
1. **AI Assistant Mode** — Guided form builder for mixed-audience users
2. **Code Snippets Mode** — Ready-to-copy templates for developers

The page is already referenced in the sidebar navigation (`AppSidebar` component).

## Page Architecture

### File Structure
```
src/app/dashboard/[websiteId]/integration/
├── page.tsx                 # Main page component
├── _components/
│   ├── integration-tabs.tsx # Tab switcher (AI vs Code Snippets)
│   ├── ai-assistant.tsx     # AI chat flow component
│   ├── code-snippets.tsx    # Developer templates component
│   └── form-preview.tsx     # Raw HTML form preview
└── __tests__/
    └── integration.test.tsx
```

### Mode 1: AI Assistant
**Layout:** Two-column design

**Left Column (Chat Console):**
- Messages container with conversation history
- Chat input with AI responses (Claude API-powered)
- Step indicator showing progress (1/4, 2/4, etc.)

**Right Column (Form Builder):**
- Live form preview (unstyled raw HTML, user's responsibility to style)
- Syntax-highlighted code block (appears after all questions answered)
- "Copy code" button (disabled until generation complete)

**Chat Flow — 4 Steps:**

1. **Step 1: Form Name**
   - AI prompt: "What would you like to name this form? (e.g., Newsletter Signup, Contact Us)"
   - User input: Text field
   - Validation: Non-empty, max 100 characters

2. **Step 2: Fields Selection**
   - AI prompt: "Which fields do you need?"
   - User input: Radio buttons
     - Option A: "Email only"
     - Option B: "Email, First Name, Last Name"
   - Generates `name="email"`, `name="firstName"`, `name="lastName"` fields accordingly

3. **Step 3: Success Behavior**
   - AI prompt: "On successful submission, what should happen?"
   - User input: Radio buttons
     - Option A: "Redirect to another URL" → Text field for URL
     - Option B: "Clear form and show inline message" → Text area for custom message
   - Generates appropriate success callback logic

4. **Step 4: Error Message**
   - AI prompt: "What error message should users see if submission fails?"
   - User input: Text area
   - Default: "Failed to subscribe. Please try again."
   - Max 200 characters

**Generation & Display:**
Once all answers collected:
- AI confirms choices in a summary message
- Right column displays:
  - **Form Preview:** Raw HTML form rendering (no styling applied)
  - **Code Block:** Complete copy-paste ready code including:
    - HTML form with collected field configuration
    - Script tag loading the SDK: `<script src="https://app.heybackend.com/api/{websiteId}/sdk.js"></script>`
    - `bindSubscriberForm()` call with dynamic callbacks based on answers
- Enable "Copy code" button

**Completion State:**
- Show success message: "You're all set! 🎉"
- Next steps: "Paste this code into your website. The form will start collecting subscribers."
- "Create another form" button → Resets chat (no data persistence)

---

### Mode 2: Code Snippets
**Layout:** Single column or card grid

**Templates (4 pre-built examples):**

1. **Email Only + Redirect on Success**
   - Preview + copy-able code
   - Form has single email field
   - Success redirects to custom URL

2. **Email Only + Inline Success Message**
   - Preview + copy-able code
   - Form has single email field
   - Success shows inline confirmation message

3. **Email + First Name + Last Name + Redirect on Success**
   - Preview + copy-able code
   - Form has email, firstName, lastName fields
   - Success redirects to custom URL

4. **Email + First Name + Last Name + Inline Success Message**
   - Preview + copy-able code
   - Form has email, firstName, lastName fields
   - Success shows inline confirmation message

Each template card shows:
- Template title and description
- Live form preview (unstyled HTML)
- Syntax-highlighted code block
- "Copy code" button
- Brief explanation of what's included

---

## Generated Code Format

All generated snippets include complete, production-ready code:

```html
<form id="subscriber-form">
  <input type="email" name="email" required />
  <!-- other fields based on selection -->
  <button type="submit">Subscribe</button>
</form>

<script src="https://app.heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#subscriber-form', {
    onSuccess: () => { /* dynamic callback */ },
    onError: (err) => { /* error handling */ }
  });
</script>
```

---

## SDK Documentation

Create `/sdk/USAGE.md` documenting:

**Sections:**
1. **Quick Start** — Load script, basic example
2. **API Reference**
   - `subscribe(data)` — Direct API call
   - `bindSubscriberForm(selector, config)` — Form binding for subscribers
   - `bindContactForm(selector, config)` — Form binding for contacts (brief mention)
3. **Form Field Requirements**
   - Required fields by form type
   - Field name attributes (email, firstName, lastName, etc.)
   - HTML input type recommendations
4. **Callback Patterns**
   - onSuccess callback signature and usage
   - onError callback signature and error handling
5. **Code Examples**
   - Direct subscribe() call example
   - bindSubscriberForm() with different success/error patterns
6. **Validation & Error Handling**
   - Client-side validation (email format, required fields)
   - Error messages and how to handle them
7. **Troubleshooting**
   - Common issues and solutions
   - Form not found errors
   - CORS issues when embedded on other origins

---

## Technical Implementation Details

### AI Assistant Component
- Use Claude API via `useChat` hook pattern (or similar streaming approach)
- Maintain conversation history in component state
- No data persistence — reset on page load or explicit "Create another form"
- Generate form HTML dynamically based on collected answers
- Pass websiteId from URL params to form generation logic

### Form Preview
- Render unstyled raw HTML (no Tailwind CSS applied)
- Use `dangerouslySetInnerHTML` or iframe to isolate styling
- Lightweight, no JavaScript interactions in preview

### Code Generation
- Template engine or string interpolation to build complete code snippets
- Syntax highlighting library (e.g., Prism, highlight.js)
- "Copy code" button uses native `navigator.clipboard` API

### Code Snippets Component
- Static template definitions (4 templates hardcoded)
- Each template has title, description, preview HTML, and full code
- Reusable card component for each template

---

## User Experience Flow

### AI Assistant Path (Mixed Audience)
1. User lands on Integration page, sees AI Assistant tab active by default
2. AI greets user: "I'll help you create a subscriber form. Let's start!"
3. Chat progresses through 4 questions, user answers each
4. After step 4, form preview and code appear on right
5. User copies code (one-click)
6. Success state shows next steps
7. Option to start over or switch to Code Snippets tab

### Code Snippets Path (Developers)
1. User clicks Code Snippets tab
2. Sees 4 pre-built templates with previews
3. Picks template that matches their needs
4. Copies code directly
5. Done — no conversation, no waiting for AI

---

## Success Criteria

- ✅ AI mode generates functionally correct code matching SDK spec
- ✅ Code snippets provide quick access for developers
- ✅ Form previews are unstyled (raw HTML only)
- ✅ All generated code is production-ready and copy-paste ready
- ✅ No data persistence between sessions
- ✅ SDK documentation is complete and accessible
- ✅ Page integrates seamlessly with dashboard navigation
- ✅ Both modes handle websiteId correctly for SDK script URL

---

## Dependencies

- **Claude API** — For AI conversation (via `useChat` hook or similar)
- **Syntax Highlighting** — Prism or highlight.js for code display
- **Clipboard API** — Native browser API for copy-to-clipboard
- **Form Preview** — vanilla HTML rendering (no special library needed)

---

## Notes

- Form answers are not saved — intentional UX choice for simplicity
- SDK script URL (`/api/{websiteId}/sdk.js`) is dynamically injected with correct websiteId
- Success/error callbacks are generated dynamically based on user choices
- Code blocks are read-only; users copy the entire block rather than editing inline
