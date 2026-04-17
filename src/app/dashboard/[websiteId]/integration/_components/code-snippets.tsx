"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    preview: `<form>
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>`,
    code: `<form id="subscriber-form">
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>

<script src="https://app.heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#subscriber-form', {
    onSuccess: () => {
      window.location.href = '/welcome';
    },
    onError: (err) => {
      alert(err.message);
    }
  });
</script>`,
  },
  {
    id: "email-message",
    title: "Email Only with Message",
    description: "Collect email and show a success message inline",
    preview: `<form>
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>`,
    code: `<form id="subscriber-form">
  <input type="email" name="email" placeholder="your@email.com" required />
  <button type="submit">Subscribe</button>
</form>
<div id="success-message" style="display: none; color: green; margin-top: 1rem;">
  Thanks for subscribing!
</div>

<script src="https://app.heybackend.com/api/{websiteId}/sdk.js"></script>
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
</script>`,
  },
  {
    id: "full-redirect",
    title: "Email + Name with Redirect",
    description: "Collect email, first name, and last name, then redirect",
    preview: `<form>
  <input type="email" name="email" placeholder="your@email.com" required />
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>`,
    code: `<form id="subscriber-form">
  <input type="email" name="email" placeholder="your@email.com" required />
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>

<script src="https://app.heybackend.com/api/{websiteId}/sdk.js"></script>
<script>
  __HB.bindSubscriberForm('#subscriber-form', {
    onSuccess: () => {
      window.location.href = '/welcome';
    },
    onError: (err) => {
      alert(err.message);
    }
  });
</script>`,
  },
  {
    id: "full-message",
    title: "Email + Name with Message",
    description: "Collect email, first name, and last name, then show message",
    preview: `<form>
  <input type="email" name="email" placeholder="your@email.com" required />
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>`,
    code: `<form id="subscriber-form">
  <input type="email" name="email" placeholder="your@email.com" required />
  <input type="text" name="firstName" placeholder="First name" />
  <input type="text" name="lastName" placeholder="Last name" />
  <button type="submit">Subscribe</button>
</form>
<div id="success-message" style="display: none; color: green; margin-top: 1rem;">
  Welcome aboard!
</div>

<script src="https://app.heybackend.com/api/{websiteId}/sdk.js"></script>
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
</script>`,
  },
];

interface CodeSnippetsProps {
  websiteId: string;
}

export function CodeSnippets({ websiteId }: CodeSnippetsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    const codeWithWebsiteId = code.replace(/{websiteId}/g, websiteId);
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
            <div className="border rounded-md p-4 bg-white">
              <form className="space-y-3">
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  disabled
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                {(template.id === "full-redirect" || template.id === "full-message") && (
                  <>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First name"
                      disabled
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last name"
                      disabled
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </>
                )}
                <button
                  type="button"
                  disabled
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded-md text-sm font-medium">
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Code</p>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-xs">
              <code>{template.code.replace(/{websiteId}/g, websiteId)}</code>
            </pre>
          </div>

          <Button
            onClick={() => handleCopyCode(template.code, template.id)}
            className="w-full"
            variant={copiedId === template.id ? "secondary" : "default"}>
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
