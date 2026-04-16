import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ContactRequest } from "@/lib/domain/types";
import { ContactsTable } from "./contacts-table";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../actions", () => ({
  markContactAsRead: vi.fn(),
}));

describe("ContactsTable", () => {
  const mockContacts: ContactRequest[] = [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      company: "Acme",
      phone: null,
      message: "Hello world",
      country: "US",
      region: null,
      city: null,
      timezone: null,
      os: null,
      deviceType: null,
      browser: null,
      websiteId: "site1",
      metadata: null,
      createdAt: new Date("2026-04-16"),
      readAt: null,
    },
  ];

  const defaultProps = {
    selectedWebsiteId: "site1",
    contacts: mockContacts,
    total: 1,
    page: 1,
    pageSize: 20,
    search: { q: "", readStatus: "all" as const },
    company: "",
    sortField: "createdAt" as const,
    sortDir: "desc" as const,
    availableCompanies: ["Acme"],
  };

  it("displays contacts with visible columns", () => {
    render(<ContactsTable {...defaultProps} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();

    // Country column is hidden by default
    expect(screen.queryByText("US")).not.toBeInTheDocument();
  });

  it('shows "Unread" badge for unread contacts', () => {
    render(<ContactsTable {...defaultProps} />);

    expect(screen.getByText("Unread")).toBeInTheDocument();
  });

  it("shows read date for read contacts", () => {
    const readContact = {
      ...mockContacts[0],
      readAt: new Date("2026-04-15"),
    };

    render(<ContactsTable {...defaultProps} contacts={[readContact]} />);

    expect(screen.getByText(/read on/i)).toBeInTheDocument();
  });

  it("shows 'No results' when total is 0", () => {
    render(<ContactsTable {...defaultProps} contacts={[]} total={0} />);

    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("renders sort buttons for visible columns", () => {
    render(<ContactsTable {...defaultProps} />);

    // These are visible by default
    expect(screen.getByRole("button", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /created at/i })).toBeInTheDocument();

    // Country column is hidden by default (not sortable)
    expect(screen.queryByRole("button", { name: /country/i })).not.toBeInTheDocument();
  });

  it("rows are keyboard focusable and have accessible label", () => {
    render(<ContactsTable {...defaultProps} />);

    const row = screen.getByRole("row", { name: /john doe/i });
    expect(row).toHaveAttribute("tabindex", "0");
  });

  it("opens modal when Enter key is pressed on a row", async () => {
    const user = userEvent.setup();

    render(<ContactsTable {...defaultProps} />);

    const row = screen.getByRole("row", { name: /john doe/i });
    row.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens modal when Space key is pressed on a row", async () => {
    const user = userEvent.setup();

    render(<ContactsTable {...defaultProps} />);

    const row = screen.getByRole("row", { name: /john doe/i });
    row.focus();
    await user.keyboard(" ");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
