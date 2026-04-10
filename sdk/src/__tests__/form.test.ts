// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindForm } from "../form";
import { HbError } from "../subscribe";

vi.mock("../subscribe", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../subscribe")>();
  return { ...mod, coreSubscribe: vi.fn() };
});

import { coreSubscribe } from "../subscribe";

const CONFIG = { websiteId: "site_abc", key: "key" };

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
