import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type ContactFilterValues, ContactsFilterPopover } from "./contacts-filter-popover";

describe("ContactsFilterPopover", () => {
  const defaultProps = {
    availableCompanies: ["ACME", "TechCorp", "DevCo"],
    currentFilters: { query: "", company: "__all__", readStatus: "all" as const },
    total: 25,
    hasActiveFilters: false,
    onApply: vi.fn(),
    onReset: vi.fn(),
  };

  it("renders filter button with SlidersHorizontalIcon", () => {
    render(<ContactsFilterPopover {...defaultProps} />);

    expect(screen.getByRole("button", { name: /filters/i })).toBeInTheDocument();
  });

  it("shows active filter count when hasActiveFilters is true", () => {
    render(<ContactsFilterPopover {...defaultProps} hasActiveFilters total={42} />);

    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders filter fields when popover is open", async () => {
    const user = userEvent.setup();
    render(<ContactsFilterPopover {...defaultProps} />);

    const filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    expect(screen.getByPlaceholderText(/name or email/i)).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Read Status")).toBeInTheDocument();
  });

  it("renders company label in the popover", async () => {
    const user = userEvent.setup();
    render(<ContactsFilterPopover {...defaultProps} />);

    const filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    expect(screen.getByText("Company")).toBeInTheDocument();
  });

  it("calls onApply with filter values when Apply is clicked", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(<ContactsFilterPopover {...defaultProps} onApply={onApply} />);

    const filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    const searchInput = screen.getByPlaceholderText(/name or email/i);
    await user.type(searchInput, "john");

    const applyButton = screen.getByRole("button", { name: /apply/i });
    await user.click(applyButton);

    expect(onApply).toHaveBeenCalledWith({
      query: "john",
      company: "__all__",
      readStatus: "all",
    });
  });

  it("calls onReset when Clear all is clicked (when hasActiveFilters is true)", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(
      <ContactsFilterPopover
        {...defaultProps}
        currentFilters={{ query: "test", company: "ACME", readStatus: "unread" }}
        hasActiveFilters
        onReset={onReset}
      />,
    );

    const filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    const clearButton = screen.getByRole("button", { name: /clear all/i });
    await user.click(clearButton);

    expect(onReset).toHaveBeenCalled();
  });

  it("does not show Clear all button when hasActiveFilters is false", async () => {
    const user = userEvent.setup();
    render(<ContactsFilterPopover {...defaultProps} hasActiveFilters={false} />);

    const filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();
  });

  it("syncs draft from currentFilters when popover opens", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ContactsFilterPopover
        {...defaultProps}
        currentFilters={{ query: "initial", company: "ACME", readStatus: "read" }}
      />,
    );

    let filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    let searchInput = screen.getByPlaceholderText(/name or email/i);
    expect(searchInput).toHaveValue("initial");

    // Close and change currentFilters
    await user.keyboard("{Escape}");

    rerender(
      <ContactsFilterPopover
        {...defaultProps}
        currentFilters={{ query: "updated", company: "TechCorp", readStatus: "unread" }}
      />,
    );

    filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    searchInput = screen.getByPlaceholderText(/name or email/i);
    expect(searchInput).toHaveValue("updated");
  });

  it("popover closes after applying filters", async () => {
    const user = userEvent.setup();

    render(<ContactsFilterPopover {...defaultProps} />);

    const filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    expect(screen.getByPlaceholderText(/name or email/i)).toBeInTheDocument();

    const applyButton = screen.getByRole("button", { name: /apply/i });
    await user.click(applyButton);

    expect(screen.queryByPlaceholderText(/name or email/i)).not.toBeInTheDocument();
  });
});
