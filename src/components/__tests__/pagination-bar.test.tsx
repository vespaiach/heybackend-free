import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { PaginationBar } from "../pagination-bar";

function makeProps(overrides: Partial<React.ComponentProps<typeof PaginationBar>> = {}) {
  return {
    page: 1,
    pageSize: 20,
    total: 100,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    ...overrides,
  };
}

describe("PaginationBar", () => {
  it("shows showing range", () => {
    render(<PaginationBar {...makeProps({ page: 2, pageSize: 20, total: 47 })} />);
    expect(screen.getByText(/showing 21–40 of 47/i)).toBeInTheDocument();
  });

  it("shows 'No results' when total is 0", () => {
    render(<PaginationBar {...makeProps({ total: 0 })} />);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it("does not render page nav buttons when only 1 page", () => {
    render(<PaginationBar {...makeProps({ total: 20, pageSize: 20 })} />);
    expect(screen.queryByRole("button", { name: /previous page/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument();
  });

  it("renders page nav buttons when more than 1 page", () => {
    render(<PaginationBar {...makeProps({ total: 21, pageSize: 20 })} />);
    expect(screen.getByRole("button", { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
  });

  it("Previous page is disabled on page 1", () => {
    render(<PaginationBar {...makeProps({ page: 1, total: 40, pageSize: 20 })} />);
    expect(screen.getByRole("button", { name: /previous page/i })).toBeDisabled();
  });

  it("Next page is disabled on last page", () => {
    render(<PaginationBar {...makeProps({ page: 2, total: 40, pageSize: 20 })} />);
    expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled();
  });

  it("calls onPageChange with decremented page when Previous is clicked", async () => {
    const onPageChange = vi.fn();
    render(<PaginationBar {...makeProps({ page: 3, total: 100, pageSize: 20, onPageChange })} />);
    await userEvent.click(screen.getByRole("button", { name: /previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with incremented page when Next is clicked", async () => {
    const onPageChange = vi.fn();
    render(<PaginationBar {...makeProps({ page: 1, total: 100, pageSize: 20, onPageChange })} />);
    await userEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with correct page when a numbered button is clicked", async () => {
    const onPageChange = vi.fn();
    render(<PaginationBar {...makeProps({ page: 1, total: 60, pageSize: 20, onPageChange })} />);
    await userEvent.click(screen.getByRole("button", { name: /^page 3$/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("current page button has aria-current=page", () => {
    render(<PaginationBar {...makeProps({ page: 2, total: 60, pageSize: 20 })} />);
    expect(screen.getByRole("button", { name: /^page 2$/i })).toHaveAttribute("aria-current", "page");
  });

  it("other page buttons do not have aria-current", () => {
    render(<PaginationBar {...makeProps({ page: 2, total: 60, pageSize: 20 })} />);
    expect(screen.getByRole("button", { name: /^page 1$/i })).not.toHaveAttribute("aria-current");
  });

  it("shows ellipsis for large page counts", () => {
    render(<PaginationBar {...makeProps({ page: 5, total: 200, pageSize: 20 })} />);
    expect(screen.getAllByText("…").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onPageSizeChange when rows-per-page is changed", async () => {
    const onPageSizeChange = vi.fn();
    render(<PaginationBar {...makeProps({ pageSize: 20, total: 200, onPageSizeChange })} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /rows per page/i }), "50");
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("disables controls when isLoading is true", () => {
    render(<PaginationBar {...makeProps({ page: 2, total: 100, pageSize: 20, isLoading: true })} />);
    expect(screen.getByRole("button", { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: /rows per page/i })).toBeDisabled();
  });

  it("shows loading spinner when isLoading is true", () => {
    render(<PaginationBar {...makeProps({ isLoading: true })} />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("accepts custom pageSizeOptions", () => {
    render(<PaginationBar {...makeProps({ pageSizeOptions: [5, 10, 25], pageSize: 5 })} />);
    const select = screen.getByRole("combobox", { name: /rows per page/i });
    expect(select).toHaveValue("5");
    expect(screen.getByRole("option", { name: "25" })).toBeInTheDocument();
  });
});
