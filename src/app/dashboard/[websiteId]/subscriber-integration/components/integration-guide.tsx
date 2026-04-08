"use client"

import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper"
import { Separator } from "@/components/ui/separator"
import { CheckIcon } from "lucide-react"
import { CopyButton } from "./copy-button"

const PROGRAMMATIC_SNIPPET = `try {
  await BFF.subscribe({
    email: "user@example.com",
    firstName: "Jane",  // optional
    lastName:  "Doe",   // optional
  });
} catch (error) {
  // Handle errors — for example, show a message to the user
}`
const ATTACH_FORM_SNIPPET = `
<!-- Your form with form id goes here -->
<form id="subscribe-form">
  <input type="email" name="email" placeholder="Email address" required />
  <input type="text"  name="first_name" placeholder="First name" /> <!-- optional -->
  <input type="text"  name="last_name"  placeholder="Last name"  /> <!-- optional -->
  <button type="submit">Subscribe</button>
</form>

<script>
document.addEventListener("DOMContentLoaded", function () {
  const formEl = document.getElementById("subscribe-form");
  BFF.attachForms(formEl);

  // Optional. Subscriber added — show a thank-you message, confetti, etc.
  formEl.addEventListener("bff:success", function () {
    console.log("Subscribed!");
  });

  // Optional. Something went wrong — show the error to the user
  formEl.addEventListener("bff:error", function (e) {
    console.error("Error:", e.detail.message);
  });
});
</script>`

const EVENTS_SNIPPET = `document.getElementById("subscribe-form").addEventListener("bff:success", function () {
  // Subscriber added — show a thank-you message, confetti, etc.
  console.log("Subscribed!");
});

document.getElementById("subscribe-form").addEventListener("bff:error", function (e) {
  // Something went wrong — show the error to the user
  console.error("Error:", e.detail.message);
});`

const SEPARATOR_CLASS =
  "absolute top-7 left-3 -order-1 m-0 -translate-x-1/2 group-data-[orientation=vertical]/stepper-nav:h-[calc(100%-2rem)]"

const TRIGGER_CLASS = "items-start gap-3 pb-0 w-full cursor-default pointer-events-none rounded-none"

export function IntegrationGuide({ websiteId }: { websiteId: string }) {
  const scriptSnippet = `<script src="https://heybackend.com/bff.js?websiteId=${websiteId}"></script>`

  return (
    <Stepper
      orientation="vertical"
      defaultValue={1}
      className="w-full"
      indicators={{ completed: <CheckIcon className="size-3.5" /> }}>
      <StepperNav className="w-full">
        {/* ── Step 1 ── */}
        <StepperItem step={1} className="relative items-start not-last:flex-1">
          <StepperTrigger className={TRIGGER_CLASS}>
            <StepperIndicator>1</StepperIndicator>
            <div className="mt-0.5 text-left">
              <StepperTitle className="text-base font-semibold">Add the BFF script</StepperTitle>
              <StepperDescription>
                To begin, include our client-side library on every page where you intend to capture
                subscribers. This serves as the secure bridge between your frontend and our API.
              </StepperDescription>
            </div>
          </StepperTrigger>

          <div className="mt-3 mb-10 w-full space-y-3 pl-9">
            <div className="relative">
              <pre className="language-html overflow-x-auto rounded-md bg-muted p-4 pt-7 text-sm leading-relaxed">
                <code>{scriptSnippet}</code>
              </pre>
              <CopyButton text={scriptSnippet} />
            </div>
            <p className="text-xs text-muted-foreground">
              This script is unique to your Website ID and handles all API security automatically.
            </p>
          </div>

          <StepperSeparator className={SEPARATOR_CLASS} />
        </StepperItem>

        {/* ── Step 2 ── */}
        <StepperItem step={2} className="relative items-start not-last:flex-1">
          <StepperTrigger className={TRIGGER_CLASS}>
            <StepperIndicator className="bg-primary!">2</StepperIndicator>
            <div className="mt-0.5 text-left">
              <StepperTitle className="text-base font-semibold">Execute Subscriptions</StepperTitle>
              <StepperDescription>
                Use the methods provided by the BFF library to send data to the Subscriber API. You can trigger a subscription programmatically or bind the logic to an existing HTML form.
              </StepperDescription>
            </div>
          </StepperTrigger>

          <div className="mt-3 mb-10 w-full space-y-5 pl-9">
            {/* Option A */}
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-medium">
                Option A &mdash; <code className="text-xs">BFF.subscribe()</code> — Programmatic Trigger
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Use this method for full control over the subscription flow. It allows you to manually send subscriber data from custom event listeners, AJAX callbacks, or non-standard UI components.
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm leading-relaxed">
                  <code>{PROGRAMMATIC_SNIPPET}</code>
                </pre>
                <CopyButton text={PROGRAMMATIC_SNIPPET} />
              </div>
            </div>


            <Separator />

            {/* Option B */}
            <div>
              <p className="mb-1.5 text-sm font-medium">
                Option B &mdash; <code className="text-xs">BFF.attachForms()</code> — Form Binding
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                The fastest way to integrate. Use this to bind the SDK logic to a standard HTML form; it automatically intercepts the submit event, handles the API request, and manages the loading state for you.
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm leading-relaxed">
                  <code>{ATTACH_FORM_SNIPPET}</code>
                </pre>
                <CopyButton text={ATTACH_FORM_SNIPPET} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Important:</strong> For the auto-binding to work, your &lt;input&gt; tags must use the exact name attributes: email (required), first_name, and last_name. The SDK uses these keys to map your form data to the Subscriber API.
            </p>
          </div>
        </StepperItem>
      </StepperNav>
    </Stepper>
  )
}
