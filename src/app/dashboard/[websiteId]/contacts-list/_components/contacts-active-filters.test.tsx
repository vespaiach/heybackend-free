import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContactsActiveFilters } from "./contacts-active-filters";

describe("ContactsActiveFilters", () => {
  it("returns null when no active filters", () => {
    const { container } = render(
      <ContactsActiveFilters
        search={{ q: "", readStatus: "all" }}
        country=""
        onRemoveFilter={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("displays search filter chip", () => {
    render(
      <ContactsActiveFilters
        search={{ q: "John", readStatus: "all" }}
        country=""
        onRemoveFilter={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );

    expect(screen.getByText(/search: john/i)).toBeInTheDocument();
  });

  it("displays read status filter chip when not 'all'", () => {
    render(
      <ContactsActiveFilters
        search={{ q: "", readStatus: "unread" }}
        country=""
        onRemoveFilter={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );

    expect(screen.getByText(/status: unread/i)).toBeInTheDocument();
  });

  it("displays country filter chip", () => {
    render(
      <ContactsActiveFilters
        search={{ q: "", readStatus: "all" }}
        country="US"
        onRemoveFilter={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );

    expect(screen.getByText(/country: us/i)).toBeInTheDocument();
  });

  it("calls onRemoveFilter with 'query' when search chip × is clicked", async () => {
    const user = userEvent.setup();
    const onRemoveFilter = vi.fn();

    render(
      <ContactsActiveFilters
        search={{ q: "John", readStatus: "all" }}
        country=""
        onRemoveFilter={onRemoveFilter}
        onResetAll={vi.fn()}
      />,
    );

    const searchChip = screen.getByText(/search: john/i).parentElement!;
    const removeButton = searchChip.querySelector("button")!;
    await user.click(removeButton);

    expect(onRemoveFilter).toHaveBeenCalledWith("query");
  });

  it("calls onRemoveFilter with 'readStatus' when status chip × is clicked", async () => {
    const user = userEvent.setup();
    const onRemoveFilter = vi.fn();

    render(
      <ContactsActiveFilters
        search={{ q: "", readStatus: "unread" }}
        country=""
        onRemoveFilter={onRemoveFilter}
        onResetAll={vi.fn()}
      />,
    );

    const statusChip = screen.getByText(/status: unread/i).parentElement!;
    const removeButton = statusChip.querySelector("button")!;
    await user.click(removeButton);

    expect(onRemoveFilter).toHaveBeenCalledWith("readStatus");
  });

  it("calls onRemoveFilter with 'country' when country chip × is clicked", async () => {
    const user = userEvent.setup();
    const onRemoveFilter = vi.fn();

    render(
      <ContactsActiveFilters
        search={{ q: "", readStatus: "all" }}
        country="US"
        onRemoveFilter={onRemoveFilter}
        onResetAll={vi.fn()}
      />,
    );

    const countryChip = screen.getByText(/country: us/i).parentElement!;
    const removeButton = countryChip.querySelector("button")!;
    await user.click(removeButton);

    expect(onRemoveFilter).toHaveBeenCalledWith("country");
  });

  it("calls onResetAll when 'Clear all' button is clicked", async () => {
    const user = userEvent.setup();
    const onResetAll = vi.fn();

    render(
      <ContactsActiveFilters
        search={{ q: "John", readStatus: "read" }}
        country="UK"
        onRemoveFilter={vi.fn()}
        onResetAll={onResetAll}
      />,
    );

    const clearAllButton = screen.getByRole("button", { name: /clear all/i });
    await user.click(clearAllButton);

    expect(onResetAll).toHaveBeenCalled();
  });

  it("displays multiple filter chips together", () => {
    render(
      <ContactsActiveFilters
        search={{ q: "John", readStatus: "unread" }}
        country="US"
        onRemoveFilter={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );

    expect(screen.getByText(/search: john/i)).toBeInTheDocument();
    expect(screen.getByText(/status: unread/i)).toBeInTheDocument();
    expect(screen.getByText(/country: us/i)).toBeInTheDocument();
  });
});
