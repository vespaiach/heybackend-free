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

/**
 * Attaches a submit handler to a form (by any CSS selector or element ref).
 * Reads email/firstName/lastName by field name attribute.
 * Disables the submit button while the request is in flight.
 * Returns an unbind function to remove the listener.
 */
export function bindForm(
  selector: string | HTMLFormElement,
  config: HbConfig,
  callbacks: BindFormCallbacks,
): () => void {
  const form = resolveForm(selector);
  if (!form) {
    console.warn("__HB.bindForm: form not found for selector", selector);
    return () => {};
  }

  const resolvedForm: HTMLFormElement = form;
  const submitButton = resolvedForm.querySelector<HTMLButtonElement | HTMLInputElement>('[type="submit"]');

  async function handleSubmit(e: Event) {
    e.preventDefault();

    const email = getFieldValue(resolvedForm, "email");
    if (!email) return;

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
