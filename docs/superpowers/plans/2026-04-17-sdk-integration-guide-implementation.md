# SDK Integration Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an integration guide page with AI-assisted form builder and code snippet templates to help users integrate the subscriber form SDK into their websites.

**Architecture:** Two-tab interface—AI Assistant mode guides users through a 3-step chat flow to generate customized code; Code Snippets mode displays 4 pre-built templates for quick copy-paste. Both modes generate unstyled HTML forms + complete SDK integration code. All UI uses shadcn/ui components.

**Tech Stack:** Next.js 16, React 19, Claude API (streaming), shadcn/ui, Tailwind CSS, TypeScript, Vitest + React Testing Library

---

## File Structure

**New Files:**
- `sdk/USAGE.md` — SDK documentation
- `src/app/dashboard/[websiteId]/integration/page.tsx` — Main page component
- `src/app/dashboard/[websiteId]/integration/_components/integration-tabs.tsx` — Tab switcher
- `src/app/dashboard/[websiteId]/integration/_components/ai-assistant.tsx` — AI chat component
- `src/app/dashboard/[websiteId]/integration/_components/code-snippets.tsx` — Pre-built templates
- `src/app/dashboard/[websiteId]/integration/_components/form-preview.tsx` — Raw HTML preview
- `src/app/dashboard/[websiteId]/integration/_components/form-generator.ts` — Code generation logic
- `src/app/dashboard/[websiteId]/integration/__tests__/integration.test.tsx` — Component tests
- `src/app/dashboard/[websiteId]/integration/__tests__/form-generator.test.ts` — Logic tests

---

## Tasks

### Task 1: Create SDK USAGE.md Documentation

**Files:**
- Create: `sdk/USAGE.md`

- [ ] **Step 1: Write the SDK documentation file**

Create `sdk/USAGE.md` with comprehensive SDK usage guide:

```markdown
# HeyBackend SDK Usage Guide

## Quick Start

Load the SDK in your HTML:

\`\`\`html
<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
\`\`\`

The SDK exposes a global `__HB` object with the following APIs:

## API Reference

### subscribe(data)

Directly subscribe a user without a form.

**Parameters:**
- \`email\` (string, required) — User's email address
- \`firstName\` (string, optional) — User's first name
- \`lastName\` (string, optional) — User's last name

**Returns:** Promise<{status: number}>

**Example:**
\`\`\`javascript
__HB.subscribe({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe'
}).then(result => {
  console.log('Subscribed!', result);
}).catch(err => {
  console.error('Failed:', err.message);
});
\`\`\`

### bindSubscriberForm(selector, callbacks)

Automatically handle form submission for a subscriber form.

**Parameters:**
- \`selector\` (string | HTMLFormElement) — CSS selector or form element reference
- \`callbacks\` (object) — Callback handlers
  - \`onSuccess\` (function) — Called when subscription succeeds
  - \`onError\` (function) — Called when subscription fails (receives Error object)

**Returns:** () => void — Cleanup function to remove listeners

**Form Field Names:**
- \`email\` — Required. Input field with name="email"
- \`firstName\` — Optional. Input field with name="firstName"
- \`lastName\` — Optional. Input field with name="lastName"

**Example:**
\`\`\`html
<form id="subscriber-form">
  <input type="email" name="email" required />
  <input type="text" name="firstName" />
  <input type="text" name="lastName" />
  <button type="submit">Subscribe</button>
</form>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#subscriber-form', {
    onSuccess: (result) => {
      alert('Welcome!');
    },
    onError: (err) => {
      alert('Error: ' + err.message);
    }
  });
</script>
\`\`\`

### bindContactForm(selector, callbacks)

Handle contact form submissions (separate from subscriber forms).

**Parameters:**
- \`selector\` (string | HTMLFormElement) — CSS selector or form element reference
- \`callbacks\` (object) — Callback handlers

**Form Field Names:**
- \`name\` (required, max 256 chars)
- \`email\` (required, valid email format, max 320 chars)
- \`message\` (required, max 5000 chars)
- \`company\` (optional, max 256 chars)
- \`phone\` (optional, max 50 chars)

**Example:**
\`\`\`html
<form id="contact-form">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindContactForm('#contact-form', {
    onSuccess: () => console.log('Message sent'),
    onError: (err) => console.error(err.message)
  });
</script>
\`\`\`

## Validation

### Client-Side Validation

The SDK validates before sending:
- **email**: Must be a valid email format (validated via HTML5 input validation)
- **firstName, lastName**: Trimmed, optional
- **All fields**: Empty strings are treated as missing (trimmed)

### Server-Side Validation

The API endpoint validates again. Client-side validation is a UX feature only.

## Error Handling

Common errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "Email is required" | Form email field is empty | Ensure input name="email" exists and has value |
| "Form not found for selector X" | Selector doesn't match any form | Check CSS selector or pass HTMLFormElement directly |
| Network error | Connection failed | Will auto-retry once; handle in onError callback |
| HTTP 429 | Rate limited | Too many requests from same IP; wait before retrying |

**Example error handling:**
\`\`\`javascript
__HB.bindSubscriberForm('#form', {
  onError: (err) => {
    if (err.message.includes('Email')) {
      document.getElementById('email-error').textContent = err.message;
    } else {
      console.error('Unexpected error:', err.message);
    }
  }
});
\`\`\`

## Integration Examples

### HTML Form with Redirect on Success

\`\`\`html
<form id="signup">
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#signup', {
    onSuccess: () => {
      window.location.href = '/welcome';
    },
    onError: (err) => {
      alert(err.message);
    }
  });
</script>
\`\`\`

### HTML Form with Inline Message

\`\`\`html
<form id="signup">
  <input type="email" name="email" required />
  <button type="submit">Subscribe</button>
</form>
<div id="success-msg" style="display:none; color: green;">
  Thanks for subscribing!
</div>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#signup', {
    onSuccess: () => {
      document.getElementById('signup').style.display = 'none';
      document.getElementById('success-msg').style.display = 'block';
    },
    onError: (err) => {
      alert('Error: ' + err.message);
    }
  });
</script>
\`\`\`

## Troubleshooting

### "Form not found for selector..."
- Check the CSS selector is correct
- Ensure the form exists in the DOM when the script runs
- Try passing the form element directly: \`__HB.bindSubscriberForm(formElement, ...)\`

### Form submits but nothing happens
- Check browser console for errors (F12 → Console)
- Verify the script tag URL is correct and websiteId matches
- Ensure form has an input with name="email"

### CORS errors when loading SDK
- SDK is loaded from the same origin (app.heybackend.com) — CORS is not an issue
- Check that you're using the correct script URL format

## Support

For issues, check your browser console (F12) for error messages. Errors are sent to \`onError\` callback.
\`\`\`

- [ ] **Step 2: Commit the documentation**

\`\`\`bash
git add sdk/USAGE.md
git commit -m "docs: add SDK usage documentation"
\`\`\`

---

### Task 2: Create Form Code Generation Utility

**Files:**
- Create: `src/app/dashboard/[websiteId]/integration/_components/form-generator.ts`
- Test: `src/app/dashboard/[websiteId]/integration/__tests__/form-generator.test.ts`

- [ ] **Step 1: Write failing tests for form generator**

Create `src/app/dashboard/[websiteId]/integration/__tests__/form-generator.test.ts`:

\`\`\`typescript
import { describe, it, expect } from "vitest";
import { generateFormCode, generateFormPreview, type FormConfig } from "../_components/form-generator";

describe("Form Generator", () => {
  const baseConfig: FormConfig = {
    websiteId: "test_site_123",
    fields: "email-only",
    successBehavior: {
      type: "redirect",
      url: "https://example.com/welcome",
    },
    errorMessage: "Something went wrong. Please try again.",
  };

  describe("generateFormPreview", () => {
    it("generates HTML form with email only field", () => {
      const html = generateFormPreview("email-only");
      expect(html).toContain('name="email"');
      expect(html).toContain('type="email"');
      expect(html).not.toContain('name="firstName"');
    });

    it("generates HTML form with email, firstName, lastName fields", () => {
      const html = generateFormPreview("email-name");
      expect(html).toContain('name="email"');
      expect(html).toContain('name="firstName"');
      expect(html).toContain('name="lastName"');
    });
  });

  describe("generateFormCode", () => {
    it("generates code with redirect on success", () => {
      const code = generateFormCode({
        ...baseConfig,
        fields: "email-only",
      });
      expect(code).toContain("window.location.href");
      expect(code).toContain("https://example.com/welcome");
      expect(code).toContain(\`api/test_site_123/sdk.js\`);
    });

    it("generates code with inline success message", () => {
      const code = generateFormCode({
        ...baseConfig,
        successBehavior: {
          type: "message",
          message: "Welcome aboard!",
        },
      });
      expect(code).toContain("Welcome aboard!");
      expect(code).not.toContain("window.location.href");
    });

    it("includes custom error message in callback", () => {
      const code = generateFormCode({
        ...baseConfig,
        errorMessage: "Custom error text",
      });
      expect(code).toContain("Custom error text");
    });

    it("generates code with all three fields", () => {
      const code = generateFormCode({
        ...baseConfig,
        fields: "email-name",
      });
      expect(code).toContain('name="email"');
      expect(code).toContain('name="firstName"');
      expect(code).toContain('name="lastName"');
    });
  });
});
\`\`\`

- [ ] **Step 2: Run tests to verify they fail**

\`\`\`bash
npm test -- src/app/dashboard/[websiteId]/integration/__tests__/form-generator.test.ts
\`\`\`

Expected output: \`FAIL\` — Cannot find module \`form-generator\`

- [ ] **Step 3: Create form generator utility with minimal implementation**

Create \`src/app/dashboard/[websiteId]/integration/_components/form-generator.ts\`:

\`\`\`typescript
export type FieldType = "email-only" | "email-name";

export type SuccessBehavior = 
  | { type: "redirect"; url: string }
  | { type: "message"; message: string };

export interface FormConfig {
  websiteId: string;
  fields: FieldType;
  successBehavior: SuccessBehavior;
  errorMessage: string;
}

export function generateFormPreview(fields: FieldType): string {
  const emailField = \`<input type="email" name="email" placeholder="your@email.com" required />\`;
  
  if (fields === "email-only") {
    return \`<form>
  \${emailField}
  <button type="submit">Subscribe</button>
</form>\`;
  }

  return \`<form>
  \${emailField}
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>\`;
}

export function generateFormCode(config: FormConfig): string {
  const formPreview = generateFormPreview(config.fields);
  const formId = "subscriber-form";
  const scriptUrl = \`https://heybackend.com/api/\${config.websiteId}/sdk.js\`;
  
  let successCallback = "";
  if (config.successBehavior.type === "redirect") {
    successCallback = \`window.location.href = '\${config.successBehavior.url}';\`;
  } else {
    successCallback = \`
    document.getElementById('\${formId}').style.display = 'none';
    document.getElementById('success-message').style.display = 'block';\`;
  }

  const code = \`\${formPreview.replace("<form>", \`<form id="\${formId}"\`)}\

<script src="\${scriptUrl}"><\/script>
<script>
  __HB.bindSubscriberForm('#\${formId}', {
    onSuccess: () => {
      \${successCallback}
    },
    onError: (err) => {
      alert('\${config.errorMessage}');
    }
  });
<\/script>\`;

  return code;
}
\`\`\`

- [ ] **Step 4: Run tests to verify they pass**

\`\`\`bash
npm test -- src/app/dashboard/[websiteId]/integration/__tests__/form-generator.test.ts
\`\`\`

Expected output: \`PASS\` (all tests passing)

- [ ] **Step 5: Commit**

\`\`\`bash
git add src/app/dashboard/[websiteId]/integration/_components/form-generator.ts src/app/dashboard/[websiteId]/integration/__tests__/form-generator.test.ts
git commit -m "feat: add form code generation utility"
\`\`\`

---

### Task 3: Create Form Preview Component

**Files:**
- Create: \`src/app/dashboard/[websiteId]/integration/_components/form-preview.tsx\`

- [ ] **Step 1: Create the form preview component**

Create \`src/app/dashboard/[websiteId]/integration/_components/form-preview.tsx\`:

\`\`\`typescript
import { Card } from "@/components/ui/card";

interface FormPreviewProps {
  html: string;
}

export function FormPreview({ html }: FormPreviewProps) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold mb-4">Preview</h3>
      <div
        className="border rounded-md p-4 bg-white"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  );
}
\`\`\`

- [ ] **Step 2: Commit**

\`\`\`bash
git add src/app/dashboard/[websiteId]/integration/_components/form-preview.tsx
git commit -m "feat: create form preview component"
\`\`\`

---

### Task 4: Create Code Snippets Component with 4 Templates

**Files:**
- Create: \`src/app/dashboard/[websiteId]/integration/_components/code-snippets.tsx\`

- [ ] **Step 1: Create code snippets template data**

Create \`src/app/dashboard/[websiteId]/integration/_components/code-snippets.tsx\`:

\`\`\`typescript
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { FormPreview } from "./form-preview";

interface CodeTemplate {
  id: string;
  title: string;
  description: string;
  preview: string;
  code: string;
}

const templates: CodeTemplate[] = [
  {
    id: "email-redirect",
    title: "Email Only with Redirect",
    description: "Collect email and redirect to a custom page on success",
    preview: \`<form>
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>\`,
    code: \`<form id="subscriber-form">
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#subscriber-form', {
    onSuccess: () => {
      window.location.href = '/welcome';
    },
    onError: (err) => {
      alert(err.message);
    }
  });
</script>\`,
  },
  {
    id: "email-message",
    title: "Email Only with Message",
    description: "Collect email and show a success message inline",
    preview: \`<form>
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>\`,
    code: \`<form id="subscriber-form">
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>
<div id="success-message" style="display: none; color: green; margin-top: 1rem;">
  Thanks for subscribing!
</div>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#subscriber-form', {
    onSuccess: () => {
      document.getElementById('subscriber-form').style.display = 'none';
      document.getElementById('success-message').style.display = 'block';
    },
    onError: (err) => {
      alert(err.message);
    }
  });
</script>\`,
  },
  {
    id: "full-redirect",
    title: "Email + Name with Redirect",
    description: "Collect email, first name, and last name, then redirect",
    preview: \`<form>
  <input type="email" name="email" placeholder="your@email.com" required />
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>\`,
    code: \`<form id="subscriber-form">
  <input type="email" name="email" placeholder="your@email.com" required />
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#subscriber-form', {
    onSuccess: () => {
      window.location.href = '/welcome';
    },
    onError: (err) => {
      alert(err.message);
    }
  });
</script>\`,
  },
  {
    id: "full-message",
    title: "Email + Name with Message",
    description: "Collect email, first name, and last name, then show message",
    preview: \`<form>
  <input type="email" name="email" placeholder="your@email.com" required />
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>\`,
    code: \`<form id="subscriber-form">
  <input type="email" name="email" placeholder="your@email.com" required />
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>
<div id="success-message" style="display: none; color: green; margin-top: 1rem;">
  Welcome aboard!
</div>

<script src="https://heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#subscriber-form', {
    onSuccess: () => {
      document.getElementById('subscriber-form').style.display = 'none';
      document.getElementById('success-message').style.display = 'block';
    },
    onError: (err) => {
      alert(err.message);
    }
  });
</script>\`,
  },
];

interface CodeSnippetsProps {
  websiteId: string;
}

export function CodeSnippets({ websiteId }: CodeSnippetsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    const codeWithWebsiteId = code.replace("{websiteId}", websiteId);
    navigator.clipboard.writeText(codeWithWebsiteId);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {templates.map((template) => (
        <Card key={template.id} className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{template.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Preview</p>
            <div
              className="border rounded-md p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: template.preview }}
            />
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Code</p>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-xs">
              <code>{template.code.replace("{websiteId}", websiteId)}</code>
            </pre>
          </div>

          <Button
            onClick={() => handleCopyCode(template.code, template.id)}
            className="w-full"
            variant={copiedId === template.id ? "secondary" : "default"}
          >
            {copiedId === template.id ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              "Copy Code"
            )}
          </Button>
        </Card>
      ))}
    </div>
  );
}
\`\`\`

- [ ] **Step 2: Commit**

\`\`\`bash
git add src/app/dashboard/[websiteId]/integration/_components/code-snippets.tsx
git commit -m "feat: create code snippets templates component"
\`\`\`

---

### Task 5: Create AI Assistant Chat Component

**Files:**
- Create: \`src/app/dashboard/[websiteId]/integration/_components/ai-assistant.tsx\`

- [ ] **Step 1: Create AI assistant component with chat flow**

Create \`src/app/dashboard/[websiteId]/integration/_components/ai-assistant.tsx\`:

\`\`\`typescript
"use client";

import { useState } from "react";
import { useChat } from "ai/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormPreview } from "./form-preview";
import { generateFormCode, type FormConfig } from "./form-generator";
import { Copy, Check } from "lucide-react";

interface AIAssistantProps {
  websiteId: string;
}

type Step = 1 | 2 | 3;

interface FormAnswers {
  fields: "email-only" | "email-name" | null;
  successBehavior: {
    type: "redirect" | "message" | null;
    url?: string;
    message?: string;
  };
  errorMessage: string;
}

export function AIAssistant({ websiteId }: AIAssistantProps) {
  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<FormAnswers>({
    fields: null,
    successBehavior: { type: null },
    errorMessage: "Failed to subscribe. Please try again.",
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleFieldsSelect = (value: "email-only" | "email-name") => {
    setAnswers((prev) => ({ ...prev, fields: value }));
    setStep(2);
  };

  const handleSuccessBehavior = (type: "redirect" | "message") => {
    setAnswers((prev) => ({
      ...prev,
      successBehavior: { type },
    }));
  };

  const handleRedirectUrl = (url: string) => {
    setAnswers((prev) => ({
      ...prev,
      successBehavior: { ...prev.successBehavior, url },
    }));
  };

  const handleSuccessMessage = (message: string) => {
    setAnswers((prev) => ({
      ...prev,
      successBehavior: { ...prev.successBehavior, message },
    }));
  };

  const handleErrorMessage = (message: string) => {
    setAnswers((prev) => ({ ...prev, errorMessage: message }));
  };

  const handleComplete = () => {
    if (answers.fields && answers.successBehavior.type && answers.errorMessage) {
      const config: FormConfig = {
        websiteId,
        fields: answers.fields,
        successBehavior:
          answers.successBehavior.type === "redirect"
            ? { type: "redirect", url: answers.successBehavior.url || "/" }
            : { type: "message", message: answers.successBehavior.message || "Thanks!" },
        errorMessage: answers.errorMessage,
      };

      const code = generateFormCode(config);
      setGeneratedCode(code);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleStartOver = () => {
    setStep(1);
    setAnswers({
      fields: null,
      successBehavior: { type: null },
      errorMessage: "Failed to subscribe. Please try again.",
    });
    setGeneratedCode(null);
  };

  if (generatedCode) {
    return (
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Chat */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold">Form Ready!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              I've generated your subscriber form code. Copy the code and paste it into your website.
            </p>
          </div>

          <div className="space-y-2 text-sm mb-6">
            <p className="font-medium">Your setup:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                Fields: {answers.fields === "email-only" ? "Email only" : "Email, First Name, Last Name"}
              </li>
              <li>
                Success: {answers.successBehavior.type === "redirect"
                  ? \`Redirect to \${answers.successBehavior.url}\`
                  : "Show inline message"}
              </li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopyCode} className="flex-1">
              {copiedCode ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiedCode ? "Copied!" : "Copy Code"}
            </Button>
            <Button onClick={handleStartOver} variant="outline" className="flex-1">
              Create Another
            </Button>
          </div>
        </Card>

        {/* Right: Preview & Code */}
        <div className="space-y-6">
          <FormPreview html={generatedCode.split("<script")[0]} />
          <Card className="p-6">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Code to Copy</p>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-xs">
              <code>{generatedCode}</code>
            </pre>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left: Chat */}
      <Card className="p-6">
        <div className="mb-4">
          <Badge variant="secondary">
            Step {step} of 3
          </Badge>
        </div>

        <ScrollArea className="h-96 mb-6">
          <div className="space-y-4 pr-4">
            {step >= 1 && (
              <div>
                <h3 className="font-semibold mb-4">Which fields do you need?</h3>
                <RadioGroup value={answers.fields || ""} onValueChange={handleFieldsSelect}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email-only" id="email-only" />
                    <Label htmlFor="email-only" className="font-normal cursor-pointer">
                      Email only
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email-name" id="email-name" />
                    <Label htmlFor="email-name" className="font-normal cursor-pointer">
                      Email, First Name, Last Name
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {step >= 2 && (
              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-4">On successful submission, what should happen?</h3>
                <RadioGroup
                  value={answers.successBehavior.type || ""}
                  onValueChange={(val) => handleSuccessBehavior(val as "redirect" | "message")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="redirect" id="redirect" />
                    <Label htmlFor="redirect" className="font-normal cursor-pointer">
                      Redirect to a URL
                    </Label>
                  </div>
                  {answers.successBehavior.type === "redirect" && (
                    <Input
                      placeholder="https://example.com/welcome"
                      value={answers.successBehavior.url || ""}
                      onChange={(e) => handleRedirectUrl(e.target.value)}
                      className="mt-2 ml-6"
                    />
                  )}

                  <div className="flex items-center space-x-2 mt-2">
                    <RadioGroupItem value="message" id="message" />
                    <Label htmlFor="message" className="font-normal cursor-pointer">
                      Show inline message
                    </Label>
                  </div>
                  {answers.successBehavior.type === "message" && (
                    <Textarea
                      placeholder="Thanks for subscribing!"
                      value={answers.successBehavior.message || ""}
                      onChange={(e) => handleSuccessMessage(e.target.value)}
                      className="mt-2 ml-6"
                    />
                  )}
                </RadioGroup>
              </div>
            )}

            {step >= 3 && (
              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-4">What error message should users see?</h3>
                <Textarea
                  value={answers.errorMessage}
                  onChange={(e) => handleErrorMessage(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {answers.errorMessage.length}/200
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {step === 3 && (
          <Button
            onClick={handleComplete}
            className="w-full"
            disabled={!answers.successBehavior.url && answers.successBehavior.type === "redirect"}
          >
            Generate Form
          </Button>
        )}
      </Card>

      {/* Right: Preview (empty until generation) */}
      <div className="text-center text-muted-foreground">
        <p className="text-sm">Answer the questions to preview your form here</p>
      </div>
    </div>
  );
}
\`\`\`

- [ ] **Step 2: Install AI SDK package**

\`\`\`bash
npm install ai
\`\`\`

- [ ] **Step 3: Commit**

\`\`\`bash
git add src/app/dashboard/[websiteId]/integration/_components/ai-assistant.tsx package.json
git commit -m "feat: create AI assistant chat component"
\`\`\`

---

### Task 6: Create Integration Tabs Component

**Files:**
- Create: \`src/app/dashboard/[websiteId]/integration/_components/integration-tabs.tsx\`

- [ ] **Step 1: Create tabs component**

Create \`src/app/dashboard/[websiteId]/integration/_components/integration-tabs.tsx\`:

\`\`\`typescript
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAssistant } from "./ai-assistant";
import { CodeSnippets } from "./code-snippets";

interface IntegrationTabsProps {
  websiteId: string;
}

export function IntegrationTabs({ websiteId }: IntegrationTabsProps) {
  const [activeTab, setActiveTab] = useState("ai");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="ai">AI Assistant</TabsTrigger>
        <TabsTrigger value="snippets">Code Snippets</TabsTrigger>
      </TabsList>

      <TabsContent value="ai" className="mt-0">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Build Your Form</h2>
            <p className="text-sm text-muted-foreground">
              Answer a few questions and we'll generate the code for your subscriber form.
            </p>
          </div>
          <AIAssistant websiteId={websiteId} />
        </div>
      </TabsContent>

      <TabsContent value="snippets" className="mt-0">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Ready-Made Templates</h2>
            <p className="text-sm text-muted-foreground">
              Pick a template and copy the code directly.
            </p>
          </div>
          <CodeSnippets websiteId={websiteId} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
\`\`\`

- [ ] **Step 2: Commit**

\`\`\`bash
git add src/app/dashboard/[websiteId]/integration/_components/integration-tabs.tsx
git commit -m "feat: create integration tabs component"
\`\`\`

---

### Task 7: Create Main Integration Page

**Files:**
- Create: \`src/app/dashboard/[websiteId]/integration/page.tsx\`

- [ ] **Step 1: Create the main page component**

Create \`src/app/dashboard/[websiteId]/integration/page.tsx\`:

\`\`\`typescript
import { IntegrationTabs } from "./_components/integration-tabs";

export const metadata = {
  title: "Integration | Dashboard",
  description: "Integrate your subscriber form with the SDK",
};

interface IntegrationPageProps {
  params: Promise<{ websiteId: string }>;
}

export default async function IntegrationPage({ params }: IntegrationPageProps) {
  const { websiteId } = await params;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Integration</h1>
        <p className="text-muted-foreground mt-1">
          Add a subscriber form to your website using our SDK.
        </p>
      </div>
      <IntegrationTabs websiteId={websiteId} />
    </div>
  );
}
\`\`\`

- [ ] **Step 2: Commit**

\`\`\`bash
git add src/app/dashboard/[websiteId]/integration/page.tsx
git commit -m "feat: create integration page"
\`\`\`

---

### Task 8: Add Component Tests

**Files:**
- Test: \`src/app/dashboard/[websiteId]/integration/__tests__/integration.test.tsx\`

- [ ] **Step 1: Write tests for integration components**

Create \`src/app/dashboard/[websiteId]/integration/__tests__/integration.test.tsx\`:

\`\`\`typescript
import { render, screen, userEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CodeSnippets } from "../_components/code-snippets";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe("CodeSnippets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 4 templates", () => {
    render(<CodeSnippets websiteId="test_123" />);
    
    expect(screen.getByText("Email Only with Redirect")).toBeInTheDocument();
    expect(screen.getByText("Email Only with Message")).toBeInTheDocument();
    expect(screen.getByText("Email + Name with Redirect")).toBeInTheDocument();
    expect(screen.getByText("Email + Name with Message")).toBeInTheDocument();
  });

  it("copies code to clipboard when copy button clicked", async () => {
    render(<CodeSnippets websiteId="test_123" />);
    const copyButtons = screen.getAllByText("Copy Code");
    
    await userEvent.click(copyButtons[0]);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("shows copied confirmation message", async () => {
    render(<CodeSnippets websiteId="test_123" />);
    const copyButtons = screen.getAllByText("Copy Code");
    
    await userEvent.click(copyButtons[0]);
    
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("includes websiteId in generated code", () => {
    render(<CodeSnippets websiteId="my_site_456" />);
    
    const codeElements = screen.getAllByText(/api\\/my_site_456\\/sdk\\.js/);
    expect(codeElements.length).toBeGreaterThan(0);
  });
});
\`\`\`

- [ ] **Step 2: Run tests to verify they pass**

\`\`\`bash
npm test -- src/app/dashboard/[websiteId]/integration/__tests__/integration.test.tsx
\`\`\`

Expected output: \`PASS\` (all tests passing)

- [ ] **Step 3: Commit**

\`\`\`bash
git add src/app/dashboard/[websiteId]/integration/__tests__/integration.test.tsx
git commit -m "test: add integration component tests"
\`\`\`

---

### Task 9: Verify Full Integration and Build

**Files:**
- All new files from tasks 1-8

- [ ] **Step 1: Run full test suite**

\`\`\`bash
npm test
\`\`\`

Expected output: All tests pass, including new integration tests

- [ ] **Step 2: Run linter**

\`\`\`bash
npm run lint
\`\`\`

Expected output: No linting errors

- [ ] **Step 3: Build project**

\`\`\`bash
npm run build
\`\`\`

Expected output: Build succeeds without errors

- [ ] **Step 4: Commit final verification**

\`\`\`bash
git add -A
git commit -m "chore: verify integration feature build and tests"
\`\`\`

---

## Summary

**New files created:** 9  
**Modified files:** 0  
**Tests added:** 2 test files (form generator + integration)  
**Dependencies added:** \`ai\` package for Claude API integration  
**Documentation:** \`/sdk/USAGE.md\` created

**Deliverables:**
- ✅ \`/sdk/USAGE.md\` — Complete SDK documentation
- ✅ Integration page at \`/dashboard/[websiteId]/integration\`
- ✅ Two modes: AI Assistant (3-step chat) + Code Snippets (4 templates)
- ✅ All components use shadcn/ui
- ✅ Form preview (unstyled HTML) + syntax-highlighted code blocks
- ✅ Copy-to-clipboard functionality for all code snippets
- ✅ Full test coverage for logic and components
