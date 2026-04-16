import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContactsFilterPopover } from "./contacts-filter-popover";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("ContactsFilterPopover", () => {
  it("renders filter button", () => {
    render(<ContactsFilterPopover availableCountries={["US", "UK"]} onFilterChange={() => {}} />);

    expect(screen.getByRole("button", { name: /filters/i })).toBeInTheDocument();
  });

  it("renders filter fields when popover is open", async () => {
    const user = userEvent.setup();
    render(<ContactsFilterPopover availableCountries={["US", "UK"]} onFilterChange={() => {}} />);

    const filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    expect(screen.getByPlaceholderText(/name or email/i)).toBeInTheDocument();
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("Read Status")).toBeInTheDocument();
  });

  it("calls onFilterChange when apply is clicked", async () => {
    const user = userEvent.setup();
    const mockOnFilterChange = vi.fn();

    render(<ContactsFilterPopover availableCountries={["US", "UK"]} onFilterChange={mockOnFilterChange} />);

    const filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    const applyButton = screen.getByRole("button", { name: /apply/i });
    await user.click(applyButton);

    expect(mockOnFilterChange).toHaveBeenCalled();
  });

  it("calls onFilterChange when clear is clicked", async () => {
    const user = userEvent.setup();
    const mockOnFilterChange = vi.fn();

    render(<ContactsFilterPopover availableCountries={["US", "UK"]} onFilterChange={mockOnFilterChange} />);

    const filterButton = screen.getByRole("button", { name: /filters/i });
    await user.click(filterButton);

    const clearButton = screen.getByRole("button", { name: /clear/i });
    await user.click(clearButton);

    expect(mockOnFilterChange).toHaveBeenCalled();
  });
});
