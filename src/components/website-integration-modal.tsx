"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialogs";

interface WebsiteIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  website: { id: string; name: string } | null;
}

export function WebsiteIntegrationModal({ open, onOpenChange, website }: WebsiteIntegrationModalProps) {
  const [copied, setCopied] = React.useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = website
    ? `<!-- BFF Newsletter Subscribe: ${website.name} -->
<script src="${origin}/bff.js?websiteId=${website.id}"></script>

<!-- Wire up your subscribe form -->
<form id="subscribe-form">
  <input type="email" name="email" placeholder="Your email" required />
  <button type="submit">Subscribe</button>
</form>

<script>
  BFF.attachForm(document.getElementById('subscribe-form'));
  document.getElementById('subscribe-form').addEventListener('bff:success', function () {
    alert('You are subscribed!');
  });
  document.getElementById('subscribe-form').addEventListener('bff:error', function (e) {
    alert('Error: ' + e.detail.message);
  });
</script>`
    : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast("Snippet copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Integration Snippet</DialogTitle>
          <DialogDescription>
            Paste this into your site&apos;s custom code section (Squarespace, Webflow, Framer, or plain
            HTML).
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm leading-relaxed">
            <code>{snippet}</code>
          </pre>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copy snippet</span>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          The snippet identifies your site via{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">websiteId</code> in the script URL. No API
          keys are embedded.
        </p>
      </DialogContent>
    </Dialog>
  );
}
