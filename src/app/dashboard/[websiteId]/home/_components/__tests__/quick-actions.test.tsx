import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickActions } from "../quick-actions";

vi.mock("@/app/dashboard/[websiteId]/subscribers-list/actions", () => ({
  exportSubscribers: vi.fn().mockResolvedValue({ subscribers: [] }),
}));

vi.mock("@/lib/export-csv", () => ({
  downloadCsv: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/website-form-modal", () => ({
  WebsiteFormModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Add Website" /> : null,
}));

describe("QuickActions", () => {
  it("renders all three action buttons", () => {
    render(<QuickActions websiteId="site_1" />);
    expect(screen.getByText(/Export Subscriber List/)).toBeInTheDocument();
    expect(screen.getByText("Add New Website")).toBeInTheDocument();
    expect(screen.getByText("Go to Integration")).toBeInTheDocument();
  });

  it("opens add website modal when button is clicked", async () => {
    const user = userEvent.setup();
    render(<QuickActions websiteId="site_1" />);
    await user.click(screen.getByText("Add New Website"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("integration link points to the correct URL", () => {
    render(<QuickActions websiteId="site_abc123" />);
    const link = screen.getByRole("link", { name: /Go to Integration/ });
    expect(link).toHaveAttribute("href", "/dashboard/site_abc123/subscriber-integration");
  });
});
