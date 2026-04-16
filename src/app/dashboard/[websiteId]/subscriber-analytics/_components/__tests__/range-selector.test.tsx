import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RangeSelector } from "../range-selector";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams("range=30d"),
  usePathname: () => "/dashboard/site1/subscriber-analytics",
}));

describe("RangeSelector", () => {
  beforeEach(() => mockPush.mockClear());

  it("renders all 4 range options", () => {
    render(<RangeSelector />);
    expect(screen.getByRole("button", { name: "7d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("highlights the active range from searchParams", () => {
    render(<RangeSelector />);
    const btn = screen.getByRole("button", { name: "30d" });
    expect(btn).toHaveAttribute("data-active", "true");
  });

  it("calls router.push with new range on click", async () => {
    render(<RangeSelector />);
    await userEvent.click(screen.getByRole("button", { name: "7d" }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("range=7d"));
  });
});
