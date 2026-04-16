import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ContactRequest } from "@/lib/domain/types";
import { ContactDetailModal } from "./contact-detail-modal";

describe("ContactDetailModal", () => {
  const mockContact: ContactRequest = {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    company: "Acme Corp",
    phone: "+1234567890",
    message: "I am interested in your product",
    country: "US",
    region: "CA",
    city: "San Francisco",
    timezone: "America/Los_Angeles",
    os: "Windows",
    deviceType: "Desktop",
    browser: "Chrome",
    websiteId: "site1",
    createdAt: new Date("2026-04-16"),
    readAt: null,
    metadata: null,
  };

  it("displays contact information", () => {
    render(<ContactDetailModal contact={mockContact} open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getAllByText("john@example.com")).toHaveLength(2);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("I am interested in your product")).toBeInTheDocument();
  });

  it("displays location and device metadata", () => {
    render(<ContactDetailModal contact={mockContact} open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("US")).toBeInTheDocument();
    expect(screen.getByText("San Francisco")).toBeInTheDocument();
    expect(screen.getByText("Windows")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
  });

  it('shows "Mark as Read" button when contact is unread', () => {
    render(<ContactDetailModal contact={mockContact} open={true} onOpenChange={() => {}} />);

    expect(screen.getByRole("button", { name: /mark as read/i })).toBeInTheDocument();
  });
});
