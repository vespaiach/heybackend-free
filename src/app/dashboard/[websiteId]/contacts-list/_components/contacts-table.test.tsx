import { render, screen } from "@testing-library/react";
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
});
