import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ContactRequest } from "@/lib/domain/types";
import { ContactsTable } from "./contacts-table";

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

  it("displays contacts with name, email, country, and created date", () => {
    render(
      <ContactsTable
        selectedWebsiteId="site1"
        contacts={mockContacts}
        total={1}
        page={1}
        pageSize={20}
        availableCountries={["US"]}
      />,
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("US")).toBeInTheDocument();
  });

  it('shows "Unread" badge for unread contacts', () => {
    render(
      <ContactsTable
        selectedWebsiteId="site1"
        contacts={mockContacts}
        total={1}
        page={1}
        pageSize={20}
        availableCountries={[]}
      />,
    );

    expect(screen.getByText("Unread")).toBeInTheDocument();
  });

  it("shows read date for read contacts", () => {
    const readContact = {
      ...mockContacts[0],
      readAt: new Date("2026-04-15"),
    };

    render(
      <ContactsTable
        selectedWebsiteId="site1"
        contacts={[readContact]}
        total={1}
        page={1}
        pageSize={20}
        availableCountries={[]}
      />,
    );

    expect(screen.getByText(/read on/i)).toBeInTheDocument();
  });

  it("rows are keyboard focusable and have button role", () => {
    render(
      <ContactsTable
        selectedWebsiteId="site1"
        contacts={mockContacts}
        total={1}
        page={1}
        pageSize={20}
        availableCountries={["US"]}
      />,
    );

    const row = screen.getByRole("row", { name: /john doe/i });
    expect(row).toHaveAttribute("tabindex", "0");
  });

  it("opens modal when Enter key is pressed on a row", async () => {
    const user = userEvent.setup();

    render(
      <ContactsTable
        selectedWebsiteId="site1"
        contacts={mockContacts}
        total={1}
        page={1}
        pageSize={20}
        availableCountries={["US"]}
      />,
    );

    const row = screen.getByRole("row", { name: /john doe/i });
    row.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens modal when Space key is pressed on a row", async () => {
    const user = userEvent.setup();

    render(
      <ContactsTable
        selectedWebsiteId="site1"
        contacts={mockContacts}
        total={1}
        page={1}
        pageSize={20}
        availableCountries={["US"]}
      />,
    );

    const row = screen.getByRole("row", { name: /john doe/i });
    row.focus();
    await user.keyboard(" ");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
