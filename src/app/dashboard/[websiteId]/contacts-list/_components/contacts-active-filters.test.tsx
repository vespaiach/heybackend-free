import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContactsActiveFilters } from "./contacts-active-filters";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("ContactsActiveFilters", () => {
  it("displays applied filter chips", () => {
    render(
      <ContactsActiveFilters
        search={{ q: "John", readStatus: "unread" }}
        country="US"
        onRemoveFilter={() => {}}
      />,
    );

    expect(screen.getByText(/search: john/i)).toBeInTheDocument();
    expect(screen.getByText(/status: unread/i)).toBeInTheDocument();
    expect(screen.getByText(/country: us/i)).toBeInTheDocument();
  });
});
