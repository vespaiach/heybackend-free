import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodeSnippets } from "../_components/code-snippets";

describe("CodeSnippets", () => {
  beforeEach(() => {
    // Setup a basic clipboard mock
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
        writable: true,
        configurable: true,
      });
    }
  });

  it("renders all 4 templates", () => {
    render(<CodeSnippets websiteId="test_123" />);

    expect(screen.getByText("Email Only with Redirect")).toBeInTheDocument();
    expect(screen.getByText("Email Only with Message")).toBeInTheDocument();
    expect(screen.getByText("Email + Name with Redirect")).toBeInTheDocument();
    expect(screen.getByText("Email + Name with Message")).toBeInTheDocument();
  });

  it("copies code to clipboard when copy button clicked", async () => {
    const user = userEvent.setup();
    const mockWriteText = vi.fn(async () => undefined);
    (navigator.clipboard as any).writeText = mockWriteText;

    render(<CodeSnippets websiteId="test_123" />);
    const copyButtons = screen.getAllByText("Copy Code");

    await user.click(copyButtons[0]!);

    expect(mockWriteText).toHaveBeenCalled();
  });

  it("shows copied confirmation message", async () => {
    const user = userEvent.setup();
    render(<CodeSnippets websiteId="test_123" />);
    const copyButtons = screen.getAllByText("Copy Code");

    await user.click(copyButtons[0]!);

    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("includes websiteId in generated code", () => {
    render(<CodeSnippets websiteId="my_site_456" />);

    const codeElements = screen.getAllByText(/api\/my_site_456\/sdk\.js/);
    expect(codeElements.length).toBeGreaterThan(0);
  });

  it("replaces all websiteId placeholders in copied code", async () => {
    const user = userEvent.setup();
    const mockWriteText = vi.fn(async () => undefined);
    (navigator.clipboard as any).writeText = mockWriteText;

    render(<CodeSnippets websiteId="test_999" />);
    const copyButtons = screen.getAllByText("Copy Code");

    await user.click(copyButtons[0]!);

    expect(mockWriteText).toHaveBeenCalled();
    const copiedCode = mockWriteText.mock.calls[0]?.[0] as string;
    expect(copiedCode).toContain("api/test_999/sdk.js");
    expect(copiedCode).not.toContain("{websiteId}");
  });

  it("each template can be copied independently", async () => {
    const user = userEvent.setup();
    const mockWriteText = vi.fn(async () => undefined);
    (navigator.clipboard as any).writeText = mockWriteText;

    render(<CodeSnippets websiteId="test_123" />);
    const copyButtons = screen.getAllByText("Copy Code");

    // Copy first template
    await user.click(copyButtons[0]!);
    expect(mockWriteText).toHaveBeenCalledTimes(1);

    // Copy second template
    await user.click(copyButtons[1]!);
    expect(mockWriteText).toHaveBeenCalledTimes(2);

    // Verify each copy has correct code
    const firstCopy = mockWriteText.mock.calls[0]?.[0] as string;
    const secondCopy = mockWriteText.mock.calls[1]?.[0] as string;
    expect(firstCopy).toContain("window.location.href");
    expect(secondCopy).toContain("success-message");
  });

  it("displays all template descriptions", () => {
    render(<CodeSnippets websiteId="test_123" />);

    expect(screen.getByText("Collect email and redirect to a custom page on success")).toBeInTheDocument();
    expect(screen.getByText("Collect email and show a success message inline")).toBeInTheDocument();
    expect(screen.getByText("Collect email, first name, and last name, then redirect")).toBeInTheDocument();
    expect(
      screen.getByText("Collect email, first name, and last name, then show message"),
    ).toBeInTheDocument();
  });

  it("shows button state changes based on copiedId", async () => {
    const user = userEvent.setup();
    render(<CodeSnippets websiteId="test_123" />);
    const copyButtons = screen.getAllByText("Copy Code");
    const firstButton = copyButtons[0]!;

    // Initially shows "Copy Code"
    expect(firstButton.textContent).toContain("Copy Code");

    // Click to copy
    await user.click(firstButton);

    // Should show "Copied!" with check icon
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });
});
