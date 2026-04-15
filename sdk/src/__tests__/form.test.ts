// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindContactForm, bindForm } from "../form";
import { HbError } from "../subscribe";

vi.mock("../subscribe", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../subscribe")>();
  return { ...mod, coreSubscribe: vi.fn() };
});

vi.mock("../contact", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../contact")>();
  return { ...mod, coreContactSubmit: vi.fn() };
});

import { HbError as ContactHbError, coreContactSubmit } from "../contact";
import { coreSubscribe } from "../subscribe";

const CONFIG = { websiteId: "site_abc", baseUrl: "https://example.com" };

function makeForm(html: string): HTMLFormElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div);
  return div.querySelector("form")!;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  vi.mocked(coreSubscribe).mockResolvedValue({ status: 201 });
});

async function submitForm(form: HTMLFormElement) {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  // flush microtasks
  await new Promise((r) => setTimeout(r, 0));
}

describe("bindForm()", () => {
  it("calls coreSubscribe with email from the form", async () => {
    const form = makeForm(`
      <form>
        <input name="email" value="user@example.com" />
        <button type="submit">Go</button>
      </form>
    `);
    bindForm(form, CONFIG, {});
    await submitForm(form);
    expect(coreSubscribe).toHaveBeenCalledWith(
      CONFIG,
      expect.objectContaining({ email: "user@example.com" }),
    );
  });

  it("passes firstName and lastName when present", async () => {
    const form = makeForm(`
      <form>
        <input name="email" value="a@b.com" />
        <input name="firstName" value="Alice" />
        <input name="lastName" value="Smith" />
        <button type="submit">Go</button>
      </form>
    `);
    bindForm(form, CONFIG, {});
    await submitForm(form);
    expect(coreSubscribe).toHaveBeenCalledWith(
      CONFIG,
      expect.objectContaining({ firstName: "Alice", lastName: "Smith" }),
    );
  });

  it("omits firstName/lastName when fields are absent", async () => {
    const form = makeForm(`
      <form><input name="email" value="a@b.com" /><button type="submit">Go</button></form>
    `);
    bindForm(form, CONFIG, {});
    await submitForm(form);
    const data = vi.mocked(coreSubscribe).mock.calls[0][1];
    expect(data.firstName).toBeUndefined();
    expect(data.lastName).toBeUndefined();
  });

  it("skips submit when email field is empty", async () => {
    const form = makeForm(`
      <form><input name="email" value="" /><button type="submit">Go</button></form>
    `);
    bindForm(form, CONFIG, {});
    await submitForm(form);
    expect(coreSubscribe).not.toHaveBeenCalled();
  });

  it("disables and re-enables the submit button during the request", async () => {
    let resolveSubscribe!: () => void;
    vi.mocked(coreSubscribe).mockReturnValue(
      new Promise((res) => {
        resolveSubscribe = () => res({ status: 201 });
      }),
    );

    const form = makeForm(`
      <form><input name="email" value="a@b.com" /><button type="submit">Go</button></form>
    `);
    const btn = form.querySelector<HTMLButtonElement>('[type="submit"]')!;

    bindForm(form, CONFIG, {});
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(btn.disabled).toBe(true);
    resolveSubscribe();
    await new Promise((r) => setTimeout(r, 0));
    expect(btn.disabled).toBe(false);
  });

  it("calls onSuccess with the result", async () => {
    const onSuccess = vi.fn();
    const form = makeForm(`
      <form><input name="email" value="a@b.com" /><button type="submit">Go</button></form>
    `);
    bindForm(form, CONFIG, { onSuccess });
    await submitForm(form);
    expect(onSuccess).toHaveBeenCalledWith({ status: 201 });
  });

  it("calls onError when coreSubscribe throws", async () => {
    const err = new HbError("RATE_LIMITED", "Too many requests", 429);
    vi.mocked(coreSubscribe).mockRejectedValue(err);
    const onError = vi.fn();
    const form = makeForm(`
      <form><input name="email" value="a@b.com" /><button type="submit">Go</button></form>
    `);
    bindForm(form, CONFIG, { onError });
    await submitForm(form);
    expect(onError).toHaveBeenCalledWith(err);
  });

  it("accepts a CSS selector string", async () => {
    const form = makeForm(`
      <form id="my-form"><input name="email" value="a@b.com" /><button type="submit">Go</button></form>
    `);
    bindForm("#my-form", CONFIG, {});
    await submitForm(form);
    expect(coreSubscribe).toHaveBeenCalledTimes(1);
  });

  it("accepts a class selector", async () => {
    const form = makeForm(`
      <form class="newsletter"><input name="email" value="a@b.com" /><button type="submit">Go</button></form>
    `);
    bindForm("form.newsletter", CONFIG, {});
    await submitForm(form);
    expect(coreSubscribe).toHaveBeenCalledTimes(1);
  });

  it("returns an unbind function that removes the listener", async () => {
    const form = makeForm(`
      <form><input name="email" value="a@b.com" /><button type="submit">Go</button></form>
    `);
    const unbind = bindForm(form, CONFIG, {});
    unbind();
    await submitForm(form);
    expect(coreSubscribe).not.toHaveBeenCalled();
  });

  it("warns and returns a no-op unbind when selector matches nothing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unbind = bindForm("#nonexistent", CONFIG, {});
    expect(warnSpy).toHaveBeenCalled();
    expect(unbind).toBeTypeOf("function");
    expect(() => unbind()).not.toThrow();
  });
});

describe("bindContactForm()", () => {
  it("calls coreContactSubmit with contact data from the form", async () => {
    const form = makeForm(`
      <form>
        <input name="name" value="John Doe" />
        <input name="email" value="john@example.com" />
        <textarea name="message">Hello there</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm(form, CONFIG, {});
    await submitForm(form);
    expect(coreContactSubmit).toHaveBeenCalledWith(
      CONFIG,
      expect.objectContaining({
        name: "John Doe",
        email: "john@example.com",
        message: "Hello there",
      }),
    );
  });

  it("passes company and phone when present", async () => {
    const form = makeForm(`
      <form>
        <input name="name" value="Jane" />
        <input name="email" value="jane@example.com" />
        <textarea name="message">Message</textarea>
        <input name="company" value="Acme Inc" />
        <input name="phone" value="+1234567890" />
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm(form, CONFIG, {});
    await submitForm(form);
    expect(coreContactSubmit).toHaveBeenCalledWith(
      CONFIG,
      expect.objectContaining({ company: "Acme Inc", phone: "+1234567890" }),
    );
  });

  it("omits company/phone when fields are absent", async () => {
    const form = makeForm(`
      <form>
        <input name="name" value="Jane" />
        <input name="email" value="jane@example.com" />
        <textarea name="message">Message</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm(form, CONFIG, {});
    await submitForm(form);
    const data = vi.mocked(coreContactSubmit).mock.calls[0][1];
    expect(data.company).toBeUndefined();
    expect(data.phone).toBeUndefined();
  });

  it("skips submit when name field is empty", async () => {
    const onError = vi.fn();
    const form = makeForm(`
      <form>
        <input name="name" value="" />
        <input name="email" value="user@example.com" />
        <textarea name="message">Message</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm(form, CONFIG, { onError });
    await submitForm(form);
    expect(coreContactSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("skips submit when email field is empty", async () => {
    const onError = vi.fn();
    const form = makeForm(`
      <form>
        <input name="name" value="John" />
        <input name="email" value="" />
        <textarea name="message">Message</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm(form, CONFIG, { onError });
    await submitForm(form);
    expect(coreContactSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("skips submit when message field is empty", async () => {
    const onError = vi.fn();
    const form = makeForm(`
      <form>
        <input name="name" value="John" />
        <input name="email" value="john@example.com" />
        <textarea name="message"></textarea>
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm(form, CONFIG, { onError });
    await submitForm(form);
    expect(coreContactSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("skips submit when email format is invalid", async () => {
    const onError = vi.fn();
    const form = makeForm(`
      <form>
        <input name="name" value="John" />
        <input name="email" value="not-an-email" />
        <textarea name="message">Hello</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm(form, CONFIG, { onError });
    await submitForm(form);
    expect(coreContactSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("disables and re-enables the submit button during the request", async () => {
    let resolveContact!: () => void;
    vi.mocked(coreContactSubmit).mockReturnValue(
      new Promise((res) => {
        resolveContact = () => res({ status: 201 });
      }),
    );

    const form = makeForm(`
      <form>
        <input name="name" value="John" />
        <input name="email" value="john@example.com" />
        <textarea name="message">Hello</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    const btn = form.querySelector<HTMLButtonElement>('[type="submit"]')!;

    bindContactForm(form, CONFIG, {});
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(btn.disabled).toBe(true);
    resolveContact();
    await new Promise((r) => setTimeout(r, 0));
    expect(btn.disabled).toBe(false);
  });

  it("calls onSuccess with the result", async () => {
    const onSuccess = vi.fn();
    const form = makeForm(`
      <form>
        <input name="name" value="John" />
        <input name="email" value="john@example.com" />
        <textarea name="message">Hello</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm(form, CONFIG, { onSuccess });
    await submitForm(form);
    expect(onSuccess).toHaveBeenCalledWith({ status: 201 });
  });

  it("calls onError when coreContactSubmit throws", async () => {
    const err = new ContactHbError("RATE_LIMITED", "Too many requests", 429);
    vi.mocked(coreContactSubmit).mockRejectedValue(err);
    const onError = vi.fn();
    const form = makeForm(`
      <form>
        <input name="name" value="John" />
        <input name="email" value="john@example.com" />
        <textarea name="message">Hello</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm(form, CONFIG, { onError });
    await submitForm(form);
    expect(onError).toHaveBeenCalledWith(err);
  });

  it("accepts a CSS selector string", async () => {
    const form = makeForm(`
      <form id="contact-form">
        <input name="name" value="John" />
        <input name="email" value="john@example.com" />
        <textarea name="message">Hello</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    bindContactForm("#contact-form", CONFIG, {});
    await submitForm(form);
    expect(coreContactSubmit).toHaveBeenCalledTimes(1);
  });

  it("returns an unbind function that removes the listener", async () => {
    const form = makeForm(`
      <form>
        <input name="name" value="John" />
        <input name="email" value="john@example.com" />
        <textarea name="message">Hello</textarea>
        <button type="submit">Send</button>
      </form>
    `);
    const unbind = bindContactForm(form, CONFIG, {});
    unbind();
    await submitForm(form);
    expect(coreContactSubmit).not.toHaveBeenCalled();
  });

  it("warns and returns a no-op unbind when selector matches nothing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unbind = bindContactForm("#nonexistent", CONFIG, {});
    expect(warnSpy).toHaveBeenCalled();
    expect(unbind).toBeTypeOf("function");
    expect(() => unbind()).not.toThrow();
  });
});
