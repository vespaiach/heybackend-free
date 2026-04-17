import { type ContactSubmitData, coreContactSubmit } from "./contact";
import { coreSubscribe, type HbConfig, type SubscribeData } from "./subscribe";

export interface BindFormCallbacks {
  onSuccess?: (result: { status: number }) => void;
  onError?: (err: Error) => void;
}

function resolveForm(selector: string | HTMLFormElement): HTMLFormElement | null {
  if (selector instanceof HTMLFormElement) return selector;
  const el = document.querySelector(selector);
  return el instanceof HTMLFormElement ? el : null;
}

function getFieldValue(form: HTMLFormElement, name: string): string | undefined {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const v = el.value.trim();
    return v.length > 0 ? v : undefined;
  }
  return undefined;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

export function bindSubscriberForm(
  selector: string | HTMLFormElement,
  config: HbConfig,
  callbacks: BindFormCallbacks,
): () => void {
  const form = resolveForm(selector);
  if (!form) {
    callbacks.onError?.(new Error(`__HB.bindSubscriberForm: form not found for selector ${selector}`));
    return () => {};
  }

  const resolvedForm: HTMLFormElement = form;
  const submitButton = resolvedForm.querySelector<HTMLButtonElement | HTMLInputElement>('[type="submit"]');

  async function handleSubmit(e: Event) {
    e.preventDefault();

    const email = getFieldValue(resolvedForm, "email");
    if (!email) {
      callbacks.onError?.(new Error("Email is required"));
      return () => {};
    }

    const data: SubscribeData = {
      email,
      firstName: getFieldValue(resolvedForm, "firstName"),
      lastName: getFieldValue(resolvedForm, "lastName"),
    };

    if (submitButton) submitButton.disabled = true;
    try {
      const result = await coreSubscribe(config, data);
      callbacks.onSuccess?.(result);
    } catch (err) {
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  resolvedForm.addEventListener("submit", handleSubmit);
  return () => resolvedForm.removeEventListener("submit", handleSubmit);
}

export function bindContactForm(
  selector: string | HTMLFormElement,
  config: HbConfig,
  callbacks: BindFormCallbacks,
): () => void {
  const form = resolveForm(selector);
  if (!form) {
    callbacks.onError?.(new Error(`__HB.bindContactForm: form not found for selector ${selector}`));
    return () => {};
  }

  const resolvedForm: HTMLFormElement = form;
  const submitButton = resolvedForm.querySelector<HTMLButtonElement | HTMLInputElement>('[type="submit"]');

  function validateContactForm(): { valid: boolean; error?: string } {
    const name = getFieldValue(resolvedForm, "name");
    if (!name) return { valid: false, error: "Name is required" };
    if (name.length > 256) return { valid: false, error: "Name must be 256 characters or less" };

    const email = getFieldValue(resolvedForm, "email");
    if (!email) return { valid: false, error: "Email is required" };
    if (!isValidEmail(email)) return { valid: false, error: "Email format is invalid" };
    if (email.length > 320) return { valid: false, error: "Email must be 320 characters or less" };

    const message = getFieldValue(resolvedForm, "message");
    if (!message) return { valid: false, error: "Message is required" };
    if (message.length > 5000) return { valid: false, error: "Message must be 5000 characters or less" };

    const company = getFieldValue(resolvedForm, "company");
    if (company && company.length > 256)
      return { valid: false, error: "Company must be 256 characters or less" };

    const phone = getFieldValue(resolvedForm, "phone");
    if (phone && phone.length > 50) return { valid: false, error: "Phone must be 50 characters or less" };

    return { valid: true };
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    const validation = validateContactForm();
    if (!validation.valid) {
      callbacks.onError?.(new Error(validation.error || "Validation failed"));
      return;
    }

    const name = getFieldValue(resolvedForm, "name");
    const email = getFieldValue(resolvedForm, "email");
    const message = getFieldValue(resolvedForm, "message");

    // Validation already passed, so these must be defined
    if (!name || !email || !message) {
      callbacks.onError?.(new Error("Validation failed"));
      return;
    }

    const data: ContactSubmitData = {
      name,
      email,
      message,
      company: getFieldValue(resolvedForm, "company"),
      phone: getFieldValue(resolvedForm, "phone"),
    };

    if (submitButton) submitButton.disabled = true;
    try {
      const result = await coreContactSubmit(config, data);
      callbacks.onSuccess?.(result);
    } catch (err) {
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  resolvedForm.addEventListener("submit", handleSubmit);
  return () => resolvedForm.removeEventListener("submit", handleSubmit);
}
